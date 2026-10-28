/* ===== OBERFLÄCHE: Anmeldung, Lobby, Fenster ===== */
const UI = { win: null, tab: null, sel: null, ranked: false, hero: { t: 0, parts: [] } };
const RN = r => `<span class="tr${r}">${RAR[r].n}</span>`;
const img = (kind, id, size) => `<img src="${iconURL(kind, id, size || 96)}" alt="">`;
const coinH = n => `<span class="coin"><i style="background-image:url(${iconURL("coin", "c", 48)})"></i>${fmt(n)}</span>`;
const gemH = n => `<span class="gem"><i style="background-image:url(${iconURL("gem", "g", 48)})"></i>${fmt(n)}</span>`;
const priceH = (c, g) => g ? gemH(g) : coinH(c || 0);
const canPay = (c, g) => g ? G.P.gems >= g : G.P.coins >= (c || 0);
const sp2 = ap => 1 + (ap - 1) * 0.5;
const cardH = (o) => `<div class="cardx r${o.r} ${o.on ? "on" : ""} ${o.dim ? "dim" : ""}" data-a="${o.a}" data-id="${o.id}">${o.tag ? `<span class="tag">${o.tag}</span>` : ""}${o.dot ? `<span class="dot">${o.dot}</span>` : ""}${o.img}<b>${o.name}</b>${o.sub ? `<small>${o.sub}</small>` : ""}</div>`;

function showScreen(name) {
  $("s-auth").hidden = name !== "auth"; $("s-lobby").hidden = name !== "lobby";
  document.body.classList.toggle("inmatch", name === "match"); $("cv").hidden = name !== "match"; $("bg").style.display = name === "match" ? "none" : "block";
  G.screen = name; if (name !== "lobby") closeWin();
  if (name === "lobby") { refreshHud(); Snd.music("lobby"); } else if (name === "auth") { Snd.music(null); }
}

/* ---------- Anmeldung ---------- */
function authErr(m) { $("authErr").textContent = m || ""; }
async function doAuth(reg) {
  const name = $("inName").value.trim(), pw = $("inPw").value; authErr("");
  if (!name || !pw) return authErr("Bitte Name und Passwort eingeben.");
  $("btnLogin").disabled = $("btnReg").disabled = true;
  const r = await api(reg ? "/api/register" : "/api/login", { name, pw });
  $("btnLogin").disabled = $("btnReg").disabled = false;
  if (!r.ok) return authErr(r.error || "Das hat nicht geklappt.");
  G.user = { name: r.profile.name, token: r.token }; G.P = r.profile; saveLogin(); enterLobby();
}
function enterLobby() { showScreen("lobby"); Lob.connect(); onQueueState(); onPartyState(); if (G.P.stats.matches === 0) $("sideInfo").textContent = "Tipp: Hol dir im Shop deinen ersten Fähigkeiten-Drop!"; else $("sideInfo").textContent = ""; }
async function tryAutoLogin() {
  const l = loadLogin(); if (!l || !l.token) return false;
  const r = await api("/api/me", { name: l.name, token: l.token });
  if (r.ok) { G.user = l; G.P = r.profile; return true; } return false;
}

/* ---------- Kopfzeile, Punkte ---------- */
function refreshHud() {
  const P = G.P; if (!P) return;
  $("meName").textContent = P.name; $("meLv").textContent = "Lv " + P.lvl; $("meXp").style.width = Math.round(100 * P.xpInto / P.xpNeed) + "%";
  UI.tc = P.coins; UI.tg = P.gems; if (UI.dc == null) { UI.dc = P.coins; UI.dg = P.gems; }
  $("icoCoin").style.backgroundImage = `url(${iconURL("coin", "c", 48)})`; $("icoGem").style.backgroundImage = `url(${iconURL("gem", "g", 48)})`;
  const dots = { shop: 0, abil: P.drops.reduce((a, b) => a + b, 0), weap: 0, look: 0, quest: (P.daily.canClaim ? 1 : 0) + P.q.list.filter(q => !q.claimed && q.have >= q.need).length };
  document.querySelectorAll("#nav .btn").forEach(b => { const d = b.querySelector(".dot"), n = dots[b.dataset.id] || 0; if (d) { d.textContent = n; d.hidden = !n; } });
  const rk = RANKS[P.rank.tier]; $("chipRanked").textContent = UI.ranked ? "Ranked: " + rk.n : "Ranked"; $("chipRanked").setAttribute("aria-pressed", UI.ranked);
  if (UI.win && UI.win.render) renderWin();
}
function buildNav() {
  const items = [["shop", "Shop"], ["abil", "Fähigkeiten"], ["weap", "Waffen"], ["look", "Aussehen"], ["quest", "Aufgaben"]];
  $("nav").innerHTML = items.map(([id, n]) => `<button class="btn" data-id="${id}">${img("nav", id, 64)}<span>${n}</span><span class="dot" hidden>0</span></button>`).join("");
  $("nav").onclick = e => { const b = e.target.closest(".btn"); if (!b) return; sfx("click"); openWinById(b.dataset.id); };
}

