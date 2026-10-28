// Ein Durable Object pro Spieler: Konto, Passwort, Spielstand und Wirtschaft (alles serverseitig, nicht manipulierbar).
import { DurableObject } from "cloudflare:workers";
import {
  W, WEAPONS, ABILITIES, AB, COSMETICS, CO, DROPS, EARN_DROP_W, DEFAULT_COS, CAPSULE_COST, CAPSULE_W, COS_DAILY_PRICE, COS_DUP_REFUND,
  STATS, MAX_WLV, MAX_ALV, weaponUpCost, abilityUpCost, levelFromXp, levelUpCoins, levelUpGems, RANKS, rankOf, RANKED_MIN_LVL,
  DAILY_COINS, QUEST_POOL, mulberry, hash32, pickW, MODES
} from "./shared.mjs";

const NAME_RE = /^[A-Za-z0-9_äöüÄÖÜß.-]{3,14}$/;
const BAD = ["nazi", "hitler", "fick", "hure", "nutte", "arsch", "neger", "porn", "sex", "rape"];
const dayNow = () => Math.floor((Date.now() + 3600e3) / 86400e3);
const b64 = u8 => btoa(String.fromCharCode(...u8)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64 = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
async function hashPw(pw, salt) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
  return b64(new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256)));
}
const same = (a, b) => { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };

export const nameKey = n => String(n).toLowerCase();
export function validName(n) {
  n = String(n || "").trim();
  if (!NAME_RE.test(n)) return "Der Name braucht 3 bis 14 Zeichen (Buchstaben, Zahlen, _ . -).";
  const k = n.toLowerCase(); if (BAD.some(b => k.includes(b))) return "Dieser Name ist nicht erlaubt.";
  return null;
}

function freshProfile(name, pwHash, salt) {
  const cos = {}; COSMETICS.filter(c => c.def).forEach(c => cos[c.id] = 1);
  return {
    v: 1, name, nk: nameKey(name), pwHash, salt, tokens: [], created: Date.now(), fail: 0, lock: 0,
    coins: 300, gems: 0, xp: 0,
    weapons: { pistole: { lvl: 1 } }, eqW: "pistole",
    abilities: {}, eqA: null,
    cos, eqC: { ...DEFAULT_COS },
    up: { hp: 0, spd: 0, pump: 0 },
    drops: [0, 0, 0, 0, 0],
    shop: { day: 0, offers: [], bought: {} },
    daily: { claimedDay: 0, streak: -1 },
    q: { day: 0, list: [] },
    rank: { rp: 0, best: 0 },
    stats: { matches: 0, wins: 0, kills: 0, dmg: 0 },
    seen: { tut: 0 }
  };
}

export class User extends DurableObject {
  p = null;
  async #load() { if (!this.p) this.p = (await this.ctx.storage.get("p")) || null; return this.p; }
  async #save() { await this.ctx.storage.put("p", this.p); }

