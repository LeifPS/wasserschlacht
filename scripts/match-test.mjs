import { createRequire } from "module"; const { chromium } = createRequire(import.meta.url)("playwright");
const OUT = process.env.OUT || "/tmp/shots"; import fs from "fs"; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
const p = await ctx.newPage(); const errs = []; p.on("pageerror", e => errs.push("PAGEERR " + e.message)); p.on("console", m => { if (m.type() === "error") errs.push("CONSOLE " + m.text()); });
const shot = async n => { await p.screenshot({ path: OUT + "/" + n + ".png" }); };
const name = "M" + Math.floor(Math.random() * 1e6), TAG = process.env.TAG || "a";
await p.goto("http://localhost:8787/"); await p.waitForTimeout(600);
await p.fill("#inName", name); await p.fill("#inPw", "geheim123"); await p.click("#btnReg"); await p.waitForTimeout(1200);
if (process.env.DROP) {
  await p.click("#nav .btn[data-id=shop]"); await p.click("text=Fähigkeiten-Drops"); await p.click(".cardx[data-id='0']"); await p.waitForTimeout(300);
  for (const [i, ms] of [[1, 900], [2, 1300], [3, 1500], [4, 900], [5, 800]]) { await shot(`d${i}`); await p.waitForTimeout(ms); }
  await shot("d6"); await p.mouse.click(400, 200); await p.waitForTimeout(800); await shot("d7");
}
if (process.env.DEV) await p.evaluate(m => Lob.send({ t: "queue", ranked: false, dev: m }), process.env.DEV); else await p.click("#playBtn", { force: true }); await p.waitForTimeout(500); await shot(TAG + "_queue");
await p.waitForSelector("#modeov", { timeout: 40000 }); await shot(TAG + "_mode"); await p.waitForTimeout(2600);
console.log("mode:", await p.evaluate(() => document.querySelector("#modeov")?.innerText || "?"));
await p.waitForTimeout(3500); await shot(TAG + "_m1");
await p.keyboard.down("d"); await p.mouse.move(600, 150); await p.waitForTimeout(1500); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(400); await shot(TAG + "_m2");
await p.keyboard.up("d"); await p.keyboard.down("s"); await p.waitForTimeout(1200); await p.mouse.move(300, 250); await p.mouse.down(); await p.mouse.up(); await p.keyboard.press("q"); await p.waitForTimeout(500); await shot(TAG + "_m3");
// Zustand
console.log("state", await p.evaluate(() => { const s = document.getElementById("cv"); return { w: s.width, h: s.height, hidden: s.hidden }; }));
await p.waitForTimeout(8000); await shot(TAG + "_m4");
console.log("errs", errs.length ? errs.slice(0, 8) : "keine");
await b.close();
