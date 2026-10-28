/* ===== GEMEINSAME DATEN (Client + Server) ===== */
const TS = 32;                 // Kachelgröße in Weltmaßeinheiten
const TICK = 30;               // Server-Ticks pro Sekunde
const DT = 1 / TICK;
const PR = 13;                 // Radius eines Tropfens
const BASE_SPEED = 100;        // Einheiten pro Sekunde
const BASE_HP = 2600;
const BOT_FILL_S = 15;         // so lange wartet die Warteschlange auf echte Spieler, dann kommen Bots

const RAR = [
  { id: 0, n: "Gewöhnlich", col: "#9aa3b0" },
  { id: 1, n: "Selten", col: "#3b82d6" },
  { id: 2, n: "Episch", col: "#8a4bd8" },
  { id: 3, n: "Legendär", col: "#f2a516" },
  { id: 4, n: "Göttlich", col: "#ff5ea8" }
];

/* ----- Waffen -----
   t: "b" Geschoss, "l" Wurf (Flugbahn, Flächenschaden), "w" Welle
   dmg Schaden je Treffer, spd Tempo, rng Reichweite in Kacheln, n Geschosse je Schuss, spr Streuung in Grad,
   ammo Munition, rl Sekunden je Munition, bd Abstand der Geschosse bei Salven, pierce durchschlägt (-1 alle),
   aoe Flächenradius in Kacheln, slow Verlangsamung 0..1, kb Rückstoß, bounce Abpraller, rad Geschossradius
   sup: Super (k: "s" Schuss mit geänderten Werten, "r" Regen um den Zielpunkt) */
