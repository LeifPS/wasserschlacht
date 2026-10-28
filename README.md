# Wasserschlacht

Ein handgezeichnetes Online-Mobile-Spiel (Querformat, Touch): Du bist ein Wassertropfen, den du selbst gestaltest und stärker machst, und spielst zufällige Modi gegen andere Tropfen und Bots.

## Aufbau

- `shared/`: Daten und Karten, die Client und Server gemeinsam nutzen (Waffen, Fähigkeiten, Kosmetik, Modi, Physik)
- `worker/`: Cloudflare Worker mit drei Durable Objects
  - `User`: Konto (Benutzername und Passwort), Spielstand, Shop, Drops, Belohnungen (alles serverseitig)
  - `Lobby`: Warteschlange, zufälliger Modus, Party-Codes, Bots nach höchstens 15 Sekunden
  - `Match`: autoritative Simulation (`sim.js`) mit Bots (`bots.js`) und WebSocket-Schnappschüssen
- `src/`: Client (wird mit `build.sh` zu einer einzigen `public/index.html` zusammengebaut)
- `scripts/`: Tests (`test-sim.mjs` Simulation, `test-online.mjs` Integration gegen `wrangler dev`)

## Lokal

```
npm install
npm run dev     # baut und startet http://localhost:8787
npm test        # Simulationstest (alle Modi mit Bots)
node scripts/test-online.mjs   # bei laufendem Server: Konto, Shop, Queue, Match
```

## Veröffentlichen

Ein Push auf `main` wird automatisch von Cloudflare gebaut und veröffentlicht (`npm run build` dann `wrangler deploy`). Die Durable Objects (`User`, `Lobby`, `Match`) werden über die Migration in `wrangler.jsonc` angelegt.
