// Liest die Namen der obersten Ebene (const/let/function) aus den gemeinsamen Dateien, damit build.sh sie exportieren kann
const fs = require("fs"), out = new Set();
for (const f of process.argv.slice(2)) for (const line of fs.readFileSync(f, "utf8").split("\n")) {
  let m = line.match(/^function +([A-Za-z0-9_$]+)/); if (m) { out.add(m[1]); continue; }
  if (/^(const|let) /.test(line)) { const re = /(?:^(?:const|let) |, )([A-Za-z_$][\w$]*) = /g; let k; while ((k = re.exec(line))) out.add(k[1]); }
}
console.log([...out].join(","));