/* ---------- Hintergrund und Held ---------- */
const BG = { bub: Array.from({ length: 26 }, (_, i) => ({ x: Math.random(), y: Math.random(), r: 4 + Math.random() * 16, v: .02 + Math.random() * .05, ph: Math.random() * 7 })) };
function sizeCv(cv, dpr) { const w = Math.max(1, Math.round(cv.clientWidth * dpr)), h = Math.max(1, Math.round(cv.clientHeight * dpr)); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } }
function drawBg(t) {
  const cv = $("bg"), dpr = Math.min(2, devicePixelRatio || 1); sizeCv(cv, dpr); const c = cv.getContext("2d"), w = cv.width, h = cv.height; c.setTransform(1, 0, 0, 1, 0, 0);
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#7fd0ee"); g.addColorStop(.45, "#4aa3d8"); g.addColorStop(1, "#245f8f"); c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.lineJoin = c.lineCap = "round";
  for (let i = 0; i < 9; i++) {
    const y0 = h * (.18 + i * .1), amp = h * (.012 + i * .004), sp = .25 + i * .06; c.beginPath(); c.moveTo(0, h);
    for (let x = 0; x <= w + 20; x += 20) c.lineTo(x, y0 + Math.sin(x / (w * .09) + t * sp + i) * amp + Math.sin(x / (w * .03) - t * sp * 1.7) * amp * .3);
    c.lineTo(w, h); c.closePath(); c.fillStyle = `rgba(${20 + i * 6},${70 + i * 10},${120 + i * 8},${.16})`; c.fill();
    c.strokeStyle = "rgba(29,39,66,.35)"; c.lineWidth = Math.max(2, h * .006); c.stroke();
    c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = Math.max(1, h * .003); c.beginPath(); for (let x = 0; x <= w + 20; x += 20) c.lineTo(x, y0 - h * .006 + Math.sin(x / (w * .09) + t * sp + i + .3) * amp); c.stroke();
  }
  for (const b of BG.bub) { const y = ((b.y - t * b.v) % 1 + 1) % 1, x = b.x + Math.sin(t * .8 + b.ph) * .01; c.beginPath(); c.arc(x * w, y * h, b.r * dpr * .6, 0, 7); c.fillStyle = "rgba(255,255,255,.18)"; c.fill(); c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = Math.max(1.5, dpr * 1.5); c.stroke(); c.beginPath(); c.arc(x * w - b.r * dpr * .2, y * h - b.r * dpr * .2, b.r * dpr * .15, 0, 7); c.fillStyle = "rgba(255,255,255,.8)"; c.fill(); }
}
function drawHero(t, dt) {
  const cv = $("heroCv"); if (!cv || !G.P || $("s-lobby").hidden) return; const dpr = Math.min(2, devicePixelRatio || 1); sizeCv(cv, dpr);
  const c = cv.getContext("2d"), w = cv.width, h = cv.height; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h);
  const s = Math.min(w * .8, h * .62), cos = G.P.eqC, hp = UI.hero.parts;
  const tr = CO[cos.trail];
  if (tr && tr.id !== "trail_none" && Math.random() < dt * 8) hp.push({ x: w / 2 + (Math.random() - .5) * s * .6, y: h * .62 + s * .3, vx: (Math.random() - .5) * 20, vy: -20 - Math.random() * 40, t: 0, k: tr.id, i: Math.floor(Math.random() * 7) });
  c.save(); c.translate(0, 0);
  for (let i = hp.length - 1; i >= 0; i--) { const p = hp[i]; p.t += dt; p.x += p.vx * dt * dpr; p.y += p.vy * dt * dpr; if (p.t > 1.4) { hp.splice(i, 1); continue; } c.globalAlpha = 1 - p.t / 1.4; trailDot(c, p.k, p.x, p.y, s * .06, p.i, t); } c.restore(); c.globalAlpha = 1;
  drawDrop(c, cos, w / 2, h * .56, s, t, { weapon: G.P.eqW, skin: cos.skin, aim: .25 + Math.sin(t * .7) * .2 });
}
function trailDot(c, k, x, y, r, i, t) {
  if (k === "trail_herzen") heart(c, x, y, r * 1.4, "#ff4f7e"); else if (k === "trail_sterne") star(c, x, y, r * 1.5, i % 2 ? "#ffe45e" : "#b58cf2", t + i); else if (k === "trail_gold") star(c, x, y, r * 1.2, i % 2 ? "#ffd23f" : "#ff9d1c", t + i);
  else { c.beginPath(); c.arc(x, y, r * (k === "trail_dampf" ? 1.8 : 1.2), 0, 7); c.fillStyle = k === "trail_regen" ? RAINBOW[i % 7] : k === "trail_dampf" ? "rgba(235,240,250,.8)" : "rgba(190,235,255,.85)"; c.fill(); c.strokeStyle = INK; c.lineWidth = 2; if (k !== "trail_dampf") c.stroke(); }
}