const WEAPONS = [
  { id: "pistole", n: "Wasserpistole", r: 0, t: "b", dmg: 170, spd: 620, rng: 7.2, n1: 1, spr: 0, ammo: 3, rl: 1.1, bd: 0, pierce: 0, rad: 5, price: 0,
    d: "Ein sicherer Allrounder: ein Strahl, gute Reichweite.",
    sup: { n: "Großer Spritzer", k: "s", mul: { dmg: 3.4, rad: 2.4, rng: 1.25 }, set: { pierce: 2 }, need: 1500 } },
  { id: "flasche", n: "Spritzflasche", r: 0, t: "b", dmg: 95, spd: 520, rng: 5.0, n1: 3, spr: 24, ammo: 3, rl: 1.3, bd: 0, pierce: 0, rad: 5, price: 300,
    d: "Dreifach-Streuung für den Nahkampf.",
    sup: { n: "Schrotsalve", k: "s", mul: { n1: 3 }, set: { spr: 56 }, need: 1500 } },
  { id: "schlauch", n: "Gartenschlauch", r: 1, t: "b", dmg: 70, spd: 600, rng: 6.2, n1: 6, spr: 6, ammo: 3, rl: 1.3, bd: 0.1, pierce: 0, rad: 5, price: 1200,
    d: "Ein langer Dauerstrahl aus vielen kleinen Tropfen.",
    sup: { n: "Flutstrahl", k: "s", mul: { n1: 3.4, dmg: 1.15 }, set: { kb: 30 }, need: 1700 } },
  { id: "ballon", n: "Wasserballon-Werfer", r: 1, t: "l", dmg: 240, spd: 0, rng: 9, n1: 1, spr: 0, ammo: 3, rl: 1.5, bd: 0, pierce: 0, aoe: 1.6, rad: 8, price: 1200,
    d: "Wirft Ballons in hohem Bogen: Flächenschaden, auch hinter Mauern.",
    sup: { n: "Ballonregen", k: "r", cnt: 8, area: 3, dmg: 220, aoe: 1.5, need: 1800 } },
  { id: "scharf", n: "Scharfschützen-Spritze", r: 2, t: "b", dmg: 390, spd: 1000, rng: 11, n1: 1, spr: 0, ammo: 2, rl: 1.9, bd: 0, pierce: 1, rad: 5, price: 0,
    d: "Weit und hart: durchschlägt den ersten Gegner.",
    sup: { n: "Durchschuss", k: "s", mul: { dmg: 1.9, rad: 2.2, rng: 1.2 }, set: { pierce: -1 }, need: 1800 } },
  { id: "eis", n: "Eisbazooka", r: 2, t: "b", dmg: 260, spd: 380, rng: 8.5, n1: 1, spr: 0, ammo: 3, rl: 1.6, bd: 0, pierce: 0, aoe: 1.5, slow: 0.45, rad: 9, price: 0,
    d: "Langsame Eisgeschosse, die Gegner verlangsamen.",
    sup: { n: "Frostwelle", k: "r", cnt: 1, area: 0, dmg: 300, aoe: 3.6, root: 2, need: 1800 } },
  { id: "reiniger", n: "Hochdruckreiniger", r: 3, t: "b", dmg: 215, spd: 900, rng: 8, n1: 1, spr: 0, ammo: 3, rl: 0.9, bd: 0, pierce: -1, kb: 80, rad: 6, price: 0,
    d: "Ein Strahl, der alles durchschneidet und zurückstößt.",
    sup: { n: "Druckwelle", k: "s", mul: { n1: 7, dmg: 1.15 }, set: { spr: 40, kb: 220 }, need: 1800 } },
  { id: "minigun", n: "Tropfen-Minigun", r: 3, t: "b", dmg: 82, spd: 640, rng: 7, n1: 8, spr: 10, ammo: 3, rl: 1.4, bd: 0.1, pierce: 0, rad: 5, selfSlow: 0.4, price: 0,
    d: "Heftige Salven. Beim Schießen wirst du langsamer.",
    sup: { n: "Dauerfeuer", k: "s", mul: { n1: 3.5, dmg: 1.05 }, set: { spr: 12 }, need: 1900 } },
  { id: "tsunami", n: "Tsunami-Kanone", r: 4, t: "w", dmg: 420, spd: 440, rng: 9, n1: 1, spr: 0, ammo: 2, rl: 1.8, bd: 0, pierce: -1, kb: 120, rad: 22, price: 0,
    d: "Eine breite Welle, die alles mitreißt.",
    sup: { n: "Springflut", k: "s", mul: { dmg: 2.1, rad: 1.9, rng: 1.4 }, set: { kb: 240 }, need: 2000 } },
  { id: "regenbogen", n: "Regenbogenbogen", r: 4, t: "b", dmg: 200, spd: 600, rng: 9, n1: 3, spr: 14, ammo: 3, rl: 1.1, bd: 0, pierce: 0, rad: 6, bounce: 2, price: 0,
    d: "Drei Strahlen, die von Wänden abprallen.",
    sup: { n: "Farbenregen", k: "s", mul: { n1: 4 }, set: { spr: 340 }, need: 1900 } }
];
const W_PACE = (() => { WEAPONS.forEach(w => { w.rl = Math.round(w.rl * 1.45 * 10) / 10; w.spd = Math.round(w.spd * 0.68); if (w.sup) w.sup.need = Math.round(w.sup.need * 1.5); }); return 1; })();
const W = Object.fromEntries(WEAPONS.map(w => [w.id, w]));
const WEAPON_PRICE = [300, 1200, 4500, 14000, 40000];
WEAPONS.forEach(w => { if (w.id !== "pistole") w.price = WEAPON_PRICE[w.r]; });

