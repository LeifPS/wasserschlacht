// Wasserschlacht: ein Worker für die Seite (public/), die Konto-Schnittstelle (/api) und die WebSockets (/ws).
import { User, nameKey } from "./user.js";
import { Lobby } from "./lobby.js";
import { Match } from "./match.js";
export { User, Lobby, Match };

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const userStub = (env, name) => env.USER.get(env.USER.idFromName(nameKey(name)));

export default {
  async fetch(request, env) {
    const url = new URL(request.url), path = url.pathname;
    try {
      if (path.startsWith("/api/")) {
        if (request.method !== "POST") return json({ ok: false, error: "POST erwartet" }, 405);
        let b; try { b = await request.json(); } catch { return json({ ok: false, error: "Ungültige Anfrage." }, 400); }
        const name = String(b.name || "").trim(); if (!name || name.length > 40) return json({ ok: false, error: "Name fehlt." }, 400);
        if (path === "/api/register") return json(await userStub(env, name).register(name, b.pw));
        if (path === "/api/login") return json(await userStub(env, name).login(b.pw));
        if (path === "/api/me") return json(await userStub(env, name).me(String(b.token || "")));
        if (path === "/api/act") return json(await userStub(env, name).act(String(b.token || ""), String(b.op || ""), b.args || {}));
        return json({ ok: false, error: "Unbekannt" }, 404);
      }
      if (path === "/ws/lobby" || path === "/ws/match") {
        if (request.headers.get("Upgrade") !== "websocket") return new Response("WebSocket erwartet", { status: 426 });
        const name = url.searchParams.get("u") || "", token = url.searchParams.get("t") || "";
        const lo = await userStub(env, name).loadout(token);
        if (!lo) return new Response("Nicht angemeldet", { status: 401 });
        const h = new Headers(request.headers);
        if (path === "/ws/lobby") {
          h.set("X-Player", btoa(unescape(encodeURIComponent(JSON.stringify(lo)))));
          return env.LOBBY.get(env.LOBBY.idFromName("lobby")).fetch(new Request(request, { headers: h }));
        }
        const id = (url.searchParams.get("id") || "").slice(0, 16); h.set("X-Name", lo.name);
        return env.MATCH.get(env.MATCH.idFromName(id)).fetch(new Request(request, { headers: h }));
      }
      return env.ASSETS.fetch(request);
    } catch (e) { return json({ ok: false, error: "Serverfehler: " + (e && e.message || e) }, 500); }
  }
};