/* ---------- Fenster ---------- */
function ensureWin() {
  if ($("win")) return; const d = document.createElement("div"); d.id = "win"; d.className = "panel"; d.hidden = true;
  d.innerHTML = `<header><h2 id="winT"></h2><button class="btn sm" id="winX">Schließen</button></header><div id="winBody"></div>`; $("app").appendChild(d);
  $("winX").onclick = () => { sfx("back"); closeWin(); };
  $("winBody").addEventListener("click", e => { const t = e.target.closest("[data-a]"); if (t && UI.win && UI.win.on) { sfx("click"); UI.win.on(t.dataset.a, t.dataset.id, t); } });
  $("winBody").addEventListener("input", e => { if (UI.win && UI.win.input) UI.win.input(e); });
}
function openWin(title, render, on, opts) { ensureWin(); UI.win = Object.assign({ title, render, on }, opts || {}); $("win").hidden = false; $("winT").textContent = title; renderWin(); }
function renderWin() { const b = $("winBody"), top = b.scrollTop; b.innerHTML = UI.win.render(); b.scrollTop = top; if (UI.win.after) UI.win.after(); }
function closeWin() { if ($("win")) $("win").hidden = true; if (UI.win && UI.win.close) UI.win.close(); UI.win = null; }
function openWinById(id) { ({ shop: winShop, abil: winAbil, weap: winWeap, look: winLook, quest: winQuest, set: winSet, party: winParty })[id](); }
async function doAct(op, args, okMsg) {
  const r = await act(op, args); if (!r.ok) { sfx("err"); toast(r.error || "Das hat nicht geklappt.", true); return r; }
  if (okMsg) toast(okMsg); return r;
}
const leftToday = () => { const n = Date.now(), next = Math.ceil((n + 3600e3) / 86400e3) * 86400e3 - 3600e3 - n, h = Math.floor(next / 3600e3), m = Math.floor(next % 3600e3 / 60e3); return h + " Std. " + m + " Min."; };

/* --- Waffen-Beschreibung --- */
function weaponStats(w, lvl) {
  const p = weaponPower(lvl), dmg = Math.round(w.dmg * p), n = w.n1 > 1 ? ` x${w.n1}` : "";
  return [["Schaden", dmg + n], ["Reichweite", w.rng + " Felder"], ["Munition", w.ammo], ["Nachladen", w.rl.toFixed(1) + " s"], ["Art", w.t === "l" ? "Wurf mit Fläche" : w.t === "w" ? "Welle" : "Strahl"]].concat(w.slow ? [["Verlangsamt", Math.round(w.slow * 100) + " %"]] : [], w.pierce ? [["Durchschlag", w.pierce < 0 ? "alles" : w.pierce]] : [], w.bounce ? [["Abpraller", w.bounce]] : []);
}
function winWeap() {
  UI.tab = UI.tab && ["w", "s"].includes(UI.tab) ? UI.tab : "w"; UI.sel = G.P.eqW;
  openWin("Waffen", () => {
    const P = G.P, tabs = `<div class="tabs"><button class="btn" aria-pressed="${UI.tab === "w"}" data-a="tab" data-id="w">Waffen</button><button class="btn" aria-pressed="${UI.tab === "s"}" data-a="tab" data-id="s">Tropfenwerte</button></div>`;
    if (UI.tab === "s") return tabs + STATS.map(s => { const lv = P.up[s.id] || 0, max = lv >= s.max, cost = s.cost[lv]; return `<div class="qrow"><div class="grow"><b style="font:1.3rem var(--f-display)">${s.n}</b> <span class="muted">Stufe ${lv}/${s.max}</span><br><span class="muted">${s.d}</span><div class="bar" style="margin-top:.3rem"><i style="width:${100 * lv / s.max}%"></i></div></div><button class="btn good" data-a="stat" data-id="${s.id}" ${max || !canPay(cost) ? "disabled" : ""}>${max ? "Max" : "Verbessern " + coinH(cost)}</button></div>`; }).join("") + `<p class="muted">Diese Werte gelten in jedem Match. Zusätzlich gibt dir jedes Level etwas mehr Leben.</p>`;
    const sel = UI.sel, w = W[sel], own = P.weapons[sel], lvl = own ? own.lvl : 1;
    const list = WEAPONS.map(x => cardH({ r: x.r, a: "sel", id: x.id, img: img("w", x.id), name: x.n, sub: P.weapons[x.id] ? "Stufe " + P.weapons[x.id].lvl : "Gesperrt", on: x.id === sel, dim: !P.weapons[x.id], tag: P.eqW === x.id ? "an" : "" })).join("");
    const nextC = own && own.lvl < MAX_WLV ? weaponUpCost(w.r, own.lvl) : 0;
    const det = `<div class="detail"><h3>${w.n}</h3><div>${RN(w.r)}</div><div class="muted">${w.d}</div>${weaponStats(w, lvl).map(r => `<div class="stat"><span>${r[0]}</span><b>${r[1]}</b></div>`).join("")}<div class="stat"><span>Super</span><b>${w.sup.n}</b></div>${own ? `<button class="btn good" data-a="upw" data-id="${sel}" ${own.lvl >= MAX_WLV || !canPay(nextC) ? "disabled" : ""}>${own.lvl >= MAX_WLV ? "Höchste Stufe" : "Stufe " + (own.lvl + 1) + " " + coinH(nextC)}</button><button class="btn" data-a="eqw" data-id="${sel}" ${P.eqW === sel ? "disabled" : ""}>${P.eqW === sel ? "Ausgerüstet" : "Ausrüsten"}</button>` : `<div class="muted">${w.r <= 1 ? "Im Shop immer erhältlich." : "Taucht zufällig im Shop auf."}</div>`}</div>`;
    return tabs + `<div class="split"><div class="grid">${list}</div>${det}</div>`;
  }, async (a, id) => {
    if (a === "tab") { UI.tab = id; renderWin(); } else if (a === "sel") { UI.sel = id; renderWin(); }
    else if (a === "upw") { const r = await doAct("upWeapon", { id }); if (r.ok) sfx("buy"); }
    else if (a === "eqw") await doAct("equip", { slot: "weapon", id });
    else if (a === "stat") { const r = await doAct("upStat", { id }); if (r.ok) sfx("buy"); }
  });
}

