// Autoritative Spielsimulation für ein Match (läuft im Match-Durable-Object, ist aber reines JavaScript und lässt sich lokal testen).
import {
  TS, DT, TICK, PR, BASE_HP, W, AB, AB_VAL, MODES, MAPS, cloneMap, tileAt, walkBlock, shotBlock, moveCircle, rayBlocked, inGrass, currentDir,
  T_FLOOR, T_CRATE, CRATE_HP, weaponPower, abilityPower, calcPlayerStats, clampN, mulberry
} from "./shared.mjs";
import { botThink } from "./bots.js";

const PICK_R = 20;
const SPAWN_INV = 1.5;
const sp = ap => 1 + (ap - 1) * 0.5;   // sanfte Skalierung für Dauer und Tempo

export class Sim {
  constructor({ mode, ranked, slots, seed }) {
    this.mode = MODES[mode]; this.modeId = mode; this.ranked = !!ranked; this.rnd = mulberry(seed || 1);
    this.base = MAPS[this.mode.map]; this.M = cloneMap(this.base);
    this.t = 0; this.tick = 0; this.over = null; this.frozen = true; this.ev = []; this.sched = []; this.nid = 1;
    this.proj = []; this.pick = []; this.puddles = []; this.crateEv = [];
    this.players = []; this.place = 0;
    slots.forEach((s, i) => this.players.push(this.#mkPlayer(i, s)));
    this.timeLeft = this.mode.time;
    this.#initMode(); this.#placeAll(true);
  }

  /* ---------- Aufbau ---------- */
  #mkPlayer(id, s) {
    const lo = s.lo, w = W[lo.w.id], st = calcPlayerStats(lo.lvl, lo.up || {}, lo.a && lo.a.id, lo.a && lo.a.lvl);
    const ab = lo.a ? AB[lo.a.id] : null;
    return {
      id, name: s.name, human: !!s.human, team: s.team, lo, w, wl: lo.w.lvl, a: ab ? ab.id : null, al: lo.a ? lo.a.lvl : 1, ak: ab ? ab.k : null,
      x: 0, y: 0, hp: st.hp, baseHp: st.hp, maxHp: st.hp, spd: st.spd, rlMul: st.reload,
      alive: true, ammo: w.ammo, sc: 0, abCd: 0, mx: 0, my: 0, face: 0, fireCd: 0, kbx: 0, kby: 0, dash: null,
      fx: { slow: 0, slowT: 0, spd: 0, spdMul: 0, shield: 0, shieldRed: 0, stun: 0, root: 0, invis: 0, inv: 0, heal: 0, healRate: 0 },
      kills: 0, dmg: 0, deaths: 0, respawn: 0, lastHurt: 99, reveal: 0, cubes: 0, perlen: 0, revived: false, seq: 0, conn: true, place: 0,
      burstUntil: 0, vx: 0, vy: 0, ai: s.human ? null : { t: 0, tgt: -1, path: null, pt: 0, strafe: 1, st: 0, lastHp: st.hp, goal: null }, spawnIdx: s.spawnIdx || 0
    };
  }
  #initMode() {
    const m = this.mode, M = this.M; this.ms = {};
    if (this.modeId === "showdown") {
      const R0 = Math.hypot(M.px, M.py) / 2, cx = M.px / 2 + (this.rnd() - .5) * 6 * TS, cy = M.py / 2 + (this.rnd() - .5) * 6 * TS;
      this.ms = { zx: cx, zy: cy, zr: R0, r0: R0, rEnd: 3 * TS, begin: 25, end: m.time - 25 };
    } else if (this.modeId === "perlen") { this.ms = { sc: [0, 0], cd: null, nextGem: 3, win: -1 };
    } else if (this.modeId === "knockout") { this.ms = { rd: [0, 0], round: 1, st: "play", pause: 0, roundT: m.time };
    } else if (this.modeId === "koenig") { this.ms = { zi: 0, zt: 25, sc: [0, 0], order: [] }; this.ms.zi = M.kings.findIndex(k => Math.abs(k[0] - M.px / 2) < 1 && Math.abs(k[1] - M.py / 2) < 1); if (this.ms.zi < 0) this.ms.zi = 0;
    } else if (this.modeId === "heist") { this.ms = { bk: [{ hp: m.bucketHp, max: m.bucketHp }, { hp: m.bucketHp, max: m.bucketHp }] };
    } else if (this.modeId === "eroberung") { this.ms = { pts: M.caps.map(() => ({ prog: 0, owner: -1 })), sc: [0, 0] }; }
  }
  #placeAll(first) {
    const M = this.M;
    if (this.mode.ffa) {
      const spots = [...M.ffa]; for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(this.rnd() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
      this.players.forEach((p, i) => { const s = spots[i % spots.length]; p.x = s[0]; p.y = s[1]; });
    } else {
      const cnt = [0, 0];
      this.players.forEach(p => { const sl = M.spawns[p.team], s = sl[cnt[p.team]++ % sl.length]; p.spawnIdx = cnt[p.team] - 1; p.x = s[0]; p.y = s[1]; p.face = p.team === 0 ? 0 : Math.PI; });
    }
  }
  start() { this.frozen = false; this.ev.push({ e: "m", t: "Los!" }); }

