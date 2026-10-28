/* ===== SPIELWELT: Karten-Bilder, Sprites, Effekte ===== */
const FSC = 2;
const THEME = {
  wiese: { floor: ["#cfe8a0", "#c4e093"], grass: "#9fcf72", water: "#6ec3ea", wall: ["#a3a9bb", "#7d849b"], crate: ["#e0a95a", "#b8803a"], dry: "rgba(170,120,60,.5)" },
  strand: { floor: ["#f6e6b4", "#efdba2"], grass: "#a8d27a", water: "#62bfe6", wall: ["#c7a98a", "#9c7e60"], crate: ["#e0a95a", "#b8803a"] },
  becken: { floor: ["#d6ecf3", "#cae4ee"], grass: "#a8d6b0", water: "#5ab4e8", wall: ["#8fa6c8", "#6a82a8"], crate: ["#e0a95a", "#b8803a"] },
  teich: { floor: ["#c3e6c9", "#b7dfbe"], grass: "#86c98a", water: "#58b7d6", wall: ["#8aa89a", "#668070"], crate: ["#e0a95a", "#b8803a"] },
  garten: { floor: ["#d9e5a4", "#cedd96"], grass: "#9fcf6a", water: "#6ec3ea", wall: ["#b08a6a", "#876347"], crate: ["#e0a95a", "#b8803a"] },
  ufer: { floor: ["#ece2b8", "#e3d8a8"], grass: "#a3cf78", water: "#5fb5e6", wall: ["#9aa0b0", "#747a8d"], crate: ["#e0a95a", "#b8803a"] }
};
const TEAMC = ["#3b82d6", "#e8523f"];
const hsh = (x, y, k) => { let h = (x * 73856093) ^ (y * 19349663) ^ ((k || 0) * 83492791); h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) % 10000 / 10000; };
function mkSprite(w, h, ox, oy, draw) { const cv = makeCv(Math.ceil(w * FSC), Math.ceil(h * FSC)), c = cv.getContext("2d"); c.scale(FSC, FSC); c.translate(ox, oy); c.lineJoin = c.lineCap = "round"; c.strokeStyle = INK; draw(c); return { cv, ox, oy, w, h }; }
const blit = (c, sp, x, y) => c.drawImage(sp.cv, x - sp.ox, y - sp.oy, sp.w, sp.h);