/* --- Fähigkeiten-Beschreibung --- */
function abilityInfo(id, lvl) {
  const a = AB[id], v = AB_VAL[id], ap = abilityPower(lvl), s2 = sp2(ap), pc = x => Math.round(x * 100) + " %", t1 = x => x.toFixed(1) + " s";
  const m = {
    sprint: [["Dauer", t1(v.dur * s2)], ["Tempo", "+" + pc(v.mul * s2)]], blase: [["Dauer", t1(v.dur * s2)], ["Weniger Schaden", pc(Math.min(.85, v.red * s2))]],
    zaeh: [["Leben", "+" + pc(v.hp * ap)]], flink: [["Tempo", "+" + pc(v.spd * ap)]], heilregen: [["Heilung", pc(v.heal * ap)], ["Umkreis", v.rad + " Felder"]],
    pfuetze: [["Dauer", t1(v.dur * s2)], ["Verlangsamt", pc(v.slow)], ["Schaden pro s", Math.round(v.dps * ap)]], regen: [["Heilung pro s", pc(v.rate * ap)], ["Nach", v.wait + " s ohne Treffer"]],
    schwamm: [["Super lädt", "+" + pc(v.sup * ap)]], hecht: [["Strecke", (v.dist * s2).toFixed(1) + " Felder"]], welle: [["Schaden", Math.round(v.dmg * ap)], ["Betäubt", t1(v.stun * s2)]],
    adrenalin: [["Mehr Schaden", "+" + pc(v.dmg * ap)], ["Unter", pc(v.below) + " Leben"]], eisenhaut: [["Weniger Schaden", pc(Math.min(.5, v.red * ap))]], platscher: [["Strecke", (v.dist * s2).toFixed(1) + " Felder"]],
    nebel: [["Dauer", t1(v.dur * s2)]], raub: [["Heilung", pc(v.frac * ap) + " des Schadens"]], druck: [["Schaden", "+" + pc(v.dmg * ap)], ["Reichweite", "+" + pc(v.rng * ap)]],
    sturmflut: [["Schaden", Math.round(v.dmg * ap)], ["Heilung", pc(v.heal * s2)]], wiedergeburt: [["Rückkehr mit", pc(Math.min(.9, v.hp * s2)) + " Leben"]]
  }[id] || [];
  return (a.k === "a" ? [["Abklingzeit", a.cd + " s"]] : []).concat(m);
}
function winAbil() {
  UI.sel = G.P.eqA || ABILITIES[0].id;
  openWin("Fähigkeiten", () => {
    const P = G.P, sel = UI.sel, a = AB[sel], own = P.abilities[sel], lvl = own ? own.lvl : 1;
    const drops = DROPS.map(d => `<button class="cardx r${d.id}" style="width:5rem;padding:.2rem" data-a="open" data-id="${d.id}" ${P.drops[d.id] ? "" : "disabled"}>${P.drops[d.id] ? `<span class="dot">${P.drops[d.id]}</span>` : ""}${img("orb", d.id, 80)}<small>${P.drops[d.id] ? "Öffnen" : "leer"}</small></button>`).join("");
    const list = [...ABILITIES].sort((x, y) => x.r - y.r).map(x => { const o = P.abilities[x.id]; return cardH({ r: x.r, a: "sel", id: x.id, img: img("a", x.id), name: x.n, sub: o ? "Stufe " + o.lvl + (o.dupes ? " · " + o.dupes + " Dupl." : "") : "Unbekannt", on: x.id === sel, dim: !o, tag: P.eqA === x.id ? "an" : "" }); }).join("");
    let up = ""; if (own) { if (own.lvl >= MAX_ALV) up = `<button class="btn" disabled>Höchste Stufe</button>`; else { const c = abilityUpCost(a.r, own.lvl), ok = own.dupes >= c.dupes && canPay(c.coins); up = `<div class="stat"><span>Duplikate</span><b>${own.dupes || 0} / ${c.dupes}</b></div><button class="btn good" data-a="upa" data-id="${sel}" ${ok ? "" : "disabled"}>Stufe ${own.lvl + 1} ${coinH(c.coins)}</button>`; } }
    const det = `<div class="detail"><h3>${a.n}</h3><div>${RN(a.r)} · ${a.k === "a" ? "Aktiv (Knopf)" : "Passiv"}</div><div class="muted">${a.d}</div>${abilityInfo(sel, lvl).map(r => `<div class="stat"><span>${r[0]}</span><b>${r[1]}</b></div>`).join("")}${own ? `${up}<button class="btn" data-a="eqa" data-id="${sel}" ${P.eqA === sel ? "disabled" : ""}>${P.eqA === sel ? "Ausgerüstet" : "Ausrüsten"}</button>` : `<div class="muted">Komm an diese Fähigkeit über Drops.</div>`}</div>`;
    return `<div class="sect" style="margin-top:0">Deine Drops</div><div class="row" style="flex-wrap:wrap;margin-bottom:.4rem">${drops}<button class="btn" data-a="shopdrops">Drops kaufen</button></div><div class="split"><div class="grid">${list}</div>${det}</div>`;
  }, async (a, id) => {
    if (a === "sel") { UI.sel = id; renderWin(); }
    else if (a === "open") { const r = await doAct("openDrop", { tier: +id }); if (r.ok) await revealFlow([r.got]); }
    else if (a === "upa") { const r = await doAct("upAbility", { id }); if (r.ok) sfx("buy"); }
    else if (a === "eqa") await doAct("equip", { slot: "ability", id });
    else if (a === "shopdrops") { UI.tab = "d"; winShop(); }
  });
}

