import { Sim } from "../worker/sim.js";
import { makeBotLoadout } from "../worker/bots.js";
import { MODES, mulberry } from "../worker/shared.mjs";
const modes = process.argv[2] ? [process.argv[2]] : Object.keys(MODES);
for (const id of modes) {
  const m = MODES[id], n = m.ffa ? 5 : 6, rnd = mulberry(7), slots = [];
  for (let i = 0; i < n; i++) { const lo = makeBotLoadout(rnd, 10, i); slots.push({ name: lo.name, human: false, team: m.ffa ? i : i % 2, lo }); }
  const sim = new Sim({ mode: id, ranked: false, slots, seed: 42 });
  sim.start(); const t0 = performance.now(); let steps = 0, evc = {};
  while (!sim.over && sim.t < 400) { sim.step(); steps++; for (const e of sim.ev) evc[e.e] = (evc[e.e] || 0) + 1; for (let i = 0; i < n; i++) sim.snapshot(i); sim.clearEvents(); }
  const ms = performance.now() - t0;
  console.log(id.padEnd(10), "ende", sim.over ? JSON.stringify(sim.over) : "NICHT", "t=" + sim.t.toFixed(1), "ms/tick=" + (ms / steps).toFixed(3), "kills", sim.players.map(p => p.kills).join(","), "dmg", sim.players.map(p => Math.round(p.dmg)).join(","));
  console.log("   events", JSON.stringify(evc));
}
