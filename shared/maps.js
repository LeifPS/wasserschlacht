/* ===== KARTEN (Client + Server) =====
   Zeichen: . Boden  # Fels  x Kiste (zerstörbar)  g hohes Gras (versteckt)  o Wasser (nicht begehbar, Geschosse fliegen drüber)
   > < ^ v Strömung  1/2 Team-Start  S Showdown-Start  m Perlen-Mine  k Königs-Becken  a/b Eimer  c Eroberungs-Punkt */
const T_FLOOR = 0, T_WALL = 1, T_CRATE = 2, T_GRASS = 3, T_WATER = 4, T_CE = 5, T_CW = 6, T_CN = 7, T_CS = 8;
const CRATE_HP = 500;
const CH2T = { ".": T_FLOOR, "#": T_WALL, x: T_CRATE, g: T_GRASS, o: T_WATER, ">": T_CE, "<": T_CW, "^": T_CN, v: T_CS };
const MIRROR_CH = { "1": "2", "2": "1", ">": "<", "<": ">", a: "b", b: "a" };

function mkGrid(w, h, ch) { const g = []; for (let y = 0; y < h; y++) g.push(new Array(w).fill(ch)); return g; }
function gPut(g, x, y, ch) { if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = ch; }
function gFill(g, x, y, w, h, ch) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) gPut(g, x + i, y + j, ch); }
function gEll(g, cx, cy, rx, ry, ch) { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) if (((x - cx) / (rx + .5)) ** 2 + ((y - cy) / (ry + .5)) ** 2 <= 1) gPut(g, x, y, ch); }
function gBorder(g) { const h = g.length, w = g[0].length; gFill(g, 0, 0, w, 1, "#"); gFill(g, 0, h - 1, w, 1, "#"); gFill(g, 0, 0, 1, h, "#"); gFill(g, w - 1, 0, 1, h, "#"); }
/* Spiegelt die linke Hälfte nach rechts und die obere nach unten (Mittelspalte/-zeile bleibt wie gezeichnet) */
function gMirror(g, hor, ver) {
  const h = g.length, w = g[0].length;
  if (hor) for (let y = 0; y < h; y++) for (let x = 0; x < (w - 1) / 2; x++) { const c = g[y][x]; g[y][w - 1 - x] = MIRROR_CH[c] || c; }
  if (ver) for (let y = 0; y < (h - 1) / 2; y++) for (let x = 0; x < w; x++) g[h - 1 - y][x] = g[y][x];
}