/* --- Shop --- */
function winShop() {
  UI.tab = ["w", "d", "c"].includes(UI.tab) ? UI.tab : "w"; UI.sel = null;
  openWin("Shop", () => {
    const P = G.P, tabs = `<div class="tabs"><button class="btn" aria-pressed="${UI.tab === "w"}" data-a="tab" data-id="w">Waffen</button><button class="btn" aria-pressed="${UI.tab === "d"}" data-a="tab" data-id="d">Fähigkeiten-Drops</button><button class="btn" aria-pressed="${UI.tab === "c"}" data-a="tab" data-id="c">Kosmetik</button><span class="grow"></span><span class="muted" style="align-self:center">Neue Angebote in ${leftToday()}</span></div>`;
    if (UI.tab === "d") return tabs + `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(7.5rem,1fr))">${DROPS.map(d => `<div class="cardx r${d.id}" data-a="buyd" data-id="${d.id}">${img("orb", d.id, 96)}<b>${RN(d.id)}</b><small>${d.w.map((x, i) => x ? RAR[i].n.slice(0, 3) + " " + x + "%" : "").filter(Boolean).join(" · ")}</small><div class="price" style="margin-top:.2rem">${priceH(d.coins, d.gems)}</div></div>`).join("")}</div><p class="muted">Beim Öffnen bekommst du eine zufällige Fähigkeit dieser Seltenheiten. Doppelte Fähigkeiten helfen dir beim Verbessern. Drops gibt es auch nach Matches.</p>`;
    if (UI.tab === "c") {
      const offs = P.shop.offers.filter(o => o.k === "c");
      return tabs + `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(7.5rem,1fr))"><div class="cardx r1" data-a="capsule" data-id="x">${img("capsule", "x", 96)}<b>Kosmetik-Blase</b><small>Zufälliger Gegenstand. Sehr selten: Göttliches und Waffen-Looks.</small><div class="price">${coinH(CAPSULE_COST)}</div></div>${offs.map(o => { const c = CO[o.id], got = P.shop.bought["c:" + o.id] || P.cos[o.id]; return cardH({ r: c.r, a: "buyc", id: o.id, img: img("c", o.id), name: c.n, sub: got ? "Gekauft" : COS_SLOTS.find(s => s.id === c.s).n, dim: false, tag: got ? "✓" : "" }) + ""; }).join("")}</div><p class="muted">Kosmetik ändert nur das Aussehen, nicht die Stärke.</p>`;
    }
    const shelf = WEAPONS.filter(w => w.r <= 1), offs = P.shop.offers.filter(o => o.k === "w").map(o => W[o.id]);
    const sel = UI.sel2 || (offs[0] || shelf[0]).id, w = W[sel], owned = !!P.weapons[sel];
    const wc = x => cardH({ r: x.r, a: "sel", id: x.id, img: img("w", x.id), name: x.n, sub: P.weapons[x.id] ? "Gekauft" : coinH(x.price).replace(/<[^>]+>/g, m => m.startsWith("<i") ? "" : ""), tag: P.weapons[x.id] ? "✓" : "", on: x.id === sel });
    const card2 = x => `<div class="cardx r${x.r} ${x.id === sel ? "on" : ""}" data-a="sel" data-id="${x.id}">${P.weapons[x.id] ? '<span class="tag">✓</span>' : ""}${img("w", x.id)}<b>${x.n}</b><small>${P.weapons[x.id] ? "Gekauft" : ""}</small>${P.weapons[x.id] ? "" : `<div class="price">${coinH(x.price)}</div>`}</div>`;
    const det = `<div class="detail"><h3>${w.n}</h3><div>${RN(w.r)}</div><div class="muted">${w.d}</div>${weaponStats(w, 1).map(r => `<div class="stat"><span>${r[0]}</span><b>${r[1]}</b></div>`).join("")}<div class="stat"><span>Super</span><b>${w.sup.n}</b></div>${owned ? `<button class="btn" disabled>Gehört dir</button>` : `<button class="btn good" data-a="buyw" data-id="${sel}" ${canPay(w.price) ? "" : "disabled"}>Kaufen ${coinH(w.price)}</button>`}</div>`;
    return tabs + `<div class="split"><div><div class="sect" style="margin-top:0">Tagesangebote (Zufall)</div><div class="grid">${offs.length ? offs.map(card2).join("") : '<span class="muted">Heute nichts mehr im Angebot.</span>'}</div><div class="sect">Immer da</div><div class="grid">${shelf.map(card2).join("")}</div></div>${det}</div>`;
  }, async (a, id) => {
    if (a === "tab") { UI.tab = id; renderWin(); } else if (a === "sel") { UI.sel2 = id; renderWin(); }
    else if (a === "buyw") { const r = await doAct("buyWeapon", { id }); if (r.ok) { sfx("buy"); await revealFlow([r.got]); } }
    else if (a === "buyd") { const r = await doAct("buyDrop", { tier: +id }); if (r.ok) await revealFlow([r.got]); }
    else if (a === "capsule") { const r = await doAct("capsule"); if (r.ok) await revealFlow([r.got]); }
    else if (a === "buyc") { const r = await doAct("buyCos", { id }); if (r.ok) { sfx("buy"); await revealFlow([r.got]); } }
  }, { close() { UI.sel2 = null; } });
}

