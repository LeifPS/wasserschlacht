#!/bin/bash
# Baut public/index.html (Client) und worker/shared.mjs (gemeinsame Daten für den Server)
cd "$(dirname "$0")"
mkdir -p public
SHARED="shared/data.js shared/maps.js"
# --- gemeinsame Module für den Worker ---
{
  cat $SHARED
  names=$(node scripts/exports.cjs $SHARED)
  echo "export { $names };"
} > worker/shared.mjs
# --- Client: eine einzige Seite ---
CLIENT_JS="$SHARED $(ls src/[0-9]*.js 2>/dev/null | sort | tr '\n' ' ')"
if [ -f src/head.html ]; then
  { echo '<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">'
    cat src/head.html; echo "<script>"; cat $CLIENT_JS; echo "</script>"; } > public/index.html
  node -e "const s=require('fs').readFileSync('public/index.html','utf8');const m=s.match(/<script>([\s\S]*)<\/script>/)[1];try{new Function(m);console.log('client syntax ok')}catch(e){console.log('CLIENT ERR',e.message);process.exit(1)}"
fi
node --check worker/shared.mjs 2>/dev/null && echo "shared ok"
