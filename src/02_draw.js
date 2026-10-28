/* ===== GRAFIK: alles per Code handgezeichnet (Tropfen, Hüte, Waffen, Symbole) ===== */

/* ---------- Tropfen ---------- */
function dropPath(k, s) {
  k.beginPath(); k.moveTo(0, -.66 * s);
  k.bezierCurveTo(.1 * s, -.4 * s, .45 * s, -.14 * s, .45 * s, .16 * s);
  k.bezierCurveTo(.45 * s, .42 * s, .25 * s, .58 * s, 0, .58 * s);
  k.bezierCurveTo(-.25 * s, .58 * s, -.45 * s, .42 * s, -.45 * s, .16 * s);
  k.bezierCurveTo(-.45 * s, -.14 * s, -.1 * s, -.4 * s, 0, -.66 * s); k.closePath();
}
function bodyFill(c, colId, s, t) {
  const it = CO[colId] || CO.col_himmel;
  if (it.anim === "sun") return animGrad(c, "gold", -.6 * s, -.3 * s, .6 * s, .3 * s, t, 0.4);
  if (it.anim === "rainbow") return animGrad(c, "rainbow", -.6 * s, -.3 * s, .6 * s, .3 * s, t, 0.35);
  return it.col;
}
function maxCosRar(cos) { let r = 0; for (const k in cos) { const it = CO[cos[k]]; if (it && it.r > r && it.s !== "skin") r = it.r; } return r; }

const FACE = {
  normal(k, s, t, bl) { eyes(k, s, bl); mouth(k, s, 0); },
  froh(k, s, t) { k.strokeStyle = INK; k.lineWidth = Math.max(2, s * .05); [-1, 1].forEach(d => { k.beginPath(); k.arc(d * .15 * s, .13 * s, .06 * s, Math.PI * 1.05, Math.PI * 1.95); k.stroke(); }); k.fillStyle = "#ffffffcc"; mouth(k, s, 1); },
  taucher(k, s, t, bl) { eyes(k, s, bl); k.lineWidth = Math.max(2, s * .045); k.strokeStyle = INK; k.fillStyle = "rgba(160,230,255,.45)"; k.beginPath(); k.ellipse(0, .12 * s, .27 * s, .12 * s, 0, 0, 7); k.fill(); k.stroke(); k.strokeStyle = "#e8523f"; k.lineWidth = Math.max(2.5, s * .06); k.beginPath(); k.ellipse(0, .12 * s, .29 * s, .14 * s, 0, 0, 7); k.stroke(); mouth(k, s, 0); },
  cool(k, s, t) { k.fillStyle = "#222"; k.strokeStyle = INK; k.lineWidth = Math.max(2, s * .04); [-1, 1].forEach(d => { k.beginPath(); k.roundRect(d * .15 * s - .11 * s, .06 * s, .22 * s, .15 * s); FS(k, "#26304f"); }); k.beginPath(); k.moveTo(-.04 * s, .1 * s); k.lineTo(.04 * s, .1 * s); k.stroke(); k.fillStyle = "#fff8"; k.beginPath(); k.ellipse(-.2 * s, .1 * s, .03 * s, .02 * s, 0, 0, 7); k.fill(); mouth(k, s, 0); },
  herz(k, s, t) { const p = 1 + Math.sin(t * 5) * .08; [-1, 1].forEach(d => heart(k, d * .15 * s, .13 * s, .11 * s * p, "#ff4f7e")); mouth(k, s, 1); },
  monokel(k, s, t, bl) { eyes(k, s, bl); k.strokeStyle = "#d9a21f"; k.lineWidth = Math.max(2, s * .05); k.beginPath(); k.arc(.15 * s, .14 * s, .13 * s, 0, 7); k.stroke(); k.beginPath(); k.moveTo(.2 * s, .26 * s); k.quadraticCurveTo(.3 * s, .42 * s, .22 * s, .5 * s); k.stroke(); mouth(k, s, 0); },
  laser(k, s, t) { [-1, 1].forEach(d => { const g = k.createRadialGradient(d * .15 * s, .13 * s, 0, d * .15 * s, .13 * s, .17 * s); g.addColorStop(0, "#fff"); g.addColorStop(.35, "#ff3a3a"); g.addColorStop(1, "rgba(255,60,60,0)"); k.fillStyle = g; k.beginPath(); k.arc(d * .15 * s, .13 * s, .17 * s * (1 + .12 * Math.sin(t * 8)), 0, 7); k.fill(); k.fillStyle = "#ff2b2b"; k.beginPath(); k.ellipse(d * .15 * s, .13 * s, .045 * s, .06 * s, 0, 0, 7); k.fill(); }); mouth(k, s, 0); },
  stern(k, s, t) { [-1, 1].forEach((d, i) => { star(k, d * .15 * s, .13 * s, .12 * s * (1 + .15 * Math.sin(t * 6 + i)), animGrad(k, "gold", -s * .3, 0, s * .3, 0, t, .6), t * .4 * d); }); mouth(k, s, 1); }
};
function eyes(k, s, bl) { k.fillStyle = INK; [-1, 1].forEach(d => { k.beginPath(); k.ellipse(d * .15 * s, .14 * s, .05 * s, .075 * s * (bl == null ? 1 : bl), 0, 0, 7); k.fill(); }); k.fillStyle = "#fff"; [-1, 1].forEach(d => { k.beginPath(); k.arc(d * .15 * s - .015 * s, .12 * s, .018 * s, 0, 7); k.fill(); }); }
function mouth(k, s, big) { k.strokeStyle = INK; k.lineWidth = Math.max(1.6, s * .04); k.beginPath(); if (big) { k.arc(0, .27 * s, .08 * s, .1, Math.PI - .1); k.closePath(); k.fillStyle = "#7a2a3a"; k.fill(); k.stroke(); } else { k.arc(0, .26 * s, .06 * s, .25, Math.PI - .25); k.stroke(); } }
function heart(k, x, y, r, col) { k.fillStyle = col; k.strokeStyle = INK; k.lineWidth = Math.max(1.5, r * .22); k.beginPath(); k.moveTo(x, y + r * .9); k.bezierCurveTo(x - r * 1.5, y - r * .1, x - r * .5, y - r * 1.1, x, y - r * .35); k.bezierCurveTo(x + r * .5, y - r * 1.1, x + r * 1.5, y - r * .1, x, y + r * .9); k.closePath(); k.fill(); k.stroke(); }
function star(k, x, y, r, fill, rot) { k.save(); k.translate(x, y); k.rotate(rot || 0); k.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; k.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } k.closePath(); k.fillStyle = fill; k.strokeStyle = INK; k.lineWidth = Math.max(1.4, r * .16); k.fill(); k.stroke(); k.restore(); }

