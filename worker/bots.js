// Einfache, aber brauchbare Bots: Wegfindung auf dem Kachelraster, Zielen mit Vorhalt, Fähigkeiten und Modus-Ziele.
import { TS, PR, W, WEAPONS, ABILITIES, AB, COSMETICS, DEFAULT_COS, tileAt, walkBlock, shotBlock, rayBlocked, inGrass, T_CRATE, clampN } from "./shared.mjs";

const NAMES = ["Tropf", "Pfützi", "Plitsch", "Platsch", "Nässchen", "Spritzer", "Quelle", "Gischt", "Perle", "Nebelchen", "Wellchen", "Regina", "Bächle", "Sprudel", "Blubb", "Tröpfi", "Dampfer", "Fluttis", "Moorli", "Eistee"];
export function makeBotLoadout(rnd, avgLvl, idx) {
  const lvl = clampN(Math.round(avgLvl - 2 + (rnd() - .5) * 4), 1, 60);
  const pool = WEAPONS.filter(w => w.r <= (lvl > 25 ? 4 : lvl > 14 ? 3 : lvl > 7 ? 2 : 1));
  const w = pool[Math.floor(rnd() * pool.length)];
  const abPool = ABILITIES.filter(a => a.r <= (lvl > 25 ? 4 : lvl > 14 ? 3 : lvl > 7 ? 2 : 1)), ab = rnd() < 0.8 ? abPool[Math.floor(rnd() * abPool.length)] : null;
  const cos = { ...DEFAULT_COS };
  for (const slot of ["color", "hat", "face", "back", "trail"]) { const l = COSMETICS.filter(c => c.s === slot && c.r <= 2); if (rnd() < (slot === "color" ? 1 : 0.5)) cos[slot] = l[Math.floor(rnd() * l.length)].id; }
  return { name: NAMES[(idx * 7 + Math.floor(rnd() * 20)) % NAMES.length], lvl, w: { id: w.id, lvl: clampN(Math.ceil(lvl / 6), 1, 9) }, a: ab ? { id: ab.id, lvl: clampN(Math.ceil(lvl / 10), 1, 7) } : null, cos, up: { hp: 0, spd: 0, pump: 0 }, rp: 0 };
}

const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
/* Breitensuche: Liste von Kachelmitten vom Start bis zum Ziel (oder bis zur nächstliegenden erreichbaren Kachel) */
export function findPath(M, sx, sy, gx, gy) {
  const w = M.w, h = M.h, s = sy * w + sx, g = gy * w + gx, par = new Int32Array(w * h).fill(-2); par[s] = -1;
  const q = [s]; let qi = 0, best = s, bd = Math.hypot(sx - gx, sy - gy);
  while (qi < q.length) {
    const c = q[qi++]; if (c === g) { best = g; break; }
    const cx = c % w, cy = (c / w) | 0;
    for (const [dx, dy] of NB) {
      const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const n = ny * w + nx; if (par[n] !== -2) continue;
      if (walkBlock(M.tiles[n])) continue; if (dx && dy && (walkBlock(M.tiles[cy * w + nx]) || walkBlock(M.tiles[ny * w + cx]))) continue;
      par[n] = c; q.push(n); const d = Math.hypot(nx - gx, ny - gy); if (d < bd) { bd = d; best = n; }
    }
  }
  const out = []; for (let c = best; c !== -1 && c !== undefined; c = par[c]) out.push([(c % w + .5) * TS, ((c / w | 0) + .5) * TS]);
  return out.reverse();
}
const clearWalk = (M, x0, y0, x1, y1) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 8); for (let i = 1; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; for (const [ox, oy] of [[0, 0], [8, 0], [-8, 0], [0, 8], [0, -8]]) if (walkBlock(tileAt(M, x + ox, y + oy))) return false; } return true; };

