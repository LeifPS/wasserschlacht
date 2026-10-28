import { createRequire } from "module"; const { chromium } = createRequire(import.meta.url)("playwright");
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 844, height: 390 } })).newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await p.goto("http://localhost:8787/"); await p.waitForTimeout(500); await p.fill("#inName", "R" + Math.floor(Math.random() * 1e6)); await p.fill("#inPw", "geheim123"); await p.click("#btnReg"); await p.waitForTimeout(1200);
await p.evaluate(() => Lob.send({ t: "queue", ranked: false, dev: "knockout" })); await p.waitForSelector("#modeov", { timeout: 40000 });
const t0 = Date.now(); let seen = false;
while (Date.now() - t0 < 200000) { await p.waitForTimeout(2000); const txt = await p.evaluate(() => document.body.innerText); if (/Runde 2/.test(txt)) { seen = true; break; } }
await p.waitForTimeout(2500); await p.screenshot({ path: process.env.OUT + "/round2.png" }); console.log("round2", seen, "errs", errs.slice(0, 5)); await b.close();
