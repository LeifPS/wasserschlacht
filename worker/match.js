// Ein Durable Object pro Match: führt die Simulation aus und schickt jedem Spieler Schnappschüsse.
import { DurableObject } from "cloudflare:workers";
import { Sim } from "./sim.js";
import { makeBotLoadout } from "./bots.js";
import { MODES, TICK, mulberry } from "./shared.mjs";

const SNAP_EVERY = 2;           // Schnappschuss alle 2 Ticks = 15 pro Sekunde
const WAIT_MS = 10000, COUNT_S = 5, CLOSE_AFTER_MS = 14000;

export class Match extends DurableObject {
  sim = null; phase = "idle"; socks = new Map(); cfg = null; timer = null; count = 0; created = 0; left = new Set(); rewarded = new Set(); endInfo = null;

  /* Vom Lobby-Objekt aufgerufen */
  async init(cfg) {
    this.cfg = cfg; this.created = Date.now();
    const m = MODES[cfg.mode], total = m.teams * m.per, slots = [], rnd = mulberry((Math.random() * 1e9) | 0);
    const hum = cfg.players, avg = Math.round(hum.reduce((a, p) => a + p.lo.lvl, 0) / Math.max(1, hum.length));
    if (m.ffa) {
      hum.forEach((p, i) => slots.push({ name: p.lo.name, human: true, team: i, lo: p.lo }));
      for (let i = hum.length; i < total; i++) { const lo = makeBotLoadout(rnd, avg, i); slots.push({ name: lo.name, human: false, team: i, lo }); }
    } else {
      const cnt = [0, 0]; hum.forEach(p => { cnt[p.team]++; slots.push({ name: p.lo.name, human: true, team: p.team, lo: p.lo }); });
      for (let t = 0; t < 2; t++) for (let i = cnt[t]; i < m.per; i++) { const lo = makeBotLoadout(rnd, avg, slots.length); slots.push({ name: lo.name, human: false, team: t, lo }); }
      // Teams nach Spieler-ID sortieren, damit jedes Team gleich viele Plätze hat
    }
    // Bot-Namen eindeutig machen
    const used = new Set(); slots.forEach(s => { let n = s.name, k = 2; while (used.has(n.toLowerCase())) n = s.name + k++; s.name = n; used.add(n.toLowerCase()); if (!s.human) s.lo.name = n; });
    this.sim = new Sim({ mode: cfg.mode, ranked: cfg.ranked, slots, seed: (Math.random() * 1e9) | 0 });
    this.ids = new Map(); this.sim.players.forEach(p => { if (p.human) this.ids.set(p.name.toLowerCase(), p.id); });
    this.phase = "wait"; this.timer = setInterval(() => this.#loop(), 1000 / TICK);
    return true;
  }

  async fetch(request) {
    const name = request.headers.get("X-Name") || "";
    if (request.headers.get("Upgrade") !== "websocket") return new Response("WebSocket erwartet", { status: 426 });
    const pair = new WebSocketPair(), [client, server] = Object.values(pair); server.accept();
    const id = this.ids ? this.ids.get(name.toLowerCase()) : undefined;
    if (!this.sim || id === undefined || this.phase === "over" && !this.endInfo) { server.send(JSON.stringify({ t: "gone" })); server.close(1000, "weg"); return new Response(null, { status: 101, webSocket: client }); }
    const old = this.socks.get(id); if (old) { try { old.close(1000, "neu"); } catch {} }
    this.socks.set(id, server); const p = this.sim.players[id]; p.conn = true; this.left.delete(id);
    server.send(JSON.stringify(this.sim.initInfo(id)));
    if (this.phase === "over" && this.endInfo) server.send(JSON.stringify(this.endInfo[id] || this.endInfo.any));
    let last = 0, burst = 0;
    server.addEventListener("message", ev => {
      const now = Date.now(); if (now - last > 1000) { last = now; burst = 0; } if (++burst > 90) return;
      let m; try { m = JSON.parse(ev.data); } catch { return; } this.#onMsg(id, m);
    });
    const gone = () => { if (this.socks.get(id) === server) { this.socks.delete(id); p.conn = false; p.mx = p.my = 0; } };
    server.addEventListener("close", gone); server.addEventListener("error", gone);
    return new Response(null, { status: 101, webSocket: client });
  }

  #onMsg(id, m) {
    const s = this.sim, p = s.players[id]; if (!s || !m || typeof m.t !== "string") return;
    const num = (v, lo, hi) => { v = +v; return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : 0; };
    if (m.t === "i") s.input(id, { mx: num(m.mx, -1, 1), my: num(m.my, -1, 1), ax: num(m.ax, -1, 1), ay: num(m.ay, -1, 1), s: m.s | 0 });
    else if (m.t === "f") s.fire(id, num(m.ax, -1, 1), num(m.ay, -1, 1), m.d == null ? null : num(m.d, 0, 1));
    else if (m.t === "u") s.superFire(id, num(m.ax, -1, 1), num(m.ay, -1, 1), m.d == null ? null : num(m.d, 0, 1));
    else if (m.t === "a") s.ability(id, num(m.ax, -1, 1), num(m.ay, -1, 1));
    else if (m.t === "e") s.emote(id, m.n | 0);
    else if (m.t === "leave") this.#leave(id);
  }
  async #leave(id) {
    const p = this.sim.players[id]; if (this.left.has(id) || this.rewarded.has(id)) return; this.left.add(id);
    if (this.phase === "over") return;
    p.mx = p.my = 0; p.conn = false; this.rewarded.add(id);
    // Wer vorzeitig geht, verliert (Belohnung für das Gespielte)
    const res = { mode: this.cfg.mode, ranked: this.cfg.ranked, won: false, placement: this.sim.mode.ffa ? 5 : 2, kills: p.kills, dmg: p.dmg };
    try { await this.env.USER.get(this.env.USER.idFromName(p.name.toLowerCase())).matchResult(res); } catch {}
    const ws = this.socks.get(id); if (ws) try { ws.send(JSON.stringify({ t: "left" })); ws.close(1000, "ok"); } catch {}
    this.socks.delete(id);
  }

  #loop() {
    const s = this.sim; if (!s) return;
    if (this.phase === "wait") {
      const hum = s.players.filter(p => p.human);
      if (hum.every(p => this.socks.has(p.id)) || Date.now() - this.created > WAIT_MS) { this.phase = "count"; this.count = COUNT_S * TICK; }
      else return;
    }
    if (this.phase === "count") { this.count--; if (this.count <= 0) { this.phase = "play"; s.start(); } }
    s.step();
    if (s.tick % SNAP_EVERY === 0) { this.#send(); }
    if (s.over && this.phase !== "over") { this.phase = "over"; this.#finish(); }
    // alle Menschen weg? Match abbrechen
    if (this.phase !== "over" && s.tick % TICK === 0) { const any = s.players.some(p => p.human && !this.left.has(p.id) && (this.socks.has(p.id) || Date.now() - this.created < WAIT_MS)); if (!any && this.phase === "play") this.#shutdown(); }
  }
  #send() {
    const s = this.sim;
    for (const [id, ws] of this.socks) { try { const snap = s.snapshot(id); snap.ph = this.phase === "count" ? Math.ceil(this.count / TICK) : 0; ws.send(JSON.stringify(snap)); } catch {} }
    s.clearEvents();
  }
  async #finish() {
    const s = this.sim; this.#send();
    const table = s.players.map(p => ({ id: p.id, n: p.name, tm: p.team, k: p.kills, d: Math.round(p.dmg), pl: p.place || 0, h: p.human ? 1 : 0 }));
    const rewards = {};
    await Promise.all(s.players.filter(p => p.human && !this.rewarded.has(p.id)).map(async p => {
      this.rewarded.add(p.id);
      try { rewards[p.id] = await this.env.USER.get(this.env.USER.idFromName(p.name.toLowerCase())).matchResult(s.resultFor(p)); } catch { rewards[p.id] = null; }
    }));
    this.endInfo = {};
    for (const p of s.players) if (p.human) this.endInfo[p.id] = { t: "end", win: s.over.win, you: p.id, mode: s.modeId, ranked: s.ranked, rewards: rewards[p.id] || null, table, ms: s.modeId === "knockout" ? s.ms.rd : null };
    for (const [id, ws] of this.socks) { try { ws.send(JSON.stringify(this.endInfo[id])); } catch {} }
    setTimeout(() => this.#shutdown(), CLOSE_AFTER_MS);
  }
  #shutdown() { if (this.timer) clearInterval(this.timer); this.timer = null; for (const ws of this.socks.values()) { try { ws.close(1000, "ende"); } catch {} } this.socks.clear(); this.phase = "over"; }
}