export function botThink(sim, p, dt) {
  const ai = p.ai, M = sim.M;
  if (!p.alive) { p.mx = p.my = 0; return; }
  if (sim.frozen || (sim.modeId === "knockout" && sim.ms.st !== "play")) { p.mx = p.my = 0; return; }
  ai.t -= dt; ai.st -= dt; ai.pt -= dt;
  if (ai.t > 0) return;
  ai.t = 0.4 + sim.rnd() * 0.3;
  const skill = ai.skill || (ai.skill = 0.1 + sim.rnd() * 0.3), rnd = sim.rnd, w = p.w, rngU = w.rng * TS * (p.a === "druck" ? 1.1 : 1);
  const enemies = sim.players.filter(q => q.alive && q.id !== p.id && (sim.mode.ffa || q.team !== p.team));
  // sichtbares Ziel
  let tgt = null, td = 1e9;
  for (const q of enemies) {
    const d = Math.hypot(q.x - p.x, q.y - p.y); if (d > (sim.modeId === "showdown" && sim.t < 40 ? 5 : 8) * TS) continue;
    if (q.fx.invis > 0 && d > 2 * TS) continue; if (inGrass(M, q.x, q.y) && q.reveal <= 0 && d > 3 * TS) continue;
    const score = d * (0.7 + 0.6 * q.hp / q.maxHp); if (score < td && !rayBlocked(M, p.x, p.y, q.x, q.y, t => t === 1)) { td = score; tgt = q; }
  }
  const dist = tgt ? Math.hypot(tgt.x - p.x, tgt.y - p.y) : 0;
  // Ziel des Modus
  let goal = modeGoal(sim, p, enemies);
  // Bewegung
  let dx = 0, dy = 0;
  const pref = rngU * (w.t === "l" ? 0.75 : 0.6), low = p.hp < p.maxHp * 0.33;
  const toward = (gx, gy) => stepToward(sim, p, ai, gx, gy);
  if (tgt && !(goal && goal.must && Math.hypot(goal.x - p.x, goal.y - p.y) > 2.5 * TS)) {
    if (ai.st <= 0) { ai.strafe = -ai.strafe; ai.st = 0.9 + rnd() * 1.1; }
    const ux = (tgt.x - p.x) / dist, uy = (tgt.y - p.y) / dist;
    if (low && dist < rngU * 0.9) { dx = -ux; dy = -uy; }
    else if (dist > pref + TS) { [dx, dy] = toward(tgt.x, tgt.y); }
    else if (dist < pref * 0.55) { dx = -ux * 0.8 - uy * ai.strafe * 0.5; dy = -uy * 0.8 + ux * ai.strafe * 0.5; }
    else { dx = -uy * ai.strafe; dy = ux * ai.strafe; }
  } else if (goal) { [dx, dy] = Math.hypot(goal.x - p.x, goal.y - p.y) > (goal.r || 1.2 * TS) ? toward(goal.x, goal.y) : [Math.sin(sim.t * 0.9 + p.id) * 0.3, Math.cos(sim.t * 0.7 + p.id) * 0.3]; }
  // Zone im Showdown: nach draußen laufen vermeiden
  if (sim.modeId === "showdown") { const z = sim.ms, dz = Math.hypot(p.x - z.zx, p.y - z.zy); if (dz > z.zr - 2.5 * TS) { [dx, dy] = toward(z.zx, z.zy); } }
  const l = Math.hypot(dx, dy); if (l > 0.01) { p.mx = dx / l; p.my = dy / l; } else { p.mx = p.my = 0; }
  if (!tgt && (p.mx || p.my)) p.face = Math.atan2(p.my, p.mx);
  // Schießen
  if (tgt && dist <= rngU * 0.97) {
    const sp = w.t === "l" ? 250 : w.spd || 600, tt = w.t === "l" ? dist / 250 : dist / sp;
    const px = tgt.x + (tgt.vx || 0) * tt * 0.3, py = tgt.y + (tgt.vy || 0) * tt * 0.3;
    const err = (rnd() - .5) * (1 - skill) * 1.1, ang = Math.atan2(py - p.y, px - p.x) + err, dd = clampN(Math.hypot(px - p.x, py - p.y) / rngU, 0.2, 1);
    p.face = ang;
    if (rnd() < 0.18 + skill * 0.4) {
      if (p.sc >= 1 && dist < rngU * 0.85 && w.sup) sim.superFire(p.id, Math.cos(ang), Math.sin(ang), dd);
      else if (p.ammo >= 1) sim.fire(p.id, Math.cos(ang), Math.sin(ang), dd);
    }
    useAbility(sim, p, tgt, dist, ang, goal, rnd);
  } else {
    // Kisten oder Eimer beschießen
    const obj = nearestShootable(sim, p, rngU);
    if (obj && p.ammo >= 1 && rnd() < 0.3) { const ang = Math.atan2(obj.y - p.y, obj.x - p.x); p.face = ang; sim.fire(p.id, Math.cos(ang), Math.sin(ang), clampN(Math.hypot(obj.x - p.x, obj.y - p.y) / rngU, 0.2, 1)); }
    if (enemies.length) useAbility(sim, p, null, 1e9, p.face, goal, rnd);
  }
  ai.lastHp = p.hp;
}