/* ----- Fähigkeiten: k "a" aktiv (Knopf), "p" passiv ----- */
const ABILITIES = [
  { id: "sprint", n: "Sprint", r: 0, k: "a", cd: 8, d: "Kurz viel schneller laufen." },
  { id: "blase", n: "Schutzblase", r: 0, k: "a", cd: 12, d: "Schaden stark verringert, kurze Zeit." },
  { id: "zaeh", n: "Zähe Haut", r: 0, k: "p", d: "Mehr Leben." },
  { id: "flink", n: "Flinke Füße", r: 0, k: "p", d: "Du läufst etwas schneller." },
  { id: "heilregen", n: "Heilregen", r: 1, k: "a", cd: 14, d: "Heilt dich und Teamkameraden in der Nähe." },
  { id: "pfuetze", n: "Pfützenfalle", r: 1, k: "a", cd: 10, d: "Legt eine Pfütze, die Gegner verlangsamt und verletzt." },
  { id: "regen", n: "Regeneration", r: 1, k: "p", d: "Heilt dich, wenn du einige Sekunden keinen Schaden nimmst." },
  { id: "schwamm", n: "Schwamm", r: 1, k: "p", d: "Dein Super lädt schneller." },
  { id: "hecht", n: "Hechtsprung", r: 2, k: "a", cd: 7, d: "Ein schneller Satz nach vorn, du bist dabei unverwundbar." },
  { id: "welle", n: "Druckwelle", r: 2, k: "a", cd: 11, d: "Stößt Gegner um dich weg und betäubt sie kurz." },
  { id: "adrenalin", n: "Adrenalin", r: 2, k: "p", d: "Bei wenig Leben machst du mehr Schaden." },
  { id: "eisenhaut", n: "Eisenhaut", r: 2, k: "p", d: "Du nimmst weniger Schaden." },
  { id: "platscher", n: "Platscher", r: 3, k: "a", cd: 9, d: "Teleportiert dich ein Stück in Zielrichtung." },
  { id: "nebel", n: "Tarnnebel", r: 3, k: "a", cd: 14, d: "Unsichtbar, bis du angreifst." },
  { id: "raub", n: "Lebensraub", r: 3, k: "p", d: "Heilt dich anteilig am verursachten Schaden." },
  { id: "druck", n: "Überdruck", r: 3, k: "p", d: "Mehr Schaden und Reichweite." },
  { id: "sturmflut", n: "Sturmflut", r: 4, k: "a", cd: 16, d: "Riesige Flutwelle um dich: Schaden, Rückstoß und Heilung für dich." },
  { id: "wiedergeburt", n: "Wiedergeburt", r: 4, k: "p", d: "Einmal pro Match kehrst du mit halbem Leben zurück." }
];
const AB = Object.fromEntries(ABILITIES.map(a => [a.id, a]));

/* Wirkungswerte je Fähigkeit (Basis, wird mit abilityPower(lvl) skaliert) */
const AB_VAL = {
  sprint: { dur: 2.0, mul: 0.7 }, blase: { dur: 1.8, red: 0.6 }, zaeh: { hp: 0.10 }, flink: { spd: 0.08 },
  heilregen: { heal: 0.34, dur: 3, rad: 4 }, pfuetze: { rad: 1.7, dur: 6, slow: 0.5, dps: 70 }, regen: { rate: 0.03, wait: 3 },
  schwamm: { sup: 0.25 }, hecht: { dist: 5 }, welle: { rad: 3, dmg: 200, kb: 240, stun: 0.5 }, adrenalin: { dmg: 0.30, below: 0.4 },
  eisenhaut: { red: 0.12 }, platscher: { dist: 6 }, nebel: { dur: 3.5 }, raub: { frac: 0.10 }, druck: { dmg: 0.14, rng: 0.12 },
  sturmflut: { rad: 5, dmg: 500, kb: 320, heal: 0.2 }, wiedergeburt: { hp: 0.5 }
};
const abilityPower = lvl => 1 + 0.12 * (lvl - 1);
const weaponPower = lvl => 1 + 0.07 * (lvl - 1);
const MAX_WLV = 9, MAX_ALV = 7, MAX_STAT = 10;