function buildWorld(M) {
  const th = THEME[M.id] || THEME.wiese, W2 = M.w * TS, H2 = M.h * TS, cv = makeCv(W2 * FSC, H2 * FSC), c = cv.getContext("2d");
  c.scale(FSC, FSC); c.lineJoin = c.lineCap = "round"; c.strokeStyle = INK;
  const tl = (x, y) => (x < 0 || y < 0 || x >= M.w || y >= M.h) ? T_WALL : M.tiles[y * M.w + x];
  for (let ty = 0; ty < M.h; ty++) for (let tx = 0; tx < M.w; tx++) {
    const t = tl(tx, ty), r = hsh(tx, ty);
    c.fillStyle = t === T_WATER ? th.water : t >= T_CE ? "#8fd3f0" : t === T_GRASS ? th.grass : th.floor[r < .5 ? 0 : 1];
    c.fillRect(tx * TS, ty * TS, TS + .5, TS + .5);
  }
  // Dekoration
  c.lineWidth = 1.4; const k = sketchCtx(c, 3.3, TS * 1.4);
  for (let ty = 0; ty < M.h; ty++) for (let tx = 0; tx < M.w; tx++) {
    const t = tl(tx, ty), r = hsh(tx, ty, 5), x = tx * TS, y = ty * TS;
    if (t === T_FLOOR && r < .22) { const px = x + 6 + hsh(tx, ty, 6) * 20, py = y + 8 + hsh(tx, ty, 7) * 18; if (r < .12) { k.beginPath(); k.moveTo(px - 3, py); k.lineTo(px - 1, py - 5); k.moveTo(px, py); k.lineTo(px, py - 7); k.moveTo(px + 3, py); k.lineTo(px + 1, py - 5); c.strokeStyle = "rgba(29,39,66,.55)"; k.stroke(); } else { c.beginPath(); c.ellipse(px, py, 3, 2, 0, 0, 7); c.fillStyle = "rgba(255,255,255,.55)"; c.fill(); c.strokeStyle = "rgba(29,39,66,.4)"; c.stroke(); } }
    else if (t === T_FLOOR && r > .96) { const px = x + 16, py = y + 16; c.fillStyle = r > .98 ? "#ffd23f" : "#ff7ea8"; c.beginPath(); c.arc(px, py, 3, 0, 7); c.fill(); c.strokeStyle = "rgba(29,39,66,.6)"; c.stroke(); c.beginPath(); c.moveTo(px, py + 3); c.lineTo(px, py + 9); c.stroke(); }
    else if (t === T_WATER) { if (r < .5) { const px = x + 6 + r * 10; c.strokeStyle = "rgba(255,255,255,.8)"; k.beginPath(); k.moveTo(px, y + 12); k.quadraticCurveTo(px + 5, y + 8, px + 10, y + 12); k.stroke(); } }
    else if (t >= T_CE) { const d = currentDir(t); c.save(); c.translate(x + 16, y + 16); c.rotate(Math.atan2(d[1], d[0])); c.strokeStyle = "rgba(255,255,255,.9)"; c.lineWidth = 2.4; c.beginPath(); c.moveTo(-7, -6); c.lineTo(0, 0); c.lineTo(-7, 6); c.moveTo(3, -6); c.lineTo(10, 0); c.lineTo(3, 6); c.stroke(); c.restore(); }
  }
  // Schraffur wie mit dem Stift
  c.lineWidth = 1.3; c.strokeStyle = "rgba(29,39,66,.13)"; k.beginPath();
  for (let ty = 0; ty < M.h; ty++) for (let tx = 0; tx < M.w; tx++) { const t = tl(tx, ty); if (t !== T_FLOOR && t !== T_GRASS) continue; const r = hsh(tx, ty, 11); if (r > .6) continue; const x = tx * TS + 4 + hsh(tx, ty, 12) * 8, y = ty * TS + 20 + hsh(tx, ty, 13) * 8; for (let i = 0; i < 3 + (r * 6 | 0) % 3; i++) { k.moveTo(x + i * 5, y); k.lineTo(x + i * 5 + 6, y - 7); } }
  k.stroke();
  // Wasserränder
  c.lineWidth = 2.4; c.strokeStyle = INK; k.beginPath();
  for (let ty = 0; ty < M.h; ty++) for (let tx = 0; tx < M.w; tx++) {
    const t = tl(tx, ty), w = t === T_WATER || t >= T_CE; if (!w) continue; const x = tx * TS, y = ty * TS, nw = (a, b) => { const n = tl(a, b); return n === T_WATER || n >= T_CE || n === T_WALL; };
    if (!nw(tx, ty - 1)) { k.moveTo(x, y); k.lineTo(x + TS, y); } if (!nw(tx, ty + 1)) { k.moveTo(x, y + TS); k.lineTo(x + TS, y + TS); } if (!nw(tx - 1, ty)) { k.moveTo(x, y); k.lineTo(x, y + TS); } if (!nw(tx + 1, ty)) { k.moveTo(x + TS, y); k.lineTo(x + TS, y + TS); }
  }
  k.stroke();
  // Farblose Kachelfugen (hauchdünn)
  c.strokeStyle = "rgba(29,39,66,.09)"; c.lineWidth = 1.2; k.beginPath(); for (let i = 1; i < M.w; i++) { k.moveTo(i * TS, 0); k.lineTo(i * TS, H2); } for (let j = 1; j < M.h; j++) { k.moveTo(0, j * TS); k.lineTo(W2, j * TS); } k.stroke();
  // Sprites
  const wall = [0, 1, 2].map(v => mkSprite(TS + 4, TS + 13, 2, 11, c2 => {
    const kk = sketchCtx(c2, 4 + v, TS * 1.3); c2.lineWidth = 2.2;
    kk.beginPath(); kk.rect(1, 21, 30, 11); kk.fillStyle = th.wall[1]; kk.fill(); kk.stroke();
    kk.beginPath(); kk.moveTo(1, -6); kk.quadraticCurveTo(0, -9, 4, -9); kk.lineTo(28, -9); kk.quadraticCurveTo(32, -9, 31, -6); kk.lineTo(31, 21); kk.lineTo(1, 21); kk.closePath(); kk.fillStyle = th.wall[0]; kk.fill(); kk.stroke();
    c2.strokeStyle = "rgba(29,39,66,.45)"; c2.lineWidth = 1.6; c2.beginPath(); if (v === 0) { c2.moveTo(8, 2); c2.lineTo(14, 8); c2.lineTo(11, 14); c2.moveTo(22, -3); c2.lineTo(25, 5); } else if (v === 1) { c2.moveTo(6, 10); c2.lineTo(16, 6); c2.lineTo(26, 12); c2.moveTo(16, -4); c2.lineTo(16, 6); } else { c2.moveTo(10, -2); c2.lineTo(8, 8); c2.moveTo(20, 4); c2.lineTo(26, 0); c2.moveTo(15, 14); c2.lineTo(22, 16); } c2.stroke();
    c2.fillStyle = "rgba(255,255,255,.35)"; c2.beginPath(); c2.ellipse(8, -3, 5, 2.2, -.2, 0, 7); c2.fill();
  }));
  const crate = mkSprite(TS + 4, TS + 13, 2, 11, c2 => {
    const kk = sketchCtx(c2, 9.1, TS * 1.2); c2.lineWidth = 2.2;
    kk.beginPath(); kk.rect(2, 19, 28, 11); kk.fillStyle = th.crate[1]; kk.fill(); kk.stroke();
    kk.beginPath(); kk.rect(2, -5, 28, 24); kk.fillStyle = th.crate[0]; kk.fill(); kk.stroke();
    c2.lineWidth = 1.6; c2.strokeStyle = "rgba(29,39,66,.6)"; c2.beginPath(); c2.moveTo(2, 3); c2.lineTo(30, 3); c2.moveTo(2, 11); c2.lineTo(30, 11); c2.moveTo(10, 19); c2.lineTo(10, 30); c2.moveTo(22, 19); c2.lineTo(22, 30); c2.stroke();
    c2.lineWidth = 2; c2.beginPath(); c2.moveTo(5, -2); c2.lineTo(27, 16); c2.moveTo(27, -2); c2.lineTo(5, 16); c2.stroke();
  });
  const grass = [0, 1, 2].map(v => mkSprite(TS + 6, TS + 12, 3, 12, c2 => {
    c2.lineWidth = 1.7; const rr = mulberry(77 + v * 13);
    for (let i = 0; i < 11; i++) { const bx = 2 + i * 2.7 + rr() * 2, by = 28 + rr() * 4, h = 14 + rr() * 12, lean = (rr() - .5) * 8; c2.beginPath(); c2.moveTo(bx - 2.2, by); c2.quadraticCurveTo(bx - 1 + lean * .3, by - h * .55, bx + lean, by - h); c2.quadraticCurveTo(bx + 1 + lean * .3, by - h * .55, bx + 2.2, by); c2.closePath(); c2.fillStyle = i % 3 === 0 ? "#6fb04a" : i % 3 === 1 ? "#86c85c" : "#a2da72"; c2.fill(); c2.stroke(); }
  }));
  return { floor: cv, wall, crate, grass, th, W: W2, H: H2 };
}