  /* ---------- Eingaben ---------- */
  input(id, m) {
    const p = this.players[id]; if (!p || !p.alive) return;
    const l = Math.hypot(m.mx, m.my) || 1, k = Math.min(1, l);
    p.mx = (m.mx / l) * k || 0; p.my = (m.my / l) * k || 0; if (m.s > p.seq) p.seq = m.s;
    if (m.ax || m.ay) p.face = Math.atan2(m.ay, m.ax);
  }
  fire(id, ax, ay, d) { const p = this.players[id]; if (!p || !p.alive || this.frozen || p.fx.stun > 0) return; this.#fire(p, ax, ay, d); }
  superFire(id, ax, ay, d) { const p = this.players[id]; if (!p || !p.alive || this.frozen || p.fx.stun > 0) return; this.#super(p, ax, ay, d); }
  ability(id, ax, ay) { const p = this.players[id]; if (!p || !p.alive || this.frozen || p.fx.stun > 0) return; this.#useAbility(p, ax, ay); }
  emote(id, n) { const p = this.players[id]; if (p && n >= 0 && n < 8) this.ev.push({ e: "e", id, n }); }

  /* ---------- Hilfen ---------- */
  #enemies(p) { return this.players.filter(q => q.alive && q.id !== p.id && (this.mode.ffa || q.team !== p.team)); }
  #weaponOf(p, sup) {
    const b = Object.assign({}, p.w); let dmg = p.w.dmg * weaponPower(p.wl), rng = p.w.rng;
    if (p.a === "druck") { const ap = abilityPower(p.al), v = AB_VAL.druck; dmg *= 1 + v.dmg * ap; rng *= 1 + v.rng * ap; }
    b.dmg = dmg; b.rng = rng;
    if (sup && sup.k === "s") { for (const k in (sup.mul || {})) b[k === "n1" ? "n1" : k] = (b[k] || 1) * sup.mul[k]; for (const k in (sup.set || {})) b[k] = sup.set[k]; b.n1 = Math.max(1, Math.round(b.n1)); }
    return b;
  }
  #dirOf(p, ax, ay) { let a = Math.atan2(ay, ax); if (!(ax || ay)) a = p.face; return a; }

  /* ---------- Schießen ---------- */
  #fire(p, ax, ay, d) {
    if (p.ammo < 1 || p.fireCd > 0) return;
    p.ammo -= 1; p.fireCd = 0.22; p.face = this.#dirOf(p, ax, ay); this.#breakInvis(p);
    const w = this.#weaponOf(p, null); this.#volley(p, w, p.face, d, false);
  }
  #super(p, ax, ay, d) {
    const sup = p.w.sup; if (!sup || p.sc < 1) return; p.sc = 0; p.face = this.#dirOf(p, ax, ay); this.#breakInvis(p);
    if (sup.k === "s") { this.#volley(p, this.#weaponOf(p, sup), p.face, d, true); }
    else { this.#rain(p, sup, p.face, d); }
    this.ev.push({ e: "su", id: p.id });
  }
  #breakInvis(p) { if (p.fx.invis > 0) p.fx.invis = 0; p.reveal = 1.2; }
  #volley(p, w, ang, d, isSup) {
    const n = w.n1, bd = w.bd || 0, spr = (w.spr || 0) * Math.PI / 180, total = n * bd;
    this.ev.push({ e: "f", id: p.id, a: Math.round(ang * 100) / 100, w: p.w.id, s: isSup ? 1 : 0 });
    if (w.selfSlow && total > 0) p.burstUntil = this.t + total + 0.2;
    for (let i = 0; i < n; i++) {
      let a = ang;
      if (n > 1) { if (bd > 0) a += (this.rnd() - .5) * spr; else a += (i / (n - 1) - .5) * spr; }
      const at = this.t + i * bd;
      if (at <= this.t) this.#shot(p, w, a, d); else this.sched.push({ at, p, w, a, d, k: "shot" });
    }
  }
  #shot(p, w, a, d) {
    const dx = Math.cos(a), dy = Math.sin(a), ox = p.x + dx * 16, oy = p.y + dy * 16;
    if (w.t === "l") {
      const dist = clampN(d == null ? 0.75 : d, 0.25, 1) * w.rng * TS, tx = p.x + dx * dist, ty = p.y + dy * dist, fl = Math.max(0.4, dist / 380);
      this.proj.push({ id: this.nid++, owner: p.id, team: p.team, kind: 1, x: ox, y: oy, sx: ox, sy: oy, tx, ty, t: 0, fl, dmg: w.dmg, aoe: (w.aoe || 1.5) * TS, rad: 8, slow: w.slow || 0, root: w.root || 0, kb: w.kb || 0, dead: false });
      return;
    }
    const spd = w.spd, b = { id: this.nid++, owner: p.id, team: p.team, kind: w.t === "w" ? 2 : 0, x: ox, y: oy, vx: dx * spd, vy: dy * spd, dist: 0, max: w.rng * TS, dmg: w.dmg, rad: w.rad || 5, pierce: w.pierce || 0, hit: new Set(), aoe: w.aoe ? w.aoe * TS : 0, slow: w.slow || 0, root: w.root || 0, kb: w.kb || 0, bounce: w.bounce || 0, dead: false };
    // Start in einer Wand? Dann sofort treffen
    this.proj.push(b);
  }
  #rain(p, sup, ang, d) {
    const w = this.#weaponOf(p, null), dist = clampN(d == null ? 0.8 : d, 0.3, 1) * w.rng * TS * (sup.area ? 1 : 1), tx = p.x + Math.cos(ang) * dist, ty = p.y + Math.sin(ang) * dist;
    this.ev.push({ e: "f", id: p.id, a: Math.round(ang * 100) / 100, w: p.w.id, s: 1 });
    const mul = weaponPower(p.wl) * (p.a === "druck" ? 1 + AB_VAL.druck.dmg * abilityPower(p.al) : 1);
    for (let i = 0; i < sup.cnt; i++) {
      const r = sup.area * TS * Math.sqrt(this.rnd()), a = this.rnd() * 6.283, px = tx + Math.cos(a) * r, py = ty + Math.sin(a) * r;
      const spec = { at: this.t + i * 0.12, p, k: "lob", tx: px, ty: py, dmg: sup.dmg * mul, aoe: sup.aoe * TS, root: sup.root || 0, slow: 0 };
      if (i === 0) this.#lobAt(spec); else this.sched.push(spec);
    }
  }
  #lobAt(s) {
    const p = s.p, ox = p.x, oy = p.y, dist = Math.hypot(s.tx - ox, s.ty - oy), fl = Math.max(0.45, dist / 420);
    this.proj.push({ id: this.nid++, owner: p.id, team: p.team, kind: 1, x: ox, y: oy, sx: ox, sy: oy, tx: s.tx, ty: s.ty, t: 0, fl, dmg: s.dmg, aoe: s.aoe, rad: 8, slow: s.slow || 0, root: s.root || 0, kb: 0, dead: false, rainy: 1 });
  }

  /* ---------- Schaden ---------- */
  #hurt(t, amount, src, o) {
    if (!t.alive || amount <= 0) return 0; o = o || {};
    if (t.fx.inv > 0) return 0;
    if (t.fx.shield > 0) amount *= 1 - t.fx.shieldRed;
    if (t.a === "eisenhaut") amount *= 1 - Math.min(0.5, AB_VAL.eisenhaut.red * abilityPower(t.al));
    if (src) {
      if (src.a === "adrenalin" && src.hp < src.maxHp * AB_VAL.adrenalin.below) amount *= 1 + AB_VAL.adrenalin.dmg * abilityPower(src.al);
      if (src.cubes) amount *= 1 + 0.1 * src.cubes;
    }
    amount = Math.min(amount, t.hp); if (amount <= 0) return 0;
    t.hp -= amount; t.lastHurt = 0; t.reveal = Math.max(t.reveal, 0.6);
    if (t.fx.invis > 0 && !o.noBreak) t.fx.invis = 0;
    if (src && src !== t) {
      src.dmg += amount; const gain = amount * (src.a === "schwamm" ? 1 + AB_VAL.schwamm.sup * abilityPower(src.al) : 1);
      const need = src.w.sup ? src.w.sup.need : 1800; src.sc = Math.min(1, src.sc + gain / need);
      if (src.a === "raub") src.hp = Math.min(src.maxHp, src.hp + amount * AB_VAL.raub.frac * abilityPower(src.al));
    }
    this.ev.push({ e: "h", v: t.id, a: Math.round(amount), x: Math.round(t.x), y: Math.round(t.y), s: src ? src.id : -1 });
    if (t.hp <= 0) this.#die(t, src);
    return amount;
  }
  #die(t, src) {
    if (t.a === "wiedergeburt" && !t.revived) {
      t.revived = true; t.hp = t.maxHp * Math.min(0.9, AB_VAL.wiedergeburt.hp * sp(abilityPower(t.al))); t.fx.inv = 1.5; this.ev.push({ e: "rv", id: t.id }); return;
    }
    t.alive = false; t.deaths++; t.mx = t.my = 0; t.dash = null; t.fx.invis = 0;
    if (src && src !== t && (this.mode.ffa || src.team !== t.team)) src.kills++;
    this.ev.push({ e: "k", k: src ? src.id : -1, v: t.id, x: Math.round(t.x), y: Math.round(t.y) });
    this.sched = this.sched.filter(s => s.p !== t);
    if (this.modeId === "perlen" && t.perlen > 0) { for (let i = 0; i < t.perlen; i++) this.#dropPick("p", t.x, t.y, 30); t.perlen = 0; }
    if (this.modeId === "showdown") {
      const n = t.cubes + 1; for (let i = 0; i < Math.min(n, 6); i++) this.#dropPick("c", t.x, t.y, 30); t.cubes = 0;
      t.place = this.players.filter(q => q.alive).length + 1;
    }
    if (this.modeId === "perlen" || this.modeId === "koenig" || this.modeId === "heist" || this.modeId === "eroberung") t.respawn = 3;
  }
  #dropPick(k, x, y, spread) {
    const a = this.rnd() * 6.283, r = this.rnd() * spread, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    const q = { x, y }; moveCircle(this.M, q, px - x, py - y, 6);
    this.pick.push({ id: this.nid++, k, x: q.x, y: q.y, age: 0 });
  }
  #hitCrate(i, dmg) {
    const M = this.M; if (!M.crate.has(i)) return;
    const hp = M.crate.get(i) - dmg;
    if (hp <= 0) {
      M.crate.delete(i); M.tiles[i] = T_FLOOR; this.crateEv.push(i); this.ev.push({ e: "c", i });
      const x = (i % M.w + .5) * TS, y = (Math.floor(i / M.w) + .5) * TS;
      if (this.modeId === "showdown" && this.rnd() < 0.75) this.pick.push({ id: this.nid++, k: "c", x, y, age: 0 });
    } else M.crate.set(i, hp);
  }
  #explode(b, x, y) {
    const r = b.aoe, owner = this.players[b.owner]; if (!owner) return;
    this.ev.push({ e: "x", x: Math.round(x), y: Math.round(y), r: Math.round(r), k: b.kb || b.slow ? 1 : 0, ic: b.root ? 1 : 0 });
    for (const q of this.#enemies(owner)) {
      const d = Math.hypot(q.x - x, q.y - y); if (d > r + PR) continue;
      const fall = 1 - 0.35 * clampN(d / (r + PR), 0, 1);
      const dealt = this.#hurt(q, b.dmg * fall, owner);
      if (dealt > 0) this.#effects(q, b, x, y);
    }
    this.#bucketAoe(owner, x, y, r, b.dmg);
    const tx0 = Math.floor((x - r) / TS), tx1 = Math.floor((x + r) / TS), ty0 = Math.floor((y - r) / TS), ty1 = Math.floor((y + r) / TS);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) { if (tx < 0 || ty < 0 || tx >= this.M.w || ty >= this.M.h) continue; const i = ty * this.M.w + tx; if (this.M.crate.has(i) && Math.hypot((tx + .5) * TS - x, (ty + .5) * TS - y) <= r) this.#hitCrate(i, b.dmg * 0.8); }
  }
  #effects(q, b, x, y) {
    if (b.slow) { q.fx.slow = Math.max(q.fx.slow, b.slow); q.fx.slowT = Math.max(q.fx.slowT, 2); }
    if (b.root) q.fx.root = Math.max(q.fx.root, b.root);
    if (b.kb) { const a = Math.atan2(q.y - y, q.x - x); q.kbx += Math.cos(a) * b.kb * 3; q.kby += Math.sin(a) * b.kb * 3; }
  }
  #bucketAoe(owner, x, y, r, dmg) {
    if (this.modeId !== "heist") return; const tb = 1 - owner.team, bk = this.M.buckets[tb];
    if (bk && Math.hypot(bk[0] - x, bk[1] - y) <= r + 22) { this.ms.bk[tb].hp = Math.max(0, this.ms.bk[tb].hp - dmg); owner.dmg += dmg; owner.sc = Math.min(1, owner.sc + dmg / (owner.w.sup ? owner.w.sup.need : 1800)); this.ev.push({ e: "bh", t: tb, a: Math.round(dmg) }); }
  }

  /* ---------- Fähigkeiten ---------- */
  #useAbility(p, ax, ay) {
    if (!p.a || p.ak !== "a" || p.abCd > 0) return;
    const ab = AB[p.a], v = AB_VAL[p.a], ap = abilityPower(p.al), s2 = sp(ap), ang = this.#dirOf(p, ax || p.mx, ay || p.my);
    const dir = (ax || ay) ? [Math.cos(ang), Math.sin(ang)] : (p.mx || p.my) ? [p.mx / (Math.hypot(p.mx, p.my) || 1), p.my / (Math.hypot(p.mx, p.my) || 1)] : [Math.cos(p.face), Math.sin(p.face)];
    p.abCd = ab.cd; const f = p.fx;
    switch (p.a) {
      case "sprint": f.spd = v.dur * s2; f.spdMul = v.mul * s2; break;
      case "blase": f.shield = v.dur * s2; f.shieldRed = Math.min(0.85, v.red * s2); break;
      case "heilregen": {
        for (const q of this.players) if (q.alive && (q.id === p.id || (!this.mode.ffa && q.team === p.team)) && Math.hypot(q.x - p.x, q.y - p.y) <= v.rad * TS) { q.fx.heal = v.dur; q.fx.healRate = v.heal * ap * q.maxHp / v.dur; }
        this.ev.push({ e: "x", x: Math.round(p.x), y: Math.round(p.y), r: v.rad * TS, k: 2, ic: 0 }); break;
      }
      case "pfuetze": this.puddles.push({ id: this.nid++, team: p.team, owner: p.id, x: p.x, y: p.y, r: v.rad * TS, t: v.dur * s2, slow: v.slow, dps: v.dps * ap }); break;
      case "hecht": p.dash = { dx: dir[0], dy: dir[1], t: 0.18, sp: (v.dist * s2 * TS) / 0.18 }; f.inv = Math.max(f.inv, 0.22); break;
      case "welle": {
        this.ev.push({ e: "x", x: Math.round(p.x), y: Math.round(p.y), r: v.rad * TS, k: 1, ic: 0 });
        for (const q of this.#enemies(p)) { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d > v.rad * TS + PR) continue; if (this.#hurt(q, v.dmg * ap, p) > 0) { const a = Math.atan2(q.y - p.y, q.x - p.x); q.kbx += Math.cos(a) * v.kb * s2; q.kby += Math.sin(a) * v.kb * s2; q.fx.stun = Math.max(q.fx.stun, v.stun * s2); } }
        break;
      }
      case "platscher": {
        const q = { x: p.x, y: p.y }, dist = v.dist * s2 * TS, steps = Math.ceil(dist / 8);
        for (let i = 0; i < steps; i++) { const nx = q.x + dir[0] * dist / steps, ny = q.y + dir[1] * dist / steps; if (walkBlock(tileAt(this.M, nx, ny))) break; q.x = nx; q.y = ny; }
        this.ev.push({ e: "x", x: Math.round(p.x), y: Math.round(p.y), r: 40, k: 3, ic: 0 }); p.x = q.x; p.y = q.y; pushOutSafe(this.M, p);
        this.ev.push({ e: "x", x: Math.round(p.x), y: Math.round(p.y), r: 40, k: 3, ic: 0 }); break;
      }
      case "nebel": f.invis = v.dur * s2; break;
      case "sturmflut": {
        this.ev.push({ e: "x", x: Math.round(p.x), y: Math.round(p.y), r: v.rad * TS, k: 4, ic: 0 });
        for (const q of this.#enemies(p)) { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d > v.rad * TS + PR) continue; if (this.#hurt(q, v.dmg * ap, p) > 0) { const a = Math.atan2(q.y - p.y, q.x - p.x); q.kbx += Math.cos(a) * v.kb * s2; q.kby += Math.sin(a) * v.kb * s2; } }
        p.hp = Math.min(p.maxHp, p.hp + p.maxHp * v.heal * s2); break;
      }
    }
    this.ev.push({ e: "a", id: p.id, ab: p.a });
  }

  /* ---------- Hauptschritt ---------- */
  step() {
    this.tick++;
    if (this.over) return;
    if (this.frozen) return;
    this.t += DT;
    for (const p of this.players) if (p.ai) botThink(this, p, DT);
    this.#runSched();
    for (const p of this.players) this.#stepPlayer(p);
    this.#separate();
    this.#stepProj();
    this.#stepPuddles();
    this.#stepPicks();
    this.#stepMode();
  }
  #runSched() {
    if (!this.sched.length) return;
    const keep = [];
    for (const s of this.sched) {
      if (s.at > this.t) { keep.push(s); continue; }
      if (!s.p.alive) continue;
      if (s.k === "shot") this.#shot(s.p, s.w, s.a, s.d); else if (s.k === "lob") this.#lobAt(s);
    }
    this.sched = keep;
  }
  #stepPlayer(p) {
    const f = p.fx;
    if (!p.alive) { if (p.respawn > 0) { p.respawn -= DT; if (p.respawn <= 0) this.#respawn(p); } return; }
    p.lastHurt += DT; p.reveal = Math.max(0, p.reveal - DT); p.fireCd = Math.max(0, p.fireCd - DT);
    for (const k of ["spd", "shield", "stun", "root", "invis", "inv", "heal", "slowT"]) if (f[k] > 0) f[k] = Math.max(0, f[k] - DT);
    if (f.slowT <= 0) f.slow = 0;
    if (p.abCd > 0) p.abCd = Math.max(0, p.abCd - DT);
    if (p.ammo < p.w.ammo) p.ammo = Math.min(p.w.ammo, p.ammo + DT * p.rlMul / p.w.rl);
    if (f.heal > 0) p.hp = Math.min(p.maxHp, p.hp + f.healRate * DT);
    if (p.a === "regen" && p.lastHurt >= AB_VAL.regen.wait) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * AB_VAL.regen.rate * abilityPower(p.al) * DT);
    // Bewegung
    let sx = 0, sy = 0, speed = p.spd;
    if (f.spd > 0) speed *= 1 + f.spdMul;
    if (f.slow > 0) speed *= 1 - f.slow;
    if (p.burstUntil > this.t && p.w.selfSlow) speed *= 1 - p.w.selfSlow;
    if (p.dash) {
      const d = p.dash, step = Math.min(DT, d.t); moveCircle(this.M, p, d.dx * d.sp * step, d.dy * d.sp * step, PR); d.t -= DT; if (d.t <= 0) p.dash = null;
    } else if (f.stun <= 0 && f.root <= 0 && !this.#paused()) { sx = p.mx * speed; sy = p.my * speed; }
    if (!p.dash) {
      let ex = 0, ey = 0; const cur = currentDir(tileAt(this.M, p.x, p.y)); if (cur) { ex = cur[0] * 70; ey = cur[1] * 70; }
      p.vx = sx; p.vy = sy;
      moveCircle(this.M, p, (sx + ex + p.kbx) * DT, (sy + ey + p.kby) * DT, PR);
      const dec = Math.pow(0.82, DT * 30); p.kbx *= dec; p.kby *= dec; if (Math.abs(p.kbx) < 3) p.kbx = 0; if (Math.abs(p.kby) < 3) p.kby = 0;
      if ((sx || sy) && !(p.ai && p.ai.aimLock)) { /* Blickrichtung folgt der Bewegung nur ohne Zielen */ }
    }
  }
  #paused() { return this.modeId === "knockout" && this.ms.st !== "play"; }
  #respawn(p) {
    const sl = this.M.spawns[p.team], s = sl[p.spawnIdx % sl.length];
    p.alive = true; p.hp = p.maxHp; p.x = s[0]; p.y = s[1]; p.ammo = p.w.ammo; p.fx.inv = SPAWN_INV; p.lastHurt = 99; p.sc = Math.min(p.sc, 0.5);
    this.ev.push({ e: "sp", id: p.id, x: s[0], y: s[1] });
  }
  #separate() {
    const ps = this.players;
    for (let i = 0; i < ps.length; i++) { const a = ps[i]; if (!a.alive) continue;
      for (let j = i + 1; j < ps.length; j++) { const b = ps[j]; if (!b.alive) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = PR * 1.6;
        if (d < min && d > 0.01) { const k = (min - d) / 2 / d; moveCircle(this.M, a, -dx * k, -dy * k, PR); moveCircle(this.M, b, dx * k, dy * k, PR); } } }
  }
  #stepProj() {
    const M = this.M, out = [];
    for (const b of this.proj) {
      const owner = this.players[b.owner];
      if (b.kind === 1) {   // Wurf
        b.t += DT; const k = Math.min(1, b.t / b.fl); b.x = b.sx + (b.tx - b.sx) * k; b.y = b.sy + (b.ty - b.sy) * k;
        if (k >= 1) { this.#explode(b, b.tx, b.ty); b.dead = true; }
      } else {
        const sx = b.vx * DT, sy = b.vy * DT, steps = Math.max(1, Math.ceil(Math.hypot(sx, sy) / 10));
        for (let i = 0; i < steps && !b.dead; i++) {
          b.x += sx / steps; b.y += sy / steps; b.dist += Math.hypot(sx, sy) / steps;
          const t = tileAt(M, b.x, b.y);
          if (shotBlock(t)) {
            const ti = Math.floor(b.y / TS) * M.w + Math.floor(b.x / TS);
            if (t === T_CRATE) this.#hitCrate(ti, b.dmg);
            if (b.bounce > 0) {   // abprallen
              const px = b.x - sx / steps, py = b.y - sy / steps, hx = shotBlock(tileAt(M, b.x, py)), hy = shotBlock(tileAt(M, px, b.y));
              if (hx || !hy) b.vx = -b.vx; if (hy || !hx) b.vy = -b.vy; b.x = px; b.y = py; b.bounce--; continue;
            }
            if (b.aoe) this.#explode(b, b.x - sx / steps, b.y - sy / steps);
            if (!(b.pierce < 0 && t === T_CRATE && !M.crate.has(ti))) { b.dead = true; break; }
          }
          if (this.#projHits(b, owner)) { b.dead = true; break; }
          if (b.dist >= b.max) { if (b.aoe) this.#explode(b, b.x, b.y); b.dead = true; break; }
        }
      }
      if (!b.dead) out.push(b);
    }
    this.proj = out;
  }
  #projHits(b, owner) {
    if (!owner) return true;
    for (const q of this.players) {
      if (!q.alive || q.id === b.owner || (!this.mode.ffa && q.team === b.team) || b.hit.has(q.id)) continue;
      if (Math.hypot(q.x - b.x, q.y - b.y) > PR + b.rad) continue;
      if (q.fx.inv > 0) continue;
      b.hit.add(q.id);
      const dealt = this.#hurt(q, b.dmg, owner);
      if (dealt > 0) { this.#effects(q, b, b.x - b.vx * 0.1, b.y - b.vy * 0.1); if (b.kb) { const l = Math.hypot(b.vx, b.vy) || 1; q.kbx += b.vx / l * b.kb * 3; q.kby += b.vy / l * b.kb * 3; q.kbx -= 0; } }
      if (b.aoe) { this.#explode(b, b.x, b.y); return true; }
      if (b.pierce === 0) return true; if (b.pierce > 0) b.pierce--;
    }
    if (this.modeId === "heist") {
      const tb = 1 - b.team, bk = this.M.buckets[tb];
      if (bk && !b.hit.has("b") && Math.hypot(bk[0] - b.x, bk[1] - b.y) <= 24 + b.rad) {
        b.hit.add("b"); const a = Math.min(b.dmg, this.ms.bk[tb].hp); this.ms.bk[tb].hp -= a; owner.dmg += a;
        owner.sc = Math.min(1, owner.sc + a / (owner.w.sup ? owner.w.sup.need : 1800)); this.ev.push({ e: "bh", t: tb, a: Math.round(a) });
        if (b.aoe) this.#explode(b, b.x, b.y); if (b.pierce === 0) return true; if (b.pierce > 0) b.pierce--;
      }
    }
    return false;
  }
  #stepPuddles() {
    this.puddles = this.puddles.filter(pd => {
      pd.t -= DT; if (pd.t <= 0) return false; const owner = this.players[pd.owner];
      for (const q of this.players) if (q.alive && (this.mode.ffa ? q.id !== pd.owner : q.team !== pd.team) && Math.hypot(q.x - pd.x, q.y - pd.y) <= pd.r) {
        q.fx.slow = Math.max(q.fx.slow, pd.slow); q.fx.slowT = Math.max(q.fx.slowT, 0.3); this.#hurt(q, pd.dps * DT, owner, { noBreak: true });
      }
      return true;
    });
  }
  #stepPicks() {
    const keep = [];
    for (const k of this.pick) {
      k.age += DT; let taken = false;
      for (const p of this.players) {
        if (!p.alive || Math.hypot(p.x - k.x, p.y - k.y) > PICK_R) continue;
        if (k.k === "c") { p.cubes = Math.min(8, p.cubes + 1); p.maxHp = Math.round(p.baseHp * (1 + 0.1 * p.cubes)); p.hp = Math.min(p.maxHp, p.hp + p.baseHp * 0.1); }
        else if (k.k === "p") { if (k.age < 0.6) continue; p.perlen++; }
        this.ev.push({ e: "p", id: p.id, k: k.k }); taken = true; break;
      }
      if (!taken) keep.push(k);
    }
    this.pick = keep;
  }

  /* ---------- Spielmodi ---------- */
  #alive(team) { return this.players.filter(p => p.alive && p.team === team); }
  #teamsAlive() { return [0, 1].filter(t => this.#alive(t).length > 0); }
  #finish(win, reason) { if (this.over) return; this.over = { win, reason, t: this.t }; this.ev.push({ e: "end", win }); }
  #stepMode() {
    const id = this.modeId, ms = this.ms, M = this.M; this.timeLeft = Math.max(0, this.mode.time - this.t);
    if (id === "showdown") {
      if (this.t > ms.begin) { const k = clampN((this.t - ms.begin) / (ms.end - ms.begin), 0, 1); ms.zr = ms.r0 + (ms.rEnd - ms.r0) * k; }
      for (const p of this.players) if (p.alive && Math.hypot(p.x - ms.zx, p.y - ms.zy) > ms.zr) this.#hurt(p, 80 * DT, null, { noBreak: true });
      const alive = this.players.filter(p => p.alive);
      if (alive.length <= 1) { if (alive[0]) alive[0].place = 1; this.#finish(alive[0] ? alive[0].id : -1, "last"); }
      else if (this.timeLeft <= 0) { alive.sort((a, b) => b.hp - a.hp); alive.forEach((p, i) => p.place = i + 1); this.#finish(alive[0].id, "time"); }
    } else if (id === "perlen") {
      ms.nextGem -= DT;
      if (ms.nextGem <= 0) { ms.nextGem = 5; if (this.pick.filter(k => k.k === "p").length < 14 && M.mine) this.#dropPick("p", M.mine[0], M.mine[1], 36); }
      ms.sc = [0, 1].map(t => this.players.filter(p => p.team === t).reduce((a, p) => a + p.perlen, 0));
      const lead = ms.sc[0] >= this.mode.need ? 0 : ms.sc[1] >= this.mode.need ? 1 : -1;
      if (lead >= 0 && !(ms.sc[0] >= this.mode.need && ms.sc[1] >= this.mode.need)) { if (!ms.cd || ms.cd.t !== lead) { ms.cd = { t: lead, left: this.mode.hold }; this.ev.push({ e: "m", t: (lead === 0 ? "Team 1" : "Team 2") + " hat " + this.mode.need + " Perlen!" }); } else { ms.cd.left -= DT; if (ms.cd.left <= 0) this.#finish(lead, "perlen"); } }
      else ms.cd = null;
      if (this.timeLeft <= 0 && !this.over) this.#finish(ms.sc[0] > ms.sc[1] ? 0 : ms.sc[1] > ms.sc[0] ? 1 : -1, "time");
    } else if (id === "knockout") {
      if (ms.st === "pause") { ms.pause -= DT; if (ms.pause <= 0) this.#nextRound(); return; }
      ms.roundT -= DT; const al = this.#teamsAlive();
      if (al.length < 2 || ms.roundT <= 0) {
        let w = al.length === 1 ? al[0] : -1;
        if (w < 0) { const hp = [0, 1].map(t => this.players.filter(p => p.team === t && p.alive).reduce((a, p) => a + p.hp / p.maxHp, 0)); w = hp[0] > hp[1] ? 0 : hp[1] > hp[0] ? 1 : -1; }
        if (w >= 0) ms.rd[w]++;
        this.ev.push({ e: "m", t: w < 0 ? "Unentschieden" : (w === 0 ? "Team 1" : "Team 2") + " gewinnt die Runde" });
        if (ms.rd[0] >= this.mode.rounds || ms.rd[1] >= this.mode.rounds) this.#finish(ms.rd[0] > ms.rd[1] ? 0 : 1, "rounds");
        else if (ms.round >= 5) this.#finish(ms.rd[0] > ms.rd[1] ? 0 : ms.rd[1] > ms.rd[0] ? 1 : -1, "rounds");
        else { ms.st = "pause"; ms.pause = 3; }
      }
    } else if (id === "koenig") {
      ms.zt -= DT; if (ms.zt <= 0) { ms.zt = 25; let n; do { n = Math.floor(this.rnd() * M.kings.length); } while (n === ms.zi && M.kings.length > 1); ms.zi = n; this.ev.push({ e: "m", t: "Das Becken zieht um!" }); }
      const z = M.kings[ms.zi], r = 2.6 * TS, inside = [0, 1].map(t => this.players.filter(p => p.alive && p.team === t && Math.hypot(p.x - z[0], p.y - z[1]) <= r).length);
      ms.in = inside; if (inside[0] > 0 && inside[1] === 0) ms.sc[0] += 3 * DT; else if (inside[1] > 0 && inside[0] === 0) ms.sc[1] += 3 * DT;
      if (ms.sc[0] >= this.mode.goal || ms.sc[1] >= this.mode.goal) this.#finish(ms.sc[0] >= this.mode.goal ? 0 : 1, "goal");
      else if (this.timeLeft <= 0) this.#finish(ms.sc[0] > ms.sc[1] ? 0 : ms.sc[1] > ms.sc[0] ? 1 : -1, "time");
    } else if (id === "heist") {
      for (const t of [0, 1]) if (ms.bk[t].hp <= 0) { this.#finish(1 - t, "bucket"); }
      if (!this.over && this.timeLeft <= 0) { const a = ms.bk[0].hp / ms.bk[0].max, b = ms.bk[1].hp / ms.bk[1].max; this.#finish(a > b ? 0 : b > a ? 1 : -1, "time"); }
    } else if (id === "eroberung") {
      ms.pts.forEach((pt, i) => {
        const c = M.caps[i], cnt = [0, 1].map(t => this.players.filter(p => p.alive && p.team === t && Math.hypot(p.x - c[0], p.y - c[1]) <= 2.4 * TS).length);
        if (cnt[0] > 0 && cnt[1] === 0) pt.prog = Math.max(-1, pt.prog - 0.22 * Math.min(2, cnt[0]) * DT); else if (cnt[1] > 0 && cnt[0] === 0) pt.prog = Math.min(1, pt.prog + 0.22 * Math.min(2, cnt[1]) * DT);
        if (pt.prog <= -1) pt.owner = 0; else if (pt.prog >= 1) pt.owner = 1;
        else if ((pt.owner === 0 && pt.prog > -0.2) || (pt.owner === 1 && pt.prog < 0.2)) pt.owner = -1;
        if (pt.owner >= 0) ms.sc[pt.owner] += 1 * DT;
      });
      if (ms.sc[0] >= this.mode.goal || ms.sc[1] >= this.mode.goal) this.#finish(ms.sc[0] >= this.mode.goal ? 0 : 1, "goal");
      else if (this.timeLeft <= 0) this.#finish(ms.sc[0] > ms.sc[1] ? 0 : ms.sc[1] > ms.sc[0] ? 1 : -1, "time");
    }
  }
  #nextRound() {
    const ms = this.ms; ms.round++; ms.st = "play"; ms.roundT = this.mode.time; this.M = cloneMap(this.base);
    this.proj = []; this.pick = []; this.puddles = []; this.sched = [];
    this.players.forEach(p => { p.alive = true; p.hp = p.maxHp; p.ammo = p.w.ammo; p.sc = 0; p.abCd = 0; p.revived = false; p.fx = { slow: 0, slowT: 0, spd: 0, spdMul: 0, shield: 0, shieldRed: 0, stun: 0, root: 0, invis: 0, inv: 0, heal: 0, healRate: 0 }; p.kbx = p.kby = 0; p.dash = null; });
    this.#placeAll(false); this.ev.push({ e: "m", t: "Runde " + ms.round }); this.ev.push({ e: "rs" });
    this.crateEv = []; this.resetCrates = true;
  }

  /* ---------- Ausgabe ---------- */
  initInfo(forId) {
    const M = this.M;
    return {
      t: "init", you: forId, mode: this.modeId, map: M.id, ranked: this.ranked, time: this.mode.time,
      players: this.players.map(p => ({ id: p.id, n: p.name, tm: p.team, h: p.human ? 1 : 0, w: p.w.id, wl: p.wl, a: p.a, al: p.al, c: p.lo.cos, lv: p.lo.lvl, mhp: p.maxHp }))
    };
  }
  #vis(me, q, spectator) {
    if (!q.alive) return false; if (q.id === me.id) return true;
    if (spectator) return true;
    if (!this.mode.ffa && q.team === me.team) return true;
    const d = Math.hypot(q.x - me.x, q.y - me.y);
    if (q.fx.invis > 0 && d > 2.2 * TS) return false;
    if (inGrass(this.M, q.x, q.y) && q.reveal <= 0 && d > 2.8 * TS) return false;
    return true;
  }
  snapshot(id) {
    const me = this.players[id], M = this.M, spec = !me.alive && me.respawn <= 0;
    const p = [];
    for (const q of this.players) if (q.id !== id && this.#vis(me, q, spec)) p.push([q.id, Math.round(q.x), Math.round(q.y), Math.round(q.face * 50), Math.round(q.hp), Math.round(q.maxHp), this.#flags(q), Math.round(q.vx), Math.round(q.vy)]);
    const b = this.proj.map(o => o.kind === 1 ? [o.id, 1, Math.round(o.x), Math.round(o.y), Math.round(o.tx), Math.round(o.ty), Math.round(o.fl * 100), o.team, Math.round(o.aoe)] : [o.id, o.kind, Math.round(o.x), Math.round(o.y), Math.round(o.vx), Math.round(o.vy), o.rad, o.team, o.bounce ? 1 : 0]);
    const s = {
      t: "s", k: this.tick, tl: Math.round(this.timeLeft * 10) / 10, a: me.seq,
      me: { x: Math.round(me.x * 10) / 10, y: Math.round(me.y * 10) / 10, hp: Math.round(me.hp), mhp: me.maxHp, am: Math.round(me.ammo * 100) / 100, sc: Math.round(me.sc * 1000) / 1000, ab: me.ak === "a" ? Math.round(me.abCd * 10) / 10 : -1, al: me.alive ? 1 : 0, rs: Math.round(me.respawn * 10) / 10, fl: this.#flags(me), pr: me.perlen, cu: me.cubes, sp: Math.round(this.#curSpeed(me)), sd: spec ? 1 : 0, kx: Math.round(me.kbx), ky: Math.round(me.kby) },
      p, b, o: this.pick.map(k => [k.id, k.k === "c" ? 0 : 1, Math.round(k.x), Math.round(k.y)]), pd: this.puddles.map(d => [d.id, Math.round(d.x), Math.round(d.y), Math.round(d.r), d.team, Math.round(d.t * 10)]),
      st: this.#modeView(), ev: this.ev
    };
    return s;
  }
  #curSpeed(p) { let s = p.spd; if (p.fx.spd > 0) s *= 1 + p.fx.spdMul; if (p.fx.slow > 0) s *= 1 - p.fx.slow; if (p.burstUntil > this.t && p.w.selfSlow) s *= 1 - p.w.selfSlow; if (p.fx.stun > 0 || p.fx.root > 0 || this.#paused()) s = 0; return s; }
  #flags(q) { const f = q.fx; return (q.alive ? 1 : 0) | (f.shield > 0 ? 2 : 0) | (f.slow > 0 ? 4 : 0) | (f.stun > 0 ? 8 : 0) | (f.inv > 0 ? 16 : 0) | (f.spd > 0 ? 32 : 0) | (f.invis > 0 ? 64 : 0) | (f.root > 0 ? 128 : 0) | (f.heal > 0 ? 256 : 0) | (q.dash ? 512 : 0); }
  #modeView() {
    const ms = this.ms, id = this.modeId;
    if (id === "showdown") return { z: [Math.round(ms.zx), Math.round(ms.zy), Math.round(ms.zr)], al: this.players.filter(p => p.alive).length };
    if (id === "perlen") return { sc: ms.sc.map(Math.round), cd: ms.cd ? [ms.cd.t, Math.ceil(ms.cd.left)] : null };
    if (id === "knockout") return { rd: ms.rd, rn: ms.round, ps: ms.st === "pause" ? 1 : 0, al: [0, 1].map(t => this.#alive(t).length) };
    if (id === "koenig") { const z = this.M.kings[ms.zi]; return { z: [z[0], z[1], Math.round(2.6 * TS)], sc: ms.sc.map(Math.round), zt: Math.ceil(ms.zt), in: ms.in || [0, 0] }; }
    if (id === "heist") return { bk: ms.bk.map(b => [Math.round(b.hp), b.max]) };
    if (id === "eroberung") return { pts: ms.pts.map(p => [Math.round(p.prog * 100) / 100, p.owner]), sc: ms.sc.map(Math.round) };
    return {};
  }
  clearEvents() { this.ev = []; this.crateEv = []; this.resetCrates = false; }
  /* Ergebnis für einen Spieler (für Belohnungen) */
  resultFor(p) {
    const o = this.over; if (!o) return null;
    const ffa = this.mode.ffa, won = ffa ? o.win === p.id : o.win === p.team;
    return { mode: this.modeId, ranked: this.ranked, won, placement: ffa ? (p.place || 5) : (won ? 1 : 2), kills: p.kills, dmg: p.dmg, draw: o.win === -1 };
  }
}

function pushOutSafe(M, p) { const q = { x: p.x, y: p.y }; moveCircle(M, q, 0, 0, PR); p.x = q.x; p.y = q.y; }