const HAT = {   // Unterkante liegt bei y = 0
  kappe(k, s) { k.fillStyle = "#d9483b"; k.beginPath(); k.ellipse(0, -.02 * s, .3 * s, .2 * s, 0, Math.PI, 0); k.closePath(); FS(k, "#d9483b"); k.beginPath(); k.ellipse(.2 * s, -.01 * s, .22 * s, .05 * s, .1, 0, 7); FS(k, "#b3372c"); },
  stroh(k, s) { k.beginPath(); k.ellipse(0, -.01 * s, .46 * s, .09 * s, 0, 0, 7); FS(k, "#e8c46a"); k.beginPath(); k.ellipse(0, -.05 * s, .24 * s, .2 * s, 0, Math.PI, 0); k.closePath(); FS(k, "#f0d27e"); k.beginPath(); k.rect(-.24 * s, -.1 * s, .48 * s, .06 * s); FS(k, "#c9482f"); },
  party(k, s) { k.beginPath(); k.moveTo(-.2 * s, 0); k.lineTo(0, -.55 * s); k.lineTo(.2 * s, 0); k.closePath(); FS(k, "#ff6fb0"); k.strokeStyle = "#ffe45e"; k.lineWidth = Math.max(2, s * .04); [.15, .3].forEach(h => { k.beginPath(); k.moveTo(-.2 * s * (1 - h * 1.6), -h * s); k.lineTo(.2 * s * (1 - h * 1.6), -h * s); k.stroke(); }); k.beginPath(); k.arc(0, -.56 * s, .06 * s, 0, 7); FS(k, "#ffe45e"); },
  zylinder(k, s) { k.beginPath(); k.ellipse(0, -.01 * s, .34 * s, .07 * s, 0, 0, 7); FS(k, "#2a2f45"); k.beginPath(); k.rect(-.2 * s, -.46 * s, .4 * s, .44 * s); FS(k, "#343a57"); k.beginPath(); k.rect(-.2 * s, -.14 * s, .4 * s, .07 * s); FS(k, "#d8483b"); },
  pirat(k, s) { k.beginPath(); k.moveTo(-.42 * s, -.02 * s); k.quadraticCurveTo(-.3 * s, -.34 * s, 0, -.34 * s); k.quadraticCurveTo(.3 * s, -.34 * s, .42 * s, -.02 * s); k.quadraticCurveTo(0, .06 * s, -.42 * s, -.02 * s); k.closePath(); FS(k, "#262a3c"); k.fillStyle = "#fff"; k.beginPath(); k.arc(0, -.17 * s, .05 * s, 0, 7); k.fill(); k.strokeStyle = "#fff"; k.lineWidth = Math.max(1.5, s * .03); k.beginPath(); k.moveTo(-.07 * s, -.1 * s); k.lineTo(.07 * s, -.1 * s); k.stroke(); },
  zauber(k, s) { k.beginPath(); k.ellipse(0, -.02 * s, .4 * s, .08 * s, 0, 0, 7); FS(k, "#6a3fc4"); k.beginPath(); k.moveTo(-.22 * s, -.03 * s); k.quadraticCurveTo(-.05 * s, -.35 * s, .12 * s, -.66 * s); k.quadraticCurveTo(.2 * s, -.3 * s, .22 * s, -.03 * s); k.closePath(); FS(k, "#7b4fd6"); star(k, -.02 * s, -.26 * s, .07 * s, "#ffe45e"); star(k, .08 * s, -.42 * s, .04 * s, "#fff2a8"); },
  blumen(k, s) { const cols = ["#ff6fb0", "#ffe45e", "#fff", "#ff9d4f", "#b58cf2"], lw = k.lineWidth; k.lineWidth = Math.max(1.2, s * .02); for (let i = 0; i < 7; i++) { const a = Math.PI + (i / 6) * Math.PI, x = Math.cos(a) * .3 * s, y = -.04 * s + Math.sin(a) * .16 * s; for (let j = 0; j < 5; j++) { const b = j * 1.2566; k.beginPath(); k.arc(x + Math.cos(b) * .05 * s, y + Math.sin(b) * .05 * s, .04 * s, 0, 7); FS(k, cols[i % 5]); } k.beginPath(); k.arc(x, y, .03 * s, 0, 7); FS(k, "#ffe45e"); } k.lineWidth = lw; },
  krone(k, s, t) { const g = animGrad(k, "gold", -.3 * s, -.4 * s, .3 * s, 0, t || 0, .5); k.beginPath(); k.moveTo(-.3 * s, -.01 * s); k.lineTo(-.33 * s, -.42 * s); k.lineTo(-.15 * s, -.22 * s); k.lineTo(0, -.5 * s); k.lineTo(.15 * s, -.22 * s); k.lineTo(.33 * s, -.42 * s); k.lineTo(.3 * s, -.01 * s); k.closePath(); FS(k, g); [[-.33, -.42, "#ff4f4f"], [0, -.5, "#2eb6ff"], [.33, -.42, "#35d96a"]].forEach(p => { k.beginPath(); k.arc(p[0] * s, p[1] * s, .045 * s, 0, 7); FS(k, p[2]); }); },
  heilig(k, s, t) { const y = -.2 * s + Math.sin((t || 0) * 2.5) * .03 * s; k.save(); k.shadowColor = "#fff6a0"; k.shadowBlur = s * .25; k.strokeStyle = "#ffd84a"; k.lineWidth = Math.max(3, s * .07); k.beginPath(); k.ellipse(0, y - .22 * s, .26 * s, .08 * s, 0, 0, 7); k.stroke(); k.restore(); k.strokeStyle = "#fff6c0"; k.lineWidth = Math.max(1.5, s * .025); k.beginPath(); k.ellipse(0, y - .23 * s, .26 * s, .08 * s, 0, Math.PI * 1.1, Math.PI * 1.7); k.stroke(); }
};
const BACKB = {  // hinter dem Körper
  umhang(k, s) { k.beginPath(); k.moveTo(-.3 * s, -.18 * s); k.quadraticCurveTo(-.62 * s, .3 * s, -.5 * s, .62 * s); k.lineTo(.5 * s, .62 * s); k.quadraticCurveTo(.62 * s, .3 * s, .3 * s, -.18 * s); k.closePath(); FS(k, "#d9483b"); },
  rucksack(k, s) { k.beginPath(); k.roundRect(-.5 * s, -.02 * s, .22 * s, .38 * s); FS(k, "#a8763c"); k.beginPath(); k.roundRect(.28 * s, -.02 * s, .22 * s, .38 * s); FS(k, "#a8763c"); },
  engel(k, s, t) { const f = Math.sin(t * 6) * .12; [-1, 1].forEach(d => { k.beginPath(); k.moveTo(d * .3 * s, .05 * s); k.bezierCurveTo(d * .75 * s, (-.35 + f) * s, d * .95 * s, (-.05 + f) * s, d * .8 * s, (.2 + f) * s); k.bezierCurveTo(d * .6 * s, .22 * s, d * .5 * s, .2 * s, d * .3 * s, .3 * s); k.closePath(); FS(k, "#fff"); }); },
  jet(k, s, t) { [-1, 1].forEach(d => { k.beginPath(); k.roundRect(d * .42 * s - .09 * s, -.05 * s, .18 * s, .42 * s); FS(k, "#8d94ad"); const fl = .12 + .05 * Math.sin(t * 25 + d); k.beginPath(); k.moveTo(d * .42 * s - .07 * s, .37 * s); k.quadraticCurveTo(d * .42 * s, (.37 + fl * 3) * s, d * .42 * s + .07 * s, .37 * s); k.closePath(); FS(k, "#ff9d1c"); k.beginPath(); k.moveTo(d * .42 * s - .04 * s, .37 * s); k.quadraticCurveTo(d * .42 * s, (.37 + fl * 1.8) * s, d * .42 * s + .04 * s, .37 * s); k.closePath(); k.fillStyle = "#ffe45e"; k.fill(); }); },
  regenb(k, s, t) { const f = Math.sin(t * 5) * .1; [-1, 1].forEach(d => { for (let i = 0; i < RAINBOW.length; i++) { const sc = 1 - i * .1; k.beginPath(); k.moveTo(d * .3 * s, .05 * s); k.bezierCurveTo(d * .75 * s * sc, (-.4 + f) * s * sc, d * 1.0 * s * sc, (-.05 + f) * s * sc, d * .8 * s * sc, (.25 + f) * s * sc); k.lineTo(d * .3 * s, .3 * s); k.closePath(); k.fillStyle = RAINBOW[(i + Math.floor(t * 3)) % 7]; k.fill(); } k.beginPath(); k.moveTo(d * .3 * s, .05 * s); k.bezierCurveTo(d * .75 * s, (-.4 + f) * s, d * 1.0 * s, (-.05 + f) * s, d * .8 * s, (.25 + f) * s); k.lineTo(d * .3 * s, .3 * s); k.closePath(); k.stroke(); }); }
};
function backFront(k, id, s) { if (id === "back_ring") { k.lineWidth = Math.max(3, s * .08); k.strokeStyle = "#fff"; k.beginPath(); k.ellipse(0, .36 * s, .5 * s, .15 * s, 0, 0, Math.PI); k.stroke(); k.strokeStyle = INK; k.lineWidth = Math.max(1.5, s * .035); k.beginPath(); k.ellipse(0, .36 * s, .5 * s, .15 * s, 0, 0, Math.PI); k.stroke(); k.strokeStyle = "#e8523f"; k.lineWidth = Math.max(3, s * .08); [[.15, .7], [1.2, 1.9], [2.35, 2.95]].forEach(a => { k.beginPath(); k.ellipse(0, .36 * s, .5 * s, .15 * s, 0, a[0], a[1]); k.stroke(); }); } }
function backBehind(k, id, s, t) { if (id === "back_ring") { k.lineWidth = Math.max(3, s * .08); k.strokeStyle = "#fff"; k.beginPath(); k.ellipse(0, .36 * s, .5 * s, .15 * s, 0, Math.PI, TAU); k.stroke(); } else { const f = BACKB[id.slice(5)]; if (f) f(k, s, t); } }