/* ----- Kleine Zeichner ----- */
function txt(c, s, x, y, size, col, align, w) { c.font = size + "px 'Caveat Brush','Patrick Hand',cursive"; c.textAlign = align || "center"; c.textBaseline = "middle"; c.lineJoin = "round"; c.lineWidth = Math.max(2, size * .2); c.strokeStyle = INK; c.strokeText(s, x, y); c.fillStyle = col || "#fff"; c.fillText(s, x, y); }
function wavyRing(c, x, y, r, t, col, lw) { c.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, rr = r + Math.sin(a * 9 + t * 3) * 1.6; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.strokeStyle = col; c.lineWidth = lw; c.stroke(); }
function drawPearl(c, x, y, r, t) { c.save(); c.translate(x, y + Math.sin(t * 3 + x) * 1.5); c.lineWidth = 2; c.strokeStyle = INK; const g = c.createRadialGradient(-r * .3, -r * .3, 1, 0, 0, r); g.addColorStop(0, "#fff"); g.addColorStop(.6, "#ffd8ec"); g.addColorStop(1, "#c99be8"); c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill(); c.stroke(); c.fillStyle = "rgba(255,255,255,.9)"; c.beginPath(); c.arc(-r * .35, -r * .35, r * .22, 0, 7); c.fill(); c.restore(); }
function drawCube(c, x, y, r, t) { c.save(); c.translate(x, y + Math.sin(t * 3 + y) * 1.5); c.lineWidth = 2; c.strokeStyle = INK; c.lineJoin = "round"; c.fillStyle = "#ffb21f"; c.beginPath(); c.moveTo(0, -r); c.quadraticCurveTo(r * 1.05, r * .2, 0, r); c.quadraticCurveTo(-r * 1.05, r * .2, 0, -r); c.fill(); c.stroke(); c.fillStyle = "rgba(255,255,255,.8)"; c.beginPath(); c.ellipse(-r * .3, 0, r * .16, r * .32, .4, 0, 7); c.fill(); star(c, 0, r * .12, r * .38, "#fff3b0", t); c.restore(); }
function drawBucket(c, x, y, team, hp, max, t, hit) {
  c.save(); c.translate(x, y); c.lineWidth = 2.4; c.strokeStyle = INK; c.lineJoin = "round"; const sk = hit > 0 ? Math.sin(t * 60) * 2 * hit : 0; c.translate(sk, 0);
  c.fillStyle = "rgba(20,40,70,.25)"; c.beginPath(); c.ellipse(0, 20, 24, 7, 0, 0, 7); c.fill();
  const col = TEAMC[team]; c.fillStyle = col; c.beginPath(); c.moveTo(-22, -10); c.lineTo(22, -10); c.lineTo(17, 20); c.lineTo(-17, 20); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = "rgba(255,255,255,.35)"; c.fillRect(-18, 0, 36, 5); c.fillStyle = "#b9e6fb"; c.beginPath(); c.ellipse(0, -10, 22, 6, 0, 0, 7); c.fill(); c.stroke();
  c.strokeStyle = INK; c.beginPath(); c.arc(0, -10, 22, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
  c.restore();
  const w = 56, f = Math.max(0, hp / max); c.fillStyle = "rgba(29,39,66,.9)"; c.beginPath(); c.rect(x - w / 2 - 2, y - 34, w + 4, 9); c.fill(); c.fillStyle = f > .35 ? "#4cd964" : "#ff5a4f"; c.beginPath(); c.rect(x - w / 2, y - 32, w * f, 5); c.fill();
}
function drawEmote(c, n, x, y, s) {
  c.save(); c.translate(x, y); c.lineWidth = Math.max(2, s * .07); c.strokeStyle = INK; c.lineJoin = c.lineCap = "round";
  c.fillStyle = "#fffdf4"; c.beginPath(); c.arc(0, 0, s * .5, 0, 7); c.fill(); c.stroke();
  const f = (col) => { c.fillStyle = col; c.beginPath(); c.arc(0, 0, s * .34, 0, 7); c.fill(); c.stroke(); }, e = (dx) => { c.fillStyle = INK; c.beginPath(); c.arc(dx * s, -s * .07, s * .045, 0, 7); c.fill(); };
  if (n === 0) { f("#ffe45e"); e(-.12); e(.12); c.beginPath(); c.arc(0, s * .02, s * .17, .2, Math.PI - .2); c.stroke(); }
  else if (n === 1) heart(c, 0, 0, s * .3, "#ff4f7e");
  else if (n === 2) star(c, 0, 0, s * .36, "#ffd23f", 0);
  else if (n === 3) { f("#ff8a7a"); c.beginPath(); c.moveTo(-.2 * s, -.18 * s); c.lineTo(-.06 * s, -.1 * s); c.moveTo(.2 * s, -.18 * s); c.lineTo(.06 * s, -.1 * s); c.stroke(); e(-.12); e(.12); c.beginPath(); c.arc(0, s * .2, s * .12, Math.PI + .3, -.3); c.stroke(); }
  else if (n === 4) { f("#9fd8f5"); e(-.12); e(.12); c.fillStyle = "#4aa3d8"; c.beginPath(); c.ellipse(-.14 * s, .08 * s, s * .04, s * .09, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(.14 * s, .08 * s, s * .04, s * .09, 0, 0, 7); c.fill(); c.beginPath(); c.arc(0, s * .22, s * .1, Math.PI + .3, -.3); c.stroke(); }
  else if (n === 5) { txt(c, "GG", 0, 0, s * .5, "#fff"); }
  else if (n === 6) { txt(c, "?", 0, 0, s * .6, "#ffd23f"); }
  else { txt(c, "!", 0, 0, s * .62, "#ff5a4f"); }
  c.restore();
}
const EMOTE_N = 8;
