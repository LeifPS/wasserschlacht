import * as S from "../worker/shared.mjs";
const show = id => { const M = S.MAPS[id]; const ch = ["·", "#", "x", "g", "~", ">", "<", "^", "v"]; let out = "";
  for (let y = 0; y < M.h; y++) { let row = ""; for (let x = 0; x < M.w; x++) row += ch[M.tiles[y * M.w + x]]; out += row + "\n"; } return out; };
for (const id of Object.keys(S.MAPS)) {
  const M = S.MAPS[id]; console.log("==", id, M.w, "x", M.h, "spawns", M.spawns[0].length, M.spawns[1].length, "ffa", M.ffa.length, "mine", !!M.mine, "kings", M.kings.length, "caps", M.caps.length, "buckets", M.buckets.map(b => !!b));
  // Erreichbarkeit per Flood-Fill von der ersten Startposition aus (Wasser/Fels/Kisten blockieren)
  const start = (M.ffa[0] || M.spawns[0][0]); const seen = new Set(); const q = [[Math.floor(start[0] / 32), Math.floor(start[1] / 32)]];
  while (q.length) { const [x, y] = q.pop(); const k = y * M.w + x; if (seen.has(k) || x < 0 || y < 0 || x >= M.w || y >= M.h) continue; const t = M.tiles[k]; if (S.walkBlock(t)) continue; seen.add(k); q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
  let free = 0; for (let i = 0; i < M.tiles.length; i++) if (!S.walkBlock(M.tiles[i])) free++;
  const pts = [...M.ffa, ...M.spawns[0], ...M.spawns[1], ...(M.mine ? [M.mine] : []), ...M.kings, ...M.caps, ...M.buckets.filter(Boolean)];
  const bad = pts.filter(p => !seen.has(Math.floor(p[1] / 32) * M.w + Math.floor(p[0] / 32)));
  console.log("  frei", free, "erreichbar", seen.size, "unerreichbare Markierungen", bad.length, bad.map(p => [Math.floor(p[0]/32), Math.floor(p[1]/32)].join(",")).join(" "));
  if (process.argv[2] === id || process.argv[2] === "all") console.log(show(id));
}