function nearestShootable(sim, p, rngU) {
  const M = sim.M;
  if (sim.modeId === "heist") { const bk = M.buckets[1 - p.team]; if (bk && Math.hypot(bk[0] - p.x, bk[1] - p.y) < rngU * 0.95 && !rayBlocked(M, p.x, p.y, bk[0], bk[1])) return { x: bk[0], y: bk[1] }; }
  if (sim.modeId === "showdown" || sim.modeId === "heist") {
    let best = null, bd = rngU * 0.9;
    for (const [i] of M.crate) { const x = (i % M.w + .5) * TS, y = (Math.floor(i / M.w) + .5) * TS, d = Math.hypot(x - p.x, y - p.y); if (d < bd && !rayBlocked(M, p.x, p.y, x - Math.sign(x - p.x) * 14, y - Math.sign(y - p.y) * 14)) { bd = d; best = { x, y }; } }
    return best;
  }
  return null;
}

function stepToward(sim, p, ai, gx, gy) {
  const M = sim.M, tx = clampN(Math.floor(gx / TS), 1, M.w - 2), ty = clampN(Math.floor(gy / TS), 1, M.h - 2);
  if (clearWalk(M, p.x, p.y, gx, gy) && Math.hypot(gx - p.x, gy - p.y) < 9 * TS) { const d = Math.hypot(gx - p.x, gy - p.y) || 1; return [(gx - p.x) / d, (gy - p.y) / d]; }
  if (!ai.path || ai.pt <= 0 || ai.pgx !== tx || ai.pgy !== ty) { ai.path = findPath(M, Math.floor(p.x / TS), Math.floor(p.y / TS), tx, ty); ai.pt = 0.9; ai.pgx = tx; ai.pgy = ty; }
  const path = ai.path; let pick = null;
  for (let i = Math.min(path.length - 1, 12); i >= 0; i--) { const n = path[i]; if (Math.hypot(n[0] - p.x, n[1] - p.y) < 10) continue; if (clearWalk(M, p.x, p.y, n[0], n[1])) { pick = n; break; } }
  if (!pick) pick = path[Math.min(1, path.length - 1)] || [gx, gy];
  const d = Math.hypot(pick[0] - p.x, pick[1] - p.y) || 1; return [(pick[0] - p.x) / d, (pick[1] - p.y) / d];
}