/* --- Aussehen --- */
function winLook() {
  UI.tab = COS_SLOTS.some(s => s.id === UI.tab) ? UI.tab : "color";
  openWin("Aussehen", () => {
    const P = G.P, slot = UI.tab, items = COSMETICS.filter(c => c.s === slot).sort((a, b) => a.r - b.r);
    const tabs = `<div class="tabs">${COS_SLOTS.map(s => `<button class="btn sm" aria-pressed="${UI.tab === s.id}" data-a="tab" data-id="${s.id}">${s.n}</button>`).join("")}</div>`;
    const grid = items.map(c => cardH({ r: c.r, a: "eq", id: c.id, img: img("c", c.id), name: c.n, sub: P.cos[c.id] ? "" : "Nicht freigeschaltet", on: P.eqC[slot] === c.id, dim: !P.cos[c.id] })).join("");
    return tabs + `<div class="split"><div class="grid">${grid}</div><div class="detail" style="align-content:center;justify-items:center"><canvas id="lookCv" style="width:100%;aspect-ratio:1"></canvas><div class="muted" style="text-align:center">Nur Optik: Aussehen macht dich nicht stärker. Neue Gegenstände kommen aus dem Shop (Kosmetik-Blase, Tagesangebot).</div></div></div>`;
  }, async (a, id) => {
    if (a === "tab") { UI.tab = id; renderWin(); } else if (a === "eq") { if (!G.P.cos[id]) { toast("Das hast du noch nicht. Schau im Shop unter Kosmetik.", true); sfx("err"); return; } await doAct("equip", { slot: UI.tab, id }); }
  }, { after() { UI.look = true; } , close() { UI.look = false; } });
}
function drawLook(t) {
  const cv = $("lookCv"); if (!cv || !G.P) return; const dpr = Math.min(2, devicePixelRatio || 1); sizeCv(cv, dpr); const c = cv.getContext("2d"); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
  const s = Math.min(cv.width, cv.height) * .62; drawDrop(c, G.P.eqC, cv.width / 2, cv.height * .56, s, t, { weapon: G.P.eqW, skin: G.P.eqC.skin, aim: .3 });
}