/* Tropfen-Werte (Upgrades mit Münzen) */
const STATS = [
  { id: "hp", n: "Hülle", d: "Mehr Leben (+8 % je Stufe)", max: 10, cost: [100, 200, 350, 550, 800, 1100, 1500, 2000, 2700, 3500] },
  { id: "spd", n: "Schwung", d: "Schneller laufen (+2 % je Stufe)", max: 5, cost: [150, 350, 700, 1200, 2000] },
  { id: "pump", n: "Pumpe", d: "Schneller nachladen (+4 % je Stufe)", max: 5, cost: [150, 350, 700, 1200, 2000] }
];
const RAR_COST_MUL = [1, 1.5, 2.2, 3.2, 4.5];
const weaponUpCost = (r, lv) => Math.round([150, 350, 700, 1300, 2200, 3500, 5500, 8000][lv - 1] * RAR_COST_MUL[r]);
const abilityUpCost = (r, lv) => ({ dupes: [1, 2, 4, 6, 10, 15][lv - 1], coins: Math.round([150, 400, 900, 1800, 3500, 6000][lv - 1] * RAR_COST_MUL[r]) });

/* ----- Drops (Fähigkeiten) ----- */
const DROPS = [
  { id: 0, n: "Gewöhnlicher Drop", w: [70, 25, 5, 0, 0], coins: 300 },
  { id: 1, n: "Seltener Drop", w: [30, 50, 17, 3, 0], coins: 1000 },
  { id: 2, n: "Epischer Drop", w: [0, 30, 55, 14, 1], coins: 3200 },
  { id: 3, n: "Legendärer Drop", w: [0, 0, 40, 55, 5], gems: 25 },
  { id: 4, n: "Göttlicher Drop", w: [0, 0, 0, 40, 60], gems: 90 }
];
const EARN_DROP_W = [60, 28, 10, 1.8, 0.2];   // welcher Drop nach einem Match fällt