const MAP_BUILD = {
  /* Showdown: sehr offene Wiese, wenig Deckung */
  wiese() {
    const w = 35, h = 31, g = mkGrid(w, h, "."); gBorder(g);
    gEll(g, 6, 5, 2.5, 1.5, "g"); gEll(g, 12, 11, 2, 1.5, "g"); gEll(g, 3, 12, 1.5, 1.5, "g");
    gEll(g, 10, 4, 1.5, 1, "o"); gEll(g, 14, 12, 1.5, 1, "o");
    gFill(g, 10, 7, 1, 2, "#"); gFill(g, 4, 9, 2, 1, "#"); gFill(g, 15, 4, 1, 1, "#");
    [[7, 9], [12, 3], [3, 3], [16, 9], [8, 13]].forEach(p => gPut(g, p[0], p[1], "x"));
    gPut(g, 2, 2, "S"); gPut(g, 8, 6, "S"); gPut(g, 14, 2, "S"); gPut(g, 2, 14, "S");
    gMirror(g, true, true);
    gFill(g, 15, 14, 5, 3, "."); gPut(g, 16, 15, "x"); gPut(g, 18, 15, "x"); gPut(g, 17, 14, "x"); gPut(g, 17, 16, "x");
    return g;
  },
  /* Perlenjagd: offene Mine in der Mitte */
  strand() {
    const w = 35, h = 21, g = mkGrid(w, h, "."); gBorder(g);
    gEll(g, 9, 4, 2, 1.5, "g"); gEll(g, 4, 9, 1, 1.5, "g");
    gFill(g, 12, 3, 2, 1, "#"); gFill(g, 8, 7, 1, 2, "#");
    gEll(g, 4, 3, 1.5, 1, "o"); gEll(g, 14, 6, 1, 1, "o");
    [[7, 5], [13, 8], [10, 2]].forEach(p => gPut(g, p[0], p[1], "x"));
    gPut(g, 2, 4, "1"); gPut(g, 2, 10, "1");
    gMirror(g, true, true);
    g[10][17] = "m";
    return g;
  },
  /* Knockout: Becken mit ein paar Säulen */
  becken() {
    const w = 35, h = 21, g = mkGrid(w, h, "."); gBorder(g);
    gEll(g, 17, 10, 2.5, 1.5, "o");
    gFill(g, 11, 4, 1, 2, "#"); gFill(g, 7, 8, 1, 2, "#"); gFill(g, 14, 8, 1, 1, "#");
    gEll(g, 9, 3, 1.5, 1, "g"); gEll(g, 5, 9, 1.5, 1, "g");
    [[10, 7], [14, 3], [4, 5]].forEach(p => gPut(g, p[0], p[1], "x"));
    gPut(g, 2, 4, "1"); gPut(g, 2, 10, "1");
    gMirror(g, true, true);
    return g;
  },
  /* Königsbecken: Teiche, offenes Gelände */
  teich() {
    const w = 35, h = 21, g = mkGrid(w, h, "."); gBorder(g);
    gEll(g, 7, 5, 2.5, 1.5, "o"); gEll(g, 13, 2, 1.5, 1, "o"); gEll(g, 12, 9, 1, 1, "o");
    gFill(g, 10, 6, 1, 1, "#"); gFill(g, 5, 9, 1, 1, "#"); gFill(g, 15, 5, 1, 1, "#");
    gEll(g, 9, 6, 1, 1, "g"); gEll(g, 3, 8, 1, 1, "g");
    [[11, 4], [14, 7], [6, 3]].forEach(p => gPut(g, p[0], p[1], "x"));
    gPut(g, 17, 10, "k"); gPut(g, 17, 3, "k"); gPut(g, 8, 10, "k");
    gPut(g, 2, 4, "1"); gPut(g, 2, 10, "1");
    gMirror(g, true, true);
    return g;
  },
  /* Eimer-Heist: Eimer links/rechts, offener Garten */
  garten() {
    const w = 35, h = 21, g = mkGrid(w, h, "."); gBorder(g);
    gPut(g, 2, 10, "a");
    gPut(g, 4, 8, "x"); gPut(g, 4, 11, "x");
    gEll(g, 9, 4, 2, 1.5, "g"); gEll(g, 10, 9, 1.5, 1, "g");
    gFill(g, 8, 6, 1, 1, "#"); gFill(g, 13, 3, 1, 1, "#"); gFill(g, 13, 8, 1, 2, "#");
    gEll(g, 15, 4, 1, 1, "o");
    [[7, 3], [11, 6], [15, 8]].forEach(p => gPut(g, p[0], p[1], "x"));
    gPut(g, 5, 4, "1"); gPut(g, 5, 10, "1");
    gMirror(g, true, true);
    return g;
  },
  /* Eroberung: drei Punkte in einer Reihe, offenes Ufer */
  ufer() {
    const w = 35, h = 21, g = mkGrid(w, h, "."); gBorder(g);
    gPut(g, 17, 10, "c"); gPut(g, 8, 10, "c");
    gEll(g, 8, 5, 2, 1, "g"); gEll(g, 14, 7, 1.5, 1, "g");
    gFill(g, 7, 7, 2, 1, "#"); gFill(g, 12, 4, 1, 1, "#"); gFill(g, 15, 9, 1, 1, "#");
    gEll(g, 4, 6, 1, 1.5, "o"); gEll(g, 16, 3, 1.5, 1, "o");
    [[10, 6], [14, 5]].forEach(p => gPut(g, p[0], p[1], "x"));
    gPut(g, 2, 4, "1"); gPut(g, 2, 10, "1");
    gMirror(g, true, true);
    return g;
  }
};