/* --- Aufgaben --- */
function winQuest() {
  openWin("Aufgaben", () => {
    const P = G.P, d = P.daily, streak = d.canClaim ? d.next : d.streak, rk = RANKS[P.rank.tier], nx = RANKS[P.rank.tier + 1];
    const days = Array.from({ length: 7 }, (_, i) => { const done = d.canClaim ? i < d.next && d.next > 0 && (d.claimedDay === P.day - 1 || i < d.next) : i <= d.streak; return `<div class="day ${d.canClaim && i === d.next ? "now" : ""} ${!d.canClaim && i <= d.streak ? "done" : ""}"><b>Tag ${i + 1}</b><br>${i < 6 ? coinH(DAILY_COINS[i]) : gemH(1) + "<br><small>+ Drop</small>"}</div>`; }).join("");
    const qs = P.q.list.map((q, i) => { const def = QUEST_POOL.find(x => x.id === q.id), ready = q.have >= q.need && !q.claimed; return `<div class="qrow"><div class="grow"><b>${def.n.replace("{n}", q.need)}</b><div class="bar" style="margin:.25rem 0"><i style="width:${100 * q.have / q.need}%"></i></div><span class="muted">${fmt(q.have)} / ${fmt(q.need)}</span></div><div>${coinH(q.coins)}${q.drop >= 0 ? `<br><small>+ ${DROPS[q.drop].n}</small>` : ""}</div><button class="btn good" data-a="cq" data-id="${i}" ${ready ? "" : "disabled"}>${q.claimed ? "Geholt" : "Abholen"}</button></div>`; }).join("");
    return `<div class="sect" style="margin-top:0">Tägliche Belohnung</div><div class="days">${days}</div><div style="text-align:center;margin:.5rem 0"><button class="btn good" data-a="cd" ${d.canClaim ? "" : "disabled"}>${d.canClaim ? "Heute abholen" : "Morgen wieder"}</button></div><div class="sect">Heutige Aufgaben</div>${qs}<div class="sect">Deine Zahlen</div><div class="stat"><span>Matches</span><b>${P.stats.matches}</b></div><div class="stat"><span>Siege</span><b>${P.stats.wins}</b></div><div class="stat"><span>Besiegte Gegner</span><b>${fmt(P.stats.kills)}</b></div><div class="stat"><span>Schaden gesamt</span><b>${fmt(P.stats.dmg)}</b></div><div class="stat"><span>Rang</span><b>${rk.n} (${P.rank.rp} RP)${nx ? " · nächster bei " + nx.rp : ""}</b></div>`;
  }, async (a, id) => {
    if (a === "cd") { const r = await doAct("claimDaily"); if (r.ok) { sfx("coin"); toast(r.reward.gems ? "1 Gem und ein Drop!" : "+" + r.reward.coins + " Münzen"); } }
    else if (a === "cq") { const r = await doAct("claimQuest", { i: +id }); if (r.ok) { sfx("coin"); toast("+" + r.reward.coins + " Münzen" + (r.reward.drop >= 0 ? " und ein Drop" : "")); } }
  });
}

/* --- Einstellungen --- */
function winSet() {
  openWin("Einstellungen", () => `<div class="qrow"><div class="grow"><b>Töne</b></div><button class="btn" data-a="sfx">${G.set.sfx ? "An" : "Aus"}</button></div><div class="qrow"><div class="grow"><b>Musik</b></div><button class="btn" data-a="mus">${G.set.music ? "An" : "Aus"}</button></div><div class="qrow"><div class="grow"><b>Lautstärke</b></div><input type="range" min="0" max="100" value="${Math.round(G.set.vol * 100)}" id="volR" style="width:40%"></div><div class="qrow"><div class="grow"><b>Konto</b><br><span class="muted">${esc(G.P.name)}</span></div><button class="btn warn" data-a="out">Abmelden</button></div><p class="muted">Dein Spielstand liegt auf dem Server und gehört zu deinem Benutzernamen und Passwort.</p>`,
    (a) => { if (a === "sfx") { G.set.sfx = !G.set.sfx; Snd.apply(); saveSet(); renderWin(); } else if (a === "mus") { G.set.music = !G.set.music; Snd.apply(); saveSet(); renderWin(); } else if (a === "out") { closeWin(); logout(); } },
    { input(e) { if (e.target.id === "volR") { G.set.vol = e.target.value / 100; Snd.apply(); saveSet(); } } });
}

/* --- Party --- */
function winParty() {
  openWin("Party", () => {
    const p = Lob.party;
    if (!Lob.open) return `<p class="muted">Du bist gerade nicht mit der Lobby verbunden. Einen Moment, dann nochmal versuchen.</p>`;
    if (p) return `<div class="detail"><h3>Party-Code: <span style="letter-spacing:.2rem">${p.code}</span></h3><div class="muted">Gib den Code deinen Freunden. Bis zu 3 Spieler. Der Anführer startet die Suche.</div>${p.members.map(m => `<div class="stat"><span>${esc(m.name)} ${m.leader ? "(Anführer)" : ""}</span><b>Lv ${m.lvl}</b></div>`).join("")}<button class="btn warn" data-a="pl">Party verlassen</button></div>`;
    return `<div class="detail"><h3>Mit Freunden spielen</h3><button class="btn good" data-a="pc">Party erstellen</button><div class="row"><input class="inp" id="partyIn" maxlength="4" placeholder="Code" style="text-transform:uppercase"><button class="btn" data-a="pj">Beitreten</button></div></div>`;
  }, (a) => { if (a === "pc") Lob.send({ t: "party", op: "create" }); else if (a === "pl") Lob.send({ t: "party", op: "leave" }); else if (a === "pj") { const v = $("partyIn").value.trim(); if (v.length === 4) Lob.send({ t: "party", op: "join", code: v }); else toast("Der Code hat 4 Buchstaben.", true); } });
}
function onPartyState() {
  const p = Lob.party, el = $("party"); if (!el) return;
  if (p) { el.style.display = "block"; el.innerHTML = `<b>Party ${p.code}</b> · ` + p.members.map(m => esc(m.name)).join(", "); } else el.style.display = "none";
  if (UI.win && UI.win.title === "Party") renderWin();
}

