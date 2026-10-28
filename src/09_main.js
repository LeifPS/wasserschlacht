/* ===== START ===== */
(async function boot() {
  bindLobby(); requestAnimationFrame(frame);
  addEventListener("visibilitychange", () => { if (!document.hidden) Snd.apply(); });
  document.addEventListener("contextmenu", e => e.preventDefault());
  if (await tryAutoLogin()) { if (!Match.resume()) enterLobby(); } else showScreen("auth");
})();