  /* ----- Konto ----- */
  async register(name, pw) {
    const err = validName(name); if (err) return { ok: false, error: err };
    pw = String(pw || ""); if (pw.length < 4 || pw.length > 64) return { ok: false, error: "Das Passwort braucht 4 bis 64 Zeichen." };
    if (await this.#load()) return { ok: false, error: "Dieser Name ist schon vergeben." };
    const salt = crypto.getRandomValues(new Uint8Array(16));
    this.p = freshProfile(String(name).trim(), await hashPw(pw, salt), b64(salt));
    const token = this.#newToken(); this.#daily(); await this.#save();
    return { ok: true, token, profile: this.#view() };
  }
  async login(pw) {
    const p = await this.#load(); if (!p) return { ok: false, error: "Name oder Passwort stimmt nicht." };
    if (Date.now() < p.lock) return { ok: false, error: "Zu viele Versuche. Warte kurz und probiere es dann nochmal." };
    const h = await hashPw(String(pw || ""), fromB64(p.salt));
    if (!same(h, p.pwHash)) { p.fail = (p.fail || 0) + 1; if (p.fail >= 5) { p.lock = Date.now() + 20000; p.fail = 0; } await this.#save(); return { ok: false, error: "Name oder Passwort stimmt nicht." }; }
    p.fail = 0; const token = this.#newToken(); this.#daily(); await this.#save();
    return { ok: true, token, profile: this.#view() };
  }
  #newToken() { const t = b64(crypto.getRandomValues(new Uint8Array(24))); this.p.tokens.push(t); if (this.p.tokens.length > 8) this.p.tokens.shift(); return t; }
  async #ok(token) { const p = await this.#load(); return !!(p && token && p.tokens.includes(token)); }

  async me(token) { if (!await this.#ok(token)) return { ok: false, error: "auth" }; this.#daily(); await this.#save(); return { ok: true, profile: this.#view() }; }

  /* Ausrüstung für ein Match (vom Worker nach der Anmeldung abgefragt) */
  async loadout(token) {
    if (!await this.#ok(token)) return null; const p = this.p, lv = levelFromXp(p.xp).lvl;
    const w = p.weapons[p.eqW] ? p.eqW : "pistole", a = p.eqA && p.abilities[p.eqA] ? p.eqA : null;
    return { name: p.name, lvl: lv, w: { id: w, lvl: p.weapons[w].lvl }, a: a ? { id: a, lvl: p.abilities[a].lvl } : null, cos: { ...p.eqC }, up: { ...p.up }, rp: p.rank.rp };
  }

  /* ----- Ansicht ohne Geheimnisse ----- */
  #view() {
    const p = this.p, lv = levelFromXp(p.xp);
    this.#shop(); this.#quests();
    return {
      name: p.name, coins: p.coins, gems: p.gems, xp: p.xp, lvl: lv.lvl, xpInto: lv.into, xpNeed: lv.need,
      weapons: p.weapons, eqW: p.eqW, abilities: p.abilities, eqA: p.eqA, cos: p.cos, eqC: p.eqC, up: p.up, drops: p.drops,
      shop: p.shop, daily: { ...p.daily, day: dayNow(), canClaim: p.daily.claimedDay !== dayNow(), next: this.#nextStreak() }, q: p.q,
      rank: { rp: p.rank.rp, best: p.rank.best, tier: rankOf(p.rank.rp) }, stats: p.stats, seen: p.seen, day: dayNow()
    };
  }
  #nextStreak() { const d = this.p.daily; return d.claimedDay === dayNow() - 1 || d.claimedDay === dayNow() ? (d.claimedDay === dayNow() ? (d.streak + 1) % 7 : (d.streak + 1) % 7) : 0; }
  #daily() { /* nur Platzhalter: Anspruch wird in der Ansicht berechnet */ }

  /* ----- Tagesangebote ----- */
  #shop() {
    const p = this.p, day = dayNow(); if (p.shop.day === day && p.shop.offers.length) return;
    const rnd = mulberry(hash32(p.nk + ":" + day)), offers = [], bought = {};
    // Waffen: 2 Plätze, nur seltene Stufen (Zufall)
    for (let i = 0; i < 2; i++) {
      for (let tries = 0; tries < 6; tries++) {
        const r = 2 + pickW([78, 18, 4], rnd);
        const pool = WEAPONS.filter(w => w.r === r && !p.weapons[w.id] && !offers.some(o => o.id === w.id));
        if (!pool.length) continue;
        const w = pool[Math.floor(rnd() * pool.length)]; offers.push({ k: "w", id: w.id, price: w.price }); break;
      }
    }
    // Kosmetik: 2 Plätze
    for (let i = 0; i < 2; i++) {
      for (let tries = 0; tries < 8; tries++) {
        const r = pickW([40, 30, 18, 9, 3], rnd);
        const pool = COSMETICS.filter(c => c.r === r && !c.def && !p.cos[c.id] && !offers.some(o => o.id === c.id));
        if (!pool.length) continue;
        const c = pool[Math.floor(rnd() * pool.length)]; offers.push({ k: "c", id: c.id, price: COS_DAILY_PRICE[c.r] }); break;
      }
    }
    p.shop = { day, offers, bought };
  }

  /* ----- Aufgaben ----- */
  #quests() {
    const p = this.p, day = dayNow(); if (p.q.day === day && p.q.list.length) return;
    const rnd = mulberry(hash32(p.nk + ":q:" + day)), pool = [...QUEST_POOL], list = [];
    for (let i = 0; i < 3 && pool.length; i++) {
      const d = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
      list.push({ id: d.id, need: d.need[Math.floor(rnd() * d.need.length)], have: 0, coins: d.coins, drop: d.drop ?? -1, claimed: false });
    }
    p.q = { day, list };
  }

  /* ----- Aktionen des Spielers ----- */
  async act(token, op, a) {
    if (!await this.#ok(token)) return { ok: false, error: "auth" };
    a = a || {}; const p = this.p; this.#shop(); this.#quests();
    let res;
    switch (op) {
      case "buyWeapon": res = this.#buyWeapon(a); break;
      case "buyCos": res = this.#buyCos(a); break;
      case "capsule": res = this.#capsule(); break;
      case "buyDrop": res = this.#buyDrop(a); break;
      case "openDrop": res = this.#openDrop(a); break;
      case "upWeapon": res = this.#upWeapon(a); break;
      case "upAbility": res = this.#upAbility(a); break;
      case "upStat": res = this.#upStat(a); break;
      case "equip": res = this.#equip(a); break;
      case "claimDaily": res = this.#claimDaily(); break;
      case "claimQuest": res = this.#claimQuest(a); break;
      case "seen": p.seen = { ...p.seen, ...(a.set || {}) }; res = { ok: true }; break;
      default: res = { ok: false, error: "Unbekannte Aktion." };
    }
    if (res.ok) await this.#save();
    return { ...res, profile: this.#view() };
  }

  #pay(coins, gems) { const p = this.p; if (coins && p.coins < coins) return "Nicht genug Münzen."; if (gems && p.gems < gems) return "Nicht genug Gems."; p.coins -= coins || 0; p.gems -= gems || 0; return null; }
  #buyWeapon({ id }) {
    const p = this.p, w = W[id]; if (!w) return { ok: false, error: "Unbekannte Waffe." }; if (p.weapons[id]) return { ok: false, error: "Die Waffe gehört dir schon." };
    const shelf = w.r <= 1, off = p.shop.offers.find(o => o.k === "w" && o.id === id);
    if (!shelf && (!off || p.shop.bought["w:" + id])) return { ok: false, error: "Diese Waffe ist heute nicht im Angebot." };
    const e = this.#pay(w.price, 0); if (e) return { ok: false, error: e };
    p.weapons[id] = { lvl: 1 }; if (off) p.shop.bought["w:" + id] = 1; return { ok: true, got: { k: "w", id } };
  }
  #buyCos({ id }) {
    const p = this.p, c = CO[id]; const off = p.shop.offers.find(o => o.k === "c" && o.id === id);
    if (!c || !off || p.shop.bought["c:" + id] || p.cos[id]) return { ok: false, error: "Das gibt es heute nicht." };
    const e = this.#pay(off.price, 0); if (e) return { ok: false, error: e };
    p.cos[id] = 1; p.shop.bought["c:" + id] = 1; return { ok: true, got: { k: "c", id } };
  }
  #capsule() {
    const p = this.p, e = this.#pay(CAPSULE_COST, 0); if (e) return { ok: false, error: e };
    const r = pickW(CAPSULE_W, Math.random);
    const pool = COSMETICS.filter(c => c.r === r && !c.def), wt = pool.map(c => c.s === "skin" ? 0.35 : 1);
    const item = pool[pickW(wt, Math.random)], dup = !!p.cos[item.id]; let refund = 0;
    if (dup) { refund = COS_DUP_REFUND[item.r]; p.coins += refund; } else p.cos[item.id] = 1;
    return { ok: true, got: { k: "c", id: item.id, dup, refund } };
  }
  #rollAbility(tier) {
    const p = this.p, r = pickW(DROPS[tier].w, Math.random), pool = ABILITIES.filter(a => a.r === r), a = pool[Math.floor(Math.random() * pool.length)];
    const own = p.abilities[a.id], dup = !!own;
    if (dup) own.dupes = (own.dupes || 0) + 1; else p.abilities[a.id] = { lvl: 1, dupes: 0 };
    if (!p.eqA) p.eqA = a.id;
    return { k: "a", id: a.id, r, tier, dup };
  }
  #buyDrop({ tier }) {
    const d = DROPS[tier]; if (!d) return { ok: false, error: "Unbekannter Drop." };
    const e = this.#pay(d.coins || 0, d.gems || 0); if (e) return { ok: false, error: e };
    return { ok: true, got: this.#rollAbility(tier) };
  }
  #openDrop({ tier }) {
    const p = this.p; if (!DROPS[tier] || !(p.drops[tier] > 0)) return { ok: false, error: "Du hast keinen solchen Drop." };
    p.drops[tier]--; return { ok: true, got: this.#rollAbility(tier) };
  }
  #upWeapon({ id }) {
    const p = this.p, w = p.weapons[id]; if (!w) return { ok: false, error: "Waffe fehlt." }; if (w.lvl >= MAX_WLV) return { ok: false, error: "Schon auf der höchsten Stufe." };
    const e = this.#pay(weaponUpCost(W[id].r, w.lvl), 0); if (e) return { ok: false, error: e }; w.lvl++; return { ok: true };
  }
  #upAbility({ id }) {
    const p = this.p, a = p.abilities[id]; if (!a) return { ok: false, error: "Fähigkeit fehlt." }; if (a.lvl >= MAX_ALV) return { ok: false, error: "Schon auf der höchsten Stufe." };
    const c = abilityUpCost(AB[id].r, a.lvl); if ((a.dupes || 0) < c.dupes) return { ok: false, error: "Du brauchst mehr Duplikate." };
    const e = this.#pay(c.coins, 0); if (e) return { ok: false, error: e }; a.dupes -= c.dupes; a.lvl++; return { ok: true };
  }
  #upStat({ id }) {
    const p = this.p, s = STATS.find(x => x.id === id); if (!s) return { ok: false, error: "Unbekannt." };
    const lv = p.up[id] || 0; if (lv >= s.max) return { ok: false, error: "Schon auf der höchsten Stufe." };
    const e = this.#pay(s.cost[lv], 0); if (e) return { ok: false, error: e }; p.up[id] = lv + 1; return { ok: true };
  }
  #equip({ slot, id }) {
    const p = this.p;
    if (slot === "weapon") { if (!p.weapons[id]) return { ok: false, error: "Die Waffe gehört dir nicht." }; p.eqW = id; }
    else if (slot === "ability") { if (id !== null && !p.abilities[id]) return { ok: false, error: "Die Fähigkeit gehört dir nicht." }; p.eqA = id; }
    else { const c = CO[id]; if (!c || c.s !== slot || !p.cos[id]) return { ok: false, error: "Das gehört dir nicht." }; p.eqC[slot] = id; }
    return { ok: true };
  }
  #claimDaily() {
    const p = this.p, day = dayNow(), d = p.daily; if (d.claimedDay === day) return { ok: false, error: "Heute schon abgeholt." };
    const streak = d.claimedDay === day - 1 ? (d.streak + 1) % 7 : 0; d.streak = streak; d.claimedDay = day;
    let reward;
    if (streak < 6) { p.coins += DAILY_COINS[streak]; reward = { coins: DAILY_COINS[streak] }; } else { p.gems += 1; p.drops[0]++; reward = { gems: 1, drop: 0 }; }
    return { ok: true, reward, streak };
  }
  #claimQuest({ i }) {
    const q = this.p.q.list[i]; if (!q || q.claimed || q.have < q.need) return { ok: false, error: "Noch nicht fertig." };
    q.claimed = true; this.p.coins += q.coins; if (q.drop >= 0) this.p.drops[q.drop]++; return { ok: true, reward: { coins: q.coins, drop: q.drop } };
  }

  /* ----- Ergebnis eines Matches (nur vom Match-Server aufgerufen) ----- */
  async matchResult(r) {
    const p = await this.#load(); if (!p) return null; this.#quests(); this.#shop();
    const won = !!r.won, k = r.kills | 0, dmg = Math.round(r.dmg || 0), pl = r.placement | 0, ffa = r.mode === "showdown";
    const placeC = ffa ? [120, 70, 40, 20, 0][clampI(pl - 1, 0, 4)] : 0, placeX = ffa ? [40, 25, 15, 5, 0][clampI(pl - 1, 0, 4)] : 0;
    const coins = 40 + (won ? 100 : 0) + k * 10 + Math.floor(dmg / 150) + placeC, xp = 30 + (won ? 40 : 0) + k * 6 + Math.floor(dmg / 400) + placeX;
    const before = levelFromXp(p.xp).lvl; p.coins += coins; p.xp += xp;
    const after = levelFromXp(p.xp).lvl; let lvCoins = 0, lvGems = 0;
    for (let l = before + 1; l <= after; l++) { lvCoins += levelUpCoins(l); lvGems += levelUpGems(l); }
    p.coins += lvCoins; p.gems += lvGems;
    // Rang
    let rank = null;
    if (r.ranked && r.mode !== "showdown") {
      const old = rankOf(p.rank.rp); p.rank.rp = Math.max(0, p.rank.rp + (won ? 22 : -16)); const nw = rankOf(p.rank.rp); let g = 0;
      if (p.rank.rp > p.rank.best) { for (let t = rankOf(p.rank.best) + 1; t <= nw; t++) g += RANKS[t].gems; p.rank.best = p.rank.rp; p.gems += g; }
      rank = { rp: p.rank.rp, delta: won ? 22 : -16, tier: nw, up: nw > old, gems: g };
    }
    // Drop und seltene Gems
    let drop = -1, gemFind = 0; const good = won || (ffa && pl <= 2);
    if (Math.random() < (good ? 0.5 : 0.28)) { drop = pickW(EARN_DROP_W, Math.random); p.drops[drop]++; }
    if (good && Math.random() < 0.01) { gemFind = 1; p.gems += 1; }
    // Aufgaben
    for (const q of p.q.list) {
      if (q.id === "play") q.have += 1; else if (q.id === "win" && won) q.have += 1; else if (q.id === "kills") q.have += k; else if (q.id === "dmg") q.have += dmg;
      else if (q.id === "top" && ffa && pl <= 2) q.have += 1;
      q.have = Math.min(q.have, q.need);
    }
    p.stats.matches++; if (won) p.stats.wins++; p.stats.kills += k; p.stats.dmg += dmg;
    await this.#save();
    const lv = levelFromXp(p.xp);
    return { coins, xp, lvBefore: before, lvAfter: after, lvCoins, lvGems, rank, drop, gemFind, lvl: lv.lvl, xpInto: lv.into, xpNeed: lv.need };
  }
}
const clampI = (v, a, b) => Math.max(a, Math.min(b, v | 0));