function modeGoal(sim, p, enemies) {
  const M = sim.M, m = sim.modeId, ms = sim.ms, home = M.spawns[p.team] && M.spawns[p.team][0];
  const near = (list, f) => { let b = null, bd = 1e9; for (const o of list) { const d = Math.hypot(f(o)[0] - p.x, f(o)[1] - p.y); if (d < bd) { bd = d; b = o; } } return b; };
  if (m === "showdown") {
    const c = near(sim.pick.filter(k => k.k === "c"), k => [k.x, k.y]); if (c && Math.hypot(c.x - p.x, c.y - p.y) < 12 * TS) return { x: c.x, y: c.y, r: 6 };
    if (p.ai.goal && Math.hypot(p.ai.goal.x - p.x, p.ai.goal.y - p.y) > 2 * TS && sim.t - (p.ai.goalT || 0) < 6) return p.ai.goal;
    let tgt;
    if (M.crate.size && sim.rnd() < 0.5) { const ids = [...M.crate.keys()], i = ids[Math.floor(sim.rnd() * ids.length)]; tgt = { x: (i % M.w + .5) * TS - 40, y: (Math.floor(i / M.w) + .5) * TS };
      if (walkBlock(tileAt(M, tgt.x, tgt.y))) tgt = { x: (i % M.w + .5) * TS, y: (Math.floor(i / M.w) + 1.6) * TS }; }
    else tgt = { x: ms.zx + (sim.rnd() - .5) * 8 * TS, y: ms.zy + (sim.rnd() - .5) * 8 * TS };
    tgt.r = 2 * TS; p.ai.goal = tgt; p.ai.goalT = sim.t; return tgt;
  }
  if (m === "perlen") {
    const gems = sim.pick.filter(k => k.k === "p"), g = near(gems, k => [k.x, k.y]);
    if (p.perlen >= 4 && enemies.length && home) return { x: home[0] + 3 * TS, y: home[1], r: 3 * TS, must: false };
    if (g && Math.hypot(g.x - p.x, g.y - p.y) < 14 * TS) return { x: g.x, y: g.y, r: 6, must: true };
    if (ms.cd && ms.cd.t !== p.team) { const e = near(enemies, q => [q.x, q.y]); if (e) return { x: e.x, y: e.y, r: 2 * TS }; }
    return M.mine ? { x: M.mine[0] + (p.team ? 40 : -40), y: M.mine[1], r: 1.5 * TS } : null;
  }
  if (m === "koenig") { const z = M.kings[ms.zi]; return { x: z[0], y: z[1], r: 1.6 * TS, must: true }; }
  if (m === "eroberung") {
    const mine = p.id % 3; const pts = M.caps; let pi = p.team ? 2 - mine : mine; // Bots verteilen sich auf die Punkte
    const st = ms.pts[pi]; if (st.owner === p.team && st.prog * (p.team ? 1 : -1) >= 0.99) pi = ms.pts.findIndex(q => q.owner !== p.team) >= 0 ? ms.pts.findIndex(q => q.owner !== p.team) : pi;
    const c = pts[pi]; return { x: c[0], y: c[1], r: 1.4 * TS, must: true };
  }
  if (m === "heist") {
    const atk = p.spawnIdx !== 0, mine = M.buckets[p.team], theirs = M.buckets[1 - p.team];
    if (atk && theirs) return { x: theirs[0] + (p.team ? 4 * TS : -4 * TS), y: theirs[1] + (p.spawnIdx - 1.5) * 1.5 * TS, r: 1.5 * TS };
    return mine ? { x: mine[0] + (p.team ? -3 * TS : 3 * TS), y: mine[1] + (sim.rnd() - .5) * 4 * TS, r: 3 * TS } : null;
  }
  if (m === "knockout") { const e = near(enemies, q => [q.x, q.y]); return e ? { x: e.x, y: e.y, r: 5 * TS } : null; }
  return null;
}

function useAbility(sim, p, tgt, dist, ang, goal, rnd) {
  if (!p.a || p.ak !== "a" || p.abCd > 0) return;
  const hpf = p.hp / p.maxHp, hurt = p.ai.lastHp - p.hp > p.maxHp * 0.08, T = TS;
  const ux = Math.cos(ang), uy = Math.sin(ang);
  const go = (ax, ay) => sim.ability(p.id, ax, ay);
  switch (p.a) {
    case "sprint": if ((tgt && dist > 6 * T && hpf > 0.4) || (hpf < 0.4 && tgt)) go(ux, uy); break;
    case "blase": if (hurt && tgt && dist < 9 * T) go(0, 0); break;
    case "heilregen": if (hpf < 0.6 && (!tgt || dist > 6 * T)) go(0, 0); break;
    case "pfuetze": if (tgt && dist < 5 * T && rnd() < 0.5) go(0, 0); break;
    case "hecht": if (tgt && dist > 6 * T && hpf > 0.5) go(ux, uy); else if (tgt && hpf < 0.35) go(-ux, -uy); break;
    case "welle": if (tgt && dist < 2.6 * T) go(0, 0); break;
    case "platscher": if (tgt && hpf < 0.35) go(-ux, -uy); else if (tgt && dist > 8 * T && rnd() < 0.3) go(ux, uy); break;
    case "nebel": if (tgt && hpf < 0.5 && dist < 9 * T) go(0, 0); break;
    case "sturmflut": if (tgt && dist < 4.5 * T) go(0, 0); break;
  }
}
