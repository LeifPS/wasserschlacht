/* ===== NETZ: Konto-Schnittstelle und Lobby-Verbindung ===== */
async function api(path, body) {
  try {
    const r = await fetch(path, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
    return await r.json();
  } catch (e) { return { ok: false, error: "Keine Verbindung zum Server." }; }
}
async function act(op, args) {
  if (!G.user) return { ok: false, error: "Nicht angemeldet." };
  const r = await api("/api/act", { name: G.user.name, token: G.user.token, op, args: args || {} });
  if (r.error === "auth") { logout("Bitte melde dich neu an."); return r; }
  if (r.profile) { G.P = r.profile; if (typeof refreshHud === "function") refreshHud(); }
  return r;
}
const wsBase = () => (location.protocol === "https:" ? "wss://" : "ws://") + location.host;

/* Lobby: Warteschlange, Party, Spielersuche */
const Lob = {
  ws: null, open: false, q: null, party: null, retry: 0, timer: 0, want: false,
  connect() {
    this.want = true; if (this.ws || !G.user) return;
    const ws = new WebSocket(wsBase() + "/ws/lobby?u=" + encodeURIComponent(G.user.name) + "&t=" + encodeURIComponent(G.user.token));
    this.ws = ws;
    ws.onopen = () => { this.open = true; this.retry = 0; };
    ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch { return; } this.onMsg(m); };
    ws.onclose = () => { this.ws = null; this.open = false; this.q = null; if (typeof onQueueState === "function") onQueueState(); if (this.want && G.user) { clearTimeout(this.timer); this.timer = setTimeout(() => this.connect(), Math.min(8000, 800 * ++this.retry)); } };
    ws.onerror = () => {};
  },
  close() { this.want = false; clearTimeout(this.timer); if (this.ws) { try { this.ws.close(); } catch (e) {} } this.ws = null; this.open = false; this.q = null; this.party = null; },
  send(o) { if (this.ws && this.open) { this.ws.send(JSON.stringify(o)); return true; } return false; },
  onMsg(m) {
    if (m.t === "queued") { this.q = { w: 0, ranked: m.ranked, bots: m.bots, humans: 1 }; onQueueState(); }
    else if (m.t === "q") { this.q = Object.assign(this.q || {}, { w: m.w, humans: m.humans }); onQueueState(); }
    else if (m.t === "unqueued") { this.q = null; onQueueState(); }
    else if (m.t === "qErr") { this.q = null; onQueueState(); toast(m.error, true); }
    else if (m.t === "partyErr") toast(m.error, true);
    else if (m.t === "party") { this.party = m.code ? m : null; if (typeof onPartyState === "function") onPartyState(); }
    else if (m.t === "found") { this.q = null; onQueueState(); if (typeof onMatchFound === "function") onMatchFound(m); }
  }
};
function logout(msg) {
  Lob.close(); clearLogin(); G.user = null; G.P = null; Snd.music(null);
  if (typeof showScreen === "function") showScreen("auth"); if (msg) toast(msg, true);
}