/* Seltenheits-Partikel um den Tropfen (Legendär: goldene Funken, Göttlich: Regenbogen-Funken und Glanz) */
function auraFx(c, r, s, t, seed) {
  if (r < 3) return; const n = r === 3 ? 5 : 9;
  c.save();
  if (r === 4) { const g = c.createRadialGradient(0, .1 * s, s * .2, 0, .1 * s, s * .9); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(.7, hexA(RAINBOW[Math.floor(t * 2) % 7], .18)); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.beginPath(); c.arc(0, .1 * s, s * .9, 0, 7); c.fill(); }
  for (let i = 0; i < n; i++) {
    const ph = ((t * (.5 + (i % 3) * .15) + i / n + (seed || 0)) % 1), a = i * 2.4 + t * .8, rr = s * (.5 + .22 * Math.sin(a * 1.3)), x = Math.cos(a) * rr, y = s * .45 - ph * s * 1.1;
    c.globalAlpha = Math.sin(ph * Math.PI); const col = r === 4 ? RAINBOW[i % 7] : (i % 2 ? "#ffd23f" : "#ff9d1c");
    star(c, x, y, s * (.05 + .03 * Math.sin(t * 5 + i)), col, t + i);
  }
  c.restore();
}

/* Der Tropfen selbst. o: { moving, aim (Winkel), weapon, skin, blink, sx, sy, alpha, hit (0..1 Treffer-Blitz), ghost } */
function drawDrop(c, cos, x, y, s, t, o) {
  o = o || {}; cos = cos || DEFAULT_COS;
  const seed = strSeed(cos.color || "x"), bob = o.moving ? Math.abs(Math.sin(t * 11)) * s * .06 : Math.sin(t * 2.2) * s * .012, sq = o.moving ? Math.sin(t * 11) * .035 : Math.sin(t * 2.2) * .02;
  c.save(); c.translate(x, y - bob); if (o.alpha != null) c.globalAlpha = o.alpha;
  // Schatten
  c.fillStyle = "rgba(20,40,70,.25)"; c.beginPath(); c.ellipse(0, .6 * s + bob, .36 * s, .09 * s, 0, 0, 7); c.fill();
  c.scale((o.sx || 1) * (1 - sq), (o.sy || 1) * (1 + sq));
  c.lineJoin = c.lineCap = "round"; c.lineWidth = Math.max(2, s * .055); c.strokeStyle = INK;
  const k = sketchCtx(c, seed, s), r = maxCosRar(cos);
  if (r >= 3) auraFx(c, r, s, t, seed);
  // Rückenstück
  backBehind(k, cos.back || "back_none", s, t);
  // Waffe hinter dem Körper, wenn nach oben gezielt wird
  const aim = o.aim, up = aim != null && Math.sin(aim) < -.2;
  if (o.weapon && up) drawHeld(c, o.weapon, o.skin, aim, s, t);
  // Füße
  const fs = o.moving ? Math.sin(t * 11) * .06 * s : 0; k.fillStyle = "#fff"; [-1, 1].forEach(d => { k.beginPath(); k.ellipse(d * .17 * s, .6 * s + (d > 0 ? fs : -fs) * .5, .1 * s, .055 * s, 0, 0, 7); k.fillStyle = bodyColorFlat(cos); k.fill(); k.stroke(); });
  // Körper
  dropPath(k, s); k.fillStyle = bodyFill(c, cos.color, s, t); k.fill(); k.stroke();
  // Licht und Schatten
  c.save(); dropPath(c, s); c.clip();
  const sh = c.createLinearGradient(0, -.2 * s, 0, .6 * s); sh.addColorStop(0, "rgba(255,255,255,0)"); sh.addColorStop(1, "rgba(10,30,80,.22)"); c.fillStyle = sh; c.fillRect(-s, -s, 2 * s, 2 * s);
  c.fillStyle = "rgba(255,255,255,.5)"; c.beginPath(); c.ellipse(-.2 * s, -.02 * s, .07 * s, .14 * s, .45, 0, 7); c.fill();
  c.fillStyle = "rgba(255,255,255,.35)"; c.beginPath(); c.arc(-.12 * s, -.22 * s, .03 * s, 0, 7); c.fill();
  if (o.hit) { c.fillStyle = "rgba(255,255,255," + (o.hit * .75) + ")"; c.fillRect(-s, -s, 2 * s, 2 * s); }
  c.restore();
  // Gesicht
  const bl = (Math.floor(t * .7 + seed * 3) % 5 === 0 && (t * .7) % 1 < .14) ? .25 : 1;
  const fid = (cos.face || "face_normal").slice(5); (FACE[fid] || FACE.normal)(k, s, t, bl);
  // Hut
  const hid = (cos.hat || "hat_none").slice(4); if (HAT[hid]) { c.save(); c.translate(0, -.3 * s); HAT[hid](k, s, t); c.restore(); }
  backFront(k, cos.back, s);
  // Waffe vor dem Körper
  if (o.weapon && !up) drawHeld(c, o.weapon, o.skin, aim == null ? 0 : aim, s, t);
  c.restore();
}
function bodyColorFlat(cos) { const it = CO[cos.color] || CO.col_himmel; return it.anim === "sun" ? "#ffb21f" : it.anim === "rainbow" ? "#ff8fb8" : it.col; }
function drawHeld(c, wid, skin, aim, s, t) {
  const left = Math.cos(aim) < 0; c.save(); c.translate(Math.cos(aim) * .2 * s, .22 * s + Math.sin(aim) * .1 * s); c.rotate(aim); if (left) c.scale(1, -1);
  drawWeapon(c, wid, skin, s * .62, t); c.restore();
}

