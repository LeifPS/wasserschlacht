/* ===== ÖFFNUNGS-ANIMATION für Drops, Waffen und Kosmetik ===== */
function gotInfo(g) {
  if (g.k === "a") { const a = AB[g.id]; return { r: a.r, name: a.n, kind: g.dup ? "Fähigkeit (Duplikat: hilft beim Verbessern)" : "Neue Fähigkeit!", icon: iconURL("a", g.id, 192) }; }
  if (g.k === "w") { const w = W[g.id]; return { r: w.r, name: w.n, kind: "Neue Waffe!", icon: iconURL("w", g.id, 192) }; }
  const c = CO[g.id]; return { r: c.r, name: c.n, kind: g.dup ? "Doppelt! Du bekommst " + g.refund + " Münzen zurück." : "Neues Aussehen (" + COS_SLOTS.find(s => s.id === c.s).n + ")", icon: iconURL("c", g.id, 192) };
}
function revealFlow(list) {
  return new Promise(res => {
    const ov = document.createElement("div"); ov.id = "dropov"; ov.style.cssText = "position:fixed;inset:0;z-index:80;background:rgba(10,25,50,.95);display:flex;align-items:center;justify-content:center;touch-action:none";
    ov.innerHTML = `<canvas id="dropCv" style="position:absolute;inset:0;width:100%;height:100%"></canvas><div id="dropUi" style="position:relative;text-align:center;color:#fff;pointer-events:none;font-family:var(--f-display)"></div>`;
    document.body.appendChild(ov); const cv = ov.querySelector("canvas"), ui = ov.querySelector("#dropUi");
    let i = 0, A = null, ps = [];
    const start = () => { const g = list[i], info = gotInfo(g), tier = g.k === "a" ? g.tier : g.k === "w" ? Math.min(2, info.r) : Math.min(3, info.r); A = { g, info, tier, ph: "fall", t0: performance.now() / 1000, shake: 0, orb: g.k === "c" && g.tier == null ? "capsule" : "orb" }; if (g.k === "c") A.orb = "capsule"; ui.innerHTML = ""; ps = []; };
    const burst = () => {
      const r = A.info.r, n = 40 + r * 40, cols = r === 4 ? RAINBOW : r === 3 ? GOLD : [RAR_COL[r], "#fff", "#ffe9a8"];
      for (let k = 0; k < n; k++) { const a = Math.random() * TAU, v = 150 + Math.random() * (350 + r * 120); ps.push({ x: 0, y: 0, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 100, t: 0, life: 1 + Math.random() * 1.2, c: cols[k % cols.length], s: 4 + Math.random() * (6 + r * 2), sp: Math.random() < .4 }); }
      sfx("burst", r);
    };
    const show = () => {
      A.ph = "reveal"; const r = A.info.r; sfx(r >= 3 ? "win" : "pick");
      ui.innerHTML = `<div style="font-size:1.4rem;opacity:.9">${A.info.kind}</div><img src="${A.info.icon}" style="width:min(34vh,14rem);height:min(34vh,14rem);animation:pop .5s ease-out"><div style="font-size:2.8rem;line-height:1.1" class="tr${r}">${A.info.name}</div><div style="font-size:1.5rem" class="tr${r}">${RAR[r].n}</div><div style="margin-top:.6rem;font-size:1.1rem;opacity:.85">Tippen zum Weitermachen</div>`;
    };
    const tap = () => {
      if (!A) return;
      if (A.ph === "wait") { A.ph = "shake"; A.t1 = performance.now() / 1000; sfx("shake"); }
      else if (A.ph === "reveal" && performance.now() / 1000 - A.t2 > .5) { i++; if (i < list.length) start(); else end(); }
    };
    const end = () => { G.dropAnim = null; ov.remove(); res(); };
    ov.addEventListener("pointerdown", tap); start();
    G.dropAnim = (t, dt) => {
      const now = performance.now() / 1000, dpr = Math.min(2, devicePixelRatio || 1); sizeCv(cv, dpr); const c = cv.getContext("2d"), w = cv.width, h = cv.height, S = Math.min(w, h) * .5; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h);
      const el = now - A.t0, cx = w / 2, cy = h * .46, r = A.info.r;
      if (A.ph === "fall") { const k = Math.min(1, el / .8), y = lerp(-S, cy, k * k); drawOrbAt(c, A, cx, y, S, t); if (k >= 1) { A.ph = "wait"; A.t1 = now; sfx("drip"); ui.innerHTML = `<div style="position:absolute;left:50%;top:${h * .8 / dpr}px;transform:translateX(-50%);font-size:1.6rem;white-space:nowrap">Tippen zum Öffnen</div>`; } }
      else if (A.ph === "wait") { drawOrbAt(c, A, cx, cy + Math.sin(t * 3) * S * .02, S, t); if (now - A.t1 > 1.6) { A.ph = "shake"; A.t1 = now; sfx("shake"); } }
      else if (A.ph === "shake") {
        const k = (now - A.t1) / (1.1 + r * .15); ui.innerHTML = ""; const sh = Math.sin(now * 55) * S * .03 * (0.3 + k), sc = 1 + k * .25;
        c.save(); c.translate(cx + sh, cy); c.rotate(Math.sin(now * 40) * .06 * k); c.scale(sc, sc); c.translate(-cx, -cy); drawOrbAt(c, A, cx, cy, S, t); c.restore();
        c.fillStyle = `rgba(255,255,255,${Math.max(0, k - .6) * 1.6})`; c.fillRect(0, 0, w, h);
        if (Math.floor(now * 9) !== A.shake) { A.shake = Math.floor(now * 9); if (k < .9) sfx("shake"); }
        if (k >= 1) { A.ph = "burst"; A.t2 = now; burst(); show(); }
      } else {
        const k = Math.min(1, (now - A.t2) / .35); if (k < 1) { c.fillStyle = `rgba(255,255,255,${1 - k})`; c.fillRect(0, 0, w, h); }
        if (r >= 3) { const g = c.createRadialGradient(cx, cy, 10, cx, cy, S * 1.2); g.addColorStop(0, r === 4 ? "rgba(255,150,230,.35)" : "rgba(255,200,60,.35)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(0, 0, w, h); for (let a = 0; a < 12; a++) { c.save(); c.translate(cx, cy); c.rotate(a * TAU / 12 + now * .4); c.fillStyle = r === 4 ? RAINBOW[a % 7] : "#ffd23f"; c.globalAlpha = .14; c.beginPath(); c.moveTo(0, 0); c.lineTo(S * 1.6, -S * .09); c.lineTo(S * 1.6, S * .09); c.fill(); c.restore(); } }
      }
      for (let k = ps.length - 1; k >= 0; k--) { const p = ps[k]; p.t += dt; if (p.t > p.life) { ps.splice(k, 1); continue; } p.vy += 500 * dt; p.x += p.vx * dt * dpr; p.y += p.vy * dt * dpr; c.globalAlpha = 1 - p.t / p.life; if (p.sp) star(c, cx + p.x, cy + p.y, p.s * dpr, p.c, p.t * 3); else { c.fillStyle = p.c; c.beginPath(); c.arc(cx + p.x, cy + p.y, p.s * dpr * .6, 0, 7); c.fill(); } }
      c.globalAlpha = 1;
    };
  });
}
function drawOrbAt(c, A, x, y, S, t) {
  c.save(); c.translate(x - S / 2, y - S / 2);
  if (A.g.k === "c") drawCapsule(c, S, t); else drawDropOrb(c, A.tier, S, t, false);
  c.restore();
}