function parseMap(id, g) {
  const h = g.length, w = g[0].length, tiles = new Uint8Array(w * h);
  const M = { id, w, h, tiles, spawns: [[], []], ffa: [], mine: null, kings: [], buckets: [null, null], caps: [], px: w * TS, py: h * TS };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = g[y][x], cx = (x + .5) * TS, cy = (y + .5) * TS;
    tiles[y * w + x] = CH2T[c] !== undefined ? CH2T[c] : T_FLOOR;
    if (c === "1") M.spawns[0].push([cx, cy]); else if (c === "2") M.spawns[1].push([cx, cy]);
    else if (c === "S") M.ffa.push([cx, cy]); else if (c === "m") M.mine = [cx, cy];
    else if (c === "k") M.kings.push([cx, cy]); else if (c === "a") M.buckets[0] = [cx, cy]; else if (c === "b") M.buckets[1] = [cx, cy];
    else if (c === "c") M.caps.push([cx, cy]);
  }
  M.caps.sort((a, b) => a[0] - b[0]);
  return M;
}
const MAPS = {};
for (const id in MAP_BUILD) MAPS[id] = parseMap(id, MAP_BUILD[id]());
/* Eine frische Kopie für ein Match (Kisten werden zerstört) */
function cloneMap(M) { const c = Object.assign({}, M); c.tiles = new Uint8Array(M.tiles); c.crate = new Map(); for (let i = 0; i < c.tiles.length; i++) if (c.tiles[i] === T_CRATE) c.crate.set(i, CRATE_HP); return c; }

/* ----- Physik ----- */
function tileAt(M, x, y) {
  const tx = Math.floor(x / TS), ty = Math.floor(y / TS);
  return tx < 0 || ty < 0 || tx >= M.w || ty >= M.h ? T_WALL : M.tiles[ty * M.w + tx];
}
const walkBlock = t => t === T_WALL || t === T_CRATE || t === T_WATER;
const shotBlock = t => t === T_WALL || t === T_CRATE;
function pushOut(M, p, r) {
  const x0 = Math.floor((p.x - r) / TS), x1 = Math.floor((p.x + r) / TS), y0 = Math.floor((p.y - r) / TS), y1 = Math.floor((p.y + r) / TS);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const t = (tx < 0 || ty < 0 || tx >= M.w || ty >= M.h) ? T_WALL : M.tiles[ty * M.w + tx];
    if (!walkBlock(t)) continue;
    const l = tx * TS, tp = ty * TS, cx = clampN(p.x, l, l + TS), cy = clampN(p.y, tp, tp + TS);
    let dx = p.x - cx, dy = p.y - cy, d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    if (d2 < 1e-6) { // Mittelpunkt liegt im Block: zur nächsten Kante schieben
      const m = [p.x - l, l + TS - p.x, p.y - tp, tp + TS - p.y], mi = m.indexOf(Math.min(...m));
      if (mi === 0) p.x = l - r; else if (mi === 1) p.x = l + TS + r; else if (mi === 2) p.y = tp - r; else p.y = tp + TS + r;
    } else { const d = Math.sqrt(d2), k = (r - d) / d; p.x += dx * k; p.y += dy * k; }
  }
}
/* Bewegt einen Kreis um (dx,dy) in kleinen Schritten mit Wandgleiten */
function moveCircle(M, p, dx, dy, r) {
  const len = Math.hypot(dx, dy), n = Math.max(1, Math.ceil(len / 8));
  for (let i = 0; i < n; i++) { p.x += dx / n; p.y += dy / n; pushOut(M, p, r); pushOut(M, p, r); }
}
/* Strahl: erste Kachel, die Geschosse blockiert? */
function rayBlocked(M, x0, y0, x1, y1, blockFn) {
  const f = blockFn || shotBlock, len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(len / 10));
  for (let i = 1; i <= n; i++) { const t = i / n; if (f(tileAt(M, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t))) return true; }
  return false;
}
const inGrass = (M, x, y) => tileAt(M, x, y) === T_GRASS;
const currentDir = t => t === T_CE ? [1, 0] : t === T_CW ? [-1, 0] : t === T_CN ? [0, -1] : t === T_CS ? [0, 1] : null;