/* ----- Kosmetik ----- */
const COSMETICS = [
  // Farben
  { id: "col_himmel", s: "color", n: "Himmelblau", r: 0, col: "#5fb4de", def: 1 },
  { id: "col_minze", s: "color", n: "Minzgrün", r: 0, col: "#7fd6a8" },
  { id: "col_rosa", s: "color", n: "Rosa", r: 0, col: "#f4a7c3" },
  { id: "col_sonne", s: "color", n: "Sonnengelb", r: 1, col: "#f4c942" },
  { id: "col_koralle", s: "color", n: "Koralle", r: 1, col: "#ee7b6c" },
  { id: "col_lavendel", s: "color", n: "Lavendel", r: 1, col: "#b9a2ec" },
  { id: "col_tief", s: "color", n: "Tiefsee", r: 2, col: "#2a4fb8" },
  { id: "col_beere", s: "color", n: "Beere", r: 2, col: "#9b2f7c" },
  { id: "col_smaragd", s: "color", n: "Smaragd", r: 2, col: "#1f9d6e" },
  { id: "col_glut", s: "color", n: "Sonnenglut", r: 3, col: "#f6b21a", anim: "sun" },
  { id: "col_regenbogen", s: "color", n: "Regenbogen", r: 4, col: "#ff5ea8", anim: "rainbow" },
  // Hüte
  { id: "hat_none", s: "hat", n: "Kein Hut", r: 0, def: 1 },
  { id: "hat_kappe", s: "hat", n: "Kappe", r: 0 },
  { id: "hat_stroh", s: "hat", n: "Strohhut", r: 0 },
  { id: "hat_party", s: "hat", n: "Partyhut", r: 1 },
  { id: "hat_zylinder", s: "hat", n: "Zylinder", r: 1 },
  { id: "hat_pirat", s: "hat", n: "Piratenhut", r: 1 },
  { id: "hat_zauber", s: "hat", n: "Zauberhut", r: 2 },
  { id: "hat_blumen", s: "hat", n: "Blumenkranz", r: 2 },
  { id: "hat_krone", s: "hat", n: "Königskrone", r: 3 },
  { id: "hat_heilig", s: "hat", n: "Heiligenschein", r: 4 },
  // Gesichter
  { id: "face_normal", s: "face", n: "Normal", r: 0, def: 1 },
  { id: "face_froh", s: "face", n: "Fröhlich", r: 0 },
  { id: "face_taucher", s: "face", n: "Taucherbrille", r: 1 },
  { id: "face_cool", s: "face", n: "Sonnenbrille", r: 1 },
  { id: "face_herz", s: "face", n: "Herzaugen", r: 2 },
  { id: "face_monokel", s: "face", n: "Monokel", r: 2 },
  { id: "face_laser", s: "face", n: "Lasersicht", r: 3 },
  { id: "face_stern", s: "face", n: "Sternenaugen", r: 4 },
  // Rücken
  { id: "back_none", s: "back", n: "Nichts", r: 0, def: 1 },
  { id: "back_ring", s: "back", n: "Schwimmring", r: 0 },
  { id: "back_umhang", s: "back", n: "Umhang", r: 1 },
  { id: "back_rucksack", s: "back", n: "Rucksack", r: 1 },
  { id: "back_engel", s: "back", n: "Engelsflügel", r: 2 },
  { id: "back_jet", s: "back", n: "Düsenpack", r: 3 },
  { id: "back_regenb", s: "back", n: "Regenbogenflügel", r: 4 },
  // Spuren
  { id: "trail_none", s: "trail", n: "Keine Spur", r: 0, def: 1 },
  { id: "trail_blasen", s: "trail", n: "Blasen", r: 0 },
  { id: "trail_herzen", s: "trail", n: "Herzen", r: 1 },
  { id: "trail_dampf", s: "trail", n: "Dampf", r: 1 },
  { id: "trail_sterne", s: "trail", n: "Sterne", r: 2 },
  { id: "trail_gold", s: "trail", n: "Goldstaub", r: 3 },
  { id: "trail_regen", s: "trail", n: "Regenbogenspur", r: 4 },
  // Waffen-Looks (nur Optik, sehr selten)
  { id: "skin_none", s: "skin", n: "Standard", r: 0, def: 1 },
  { id: "skin_pastell", s: "skin", n: "Pastell", r: 1 },
  { id: "skin_tarn", s: "skin", n: "Tarnmuster", r: 1 },
  { id: "skin_neon", s: "skin", n: "Neon", r: 2 },
  { id: "skin_gold", s: "skin", n: "Goldglanz", r: 3 },
  { id: "skin_regen", s: "skin", n: "Regenbogen", r: 4 }
];
const CO = Object.fromEntries(COSMETICS.map(c => [c.id, c]));
const COS_SLOTS = [
  { id: "color", n: "Farbe" }, { id: "hat", n: "Hut" }, { id: "face", n: "Gesicht" },
  { id: "back", n: "Rücken" }, { id: "trail", n: "Spur" }, { id: "skin", n: "Waffen-Look" }
];
const DEFAULT_COS = { color: "col_himmel", hat: "hat_none", face: "face_normal", back: "back_none", trail: "trail_none", skin: "skin_none" };
const CAPSULE_COST = 500;
const CAPSULE_W = [55, 28, 12, 4, 1];
const COS_DAILY_PRICE = [250, 700, 1800, 6000, 20000];
const COS_DUP_REFUND = [60, 150, 400, 1200, 4000];

