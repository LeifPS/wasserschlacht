// Rendert eine Kontaktkarte der Grafiken (zur Kontrolle des Zeichenstils)
import { createRequire } from "module"; const { chromium } = createRequire(import.meta.url)("playwright");
import fs from "fs";
const html = fs.readFileSync("public/index.html", "utf8");
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
const errs = []; p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await p.setContent(html, { waitUntil: "load" });
await p.evaluate(() => {
  document.body.innerHTML = ""; const cv = document.createElement("canvas"); cv.width = 1200; cv.height = 800; document.body.appendChild(cv); const c = cv.getContext("2d");
  c.fillStyle = "#f6efd9"; c.fillRect(0, 0, 1200, 800);
  const hats = COSMETICS.filter(x => x.s === "hat"), faces = COSMETICS.filter(x => x.s === "face"), cols = COSMETICS.filter(x => x.s === "color"), backs = COSMETICS.filter(x => x.s === "back");
  let x = 60;
  hats.forEach((h, i) => { drawDrop(c, { ...DEFAULT_COS, hat: h.id, color: cols[i % cols.length].id }, 60 + i * 120, 100, 80, 1.3, {}); });
  faces.forEach((f, i) => { drawDrop(c, { ...DEFAULT_COS, face: f.id }, 60 + i * 120, 230, 80, 1.3, {}); });
  backs.forEach((f, i) => { drawDrop(c, { ...DEFAULT_COS, back: f.id, color: cols[i + 3].id }, 60 + i * 120, 360, 80, 1.3, {}); });
  drawDrop(c, { ...DEFAULT_COS, color: "col_regenbogen", hat: "hat_heilig", face: "face_stern", back: "back_regenb" }, 800, 380, 100, 1.3, { weapon: "tsunami", aim: 0.3, skin: "skin_regen" });
  drawDrop(c, { ...DEFAULT_COS, color: "col_glut", hat: "hat_krone", face: "face_laser", back: "back_jet" }, 960, 380, 100, 1.3, { weapon: "pistole", aim: -0.4, skin: "skin_gold", moving: true });
  WEAPONS.forEach((w, i) => { c.save(); c.translate(40 + i * 115, 470); drawWeapon(c, w.id, null, 90, 1); c.restore(); });
  ABILITIES.forEach((a, i) => { c.save(); c.translate(20 + (i % 9) * 100, 520 + Math.floor(i / 9) * 90); drawAbilityIcon(c, a.id, 80); c.restore(); });
  c.save(); c.translate(1000, 560); drawCoin(c, 60); c.translate(70, 0); drawGem(c, 60); c.restore();
  for (let i = 0; i < 5; i++) { c.save(); c.translate(900 + i * 55, 650); drawDropOrb(c, i, 70, 1, false); c.restore(); }
  c.save(); c.translate(900, 720); drawCapsule(c, 70, 0); c.restore();
  ["shop", "abil", "weap", "look", "quest"].forEach((n, i) => { c.save(); c.translate(1000 + i * 38, 720); NAVICON[n](c, 40); c.restore(); });
});
await p.screenshot({ path: "/tmp/art.png" });
console.log("Fehler:", errs.length ? errs.join(" | ") : "keine");
await b.close();