/* ---------- Waffen (zeigen nach rechts, Ursprung am Griff) ---------- */
const WPAL = {
  pistole: ["#4aa3d8", "#ffd23f"], flasche: ["#ffd23f", "#e8523f"], schlauch: ["#3fae6a", "#dfe3ea"], ballon: ["#e8523f", "#a8763c"], scharf: ["#6a7aa0", "#2fbf6a"],
  eis: ["#9fe3ff", "#ffffff"], reiniger: ["#ffb21f", "#5a6076"], minigun: ["#8d94ad", "#e8523f"], tsunami: ["#2a6fd6", "#bfe8ff"], regenbogen: ["#ff5ea8", "#ffffff"]
};
function weaponColors(c, wid, skin, s, t) {
  let [m, a] = WPAL[wid] || WPAL.pistole;
  if (skin === "skin_pastell") { m = "#f5b8d0"; a = "#b8e8d0"; } else if (skin === "skin_tarn") { m = "#5d7a3a"; a = "#8a6a3a"; }
  else if (skin === "skin_neon") { m = "#39ff6a"; a = "#ff2fd0"; } else if (skin === "skin_gold") { m = animGrad(c, "gold", -s * .2, -s * .3, s * .8, s * .3, t, .45); a = "#fff2a8"; }
  else if (skin === "skin_regen") { m = animGrad(c, "rainbow", -s * .2, -s * .3, s * .8, s * .3, t, .4); a = "#ffffff"; }
  else if (wid === "regenbogen") m = animGrad(c, "rainbow", -s * .2, -s * .3, s * .8, s * .3, t, .4);
  return [m, a];
}
function drawWeapon(c, wid, skin, s, t) {
  const k = sketchCtx(c, strSeed(wid), s), [m, a] = weaponColors(c, wid, skin, s, t || 0);
  c.save(); c.lineJoin = c.lineCap = "round"; c.lineWidth = Math.max(2, s * .075); c.strokeStyle = INK;
  const F = col => { k.fillStyle = col; k.fill(); k.stroke(); };
  switch (wid) {
    case "pistole":
      k.beginPath(); k.roundRect(-.1 * s, -.16 * s, .7 * s, .26 * s); F(m); k.beginPath(); k.roundRect(.55 * s, -.1 * s, .3 * s, .13 * s); F(a);
      k.beginPath(); k.moveTo(-.02 * s, .1 * s); k.lineTo(-.1 * s, .38 * s); k.lineTo(.12 * s, .38 * s); k.lineTo(.18 * s, .1 * s); k.closePath(); F(a);
      k.beginPath(); k.roundRect(.1 * s, -.34 * s, .34 * s, .2 * s); k.fillStyle = "rgba(160,225,255,.8)"; k.fill(); k.stroke(); break;
    case "flasche":
      k.beginPath(); k.moveTo(-.2 * s, -.2 * s); k.quadraticCurveTo(-.3 * s, .02 * s, -.2 * s, .24 * s); k.lineTo(.3 * s, .24 * s); k.quadraticCurveTo(.4 * s, 0, .3 * s, -.2 * s); k.closePath(); F(m);
      k.beginPath(); k.rect(.3 * s, -.1 * s, .22 * s, .2 * s); F(a); k.beginPath(); k.rect(.5 * s, -.06 * s, .22 * s, .1 * s); F("#fff"); break;
    case "schlauch":
      k.strokeStyle = INK; k.lineWidth = s * .2; k.beginPath(); k.moveTo(-.4 * s, .3 * s); k.bezierCurveTo(-.3 * s, -.2 * s, .1 * s, .5 * s, .2 * s, 0); k.stroke(); k.strokeStyle = m; k.lineWidth = s * .12; k.beginPath(); k.moveTo(-.4 * s, .3 * s); k.bezierCurveTo(-.3 * s, -.2 * s, .1 * s, .5 * s, .2 * s, 0); k.stroke(); c.strokeStyle = INK; c.lineWidth = Math.max(2, s * .075);
      k.beginPath(); k.roundRect(.15 * s, -.12 * s, .4 * s, .24 * s); F(a); k.beginPath(); k.moveTo(.55 * s, -.14 * s); k.lineTo(.8 * s, -.06 * s); k.lineTo(.8 * s, .06 * s); k.lineTo(.55 * s, .14 * s); k.closePath(); F(m); break;
    case "ballon":
      k.beginPath(); k.moveTo(-.1 * s, .1 * s); k.lineTo(-.2 * s, .4 * s); k.lineTo(.04 * s, .4 * s); k.lineTo(.1 * s, .1 * s); k.closePath(); F(a);
      k.beginPath(); k.moveTo(-.12 * s, -.05 * s); k.lineTo(.62 * s, -.2 * s); k.lineTo(.62 * s, .02 * s); k.lineTo(-.12 * s, .16 * s); k.closePath(); F("#a8763c");
      k.beginPath(); k.arc(.5 * s, -.38 * s, .22 * s, 0, 7); F(m); k.beginPath(); k.moveTo(.46 * s, -.17 * s); k.lineTo(.54 * s, -.17 * s); k.lineTo(.5 * s, -.1 * s); k.closePath(); F(m); break;
    case "scharf":
      k.beginPath(); k.roundRect(-.2 * s, -.1 * s, .5 * s, .22 * s); F(m); k.beginPath(); k.rect(.3 * s, -.05 * s, .65 * s, .1 * s); F("#aeb6cf"); k.beginPath(); k.roundRect(.05 * s, -.26 * s, .3 * s, .13 * s); F(a);
      k.beginPath(); k.moveTo(-.05 * s, .12 * s); k.lineTo(-.14 * s, .36 * s); k.lineTo(.06 * s, .36 * s); k.lineTo(.12 * s, .12 * s); k.closePath(); F("#4a5270"); break;
    case "eis":
      k.beginPath(); k.roundRect(-.15 * s, -.2 * s, .85 * s, .34 * s); F(m); k.beginPath(); k.roundRect(.62 * s, -.26 * s, .2 * s, .46 * s); F(a);
      k.beginPath(); k.moveTo(-.04 * s, .14 * s); k.lineTo(-.12 * s, .38 * s); k.lineTo(.1 * s, .38 * s); k.lineTo(.14 * s, .14 * s); k.closePath(); F("#6aa8c4"); k.strokeStyle = "#5a8ab0"; k.lineWidth = Math.max(1.5, s * .04); [0, 1, 2].forEach(i => { k.beginPath(); k.moveTo(.1 * s + i * .15 * s, -.1 * s); k.lineTo(.1 * s + i * .15 * s, .06 * s); k.stroke(); }); c.strokeStyle = INK; c.lineWidth = Math.max(2, s * .075); break;
    case "reiniger":
      k.beginPath(); k.roundRect(-.15 * s, -.22 * s, .45 * s, .38 * s); F(m); k.beginPath(); k.rect(.3 * s, -.06 * s, .6 * s, .1 * s); F(a); k.beginPath(); k.moveTo(-.02 * s, .16 * s); k.lineTo(-.1 * s, .4 * s); k.lineTo(.12 * s, .4 * s); k.lineTo(.16 * s, .16 * s); k.closePath(); F("#4a5270");
      k.beginPath(); k.arc(.08 * s, -.03 * s, .09 * s, 0, 7); F("#fff"); break;
    case "minigun":
      k.beginPath(); k.roundRect(-.2 * s, -.2 * s, .4 * s, .4 * s); F(m); [-.12, 0, .12].forEach(y => { k.beginPath(); k.roundRect(.2 * s, (y - .045) * s, .65 * s, .09 * s); F("#aeb6cf"); }); k.beginPath(); k.roundRect(.8 * s, -.19 * s, .08 * s, .38 * s); F(a); k.beginPath(); k.arc(-.2 * s, 0, .1 * s, 0, 7); F(a); break;
    case "tsunami":
      k.beginPath(); k.moveTo(-.2 * s, -.24 * s); k.lineTo(.5 * s, -.34 * s); k.lineTo(.5 * s, .3 * s); k.lineTo(-.2 * s, .2 * s); k.closePath(); F(m); k.beginPath(); k.moveTo(.5 * s, -.38 * s); k.lineTo(.85 * s, -.5 * s); k.lineTo(.85 * s, .46 * s); k.lineTo(.5 * s, .34 * s); k.closePath(); F(a);
      k.strokeStyle = "#fff"; k.lineWidth = Math.max(1.6, s * .04); k.beginPath(); k.moveTo(-.1 * s, .02 * s); k.quadraticCurveTo(.05 * s, -.2 * s, .15 * s, .02 * s); k.quadraticCurveTo(.25 * s, .2 * s, .4 * s, -.05 * s); k.stroke(); c.strokeStyle = INK; c.lineWidth = Math.max(2, s * .075); break;
    case "regenbogen":
      k.beginPath(); k.moveTo(.05 * s, .4 * s); k.bezierCurveTo(.05 * s, -.55 * s, .9 * s, -.55 * s, .9 * s, .4 * s); k.lineTo(.62 * s, .4 * s); k.bezierCurveTo(.62 * s, -.2 * s, .32 * s, -.2 * s, .32 * s, .4 * s); k.closePath(); F(m);
      k.strokeStyle = a; k.lineWidth = Math.max(1.6, s * .04); k.beginPath(); k.moveTo(.2 * s, .4 * s); k.bezierCurveTo(.2 * s, -.2 * s, .75 * s, -.2 * s, .75 * s, .4 * s); k.stroke(); c.strokeStyle = INK; c.lineWidth = Math.max(2, s * .075);
      k.beginPath(); k.roundRect(-.1 * s, .05 * s, .3 * s, .14 * s); F("#4a5270"); break;
  }
  if (skin === "skin_tarn") { c.fillStyle = "rgba(40,60,20,.55)"; [[.1, -.05, .07], [.35, .02, .06], [.2, .12, .05], [.5, -.07, .05]].forEach(p => { c.beginPath(); c.ellipse(p[0] * s, p[1] * s, p[2] * s * 1.3, p[2] * s, .5, 0, 7); c.fill(); }); }
  c.restore();
}