/* ----- Spielmodi ----- */
const MODES = {
  showdown: { id: "showdown", n: "Showdown", d: "5 Tropfen, jeder gegen jeden. Die Trockenheit rückt vor, nur einer bleibt nass.", teams: 5, per: 1, ffa: true, time: 330, map: "wiese" },
  perlen: { id: "perlen", n: "Perlenjagd", d: "Sammle 10 Perlen und halte sie 15 Sekunden.", teams: 2, per: 3, time: 260, map: "strand", need: 10, hold: 15 },
  knockout: { id: "knockout", n: "Knockout", d: "Drei Runden, kein Zurückkehren. Zwei Siege gewinnen.", teams: 2, per: 3, time: 100, map: "becken", rounds: 2 },
  koenig: { id: "koenig", n: "Königsbecken", d: "Halte das wandernde Becken und sammle Punkte.", teams: 2, per: 3, time: 260, map: "teich", goal: 100 },
  heist: { id: "heist", n: "Eimer-Heist", d: "Zerstöre den Eimer der Gegner und schütze deinen.", teams: 2, per: 3, time: 260, map: "garten", bucketHp: 9000 },
  eroberung: { id: "eroberung", n: "Eroberung", d: "Halte drei Stellen auf der Karte und sammle Punkte.", teams: 2, per: 3, time: 260, map: "ufer", goal: 100 }
};
const MODE_IDS = Object.keys(MODES);
const TEAM_MODES = MODE_IDS.filter(m => !MODES[m].ffa);

/* ----- Fortschritt ----- */
const MAX_LVL = 60;
const xpToNext = lvl => 100 + 40 * lvl;
const levelFromXp = xp => { let l = 1; while (l < MAX_LVL && xp >= xpToNext(l)) { xp -= xpToNext(l); l++; } return { lvl: l, into: xp, need: l >= MAX_LVL ? 1 : xpToNext(l) }; };
const levelUpCoins = lvl => 100 + lvl * 10;
const levelUpGems = lvl => (lvl % 10 === 0 ? 1 : 0);
const RANKS = [
  { n: "Pfütze", rp: 0, gems: 0 }, { n: "Bach", rp: 100, gems: 2 }, { n: "Fluss", rp: 250, gems: 3 },
  { n: "See", rp: 450, gems: 4 }, { n: "Meer", rp: 700, gems: 6 }, { n: "Ozean", rp: 1000, gems: 10 }
];
const rankOf = rp => { let i = 0; RANKS.forEach((r, k) => { if (rp >= r.rp) i = k; }); return i; };
const RANKED_MIN_LVL = 3;
const DAILY_COINS = [100, 150, 200, 250, 300, 400];   // Tag 7: 1 Gem + Gewöhnlicher Drop
const QUEST_POOL = [
  { id: "play", n: "Spiele {n} Matches", need: [3, 4, 5], coins: 150 },
  { id: "win", n: "Gewinne {n} Match", need: [1, 2], coins: 250, drop: 0 },
  { id: "kills", n: "Spritze {n} Gegner nass", need: [5, 8], coins: 200 },
  { id: "dmg", n: "Verursache {n} Schaden", need: [6000, 9000], coins: 180 },
  { id: "top", n: "Erreiche {n}x die Top 2 im Showdown", need: [1, 2], coins: 220 }
];

/* ----- Werte-Berechnung für ein Match ----- */
function calcPlayerStats(lvl, up, abilityId, abilityLv) {
  const ap = abilityPower(abilityLv || 1), v = AB_VAL[abilityId] || {};
  let hp = BASE_HP * (1 + 0.012 * (lvl - 1)) * (1 + 0.08 * (up.hp || 0));
  let spd = BASE_SPEED * (1 + 0.02 * (up.spd || 0));
  if (abilityId === "zaeh") hp *= 1 + v.hp * ap;
  if (abilityId === "flink") spd *= 1 + v.spd * ap;
  return { hp: Math.round(hp), spd, reload: 1 + 0.04 * (up.pump || 0) };
}

/* ----- kleine Helfer ----- */
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
function hash32(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function pickW(weights, rnd) { let t = rnd() * weights.reduce((a, b) => a + b, 0); for (let i = 0; i < weights.length; i++) { t -= weights[i]; if (t < 0) return i; } return weights.length - 1; }
