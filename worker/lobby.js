// Das Lobby-Objekt: Warteschlange, zufälliger Modus, Party-Codes, Matchmaking nach Level, Bots nach Wartezeit.
import { DurableObject } from "cloudflare:workers";
import { MODE_IDS, TEAM_MODES, MODES, BOT_FILL_S, RANKED_MIN_LVL } from "./shared.mjs";

const MAX_HUMANS = 4;
const CODE_CH = "ABCDEFGHJKLMNPQRSTUVWXYZ";

export class Lobby extends DurableObject {
  users = new Map();      // name(klein) -> { ws, lo }
  parties = new Map();    // code -> { code, leader, members:[name(klein)] }
  partyOf = new Map();    // name(klein) -> code
  queue = [];             // Gruppen: { names:[...], ranked, at, lvl }
  timer = null;

  async fetch(request) {
    if (request.headers.get("Upgrade") !== "websocket") return new Response("WebSocket erwartet", { status: 426 });
    let lo; try { lo = JSON.parse(decodeURIComponent(escape(atob(request.headers.get("X-Player") || "")))); } catch { return new Response("?", { status: 400 }); }
    const pair = new WebSocketPair(), [client, server] = Object.values(pair); server.accept();
    const k = lo.name.toLowerCase(), old = this.users.get(k);
    if (old) { this.#drop(k); try { old.ws.close(1000, "neu"); } catch {} }
    this.users.set(k, { ws: server, lo });
    server.send(JSON.stringify({ t: "hi", online: this.users.size }));
    server.addEventListener("message", ev => { let m; try { m = JSON.parse(ev.data); } catch { return; } this.#onMsg(k, m); });
    const gone = () => { const u = this.users.get(k); if (u && u.ws === server) { this.#drop(k); this.users.delete(k); } };
    server.addEventListener("close", gone); server.addEventListener("error", gone);
    return new Response(null, { status: 101, webSocket: client });
  }
  #send(k, o) { const u = this.users.get(k); if (u) try { u.ws.send(JSON.stringify(o)); } catch {} }

  #onMsg(k, m) {
    const u = this.users.get(k); if (!u || !m) return;
    if (m.t === "queue") this.#enqueue(k, !!m.ranked, m.dev);
    else if (m.t === "cancel") this.#cancel(k);
    else if (m.t === "party") this.#partyOp(k, m);
    else if (m.t === "ping") this.#send(k, { t: "pong" });
  }

  /* ----- Party ----- */
  #partyOp(k, m) {
    if (m.op === "create") {
      this.#leaveParty(k);
      let code; do { code = Array.from({ length: 4 }, () => CODE_CH[Math.floor(Math.random() * CODE_CH.length)]).join(""); } while (this.parties.has(code));
      this.parties.set(code, { code, leader: k, members: [k] }); this.partyOf.set(k, code); this.#partyUpdate(code);
    } else if (m.op === "join") {
      const code = String(m.code || "").toUpperCase().trim(), p = this.parties.get(code);
      if (!p) return this.#send(k, { t: "partyErr", error: "Diese Party gibt es nicht." });
      if (p.members.length >= 3) return this.#send(k, { t: "partyErr", error: "Die Party ist voll." });
      if (this.queue.some(g => g.names.includes(p.leader))) return this.#send(k, { t: "partyErr", error: "Die Party sucht gerade ein Match." });
      this.#leaveParty(k); p.members.push(k); this.partyOf.set(k, code); this.#partyUpdate(code);
    } else if (m.op === "leave") this.#leaveParty(k);
  }
  #leaveParty(k) {
    const code = this.partyOf.get(k); if (!code) return; const p = this.parties.get(code); this.partyOf.delete(k);
    this.#cancel(k); this.#send(k, { t: "party", code: null });
    if (!p) return; p.members = p.members.filter(n => n !== k);
    if (!p.members.length) { this.parties.delete(code); return; }
    if (p.leader === k) p.leader = p.members[0]; this.#partyUpdate(code);
  }
  #partyUpdate(code) {
    const p = this.parties.get(code); if (!p) return;
    const members = p.members.map(n => ({ name: this.users.get(n) ? this.users.get(n).lo.name : n, lvl: this.users.get(n) ? this.users.get(n).lo.lvl : 1, leader: n === p.leader }));
    for (const n of p.members) this.#send(n, { t: "party", code, members, leader: n === p.leader });
  }

  /* ----- Warteschlange ----- */
  #enqueue(k, ranked, dev) {
    const code = this.partyOf.get(k), party = code ? this.parties.get(code) : null;
    if (party && party.leader !== k) return this.#send(k, { t: "qErr", error: "Nur der Party-Anführer startet die Suche." });
    const names = party ? party.members.filter(n => this.users.has(n)) : [k];
    if (this.queue.some(g => g.names.some(n => names.includes(n)))) return;
    if (ranked) { const low = names.find(n => this.users.get(n).lo.lvl < RANKED_MIN_LVL); if (low) return this.#send(k, { t: "qErr", error: "Ranked gibt es ab Level " + RANKED_MIN_LVL + "." }); }
    const lvl = Math.round(names.reduce((a, n) => a + this.users.get(n).lo.lvl, 0) / names.length);
    this.queue.push({ names, ranked, at: Date.now(), lvl, dev: typeof dev === "string" ? dev : "" });
    for (const n of names) this.#send(n, { t: "queued", ranked, bots: BOT_FILL_S });
    if (!this.timer) this.timer = setInterval(() => this.#tick(), 1000);
  }
  #cancel(k) {
    const g = this.queue.find(x => x.names.includes(k)); if (!g) return;
    this.queue = this.queue.filter(x => x !== g); for (const n of g.names) this.#send(n, { t: "unqueued" });
    if (!this.queue.length && this.timer) { clearInterval(this.timer); this.timer = null; }
  }
  #drop(k) { this.#leaveParty(k); this.#cancel(k); }

  #tick() {
    const now = Date.now();
    for (const ranked of [false, true]) {
      let list = this.queue.filter(g => g.ranked === ranked).sort((a, b) => a.at - b.at);
      while (list.length) {
        const first = list[0], waited = (now - first.at) / 1000, win = 4 + waited * 0.8;
        const pack = [first]; let humans = first.names.length;
        for (const g of list.slice(1)) if (Math.abs(g.lvl - first.lvl) <= win && humans + g.names.length <= MAX_HUMANS) { pack.push(g); humans += g.names.length; }
        const need = humans >= MAX_HUMANS ? 0 : humans >= 3 ? 3 : humans >= 2 ? 6 : BOT_FILL_S;
        if (waited < need) break;
        this.#startMatch(pack, ranked); list = list.filter(g => !pack.includes(g));
      }
    }
    for (const g of this.queue) { const w = Math.round((now - g.at) / 1000); for (const n of g.names) this.#send(n, { t: "q", w, humans: this.queue.reduce((a, x) => a + x.names.length, 0) }); }
    if (!this.queue.length && this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  async #startMatch(pack, ranked) {
    const pool = ranked ? TEAM_MODES : MODE_IDS, forced = this.env.FORCE_MODE === "any" ? (pack.map(g => g.dev).find(d => MODES[d]) || null) : this.env.FORCE_MODE && MODES[this.env.FORCE_MODE] ? this.env.FORCE_MODE : null, mode = forced || pool[Math.floor(Math.random() * pool.length)], m = MODES[mode];
    this.queue = this.queue.filter(g => !pack.includes(g));
    const players = []; let tc = [0, 0];
    if (m.ffa) { for (const g of pack) for (const n of g.names) players.push({ lo: this.users.get(n).lo, team: players.length, name: n }); }
    else {
      const groups = [...pack].sort((a, b) => b.names.length - a.names.length);
      for (const g of groups) { const t = tc[0] < tc[1] ? 0 : tc[1] < tc[0] ? 1 : Math.floor(Math.random() * 2); const tt = tc[t] + g.names.length > m.per ? 1 - t : t; tc[tt] += g.names.length; for (const n of g.names) players.push({ lo: this.users.get(n).lo, team: tt, name: n }); }
    }
    const id = crypto.randomUUID().slice(0, 8), stub = this.env.MATCH.get(this.env.MATCH.idFromName(id));
    try { await stub.init({ id, mode, ranked, players: players.map(p => ({ lo: p.lo, team: p.team })) }); }
    catch (e) { for (const p of players) this.#send(p.name, { t: "qErr", error: "Das Match konnte nicht gestartet werden." }); return; }
    for (const p of players) this.#send(p.name, { t: "found", id, mode, team: p.team, ranked });
  }
}
