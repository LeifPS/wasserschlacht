// Integrationstest gegen einen laufenden Worker (wrangler dev): Konto, Shop, Drops, Queue, Match.
const BASE = process.argv[2] || "http://localhost:8787", WS = BASE.replace("http", "ws");
const post = async (p, b) => (await fetch(BASE + p, { method: "POST", body: JSON.stringify(b) })).json();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ok = (c, m) => { console.log(c ? "  ok  " : "  FEHLER", m); if (!c) process.exitCode = 1; };
const suf = Math.random().toString(36).slice(2, 6);
async function mk(name) {
  let r = await post("/api/register", { name, pw: "geheim1" }); ok(r.ok, "registrieren " + name + (r.error ? " " + r.error : ""));
  const dup = await post("/api/register", { name, pw: "x1234" }); ok(!dup.ok, "doppelter Name abgelehnt");
  const bad = await post("/api/login", { name, pw: "falsch" }); ok(!bad.ok, "falsches Passwort abgelehnt");
  r = await post("/api/login", { name, pw: "geheim1" }); ok(r.ok && r.token, "einloggen");
  return { name, token: r.token, p: r.profile };
}
const act = async (u, op, args) => { const r = await post("/api/act", { name: u.name, token: u.token, op, args }); if (r.profile) u.p = r.profile; return r; };
const a = await mk("Alpha" + suf), b = await mk("Beta" + suf);
console.log("Profil:", JSON.stringify({ coins: a.p.coins, lvl: a.p.lvl, eqW: a.p.eqW, offers: a.p.shop.offers, quests: a.p.q.list.map(q => q.id) }));
let r = await act(a, "claimDaily"); ok(r.ok, "Tagesbelohnung " + JSON.stringify(r.reward)); r = await act(a, "claimDaily"); ok(!r.ok, "zweimal abholen geht nicht");
r = await act(a, "buyDrop", { tier: 0 }); ok(r.ok && r.got.k === "a", "Gewöhnlicher Drop gekauft: " + JSON.stringify(r.got));
r = await act(a, "capsule"); ok(r.ok || /Münzen/.test(r.error), "Kosmetik-Blase: " + JSON.stringify(r.got || r.error));
r = await act(a, "buyWeapon", { id: "flasche" }); ok(r.ok || /Münzen/.test(r.error), "Spritzflasche kaufen: " + (r.error || "ok"));
r = await act(a, "buyWeapon", { id: "tsunami" }); ok(!r.ok, "nicht im Angebot: " + r.error);
r = await act(a, "upStat", { id: "hp" }); ok(r.ok || /Münzen/.test(r.error), "Hülle upgraden: " + (r.error || "ok"));
r = await act(a, "equip", { slot: "weapon", id: "tsunami" }); ok(!r.ok, "fremde Waffe ausrüsten verboten");
r = await post("/api/me", { name: a.name, token: "boese" }); ok(!r.ok, "falscher Token abgelehnt");
// Lobby + Queue
const lob = u => new Promise((res, rej) => { const ws = new WebSocket(`${WS}/ws/lobby?u=${encodeURIComponent(u.name)}&t=${u.token}`); ws.msgs = []; ws.onmessage = e => { const m = JSON.parse(e.data); ws.msgs.push(m); if (m.t === "hi") res(ws); }; ws.onerror = e => rej(new Error("lobby ws")); });
const la = await lob(a), lb = await lob(b); ok(true, "Lobby verbunden");
la.send(JSON.stringify({ t: "party", op: "create" })); await sleep(300);
const pc = la.msgs.find(m => m.t === "party" && m.code); ok(!!pc, "Party-Code " + (pc && pc.code));
lb.send(JSON.stringify({ t: "party", op: "join", code: pc.code })); await sleep(300);
ok(lb.msgs.some(m => m.t === "party" && m.code && m.members.length === 2), "Party beigetreten");
la.send(JSON.stringify({ t: "queue", ranked: false }));
const t0 = Date.now(); let found = null;
while (!found && Date.now() - t0 < 30000) { await sleep(300); found = la.msgs.find(m => m.t === "found"); }
ok(!!found, "Match gefunden nach " + ((Date.now() - t0) / 1000).toFixed(1) + "s: " + JSON.stringify(found));
const fb = lb.msgs.find(m => m.t === "found"); ok(fb && fb.id === found.id, "Partner im selben Match, Teams " + found.team + "/" + (fb && fb.team));
// Match
const mws = u => new Promise(res => { const ws = new WebSocket(`${WS}/ws/match?id=${found.id}&u=${encodeURIComponent(u.name)}&t=${u.token}`); ws.msgs = []; ws.onmessage = e => ws.msgs.push(JSON.parse(e.data)); ws.onopen = () => res(ws); });
const ma = await mws(a), mb = await mws(b);
await sleep(1500);
const init = ma.msgs.find(m => m.t === "init"); ok(!!init, "init: Modus " + (init && init.mode) + ", " + (init && init.players.length) + " Spieler");
let snaps = ma.msgs.filter(m => m.t === "s").length; ok(snaps > 5, "Schnappschüsse kommen (" + snaps + ")");
const t1 = Date.now(); let seq = 0;
while (Date.now() - t1 < 9000) { seq++; ma.send(JSON.stringify({ t: "i", s: seq, mx: Math.cos(seq / 10), my: Math.sin(seq / 10), ax: 1, ay: 0 })); if (seq % 15 === 0) ma.send(JSON.stringify({ t: "f", ax: 1, ay: 0, d: 1 })); await sleep(50); }
const last = ma.msgs.filter(m => m.t === "s").pop(); ok(last && last.a > 0, "Server bestätigt Eingaben (seq " + (last && last.a) + ")");
console.log("  letzter Schnappschuss me:", JSON.stringify(last.me), "Spieler sichtbar:", last.p.length, "Modus-Status:", JSON.stringify(last.st).slice(0, 120));
ma.send(JSON.stringify({ t: "leave" })); mb.send(JSON.stringify({ t: "leave" })); await sleep(1500);
r = await post("/api/me", { name: a.name, token: a.token }); ok(r.ok && r.profile.stats.matches === 1, "Spielstand nach Match: " + JSON.stringify(r.profile.stats) + " Münzen " + r.profile.coins + " XP " + r.profile.xp);
process.exit(process.exitCode || 0);