/* ---------- Warteschlange ---------- */
function onQueueState() {
  let q = $("queue"); const st = Lob.q;
  if (!st) { if (q) q.remove(); $("playBtn").textContent = "Spielen"; return; }
  if (!q) { q = document.createElement("div"); q.id = "queue"; q.innerHTML = `<div class="box panel"><h2>Suche Mitspieler …</h2><div class="big" id="qT">0</div><div class="muted" id="qI"></div><div class="tabs" style="justify-content:center"><button class="btn warn" id="qC">Abbrechen</button></div></div>`; $("app").appendChild(q); $("qC").onclick = () => { sfx("back"); Lob.send({ t: "cancel" }); }; }
  $("qT").textContent = st.w + " s"; $("qI").textContent = (st.ranked ? "Ranked · " : "") + "Nach spätestens " + st.bots + " s füllen Bots die freien Plätze auf. Zufälliger Modus.";
  $("playBtn").textContent = "Suche läuft";
}
function doPlay() {
  if (Lob.q) return; sfx("click");
  if (!Lob.open) { toast("Verbinde mit dem Server …", true); Lob.connect(); return; }
  if (UI.ranked && G.P.lvl < RANKED_MIN_LVL) { toast("Ranked gibt es ab Level " + RANKED_MIN_LVL + ".", true); return; }
  Lob.send({ t: "queue", ranked: UI.ranked });
}
function onMatchFound(m) {
  closeWin(); sfx("go"); try { localStorage.setItem("ws_match", JSON.stringify({ id: m.id, at: Date.now() })); } catch (e) {}
  const md = MODES[m.mode], ov = document.createElement("div"); ov.id = "modeov"; ov.style.cssText = "position:fixed;inset:0;z-index:50;background:rgba(15,40,70,.8);display:flex;align-items:center;justify-content:center;text-align:center;color:#fff";
  ov.innerHTML = `<div><div style="font:1.4rem var(--f-display);opacity:.9">${m.ranked ? "Ranked-Match" : "Match gefunden"}</div><div style="font:5rem/1 var(--f-display);text-shadow:0 4px 0 #1d2742,3px 3px 0 #1d2742,-3px 3px 0 #1d2742;transform:rotate(-2deg)">${md.n}</div><div style="font-size:1.3rem;max-width:30rem;margin:.5rem auto;text-shadow:0 2px 0 #1d2742">${md.d}</div></div>`;
  document.body.appendChild(ov); setTimeout(() => ov.remove(), 2200);
  Match.start(m);
}

/* ---------- Start und Hauptschleife ---------- */
function bindLobby() {
  buildNav(); ensureWin();
  $("btnLogin").onclick = () => doAuth(false); $("btnReg").onclick = () => doAuth(true);
  $("inPw").addEventListener("keydown", e => { if (e.key === "Enter") doAuth(false); });
  $("playBtn").onclick = doPlay; $("btnSet").onclick = () => { sfx("click"); winSet(); };
  $("chipRanked").onclick = () => { sfx("click"); if (G.P.lvl < RANKED_MIN_LVL) { toast("Ranked gibt es ab Level " + RANKED_MIN_LVL + ".", true); return; } UI.ranked = !UI.ranked; refreshHud(); };
  $("chipParty").onclick = () => { sfx("click"); winParty(); };
  $("heroCv").onclick = () => { sfx("click"); winLook(); }; $("me").onclick = () => { sfx("click"); winQuest(); };
  const ad = $("authDrop"); drawDrop(ad.getContext("2d"), { ...DEFAULT_COS, hat: "hat_party" }, 128, 140, 150, 1, {});
}
let lastT = 0;
function tickNums(dt) { for (const [k, t, id] of [["dc", "tc", "curCoins"], ["dg", "tg", "curGems"]]) { if (UI[k] == null) continue; const d = UI[t] - UI[k]; if (Math.abs(d) < 1) UI[k] = UI[t]; else UI[k] += d * Math.min(1, dt * 7) + Math.sign(d) * .5; const el = $(id); if (el) el.textContent = fmt(UI[k]); } }
function frame(ms) {
  const t = ms / 1000, dt = Math.min(.1, t - lastT); lastT = t;
  if (G.screen === "match") { try { Match.frame(t, dt); } catch (err) { console.error(err); } }
  else { tickNums(dt); drawBg(t); if (G.screen === "lobby") drawHero(t, dt); if (UI.look && $("lookCv")) drawLook(t); if (G.dropAnim) G.dropAnim(t, dt); if (G.screen === "auth") { const ad = $("authDrop"); if (ad) { const c = ad.getContext("2d"); c.clearRect(0, 0, 256, 256); drawDrop(c, { ...DEFAULT_COS, hat: "hat_party" }, 128, 140, 150, t, {}); } } }
  requestAnimationFrame(frame);
}