/* ---------- Symbole (Fähigkeiten und Oberfläche) ---------- */
function drawAbilityIcon(c, id, s) {
  const k = sketchCtx(c, strSeed(id), s); c.save(); c.translate(s / 2, s / 2); c.lineJoin = c.lineCap = "round"; c.lineWidth = Math.max(2, s * .06); c.strokeStyle = INK;
  const F = col => { k.fillStyle = col; k.fill(); k.stroke(); }, u = s * .5;
  const miniDrop = (x, y, r, col) => { k.beginPath(); k.moveTo(x, y - r * 1.4); k.bezierCurveTo(x + r * .3, y - r * .7, x + r, y - r * .3, x + r, y + r * .3); k.bezierCurveTo(x + r, y + r, x - r, y + r, x - r, y + r * .3); k.bezierCurveTo(x - r, y - r * .3, x - r * .3, y - r * .7, x, y - r * 1.4); k.closePath(); F(col); };
  const cloud = (ox, oy, fill) => { const arcs = [[-.4, .1, .4], [0, -.15, .5], [.45, .1, .4]]; for (const a of arcs) { k.beginPath(); k.arc(ox + a[0] * u, oy + a[1] * u, a[2] * u, 0, 7); k.stroke(); } for (const a of arcs) { k.beginPath(); k.arc(ox + a[0] * u, oy + a[1] * u, a[2] * u * .96, 0, 7); k.fillStyle = fill; k.fill(); } };
  const line = (x0, y0, x1, y1, col, w) => { k.strokeStyle = col || INK; k.lineWidth = w || c.lineWidth; k.beginPath(); k.moveTo(x0, y0); k.lineTo(x1, y1); k.stroke(); k.strokeStyle = INK; k.lineWidth = Math.max(2, s * .06); };
  switch (id) {
    case "sprint": miniDrop(.1 * u, 0, .4 * u, "#5fb4de"); [-.55, -.2, .15].forEach((y, i) => line(-.9 * u, y * u + .1 * u, (-.45 - i * .08) * u, y * u + .1 * u, "#fff", s * .05)); line(-.9 * u, .45 * u, -.4 * u, .45 * u, INK, s * .04); break;
    case "blase": k.beginPath(); k.arc(0, 0, .75 * u, 0, 7); k.fillStyle = "rgba(160,225,255,.55)"; k.fill(); k.stroke(); miniDrop(0, .05 * u, .3 * u, "#5fb4de"); k.strokeStyle = "#fff"; k.beginPath(); k.arc(0, 0, .6 * u, Math.PI * 1.15, Math.PI * 1.5); k.stroke(); k.strokeStyle = INK; break;
    case "zaeh": miniDrop(0, 0, .6 * u, "#5fb4de"); k.beginPath(); k.moveTo(0, .2 * u); k.bezierCurveTo(-.35 * u, -.1 * u, -.1 * u, -.4 * u, 0, -.15 * u); k.bezierCurveTo(.1 * u, -.4 * u, .35 * u, -.1 * u, 0, .2 * u); F("#ff4f7e"); break;
    case "flink": k.beginPath(); k.moveTo(-.5 * u, -.5 * u); k.lineTo(-.1 * u, -.5 * u); k.lineTo(-.05 * u, -.1 * u); k.quadraticCurveTo(.5 * u, -.05 * u, .75 * u, .25 * u); k.lineTo(.75 * u, .5 * u); k.lineTo(-.5 * u, .5 * u); k.closePath(); F("#ff6fb0"); k.beginPath(); k.rect(-.5 * u, .38 * u, 1.25 * u, .16 * u); F("#fff"); line(-.3 * u, -.15 * u, .1 * u, -.15 * u, "#fff", s * .04); line(-.3 * u, .1 * u, .15 * u, .1 * u, "#fff", s * .04); [-.2, .1, .4].forEach(y => line(-.95 * u, y * u, -.6 * u, y * u, INK, s * .04)); break;
    case "heilregen": cloud(-.05 * u, -.3 * u, "#dfe8f5"); [-.35, .1, .5].forEach((x, i) => heart(k, x * u, (.45 + i % 2 * .22) * u, .17 * u, "#ff4f7e")); break;
    case "pfuetze": k.beginPath(); k.ellipse(0, .35 * u, .8 * u, .35 * u, 0, 0, 7); F("#5fb4de"); k.beginPath(); k.ellipse(0, .3 * u, .45 * u, .17 * u, 0, 0, 7); F("#8ad0f0"); miniDrop(.05 * u, -.4 * u, .22 * u, "#5fb4de"); break;
    case "regen": miniDrop(0, .1 * u, .5 * u, "#5fb4de"); line(-.15 * u, .15 * u, .15 * u, .15 * u, "#fff", s * .06); line(0, 0, 0, .3 * u, "#fff", s * .06); k.beginPath(); k.arc(0, .05 * u, .8 * u, Math.PI * .1, Math.PI * .55); k.stroke(); k.beginPath(); k.arc(0, .05 * u, .8 * u, Math.PI * 1.1, Math.PI * 1.55); k.stroke(); break;
    case "schwamm": k.beginPath(); k.roundRect(-.6 * u, -.4 * u, 1.2 * u, .8 * u); F("#ffd23f"); [[-.3, -.1], [.2, .1], [-.1, .2], [.35, -.2]].forEach(p => { k.beginPath(); k.ellipse(p[0] * u, p[1] * u, .09 * u, .07 * u, 0, 0, 7); F("#d9a21f"); }); miniDrop(.55 * u, .5 * u, .18 * u, "#5fb4de"); break;
    case "hecht": miniDrop(.35 * u, 0, .42 * u, "#5fb4de"); [-.4, -.05, .3].forEach((y, i) => line(-.9 * u, y * u, (-.2 + i * .05) * u, y * u, INK, s * .05)); k.beginPath(); k.moveTo(-.1 * u, -.55 * u); k.lineTo(.2 * u, -.35 * u); k.stroke(); break;
    case "welle": [.8, .55, .3].forEach((r, i) => { k.beginPath(); k.arc(0, 0, r * u, 0, 7); k.fillStyle = ["rgba(95,180,222,.35)", "rgba(95,180,222,.55)", "rgba(95,180,222,.85)"][i]; k.fill(); k.stroke(); }); miniDrop(0, 0, .16 * u, "#fff"); break;
    case "adrenalin": miniDrop(0, .05 * u, .55 * u, "#5fb4de"); k.beginPath(); k.moveTo(.1 * u, -.35 * u); k.lineTo(-.18 * u, .05 * u); k.lineTo(.02 * u, .05 * u); k.lineTo(-.1 * u, .45 * u); k.lineTo(.25 * u, -.05 * u); k.lineTo(.05 * u, -.05 * u); k.closePath(); F("#ffe45e"); break;
    case "eisenhaut": k.beginPath(); k.moveTo(0, -.8 * u); k.lineTo(.65 * u, -.5 * u); k.quadraticCurveTo(.65 * u, .4 * u, 0, .8 * u); k.quadraticCurveTo(-.65 * u, .4 * u, -.65 * u, -.5 * u); k.closePath(); F("#aeb6cf"); k.beginPath(); k.moveTo(0, -.55 * u); k.lineTo(.4 * u, -.35 * u); k.quadraticCurveTo(.4 * u, .25 * u, 0, .55 * u); k.closePath(); F("#6a7aa0"); break;
    case "platscher": k.strokeStyle = "#8a4bd8"; k.lineWidth = s * .09; k.beginPath(); for (let a = 0; a < 11; a += .3) k.lineTo(Math.cos(a) * a * .07 * u * 1.4, Math.sin(a) * a * .07 * u * 1.4); k.stroke(); k.strokeStyle = "#d6bdfc"; k.lineWidth = s * .04; k.beginPath(); for (let a = 0; a < 11; a += .3) k.lineTo(Math.cos(a) * a * .07 * u * 1.4, Math.sin(a) * a * .07 * u * 1.4); k.stroke(); k.strokeStyle = INK; k.lineWidth = Math.max(2, s * .06); miniDrop(0, 0, .2 * u, "#5fb4de"); break;
    case "nebel": cloud(0, 0, "#e3ebf5"); k.fillStyle = "rgba(255,255,255,.8)"; k.beginPath(); k.ellipse(-.1 * u, -.3 * u, .15 * u, .08 * u, 0, 0, 7); k.fill(); [-.6, .1, .6].forEach(x => line(x * u - .2 * u, .72 * u, x * u + .2 * u, .72 * u, "#aeb6cf", s * .05)); break;
    case "raub": miniDrop(0, 0, .6 * u, "#5fb4de"); k.beginPath(); k.moveTo(-.25 * u, .2 * u); k.lineTo(-.15 * u, .4 * u); k.lineTo(-.05 * u, .2 * u); k.closePath(); F("#fff"); k.beginPath(); k.moveTo(.05 * u, .2 * u); k.lineTo(.15 * u, .4 * u); k.lineTo(.25 * u, .2 * u); k.closePath(); F("#fff"); heart(k, 0, -.1 * u, .16 * u, "#ff4f7e"); break;
    case "druck": k.beginPath(); k.arc(0, 0, .75 * u, 0, 7); F("#f0f3f8"); k.beginPath(); k.arc(0, 0, .6 * u, Math.PI, 0); k.strokeStyle = "#e8523f"; k.lineWidth = s * .06; k.stroke(); k.strokeStyle = INK; k.lineWidth = Math.max(2, s * .06); line(0, .1 * u, .4 * u, -.35 * u, INK, s * .07); k.beginPath(); k.arc(0, .1 * u, .08 * u, 0, 7); F(INK); break;
    case "sturmflut": k.beginPath(); k.moveTo(-.85 * u, .5 * u); k.bezierCurveTo(-.7 * u, -.5 * u, .1 * u, -.9 * u, .45 * u, -.5 * u); k.bezierCurveTo(.1 * u, -.5 * u, .3 * u, -.1 * u, .85 * u, .1 * u); k.lineTo(.85 * u, .5 * u); k.closePath(); k.fillStyle = animGrad(c, "gold", -u, -u, u, u, 0, 0); F("#2a8fd6"); k.beginPath(); k.moveTo(-.55 * u, .5 * u); k.bezierCurveTo(-.4 * u, -.1 * u, 0, -.45 * u, .2 * u, -.35 * u); k.stroke(); [-.4, 0, .4].forEach(x => { k.beginPath(); k.arc(x * u, .35 * u, .1 * u, 0, 7); F("#fff"); }); break;
    case "wiedergeburt": k.beginPath(); k.moveTo(0, -.8 * u); k.bezierCurveTo(.5 * u, -.2 * u, .7 * u, .2 * u, .5 * u, .55 * u); k.quadraticCurveTo(0, .95 * u, -.5 * u, .55 * u); k.bezierCurveTo(-.7 * u, .2 * u, -.5 * u, -.2 * u, 0, -.8 * u); k.closePath(); F("#ff9d1c"); k.beginPath(); k.moveTo(0, -.4 * u); k.bezierCurveTo(.3 * u, 0, .35 * u, .25 * u, .2 * u, .45 * u); k.quadraticCurveTo(0, .6 * u, -.2 * u, .45 * u); k.bezierCurveTo(-.35 * u, .25 * u, -.3 * u, 0, 0, -.4 * u); F("#ffe45e"); break;
    default: miniDrop(0, 0, .6 * u, "#5fb4de");
  }
  c.restore();
}
function drawCoin(c, s) { const k = sketchCtx(c, 1.3, s); c.save(); c.translate(s / 2, s / 2); c.lineWidth = Math.max(2, s * .08); c.strokeStyle = INK; k.beginPath(); k.arc(0, 0, s * .42, 0, 7); k.fillStyle = "#ffd23f"; k.fill(); k.stroke(); k.beginPath(); k.arc(0, 0, s * .28, 0, 7); k.strokeStyle = "#d9a21f"; k.stroke(); c.fillStyle = "#d9a21f"; c.beginPath(); c.moveTo(0, -s * .18); c.bezierCurveTo(s * .1, -s * .05, s * .13, s * .04, s * .13, s * .07); c.bezierCurveTo(s * .13, s * .16, -s * .13, s * .16, -s * .13, s * .07); c.bezierCurveTo(-s * .13, s * .04, -s * .1, -s * .05, 0, -s * .18); c.fill(); c.restore(); }
function drawGem(c, s) { const k = sketchCtx(c, 2.1, s); c.save(); c.translate(s / 2, s / 2); c.lineWidth = Math.max(2, s * .08); c.strokeStyle = INK; c.lineJoin = "round"; k.beginPath(); k.moveTo(-s * .32, -s * .12); k.lineTo(-s * .16, -s * .38); k.lineTo(s * .16, -s * .38); k.lineTo(s * .32, -s * .12); k.lineTo(0, s * .42); k.closePath(); k.fillStyle = "#2fbf6a"; k.fill(); k.stroke(); k.beginPath(); k.moveTo(-s * .32, -s * .12); k.lineTo(s * .32, -s * .12); k.moveTo(-s * .16, -s * .38); k.lineTo(-s * .08, -s * .12); k.lineTo(0, s * .42); k.moveTo(s * .16, -s * .38); k.lineTo(s * .08, -s * .12); k.lineTo(0, s * .42); k.lineWidth = Math.max(1.4, s * .04); k.stroke(); c.fillStyle = "rgba(255,255,255,.55)"; c.beginPath(); c.moveTo(-s * .22, -s * .14); c.lineTo(-s * .13, -s * .3); c.lineTo(-s * .06, -s * .14); c.fill(); c.restore(); }
/* Der Fähigkeiten-Drop: eine Wasserkugel mit Wirbel, Farbe nach Stufe */
function drawDropOrb(c, tier, s, t, open) {
  const col = RAR_COL[tier], k = sketchCtx(c, tier + 1.7, s); c.save(); c.translate(s / 2, s / 2); c.lineJoin = c.lineCap = "round"; c.lineWidth = Math.max(2, s * .035); c.strokeStyle = INK;
  const gl = c.createRadialGradient(0, 0, s * .2, 0, 0, s * .6); gl.addColorStop(0, hexA(tier >= 3 ? "#ffd23f" : col, .5)); gl.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = gl; c.beginPath(); c.arc(0, 0, s * .6, 0, 7); c.fill();
  dropPath(k, s * .8); const g = tier === 3 ? animGrad(c, "gold", -s * .4, -s * .4, s * .4, s * .4, t || 0, .4) : tier === 4 ? animGrad(c, "rainbow", -s * .4, -s * .4, s * .4, s * .4, t || 0, .4) : col; k.fillStyle = g; k.fill(); k.stroke();
  c.save(); dropPath(c, s * .8); c.clip(); const sh = c.createLinearGradient(0, -s * .3, 0, s * .5); sh.addColorStop(0, "rgba(255,255,255,.35)"); sh.addColorStop(1, "rgba(10,30,80,.3)"); c.fillStyle = sh; c.fillRect(-s, -s, 2 * s, 2 * s); c.restore();
  c.strokeStyle = "rgba(255,255,255,.8)"; c.lineWidth = Math.max(2, s * .03); c.beginPath(); for (let a = 0; a < 7.5; a += .25) { const r = a * s * .022; c.lineTo(Math.cos(a + (t || 0)) * r, s * .1 + Math.sin(a + (t || 0)) * r * .8); } c.stroke();
  c.fillStyle = "rgba(255,255,255,.65)"; c.beginPath(); c.ellipse(-s * .16, -s * .06, s * .05, s * .11, .5, 0, 7); c.fill();
  c.restore();
}
function drawCapsule(c, s, t) { const k = sketchCtx(c, 5.5, s); c.save(); c.translate(s / 2, s / 2); c.lineWidth = Math.max(2, s * .05); c.strokeStyle = INK; k.beginPath(); k.arc(0, 0, s * .4, 0, 7); k.fillStyle = "rgba(180,230,255,.7)"; k.fill(); k.stroke(); k.beginPath(); k.arc(0, 0, s * .4, Math.PI, TAU); k.closePath(); k.fillStyle = "#ff6fb0"; k.fill(); k.stroke(); star(c, 0, s * .12, s * .13, "#ffe45e", t || 0); c.fillStyle = "rgba(255,255,255,.7)"; c.beginPath(); c.ellipse(-s * .2, -s * .12, s * .06, s * .1, .5, 0, 7); c.fill(); c.restore(); }
const NAVICON = {
  shop(c, s) { const k = sketchCtx(c, 3.3, s); c.save(); c.translate(s / 2, s / 2); c.lineWidth = Math.max(2, s * .06); c.strokeStyle = INK; k.beginPath(); k.moveTo(-s * .34, -s * .12); k.lineTo(s * .34, -s * .12); k.lineTo(s * .3, s * .38); k.lineTo(-s * .3, s * .38); k.closePath(); k.fillStyle = "#ffb21f"; k.fill(); k.stroke(); k.beginPath(); k.arc(0, -s * .12, s * .2, Math.PI, TAU); k.stroke(); c.restore(); },
  abil(c, s) { drawDropOrb(c, 2, s * .95, 1, false); },
  weap(c, s) { c.save(); c.translate(s * .2, s * .45); drawWeapon(c, "pistole", null, s * .85, 0); c.restore(); },
  look(c, s) { c.save(); c.translate(s / 2, s * .75); HAT.zauber(sketchCtx(c, 4.4, s), s * 1.3); c.lineWidth = 2; c.restore(); },
  quest(c, s) { const k = sketchCtx(c, 6.6, s); c.save(); c.translate(s / 2, s / 2); c.lineWidth = Math.max(2, s * .06); c.strokeStyle = INK; k.beginPath(); k.roundRect(-s * .3, -s * .38, s * .6, s * .76); k.fillStyle = "#fff8e0"; k.fill(); k.stroke(); [-.2, -.02, .16].forEach((y, i) => { k.beginPath(); k.moveTo(-s * .18, y * s); k.lineTo(s * (.12 - i * .03), y * s); k.stroke(); }); c.fillStyle = "#35d96a"; c.beginPath(); c.arc(s * .2, -s * .2, s * .07, 0, 7); c.fill(); c.restore(); },
  party(c, s) { drawDrop(c, DEFAULT_COS, s * .3, s * .5, s * .5, 0, {}); drawDrop(c, { ...DEFAULT_COS, color: "col_rosa" }, s * .7, s * .5, s * .5, 0, {}); }
};

