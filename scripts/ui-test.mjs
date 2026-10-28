import { createRequire } from "module"; const { chromium } = createRequire(import.meta.url)("playwright");
const OUT = process.env.OUT || "/tmp/shots"; import fs from "fs"; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: false });
const p = await ctx.newPage(); const errs = []; p.on("pageerror", e => errs.push("PAGEERR " + e.message)); p.on("console", m => { if (m.type() === "error") errs.push("CONSOLE " + m.text()); });
const shot = async n => { await p.waitForTimeout(500); await p.screenshot({ path: OUT + "/" + n + ".png" }); };
const name = "T" + Math.floor(Math.random() * 1e6);
await p.goto("http://localhost:8787/"); await p.waitForTimeout(800); await shot("01_auth");
await p.fill("#inName", name); await p.fill("#inPw", "geheim123"); await p.click("#btnReg"); await p.waitForTimeout(1500); await shot("02_lobby");
for (const id of ["shop", "abil", "weap", "look", "quest"]) { await p.click(`#nav .btn[data-id=${id}]`); await shot("03_" + id); await p.click("#winX"); }
await p.click("#btnSet"); await shot("04_set"); await p.click("#winX");
console.log("errs", errs.length ? errs : "keine");
await b.close();
