const WEAPONS_MAP = W;
/* ===== MATCH: Verbindung, Eingabe, Vorhersage, Zeichnen ===== */
const Match = (() => {
  let S = null, cv, c, cr, VW = 800, VH = 360, dpr = 1;
  const INTERP = 0.11, DT_ = 1 / TICK;
  const IN = { mv: { id: null, ox: 0, oy: 0, x: 0, y: 0 }, aim: { id: null, x: 0, y: 0, mag: 0, ang: 0 }, sup: { id: null, x: 0, y: 0, mag: 0, ang: 0 }, keys: {}, mouse: { x: 0, y: 0, in: false }, lastAng: 0, emote: false, emoteAt: 0, sendAcc: 0 };
  const fr = (x, y, w, h) => { c.beginPath(); c.rect(x, y, w, h); c.fill(); };
  const stored = () => { try { return JSON.parse(localStorage.getItem("ws_match")); } catch (e) { return null; } };

  /* ---------- Start und Verbindung ---------- */
  function start(m) {
    if (S) return; S = { id: m.id, tries: 0, init: null, ended: false, left: false, parts: [], texts: [], feed: [], banner: null, emotes: [], trails: [], shake: 0, cam: { x: 0, y: 0 }, pending: [], seq: 0, t0: performance.now() / 1000, bs: new Map(), hitFlash: {}, snapT: 0, snap: null, pl: new Map(), pause: false, specIdx: 0, kb: [0, 0], err: "", fireCd: 0, bucketHit: [0, 0], lastHp: -1, sounded: 0 };
    showScreen("match"); Snd.music("match"); cv = $("cv"); cr = cv.getContext("2d"); c = sketchCtx(cr, 3.7, 40); bindInput(); connect();
  }
  function connect() {
    if (!S || S.ended || S.left) return;
    const ws = new WebSocket(wsBase() + "/ws/match?id=" + encodeURIComponent(S.id) + "&u=" + encodeURIComponent(G.user.name) + "&t=" + encodeURIComponent(G.user.token)); S.ws = ws;
    ws.onopen = () => { S.tries = 0; S.err = ""; };
    ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch { return; } try { onMsg(m); } catch (err) { console.error(err); } };
    ws.onclose = () => { if (!S || S.ws !== ws || S.ended || S.left) return; S.err = "Verbindung weg … versuche es erneut"; if (++S.tries > 25) { toast("Die Verbindung zum Match ist abgebrochen.", true); toBack(); return; } setTimeout(connect, 1200); };
    ws.onerror = () => {};
  }
  function send(o) { if (S && S.ws && S.ws.readyState === 1) S.ws.send(JSON.stringify(o)); }
  function toBack() { const s = S; S = null; if (s && s.ws) { try { s.ws.close(); } catch (e) {} } try { localStorage.removeItem("ws_match"); } catch (e) {} for (const id of ["pause", "result"]) { const el = $(id); if (el) el.remove(); } api("/api/me", { name: G.user.name, token: G.user.token }).then(r => { if (r.ok) G.P = r.profile; showScreen("lobby"); onQueueState(); onPartyState(); }); showScreen("lobby"); }
  function onMsg(m) {
    if (!S) return;
    if (m.t === "init") {
      const M = cloneMap(MAPS[m.map]); (m.dc || []).forEach(i => { M.crate.delete(i); M.tiles[i] = T_FLOOR; });
      S.init = m; S.M = M; S.base = MAPS[m.map]; S.world = buildWorld(M); S.you = m.you; S.myTeam = m.players[m.you].tm; S.ffa = MODES[m.mode].ffa; S.md = MODES[m.mode];
      S.me = { x: 0, y: 0, hp: 1, mhp: m.players[m.you].mhp, am: 3, sc: 0, ab: -1, al: 1, rs: 0, fl: 1, sp: BASE_SPEED, sd: 0 }; S.me.first = true;
      S.players = m.players; m.players.forEach(p => S.pl.set(p.id, { info: p, hist: [], vis: false, last: null, trailT: 0, hit: 0 }));
      S.ab = m.players[m.you].a ? AB[m.players[m.you].a] : null; S.w = W_[m.players[m.you].w];
    } else if (m.t === "s") onSnap(m);
    else if (m.t === "end") onEnd(m);
    else if (m.t === "gone") { toast("Das Match ist schon vorbei.", true); toBack(); }
    else if (m.t === "left") { toBack(); }
  }
  const W_ = WEAPONS_MAP;

  /* ---------- Schnappschüsse ---------- */
  function onSnap(m) {
    if (!S || !S.init) return; const now = performance.now() / 1000, me = S.me, M = S.M; S.snap = m; S.snapT = now;
    const prevHp = me.hp; Object.assign(me, m.me); S.ph = m.ph || 0; S.tl = m.tl; S.st = m.st;
    // Gegner und Verbündete: Verlauf für das Glätten
    const seen = new Set();
    for (const a of m.p) { const e = S.pl.get(a[0]); if (!e) continue; seen.add(a[0]); const h = e.hist; if (!e.vis) h.length = 0; e.vis = true; h.push({ t: now, x: a[1], y: a[2], f: a[3] / 50, hp: a[4], mhp: a[5], fl: a[6], vx: a[7], vy: a[8] }); if (h.length > 6) h.shift(); e.last = h[h.length - 1]; }
    for (const [id, e] of S.pl) if (!seen.has(id) && id !== S.you) e.vis = false;
    // Geschosse
    const nb = new Map(); for (const b of m.b) { const o = S.bs.get(b[0]); nb.set(b[0], o || { id: b[0], k: b[1], x0: b[2], y0: b[3], t0: now, tx: b[4], ty: b[5], vx: b[4], vy: b[5], rad: b[6], fl: b[6] / 100, team: b[7], aoe: b[8], bounce: b[8] }); const n = nb.get(b[0]); if (o && b[1] !== 1) { n.x0 = b[2]; n.y0 = b[3]; n.t0 = now; n.vx = b[4]; n.vy = b[5]; } } S.bs = nb;
    // Vorhersage: Serverstand plus noch nicht bestätigte Eingaben
    if (me.al && !(me.fl & 512)) {
      while (S.pending.length && S.pending[0].s <= m.a) S.pending.shift();
      const q = { x: me.x, y: me.y }; let kx = me.kx || 0, ky = me.ky || 0;
      for (const p of S.pending) { const cur = currentDir(tileAt(M, q.x, q.y)), ex = cur ? cur[0] * 70 : 0, ey = cur ? cur[1] * 70 : 0; moveCircle(M, q, (p.mx * me.sp + ex + kx) * DT_, (p.my * me.sp + ey + ky) * DT_, PR); kx *= Math.pow(.82, 1); ky *= Math.pow(.82, 1); }
      S.kb = [kx, ky]; const cu = S.cur;
      if (!cu || me.first || Math.hypot(q.x - cu.x, q.y - cu.y) > 48) S.cur = { x: q.x, y: q.y }; else { cu.x += (q.x - cu.x) * .35; cu.y += (q.y - cu.y) * .35; }
    } else { S.pending.length = 0; if (!S.cur || me.first || Math.hypot(me.x - S.cur.x, me.y - S.cur.y) > 6) S.cur = { x: me.x, y: me.y }; else { S.cur.x += (me.x - S.cur.x) * .5; S.cur.y += (me.y - S.cur.y) * .5; } }
    me.first = false;
    if (me.hp < prevHp && prevHp > 0 && me.al) { S.shake = Math.min(7, S.shake + 2 + (prevHp - me.hp) / 200); S.hurtV = 1; try { navigator.vibrate && navigator.vibrate(25); } catch (e) {} }
    for (const ev of m.ev) onEvent(ev, now);
  }
  function posOf(id, rt) {
    if (id === S.you) return S.cur ? { x: S.cur.x, y: S.cur.y, f: IN.lastAng, vis: true } : null;
    const e = S.pl.get(id); if (!e || !e.vis || !e.last || !e.hist.length) return null; const h = e.hist; let a = h[0], b = h[h.length - 1];
    for (let i = h.length - 1; i > 0; i--) if (h[i - 1].t <= rt) { a = h[i - 1]; b = h[i]; break; }
    if (rt <= h[0].t) return { x: h[0].x, y: h[0].y, f: h[0].f, vx: h[0].vx, vy: h[0].vy, hp: h[0].hp, mhp: h[0].mhp, fl: h[0].fl, vis: true };
    const k = b.t === a.t ? 1 : clampN((rt - a.t) / (b.t - a.t), 0, 1.3);
    return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), f: b.f, vx: b.vx, vy: b.vy, hp: b.hp, mhp: b.mhp, fl: b.fl, vis: true };
  }

  /* ---------- Ereignisse ---------- */
  const near = (x, y) => !S.cur || Math.hypot(x - S.cur.x, y - S.cur.y) < 10 * TS;
  function splash(x, y, n, col, sp) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = (sp || 90) * (.4 + Math.random()); S.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, g: 220, t: 0, life: .4 + Math.random() * .4, r: 2 + Math.random() * 2.6, c: col || "#bfe9ff" }); } }
  function onEvent(ev, now) {
    const name = id => { const p = S.players[id]; return p ? p.n : "?"; };
    switch (ev.e) {
      case "f": { const p = posOf(ev.id, now - INTERP) || (S.cur && ev.id === S.you ? S.cur : null); if (!p) break; const o = S.pl.get(ev.id); if (o) o.fire = now; splash(p.x + Math.cos(ev.a) * 18, p.y + Math.sin(ev.a) * 18, 5, "#bfe9ff", 80); if (ev.id === S.you || near(p.x, p.y)) sfx(ev.s ? "sup" : "shoot", ev.w); break; }
      case "h": { const mine = ev.s === S.you, hurt = ev.v === S.you; S.texts.push({ x: ev.x + (Math.random() - .5) * 10, y: ev.y - 14, t: 0, s: String(ev.a), c: hurt ? "#ff5a4f" : mine ? "#ffe45e" : "#fff", big: mine ? 1.25 : 1 }); const o = S.pl.get(ev.v); if (o) o.hit = 1; if (hurt) sfx("hurt"); else if (mine || near(ev.x, ev.y)) sfx("hit"); splash(ev.x, ev.y, 4, "#bfe9ff", 70); break; }
      case "k": { splash(ev.x, ev.y, 26, "#bfe9ff", 190); S.parts.push({ ring: 1, x: ev.x, y: ev.y, t: 0, life: .5, r: 60, c: "#9fd8f5" }); sfx("ko"); S.feed.unshift({ t: 0, s: (ev.k >= 0 ? name(ev.k) + " besiegt " : "") + name(ev.v) + (ev.k < 0 ? " ist raus" : ""), me: ev.k === S.you || ev.v === S.you }); if (S.feed.length > 4) S.feed.pop(); if (ev.k === S.you) S.banner = { s: "Besiegt: " + name(ev.v), t: 0, d: 1.6, small: 1 }; break; }
      case "x": { S.parts.push({ ring: 1, x: ev.x, y: ev.y, t: 0, life: .45, r: ev.r, c: ev.k === 2 ? "#6be28a" : ev.ic ? "#e6f8ff" : ev.k === 4 ? "#5fa8ff" : "#8ad4ff", fill: 1 }); splash(ev.x, ev.y, 12 + (ev.r / 8 | 0), ev.k === 2 ? "#b4f5c4" : "#bfe9ff", ev.r * 2.4); if (near(ev.x, ev.y)) sfx("splash"); break; }
      case "su": { if (ev.id === S.you) S.punch = 1; const p = posOf(ev.id, now - INTERP); if (p) { S.parts.push({ ring: 1, x: p.x, y: p.y, t: 0, life: .6, r: 70, c: "#ffd23f" }); } break; }
      case "a": { const p = posOf(ev.id, now - INTERP); if (p) { S.texts.push({ x: p.x, y: p.y - 34, t: 0, s: AB[ev.ab].n, c: "#d7ecff", big: .9 }); } if (ev.id === S.you || (p && near(p.x, p.y))) sfx("ability"); break; }
      case "rv": { const p = posOf(ev.id, now - INTERP); if (p) { splash(p.x, p.y, 20, "#ffe45e", 140); S.texts.push({ x: p.x, y: p.y - 30, t: 0, s: "Wiedergeburt!", c: "#ffe45e", big: 1.1 }); } sfx("revive"); break; }
      case "sp": { splash(ev.x, ev.y, 14, "#fff", 100); if (ev.id === S.you) { S.cur = { x: ev.x, y: ev.y }; S.pending.length = 0; sfx("revive"); } break; }
      case "p": { if (ev.id === S.you) { sfx(ev.k === "p" ? "perle" : "pick"); S.texts.push({ x: S.cur.x, y: S.cur.y - 28, t: 0, s: ev.k === "p" ? "+1 Perle" : "+Kraft", c: ev.k === "p" ? "#ffd8ec" : "#ffb21f", big: 1 }); } break; }
      case "c": { const M = S.M, i = ev.i; M.crate.delete(i); M.tiles[i] = T_FLOOR; const x = (i % M.w + .5) * TS, y = (Math.floor(i / M.w) + .5) * TS; splash(x, y, 10, "#d79a4a", 110); if (near(x, y)) sfx("hit"); break; }
      case "bh": S.bucketHit[ev.t] = .4; break;
      case "m": S.banner = { s: ev.t, t: 0, d: 2.2 }; break;
      case "e": S.emotes.push({ id: ev.id, n: ev.n, t: 0 }); sfx("emote"); break;
      case "rs": { S.M = cloneMap(S.base); S.world = buildWorld(S.M); S.cur = null; S.pending.length = 0; S.me.first = true; break; }
    }
  }
  function onEnd(m) {
    if (!S || S.ended) return; S.ended = true; S.end = m; try { localStorage.removeItem("ws_match"); } catch (e) {}
    const p = S.players[S.you], won = S.ffa ? m.win === S.you : m.win === S.myTeam, draw = m.win === -1; sfx(won ? "win" : "lose");
    S.banner = { s: won ? "Gewonnen!" : draw ? "Unentschieden" : "Verloren", t: 0, d: 2.6 };
    setTimeout(() => { if (S && S.end === m) showResult(m); }, 2300);
  }
  function showResult(m) {
    const you = S.you, tb = m.table, mine = tb.find(r => r.id === you), won = S.ffa ? m.win === you : m.win === S.myTeam, draw = m.win === -1, rw = m.rewards;
    const title = draw ? "Unentschieden" : S.ffa ? (won ? "Sieg!" : "Platz " + (mine ? mine.pl : "?")) : won ? "Sieg!" : "Niederlage";
    const rows = [...tb].sort((a, b) => S.ffa ? (a.pl || 9) - (b.pl || 9) : a.tm - b.tm || b.k - a.k).map(r => `<tr class="${r.id === you ? "me" : ""}"><td>${S.ffa ? (r.pl || "-") + "." : `<i style="display:inline-block;width:.8rem;height:.8rem;border-radius:50%;background:${TEAMC[r.tm]};border:2px solid var(--ink)"></i>`}</td><td>${esc(r.n)}${r.h ? "" : " <small>(Bot)</small>"}</td><td>${r.k}</td><td>${fmt(r.d)}</td></tr>`).join("");
    let rew = ""; if (rw) {
      rew = `<div class="rew"><span>${coinH(rw.coins)}</span><span>+${rw.xp} EP</span>${rw.lvAfter > rw.lvBefore ? `<span style="color:var(--accent)">Level ${rw.lvAfter}! ${coinH(rw.lvCoins)}${rw.lvGems ? " " + gemH(rw.lvGems) : ""}</span>` : ""}</div>`;
      if (rw.rank) rew += `<div style="text-align:center;font:1.3rem var(--f-display)">Rang ${RANKS[rw.rank.tier].n}: ${rw.rank.delta > 0 ? "+" : ""}${rw.rank.delta} RP${rw.rank.up ? " – aufgestiegen! " + (rw.rank.gems ? gemH(rw.rank.gems) : "") : ""}</div>`;
      if (rw.drop >= 0) rew += `<div style="text-align:center;font:1.3rem var(--f-display)">Du hast einen ${DROPS[rw.drop].n} bekommen! Du findest ihn unter Fähigkeiten.</div>`;
      if (rw.gemFind) rew += `<div style="text-align:center;font:1.3rem var(--f-display)">Glückstreffer: ${gemH(1)}</div>`;
    } else rew = `<div class="muted" style="text-align:center">Die Belohnung konnte nicht abgeholt werden.</div>`;
    const d = document.createElement("div"); d.id = "result"; d.innerHTML = `<div class="box panel"><h1 class="${won ? "win" : "lose"}">${title}</h1><table><tr><th></th><th>Name</th><th>Besiegt</th><th>Schaden</th></tr>${rows}</table>${rew}<div style="text-align:center;margin-top:.6rem"><button class="btn go" id="resOk">Weiter</button></div></div>`;
    if (won) { let cf = ""; for (let i = 0; i < 40; i++) cf += `<i style="left:${Math.random() * 100}%;background:${RAINBOW[i % 7]};animation-delay:${Math.random() * 2}s;animation-duration:${2.5 + Math.random() * 2}s"></i>`; d.insertAdjacentHTML("afterbegin", `<div class="confetti">${cf}</div>`); }
    document.body.appendChild(d); $("resOk").onclick = () => { sfx("click"); toBack(); };
  }

  /* ---------- Eingabe ---------- */
  let bound = false;
  function lay() {
    VW = innerWidth; VH = innerHeight; const R = clampN(VH * .21, 60, 96), aim = { x: VW - R - 30 - (innerWidth > 900 ? 10 : 0), y: VH - R - 24, r: R }, rs = R * .62;
    return { R, aim, sup: { x: aim.x - R - rs - 14, y: aim.y + R * .28, r: rs }, ab: { x: aim.x - R * .62, y: aim.y - R - rs * .85 - 16, r: rs * .8 }, rm: 64, pause: { x: VW - 34, y: 34, r: 24 }, emo: { x: VW - 34, y: 34 + 54, r: 22 } };
  }
  function bindInput() {
    if (bound) return; bound = true;
    const L = () => lay(), d2 = (a, b, x, y) => Math.hypot(a - x, b - y);
    cv.addEventListener("pointerdown", e => {
      if (!S || !S.init || S.pause) return; e.preventDefault(); Snd.init(); try { cv.setPointerCapture(e.pointerId); } catch (_) {}
      const l = L(), x = e.clientX, y = e.clientY, id = e.pointerId;
      if (d2(x, y, l.pause.x, l.pause.y) < l.pause.r + 8) { openPause(); return; }
      if (IN.emote) { const ei = emoteHit(x, y); IN.emote = false; if (ei >= 0 && performance.now() - IN.emoteAt > 1200) { IN.emoteAt = performance.now(); send({ t: "e", n: ei }); } return; }
      if (d2(x, y, l.emo.x, l.emo.y) < l.emo.r + 8) { IN.emote = true; sfx("click"); return; }
      if (d2(x, y, l.aim.x, l.aim.y) < l.aim.r * 1.3 && IN.aim.id == null) { IN.aim = { id, x: l.aim.x, y: l.aim.y, mag: 0, ang: IN.lastAng, down: performance.now() }; stickMove(IN.aim, x, y, l.aim.r); return; }
      if (d2(x, y, l.sup.x, l.sup.y) < l.sup.r * 1.35 && IN.sup.id == null) { IN.sup = { id, x: l.sup.x, y: l.sup.y, mag: 0, ang: IN.lastAng }; stickMove(IN.sup, x, y, l.sup.r); return; }
      if (S.ab && S.ab.k === "a" && d2(x, y, l.ab.x, l.ab.y) < l.ab.r * 1.3) { useAbility(); return; }
      if (x < VW * .5 && IN.mv.id == null) { IN.mv = { id, ox: x, oy: y, x, y }; return; }
      if (e.pointerType === "mouse") { IN.mouse = { x, y, in: true }; mouseFire(x, y); return; }
      if (S.me && S.me.sd) { S.specIdx++; }
    });
    cv.addEventListener("pointermove", e => {
      if (!S) return; const l = L();
      if (e.pointerType === "mouse") { IN.mouse = { x: e.clientX, y: e.clientY, in: true }; }
      if (e.pointerId === IN.mv.id) { IN.mv.x = e.clientX; IN.mv.y = e.clientY; }
      else if (e.pointerId === IN.aim.id) stickMove(IN.aim, e.clientX, e.clientY, l.aim.r);
      else if (e.pointerId === IN.sup.id) stickMove(IN.sup, e.clientX, e.clientY, l.sup.r);
    });
    const up = e => {
      if (!S) return; const l = L();
      if (e.pointerId === IN.mv.id) IN.mv = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
      else if (e.pointerId === IN.aim.id) { const s = IN.aim; IN.aim = { id: null, x: 0, y: 0, mag: 0, ang: s.ang }; if (e.type === "pointerup") releaseShot("f", s, performance.now() - (s.down || 0) < 260); }
      else if (e.pointerId === IN.sup.id) { const s = IN.sup; IN.sup = { id: null, x: 0, y: 0, mag: 0, ang: s.ang }; if (e.type === "pointerup") releaseShot("u", s, s.mag < .2); }
    };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    addEventListener("keydown", e => {
      if (!S || !S.init) return; if (e.repeat) return; const k = e.key.toLowerCase(); IN.keys[k] = true;
      if (k === "q") { const a = mouseAng(); sendShot("u", a.ax, a.ay, a.d); } else if (k === "e" || k === " ") useAbility(); else if (k === "escape") openPause(); else if (k >= "1" && k <= "8") send({ t: "e", n: +k - 1 });
    });
    addEventListener("keyup", e => { IN.keys[e.key.toLowerCase()] = false; });
    addEventListener("blur", () => { IN.keys = {}; });
    addEventListener("contextmenu", e => { if (S) e.preventDefault(); });
  }
  function stickMove(s, x, y, R) { const dx = x - s.x, dy = y - s.y, l = Math.hypot(dx, dy); s.mag = Math.min(1, l / R); if (l > 4) s.ang = Math.atan2(dy, dx); if (s === IN.aim || s === IN.sup) IN.lastAng = s.ang; }
  function mouseAng() { if (!S.cur) return { ax: Math.cos(IN.lastAng), ay: Math.sin(IN.lastAng), d: null }; const sc = scale(), px = VW / 2 + (S.cur.x - S.cam.x) * sc / dpr, py = VH / 2 + (S.cur.y - S.cam.y) * sc / dpr, dx = IN.mouse.x - px, dy = IN.mouse.y - py, a = Math.atan2(dy, dx); IN.lastAng = a; const w = S.w, rng = (w ? w.rng : 6) * TS * sc / dpr; return { ax: Math.cos(a), ay: Math.sin(a), d: clampN(Math.hypot(dx, dy) / rng, .25, 1) }; }
  function mouseFire(x, y) { IN.mouse = { x, y, in: true }; const a = mouseAng(); sendShot("f", a.ax, a.ay, a.d); }
  function sendShot(t, ax, ay, d) { if (!S || !S.me || !S.me.al || S.ph) return; if (t === "f" && S.me.am < 1) { return; } if (t === "u" && S.me.sc < 1) return; send({ t, ax: +ax.toFixed(3), ay: +ay.toFixed(3), d: d == null ? null : +d.toFixed(2) }); }
  function releaseShot(t, s, tap) { const a = s.ang; sendShot(t, Math.cos(a), Math.sin(a), tap ? null : s.mag); }
  function useAbility() { if (!S || !S.me || !S.me.al || S.ph || !S.ab || S.ab.k !== "a" || S.me.ab > 0) return; const m = moveVec(); const a = IN.aim.id != null && IN.aim.mag > .2 ? IN.aim.ang : (m.x || m.y) ? Math.atan2(m.y, m.x) : IN.lastAng; send({ t: "a", ax: +Math.cos(a).toFixed(3), ay: +Math.sin(a).toFixed(3) }); }
  function moveVec() {
    const k = IN.keys; let x = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0), y = (k.s || k.arrowdown ? 1 : 0) - (k.w || k.arrowup ? 1 : 0);
    if (x || y) { const l = Math.hypot(x, y); return { x: x / l, y: y / l }; }
    if (IN.mv.id != null) { const dx = IN.mv.x - IN.mv.ox, dy = IN.mv.y - IN.mv.oy, l = Math.hypot(dx, dy), R = 64; if (l < 7) return { x: 0, y: 0 }; const m = Math.min(1, l / R); return { x: dx / l * m, y: dy / l * m }; }
    return { x: 0, y: 0 };
  }
  function emoteHit(x, y) { for (let i = 0; i < EMOTE_N; i++) { const p = emotePos(i); if (Math.hypot(x - p.x, y - p.y) < 24) return i; } return -1; }
  const emotePos = i => ({ x: VW / 2 + (i - (EMOTE_N - 1) / 2) * 52, y: 110 });

  function openPause() {
    if (!S || S.pause || S.ended) return; S.pause = true; let sure = false;
    const d = document.createElement("div"); d.id = "pause"; d.innerHTML = `<div class="box panel"><h2>Pause</h2><p class="muted">Das Match läuft weiter, du stehst solange still.</p><div class="tabs" style="justify-content:center"><button class="btn good" id="pCont">Weiter</button><button class="btn warn" id="pLeave">Match verlassen</button></div></div>`;
    document.body.appendChild(d); $("pCont").onclick = () => { sfx("click"); d.remove(); S.pause = false; };
    $("pLeave").onclick = () => { if (!sure) { sure = true; $("pLeave").textContent = "Wirklich? Das zählt als Niederlage."; sfx("err"); return; } d.remove(); S.left = true; send({ t: "leave" }); setTimeout(() => { if (S && S.left) toBack(); }, 1500); };
  }

  /* ---------- Hauptschleife ---------- */
  const scale = () => cv.height / (9.6 * TS);
  function frame(t, dt) {
    if (!S) return; dpr = Math.min(2, devicePixelRatio || 1); const w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    VW = innerWidth; VH = innerHeight; c.setTransform(1, 0, 0, 1, 0, 0);
    if (!S.init) { cr.fillStyle = "#4aa3d8"; cr.fillRect(0, 0, w, h); c.setTransform(dpr, 0, 0, dpr, 0, 0); txt(c, S.err || "Verbinde mit dem Match …", VW / 2, VH / 2, 34, "#fff"); return; }
    const now = performance.now() / 1000, me = S.me, M = S.M, mv = moveVec();
    // eigene Bewegung vorhersagen und Eingabe senden
    if (S.cur && me.al && !S.pause && !S.ended) {
      const kb = S.kb; if (!(me.fl & 512) && !S.ph) { const cur = currentDir(tileAt(M, S.cur.x, S.cur.y)), ex = cur ? cur[0] * 70 : 0, ey = cur ? cur[1] * 70 : 0; moveCircle(M, S.cur, (mv.x * me.sp + ex + kb[0]) * dt, (mv.y * me.sp + ey + kb[1]) * dt, PR); } const dec = Math.pow(.82, dt * 30); kb[0] *= dec; kb[1] *= dec;
    }
    IN.sendAcc += dt; while (IN.sendAcc >= DT_) { IN.sendAcc -= DT_; const mvv = S.pause || S.ended || !me.al ? { x: 0, y: 0 } : mv; const aimOn = IN.aim.id != null && IN.aim.mag > .18, a = aimOn ? IN.aim.ang : IN.lastAng; const s = ++S.seq; S.pending.push({ s, mx: mvv.x, my: mvv.y }); if (S.pending.length > 40) S.pending.shift(); send({ t: "i", mx: +mvv.x.toFixed(3), my: +mvv.y.toFixed(3), ax: +Math.cos(a).toFixed(3), ay: +Math.sin(a).toFixed(3), s }); if (IN.sendAcc > .3) IN.sendAcc = 0; }
    if (mv.x || mv.y) { if (!(IN.aim.id != null && IN.aim.mag > .18) && !IN.mouse.in) IN.lastAng = Math.atan2(mv.y, mv.x); }
    if (IN.mouse.in && (IN.keys.w || IN.keys.a || IN.keys.s || IN.keys.d || true) && !IN.aim.id) { mouseAng(); }
    render(now, t, dt, mv); drawHud(now, t, dt, mv);
  }

  /* ---------- Zeichnen: Welt ---------- */
  function render(now, t, dt, mv) {
    S.punch = Math.max(0, (S.punch || 0) - dt * 3); const sc = scale() * (1 + S.punch * .05), Wd = S.world, M = S.M, me = S.me, rt = now - INTERP; let tgt = S.cur;
    if (me.sd || !me.al) { const al = [...S.pl.values()].filter(e => e.vis && e.last), tm = al.filter(e => S.ffa || e.info.tm === S.myTeam); const pool = tm.length ? tm : al; if (pool.length) { const e = pool[S.specIdx % pool.length], p = posOf(e.info.id, rt); if (p) tgt = p; } }
    if (tgt) { const k = S.camInit ? Math.min(1, dt * 9) : 1; S.camInit = true; S.cam.x += (tgt.x - S.cam.x) * k; S.cam.y += (tgt.y - S.cam.y) * k; }
    const vw = cv.width / sc, vh = cv.height / sc; S.cam.x = clampN(S.cam.x, Math.min(vw / 2, M.px / 2), Math.max(M.px - vw / 2, M.px / 2)); S.cam.y = clampN(S.cam.y, Math.min(vh / 2, M.py / 2), Math.max(M.py - vh / 2, M.py / 2));
    S.shake = Math.max(0, S.shake - dt * 16); const shx = (Math.random() - .5) * S.shake, shy = (Math.random() - .5) * S.shake;
    cr.fillStyle = "#2a5d87"; cr.fillRect(0, 0, cv.width, cv.height);
    c.save(); c.translate(cv.width / 2 - S.cam.x * sc + shx * dpr, cv.height / 2 - S.cam.y * sc + shy * dpr); c.scale(sc, sc);
    const x0 = Math.max(0, S.cam.x - vw / 2 - 2), y0 = Math.max(0, S.cam.y - vh / 2 - 2), x1 = Math.min(M.px, S.cam.x + vw / 2 + 2), y1 = Math.min(M.py, S.cam.y + vh / 2 + 2);
    cr.drawImage(Wd.floor, x0 * FSC, y0 * FSC, (x1 - x0) * FSC, (y1 - y0) * FSC, x0, y0, x1 - x0, y1 - y0);
    const tx0 = Math.max(0, Math.floor(x0 / TS)), tx1 = Math.min(M.w - 1, Math.floor(x1 / TS)), ty0 = Math.max(0, Math.floor(y0 / TS) - 1), ty1 = Math.min(M.h - 1, Math.floor(y1 / TS) + 1);
    c.lineJoin = c.lineCap = "round";
    // Wasserglitzer
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) { const tt = M.tiles[ty * M.w + tx]; if (tt === T_WATER || tt >= T_CE) { const r = hsh(tx, ty, 3), ph = (t * .6 + r * 5) % 1; c.strokeStyle = `rgba(255,255,255,${.7 * Math.sin(ph * Math.PI)})`; c.lineWidth = 1.6; c.beginPath(); c.moveTo(tx * TS + 6 + r * 12, ty * TS + 8 + r * 10); c.quadraticCurveTo(tx * TS + 12 + r * 12, ty * TS + 4 + r * 10, tx * TS + 18 + r * 12, ty * TS + 8 + r * 10); c.stroke(); } }
    // Zonen am Boden
    const st = S.st || {}, md = S.init.mode;
    if (md === "showdown" && st.z) { cr.save(); cr.beginPath(); cr.rect(0, 0, M.px, M.py); cr.arc(st.z[0], st.z[1], Math.max(1, st.z[2]), 0, TAU, true); cr.fillStyle = "rgba(168,122,66,.55)"; cr.fill("evenodd"); cr.restore(); c.setLineDash([10, 8]); wavyRing(c, st.z[0], st.z[1], st.z[2], t, "#7a4a22", 3); c.setLineDash([]); }
    if (md === "koenig" && st.z) { const col = st.in && st.in[0] && !st.in[1] ? TEAMC[0] : st.in && st.in[1] && !st.in[0] ? TEAMC[1] : "#ffd23f"; c.fillStyle = hexA(col, .22); c.beginPath(); c.arc(st.z[0], st.z[1], st.z[2], 0, TAU); c.fill(); wavyRing(c, st.z[0], st.z[1], st.z[2], t, col, 4); txt(c, "Becken", st.z[0], st.z[1] - st.z[2] - 10, 16, "#fff"); }
    if (md === "eroberung" && st.pts) st.pts.forEach((p, i) => { const cp = M.caps[i], r = 2.4 * TS, col = p[1] >= 0 ? TEAMC[p[1]] : "#ffffff"; c.fillStyle = hexA(p[1] >= 0 ? col : "#cfd8e8", .28); c.beginPath(); c.arc(cp[0], cp[1], r, 0, TAU); c.fill(); wavyRing(c, cp[0], cp[1], r, t, col, 4); const pr = p[0]; c.lineWidth = 7; c.strokeStyle = INK; c.beginPath(); c.arc(cp[0], cp[1], r - 10, -Math.PI / 2, -Math.PI / 2 + TAU * Math.abs(pr)); c.stroke(); c.lineWidth = 4; c.strokeStyle = pr < 0 ? TEAMC[0] : TEAMC[1]; c.beginPath(); c.arc(cp[0], cp[1], r - 10, -Math.PI / 2, -Math.PI / 2 + TAU * Math.abs(pr)); c.stroke(); txt(c, String.fromCharCode(65 + i), cp[0], cp[1], 26, "#fff"); });
    if (md === "perlen" && M.mine) { c.fillStyle = "rgba(60,40,90,.35)"; c.beginPath(); c.ellipse(M.mine[0], M.mine[1], 30, 20, 0, 0, TAU); c.fill(); c.lineWidth = 2.4; c.strokeStyle = INK; c.stroke(); }
    // Pfützen
    if (S.snap) for (const d of S.snap.pd) { c.fillStyle = d[4] === S.myTeam && !S.ffa ? "rgba(90,200,140,.35)" : "rgba(130,90,200,.35)"; c.beginPath(); c.arc(d[1], d[2], d[3], 0, TAU); c.fill(); wavyRing(c, d[1], d[2], d[3], t, "rgba(29,39,66,.6)", 2); }
    // Sammelstücke
    if (S.snap) for (const o of S.snap.o) { if (o[1] === 1) drawPearl(c, o[2], o[3], 7, t); else drawCube(c, o[2], o[3], 9, t); }
    // Zielhilfen für mich
    drawAimHelp(t);
    // Dinge sortieren: Reihe für Reihe von oben nach unten
    const rows = new Map(), put = (y, f) => { const r = Math.floor(y / TS); (rows.get(r) || rows.set(r, []).get(r)).push({ y, f }); };
    const list = []; for (const [id, e] of S.pl) { const p = posOf(id, rt); if (!p) continue; if (id !== S.you && !e.vis) continue; if (id === S.you && !me.al) { continue; } list.push({ id, p, e }); }
    for (const o of list) put(o.p.y, () => drawPlayer(o, now, t, dt));
    if (md === "heist" && st.bk) M.buckets.forEach((b, i) => { if (b) put(b[1], () => drawBucket(c, b[0], b[1], i, st.bk[i][0], st.bk[i][1], t, S.bucketHit[i])); });
    for (let i = 0; i < 2; i++) S.bucketHit[i] = Math.max(0, S.bucketHit[i] - dt);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) { const tt = M.tiles[ty * M.w + tx]; if (tt === T_WALL) blit(c, Wd.wall[(tx * 7 + ty * 3) % 3], tx * TS, ty * TS); else if (tt === T_CRATE) blit(c, Wd.crate, tx * TS, ty * TS); }
      const rr = rows.get(ty); if (rr) { rr.sort((a, b) => a.y - b.y); rr.forEach(o => o.f()); }
      for (let tx = tx0; tx <= tx1; tx++) if (M.tiles[ty * M.w + tx] === T_GRASS) { const sw = Math.sin(t * 1.6 + tx * .7 + ty) * 1.1; c.save(); c.translate(sw, 0); blit(c, Wd.grass[(tx * 5 + ty * 11) % 3], tx * TS, ty * TS + 1); c.restore(); }
    }
    // Geschosse
    drawProjectiles(now, t);
    // Teilchen, Zahlen
    drawParts(dt, t);
    // Namen und Leben (über allem)
    for (const o of list) drawTag(o);
    c.restore();
  }
  function drawAimHelp(t) {
    const me = S.me; if (!me.al || !S.cur || S.ph) return; const w = S.w, pl = (s, col, len, lob, d) => { const a = s.ang, x = S.cur.x, y = S.cur.y, L = len * TS; c.save(); c.lineCap = "round"; c.setLineDash([8, 7]); c.lineWidth = 3; c.strokeStyle = col; if (lob) { const dd = clampN(d, .25, 1) * L, tx = x + Math.cos(a) * dd, ty = y + Math.sin(a) * dd; c.beginPath(); c.moveTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14); c.lineTo(tx, ty); c.stroke(); c.setLineDash([]); c.fillStyle = col.replace(/[\d.]+\)$/, ".2)"); c.beginPath(); c.arc(tx, ty, lob * TS, 0, TAU); c.fill(); c.stroke(); } else { c.beginPath(); c.moveTo(x + Math.cos(a) * 16, y + Math.sin(a) * 16); c.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); c.stroke(); } c.restore(); };
    if (IN.aim.id != null && IN.aim.mag > .18) pl(IN.aim, "rgba(255,255,255,.85)", w.rng, w.t === "l" ? (w.aoe || 1.5) : 0, IN.aim.mag);
    if (IN.sup.id != null && IN.sup.mag > .18 && me.sc >= 1) pl(IN.sup, "rgba(255,210,63,.95)", w.rng, w.t === "l" ? (w.aoe || 1.5) * 1.3 : 0, IN.sup.mag);
    if (IN.mouse.in && IN.aim.id == null) { const s = { ang: IN.lastAng, mag: 1 }; pl(s, "rgba(255,255,255,.45)", w.rng, w.t === "l" ? (w.aoe || 1.5) : 0, 1); }
  }
  function drawPlayer(o, now, t, dt) {
    const { id, p, e } = o, info = e.info, me = id === S.you, st = S.me, fl = me ? st.fl : p.fl, moving = me ? !!(moveVec().x || moveVec().y) : !!(p.vx || p.vy), ally = me || (!S.ffa && info.tm === S.myTeam);
    const cos = info.c || DEFAULT_COS; let ang = me ? (IN.aim.id != null ? IN.aim.ang : IN.lastAng) : p.f;
    if (!(fl & 1)) return; e.hit = Math.max(0, e.hit - dt * 5);
    let alpha = 1; if (fl & 64) alpha = ally ? .45 : .25; else if (ally && inGrass(S.M, p.x, p.y)) alpha = .72; if (fl & 16) alpha *= .6 + .4 * Math.sin(t * 30);
    // Spur
    if (moving && !(fl & 512)) { e.rip = (e.rip || 0) - dt; if (e.rip <= 0) { e.rip = .28; S.parts.push({ ring: 1, soft: 1, x: p.x, y: p.y + 9, t: 0, life: .5, r: 13 }); } } const tr = cos.trail; if (tr && tr !== "trail_none" && moving) { e.trailT -= dt; if (e.trailT <= 0) { e.trailT = .07; S.trails.push({ x: p.x + (Math.random() - .5) * 6, y: p.y + 8, t: 0, k: tr, i: Math.floor(Math.random() * 7) }); } }
    const fa = e.fire ? now - e.fire : 9, rec = fa < .14 ? 1 - fa / .14 : 0, s = 34, scl = ((fl & 8) ? 1 + Math.sin(t * 40) * .02 : 1) * (1 - rec * .06);
    // Schild
    if (fl & 2) { c.fillStyle = "rgba(150,220,255,.3)"; c.strokeStyle = "rgba(255,255,255,.9)"; c.lineWidth = 2.4; c.beginPath(); c.arc(p.x, p.y - 4, PR + 9, 0, TAU); c.fill(); c.stroke(); }
    if (fl & 256) { c.strokeStyle = "rgba(90,230,140,.8)"; c.lineWidth = 2.4; wavyRing(c, p.x, p.y, PR + 6, t, "rgba(90,230,140,.8)", 2.4); }
    if (fl & 4) { c.fillStyle = "rgba(160,200,255,.4)"; c.beginPath(); c.ellipse(p.x, p.y + 9, 16, 6, 0, 0, TAU); c.fill(); }
    drawDrop(cr, cos, p.x - Math.cos(ang) * rec * 3, p.y - 7 - Math.sin(ang) * rec * 2, s * scl, t + id * 1.3, { moving, aim: ang, weapon: info.w, skin: cos.skin, hit: e.hit, alpha });
    if (fl & 8) { for (let i = 0; i < 3; i++) star(c, p.x + Math.cos(t * 6 + i * 2.1) * 14, p.y - 28 + Math.sin(t * 6 + i * 2.1) * 3, 4, "#ffe45e", t * 3 + i); }
  }
  function drawTag(o) {
    const { id, p, e } = o, info = e.info, me = id === S.you, fl = me ? S.me.fl : p.fl; if (!(fl & 1)) return; const ally = me || (!S.ffa && info.tm === S.myTeam);
    const hp = me ? S.me.hp : p.hp, mhp = me ? S.me.mhp : p.mhp, w = 36, y = p.y - 36, f = clampN(hp / mhp, 0, 1);
    c.fillStyle = "rgba(29,39,66,.92)"; fr(p.x - w / 2 - 2, y - 2, w + 4, 8); c.fillStyle = me ? "#4cd964" : ally ? "#5aa8ff" : "#ff5a4f"; fr(p.x - w / 2, y, w * f, 4);
    if (!me) txt(c, info.n, p.x, y - 9, 12, ally ? "#d7ecff" : "#ffd6d0"); else txt(c, Math.round(hp) + "", p.x, y - 8, 13, "#fff");
    if (me && S.me.am != null) { const n = S.w.ammo; for (let i = 0; i < n; i++) { const f2 = clampN(S.me.am - i, 0, 1); c.fillStyle = "rgba(29,39,66,.92)"; fr(p.x - w / 2 + i * (w / n), y + 8, w / n - 2, 5); c.fillStyle = "#ffb21f"; fr(p.x - w / 2 + i * (w / n), y + 9, (w / n - 2) * f2, 3); } }
    for (const em of S.emotes) if (em.id === id) { const k = Math.min(1, em.t * 6); drawEmote(c, em.n, p.x, p.y - 62 - em.t * 6, 30 * k); }
  }
  function drawProjectiles(now, t) {
    for (const b of S.bs.values()) {
      const ally = b.team === S.myTeam && !S.ffa || (S.ffa && S.snap && false), age = now - b.t0, col = b.team === S.myTeam && !S.ffa ? "#a6e1ff" : "#ffc2b8";
      if (b.k === 1) {
        const k = clampN(age / Math.max(.2, b.fl), 0, 1), x = lerp(b.x0, b.tx, k), y = lerp(b.y0, b.ty, k), hgt = Math.sin(k * Math.PI) * 36;
        c.fillStyle = hexA(b.team === S.myTeam && !S.ffa ? "#3b82d6" : "#e8523f", .18); c.beginPath(); c.arc(b.tx, b.ty, b.aoe, 0, TAU); c.fill(); c.lineWidth = 2; c.strokeStyle = hexA(b.team === S.myTeam && !S.ffa ? "#3b82d6" : "#e8523f", .55); c.setLineDash([6, 5]); c.beginPath(); c.arc(b.tx, b.ty, b.aoe, 0, TAU); c.stroke(); c.setLineDash([]);
        c.fillStyle = "rgba(20,40,70,.3)"; c.beginPath(); c.ellipse(x, y, 7, 4, 0, 0, TAU); c.fill();
        c.lineWidth = 2.2; c.strokeStyle = INK; c.fillStyle = col; c.beginPath(); c.arc(x, y - hgt - 6, 8, 0, TAU); c.fill(); c.stroke(); c.fillStyle = "rgba(255,255,255,.85)"; c.beginPath(); c.arc(x - 2.5, y - hgt - 9, 2.4, 0, 7); c.fill();
      } else if (b.k === 2) {
        const x = b.x0 + b.vx * age, y = b.y0 + b.vy * age, a = Math.atan2(b.vy, b.vx); c.save(); c.translate(x, y); c.rotate(a); c.lineWidth = 2.4; c.strokeStyle = INK; c.fillStyle = col; c.beginPath(); c.moveTo(-4, -16); c.quadraticCurveTo(14, -10, 10, 0); c.quadraticCurveTo(14, 10, -4, 16); c.quadraticCurveTo(4, 0, -4, -16); c.fill(); c.stroke(); c.restore();
      } else {
        const x = b.x0 + b.vx * age, y = b.y0 + b.vy * age, a = Math.atan2(b.vy, b.vx), r = Math.max(4, b.rad);
        c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = hexA("#ffffff", .5); c.beginPath(); c.ellipse(-r * 1.6, 0, r * 1.8, r * .5, 0, 0, TAU); c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, r * 1.15, r, 0, 0, TAU); c.fill(); c.stroke(); c.fillStyle = "rgba(255,255,255,.9)"; c.beginPath(); c.arc(-r * .2, -r * .3, r * .3, 0, 7); c.fill(); c.restore();
      }
    }
  }
  function drawParts(dt, t) {
    for (let i = S.trails.length - 1; i >= 0; i--) { const p = S.trails[i]; p.t += dt; if (p.t > 1) { S.trails.splice(i, 1); continue; } c.globalAlpha = 1 - p.t; trailDot(c, p.k, p.x, p.y - p.t * 8, 5, p.i, t); } c.globalAlpha = 1;
    for (let i = S.parts.length - 1; i >= 0; i--) { const p = S.parts[i]; p.t += dt; if (p.t > p.life) { S.parts.splice(i, 1); continue; } const k = p.t / p.life;
      if (p.ring && p.soft) { c.globalAlpha = (1 - k) * .7; c.lineWidth = 2; c.strokeStyle = "#fff"; c.beginPath(); c.ellipse(p.x, p.y, p.r * (.4 + k), p.r * (.4 + k) * .45, 0, 0, TAU); c.stroke(); c.globalAlpha = 1; } else if (p.ring) { const r = p.r * (.3 + .7 * Math.sqrt(k)); c.globalAlpha = 1 - k; if (p.fill) { c.fillStyle = hexA(p.c, .3); c.beginPath(); c.arc(p.x, p.y, r, 0, TAU); c.fill(); } c.lineWidth = 3.5; c.strokeStyle = INK; c.beginPath(); c.arc(p.x, p.y, r, 0, TAU); c.stroke(); c.lineWidth = 2; c.strokeStyle = p.c; c.beginPath(); c.arc(p.x, p.y, r - 1, 0, TAU); c.stroke(); c.globalAlpha = 1; }
      else { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; c.globalAlpha = 1 - k * k; c.fillStyle = p.c; c.strokeStyle = INK; c.lineWidth = 1.2; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); c.stroke(); c.globalAlpha = 1; } }
    for (let i = S.texts.length - 1; i >= 0; i--) { const p = S.texts[i]; p.t += dt; if (p.t > 1) { S.texts.splice(i, 1); continue; } c.globalAlpha = Math.min(1, 2 - p.t * 2); txt(c, p.s, p.x, p.y - p.t * 26, 16 * p.big, p.c); c.globalAlpha = 1; }
    for (let i = S.emotes.length - 1; i >= 0; i--) { S.emotes[i].t += dt; if (S.emotes[i].t > 2.4) S.emotes.splice(i, 1); }
    for (const f of S.feed) f.t += dt; S.feed = S.feed.filter(f => f.t < 6);
  }

  /* ---------- Zeichnen: Oberfläche ---------- */
  function drawStick(x, y, r, on, mag, ang, col, label) {
    c.save(); c.lineWidth = 3.5; c.strokeStyle = INK; c.fillStyle = on ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.16)"; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.stroke();
    const kx = x + Math.cos(ang) * r * mag * .7, ky = y + Math.sin(ang) * r * mag * .7; c.fillStyle = col; c.beginPath(); c.arc(kx, ky, r * .42, 0, TAU); c.fill(); c.stroke(); c.fillStyle = "rgba(255,255,255,.55)"; c.beginPath(); c.arc(kx - r * .12, ky - r * .14, r * .1, 0, 7); c.fill();
    if (label) txt(c, label, x, y, r * .3, "#fff"); c.restore();
  }
  function drawHud(now, t, dt, mv) {
    c.setTransform(dpr, 0, 0, dpr, 0, 0); S.hurtV = Math.max(0, (S.hurtV || 0) - dt * 2.2); const low = S.me.al && S.me.hp / S.me.mhp < .3 ? .35 + .25 * Math.sin(now * 6) : 0, vv = Math.max(S.hurtV * .6, low); if (vv > 0) { const g = cr.createRadialGradient(VW / 2, VH / 2, VH * .35, VW / 2, VH / 2, VW * .65); g.addColorStop(0, "rgba(255,60,60,0)"); g.addColorStop(1, "rgba(255,60,60," + vv + ")"); cr.fillStyle = g; cr.fillRect(0, 0, VW, VH); } { const g = cr.createRadialGradient(VW / 2, VH / 2, VH * .45, VW / 2, VH / 2, VW * .7); g.addColorStop(0, "rgba(10,30,60,0)"); g.addColorStop(1, "rgba(10,30,60,.28)"); cr.fillStyle = g; cr.fillRect(0, 0, VW, VH); } const l = lay(), me = S.me, md = S.init.mode, st = S.st || {}, ms = S.md;
    // oben Mitte: Info je Modus
    const top = (a, b) => { const w = Math.max(tw(cr, a, 26), b ? tw(cr, b, 18) : 0) + 34, h = b ? 58 : 38; plaque(c, VW / 2 - w / 2, 6, w, h); ptxt(cr, a, VW / 2, 24, 26, INK); if (b) ptxt(cr, b, VW / 2, 46, 18, "#4b5a82"); };
    const mmss = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
    if (md === "showdown") top(mmss(S.tl), "Noch " + (st.al || "?") + " im Rennen");
    else if (md === "perlen" && st.sc) { top(mmss(S.tl), `Blau ${st.sc[0]}  :  ${st.sc[1]} Rot  (Ziel ${ms.need})`); if (st.cd) txt(c, (st.cd[0] === S.myTeam ? "Halte durch!" : "Gegner gewinnt in") + " " + st.cd[1], VW / 2, 70, 22, st.cd[0] === S.myTeam ? "#7dff9a" : "#ff8c80"); }
    else if (md === "knockout" && st.rd) top(mmss(S.tl), `Runde ${st.rn}:  Blau ${st.rd[0]}  :  ${st.rd[1]} Rot  ·  übrig ${st.al[0]} gegen ${st.al[1]}`);
    else if (md === "koenig" && st.sc) top(mmss(S.tl), `Blau ${st.sc[0]}  :  ${st.sc[1]} Rot  (Ziel ${ms.goal})  ·  Becken wechselt in ${st.zt}`);
    else if (md === "heist" && st.bk) top(mmss(S.tl), "Blauer Eimer " + Math.round(100 * st.bk[0][0] / st.bk[0][1]) + " %  ·  Roter Eimer " + Math.round(100 * st.bk[1][0] / st.bk[1][1]) + " %");
    else if (md === "eroberung" && st.sc) top(mmss(S.tl), `Blau ${st.sc[0]}  :  ${st.sc[1]} Rot  (Ziel ${ms.goal})`);
    if (!S.ffa) { const tt = "Du bist Team " + (S.myTeam ? "Rot" : "Blau"), w = tw(cr, tt, 16) + 24; plaque(c, VW / 2 - w / 2, VH - 30, w, 24, S.myTeam ? "#f7c9bf" : "#c4defa"); ptxt(cr, tt, VW / 2, VH - 17, 16, INK); }
    // Abschussmeldungen
    S.feed.forEach((f, i) => { const w = tw(cr, f.s, 16) + 18; plaque(c, 8, 8 + i * 30, w, 24, f.me ? "#ffe9a0" : "#f6efd9"); ptxt(cr, f.s, 17, 21 + i * 30, 16, INK, "left"); });
    // Pause und Emote-Knopf
    for (const [b, lab] of [[l.pause, "II"], [l.emo, ""]]) { c.lineWidth = 3; c.strokeStyle = INK; c.fillStyle = "rgba(255,255,255,.85)"; c.beginPath(); c.arc(b.x, b.y, b.r, 0, TAU); c.fill(); c.stroke(); if (lab) txt(c, lab, b.x, b.y + 1, 18, INK); else drawEmote(c, 0, b.x, b.y, b.r * 1.7); }
    if (IN.emote) { c.fillStyle = "rgba(255,255,255,.4)"; c.strokeStyle = INK; for (let i = 0; i < EMOTE_N; i++) { const p = emotePos(i); drawEmote(c, i, p.x, p.y, 44); } }
    // Steuerung
    if (me.al && !S.ended) {
      const mvOn = IN.mv.id != null; const bx = mvOn ? IN.mv.ox : 86 + l.R * .6, by = mvOn ? IN.mv.oy : VH - l.R - 28; c.save(); c.lineWidth = 3.5; c.strokeStyle = INK; c.fillStyle = mvOn ? "rgba(255,255,255,.28)" : "rgba(255,255,255,.14)"; c.beginPath(); c.arc(bx, by, 54, 0, TAU); c.fill(); c.stroke(); const mm = Math.hypot(mv.x, mv.y); c.fillStyle = "#7fd0ee"; c.beginPath(); c.arc(bx + mv.x * 38, by + mv.y * 38, 24, 0, TAU); c.fill(); c.stroke(); c.restore();
      const ready = me.am >= 1, aimOn = IN.aim.id != null; drawStick(l.aim.x, l.aim.y, l.aim.r, aimOn, aimOn ? IN.aim.mag : 0, IN.aim.ang, ready ? "#ffd23f" : "#b8c0d0", "");
      // Munition als Ring
      c.save(); c.lineWidth = 6; c.strokeStyle = INK; c.beginPath(); c.arc(l.aim.x, l.aim.y, l.aim.r + 9, Math.PI * .5, Math.PI * 1.5); c.stroke(); const n = S.w.ammo; for (let i = 0; i < n; i++) { const f = clampN(me.am - i, 0, 1), a0 = Math.PI * .5 + i * Math.PI / n + .05, a1 = a0 + Math.PI / n - .1; c.strokeStyle = "#ffb21f"; c.globalAlpha = .35 + .65 * f; c.lineWidth = 4; c.beginPath(); c.arc(l.aim.x, l.aim.y, l.aim.r + 9, a0, a0 + (a1 - a0) * Math.max(.1, f)); c.stroke(); } c.restore();
      const sup = me.sc >= 1, supOn = IN.sup.id != null; drawStick(l.sup.x, l.sup.y, l.sup.r, supOn, supOn ? IN.sup.mag : 0, IN.sup.ang, sup ? "#ff7ac8" : "#8d98b4", "");
      c.save(); c.lineWidth = 5; c.strokeStyle = INK; c.beginPath(); c.arc(l.sup.x, l.sup.y, l.sup.r + 7, 0, TAU); c.stroke(); c.strokeStyle = sup ? "#ff7ac8" : "#4fd3c4"; c.lineWidth = 3.4; c.beginPath(); c.arc(l.sup.x, l.sup.y, l.sup.r + 7, -Math.PI / 2, -Math.PI / 2 + TAU * clampN(me.sc, 0.001, 1)); c.stroke(); c.restore();
      txt(c, sup ? "SUPER" : Math.floor(me.sc * 100) + "%", l.sup.x, l.sup.y + l.sup.r + 18, 14, sup ? "#ffd2ee" : "#fff");
      if (S.ab) { const a = l.ab, act = S.ab.k === "a", cd = me.ab, rdy = act && cd <= 0; c.save(); c.lineWidth = 3.5; c.strokeStyle = INK; c.fillStyle = rdy ? "#fff7c9" : "rgba(255,255,255,.55)"; c.beginPath(); c.arc(a.x, a.y, a.r, 0, TAU); c.fill(); c.stroke(); const ic = iconURL("a", S.ab.id, 96); let im = ICONIMG[ic]; if (!im) { im = ICONIMG[ic] = new Image(); im.src = ic; } if (im.complete) { c.globalAlpha = rdy || !act ? 1 : .5; c.drawImage(im, a.x - a.r * .8, a.y - a.r * .8, a.r * 1.6, a.r * 1.6); c.globalAlpha = 1; } if (act && cd > 0) { c.fillStyle = "rgba(29,39,66,.55)"; c.beginPath(); c.moveTo(a.x, a.y); c.arc(a.x, a.y, a.r - 2, -Math.PI / 2, -Math.PI / 2 + TAU * clampN(cd / S.ab.cd, 0, 1)); c.closePath(); c.fill(); txt(c, Math.ceil(cd) + "", a.x, a.y, a.r * .7, "#fff"); } if (!act) txt(c, "passiv", a.x, a.y + a.r + 12, 12, "#fff"); c.restore(); }
    }
    // Leben unten Mitte
    if (me.al) { const w = Math.min(260, VW * .3), x = VW / 2 - w / 2, y = VH - 62, f = clampN(me.hp / me.mhp, 0, 1); plaque(c, x - 8, y - 6, w + 16, 28, "#f6efd9"); c.fillStyle = "rgba(29,39,66,.18)"; fr(x, y, w, 16); c.fillStyle = f > .35 ? "#58d36c" : "#ff6a5a"; fr(x, y, w * f, 16); c.fillStyle = "rgba(255,255,255,.4)"; fr(x + 2, y + 2, Math.max(0, w * f - 4), 4); txt(c, Math.round(me.hp) + " / " + me.mhp, VW / 2, y + 9, 15, "#fff"); }
    if (md === "perlen" || me.cu) { const parts = []; if (md === "perlen") parts.push("Perlen: " + me.pr); if (me.cu) parts.push("Kraft: " + me.cu); txt(c, parts.join("   "), VW / 2, VH - 80, 18, "#ffe9a8"); }
    // Zähler und Hinweise
    if (S.ph > 0) { S.sawCount = true; const k = (now * 1) % 1; const bw = tw(cr, S.md.n, 44) + 60; plaque(c, VW / 2 - bw / 2, VH * .14, bw, 60, "#ffe9a0", -.02); ptxt(cr, S.md.n, VW / 2, VH * .14 + 31, 44, INK); txt(c, String(S.ph), VW / 2, VH * .5, 150 - k * 40, "#fff"); } else if (S.sawCount && !S.sounded) { S.sounded = 1; sfx("go"); }
    if (S.tut === undefined) { try { S.tut = localStorage.getItem("ws_tut") ? 0 : 1; } catch (e) { S.tut = 0; } } if (S.tut && !S.ended && me.al) { S.tutT = (S.tutT || 0) + dt; if (S.tutT > 14) { S.tut = 0; try { localStorage.setItem("ws_tut", "1"); } catch (e) {} } else { const a = Math.min(1, S.tutT * 2) * Math.min(1, (14 - S.tutT)); cr.globalAlpha = a; const tt = "Links ziehen: laufen  ·  Rechts ziehen und loslassen: spritzen  ·  Super: Ring voll", w = tw(cr, tt, 19) + 30; plaque(c, VW / 2 - w / 2, VH * .22, w, 34, "#fff3b8"); ptxt(cr, tt, VW / 2, VH * .22 + 18, 19, INK); cr.globalAlpha = 1; } }
    if (!me.al && !S.ended) { if (me.rs > 0) txt(c, "Zurück in " + Math.ceil(me.rs), VW / 2, VH * .4, 40, "#fff"); else if (me.sd) { txt(c, "Du bist raus – du schaust zu", VW / 2, VH * .25, 30, "#fff"); txt(c, "Tippe, um die Ansicht zu wechseln", VW / 2, VH * .25 + 30, 18, "#ffe9a8"); } }
    if (S.banner) { const b = S.banner; b.t += dt; const k = Math.min(1, b.t * 5), a = b.t > b.d - .4 ? Math.max(0, (b.d - b.t) / .4) : 1; if (b.t > b.d) S.banner = null; else { c.globalAlpha = a; txt(c, b.s, VW / 2, b.small ? VH * .3 : VH * .36, (b.small ? 28 : 52) * (.6 + .4 * k), "#ffe45e"); c.globalAlpha = 1; } }
    if (S.err) txt(c, S.err, VW / 2, VH * .55, 24, "#ffb4a8");
  }
  const ICONIMG = {};
  return { start, frame, get active() { return !!S; }, resume() { const m = stored(); if (m && Date.now() - m.at < 12 * 60e3) { start({ id: m.id }); return true; } return false; } };
})();