/* ---------- Bild-Zwischenspeicher: Symbole als Bild-URL für die Oberfläche ---------- */
const ICON_CACHE = {};
function makeCv(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
function iconURL(kind, id, size) {
  size = size || 96; const key = kind + ":" + id + ":" + size; if (ICON_CACHE[key]) return ICON_CACHE[key];
  const cv = makeCv(size, size), c = cv.getContext("2d");
  if (kind === "w") { c.translate(size * .12, size * .5); c.scale(1, 1); drawWeapon(c, id, null, size * .74, 0); }
  else if (kind === "a") { c.fillStyle = "rgba(255,255,255,0)"; drawAbilityIcon(c, id, size); }
  else if (kind === "coin") drawCoin(c, size); else if (kind === "gem") drawGem(c, size);
  else if (kind === "orb") drawDropOrb(c, +id, size, 1, false); else if (kind === "capsule") drawCapsule(c, size, 0);
  else if (kind === "nav") NAVICON[id](c, size);
  else if (kind === "c") drawCosIcon(c, CO[id], size);
  return (ICON_CACHE[key] = cv.toDataURL());
}
function drawCosIcon(c, it, s) {
  if (!it) return; const cos = { ...DEFAULT_COS };
  if (it.s === "color") { cos.color = it.id; drawDrop(c, cos, s / 2, s * .55, s * .68, 1.2, {}); }
  else if (it.s === "hat") { cos.hat = it.id; drawDrop(c, cos, s / 2, s * .6, s * .62, 1.2, {}); }
  else if (it.s === "face") { cos.face = it.id; drawDrop(c, cos, s / 2, s * .55, s * .68, 1.2, {}); }
  else if (it.s === "back") { cos.back = it.id; drawDrop(c, cos, s / 2, s * .55, s * .55, 1.2, {}); }
  else if (it.s === "trail") { const k = sketchCtx(c, 7.1, s); c.save(); c.translate(s / 2, s / 2); const col = it.id === "trail_regen" ? RAINBOW : it.id === "trail_gold" ? ["#ffd23f", "#ff9d1c"] : it.id === "trail_herzen" ? ["#ff4f7e"] : it.id === "trail_dampf" ? ["#e3ebf5"] : it.id === "trail_sterne" ? ["#b58cf2", "#ffe45e"] : ["#8ad0f0"]; for (let i = 0; i < 6; i++) { const x = -s * .32 + i * s * .13, y = Math.sin(i * 1.7) * s * .18, r = s * (.05 + (5 - i) * .01); if (it.id === "trail_herzen") heart(c, x, y, r * 1.5, col[0]); else if (it.id === "trail_sterne" || it.id === "trail_gold") star(c, x, y, r * 1.7, col[i % col.length], i); else { c.beginPath(); c.arc(x, y, r * 1.5, 0, 7); c.fillStyle = col[i % col.length]; c.globalAlpha = .9; c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke(); c.globalAlpha = 1; } } c.restore(); }
  else if (it.s === "skin") { c.save(); c.translate(s * .12, s * .5); drawWeapon(c, "pistole", it.id, s * .74, 0); c.restore(); }
}
