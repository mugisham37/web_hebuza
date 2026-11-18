// Every contract path×method must have an MSW handler (src/mocks). Prints missing; informational (exit 0).
import { readFileSync, readdirSync } from "node:fs";
const spec = JSON.parse(readFileSync("../server/openapi.json", "utf8"));
const norm = (p) => p.replace(/\{[^}]+\}|:[A-Za-z_]+/g, ":p").replace(/\/$/, "");
const want = new Set();
for (const [p, ops] of Object.entries(spec.paths)) for (const m of Object.keys(ops)) if (/^(get|post|put|patch|delete)$/.test(m)) want.add(`${m.toUpperCase()} ${norm(p)}`);
const have = new Set();
for (const f of readdirSync("src/mocks")) {
  const src = readFileSync(`src/mocks/${f}`, "utf8");
  for (const m of src.matchAll(/http\.(get|post|put|patch|delete)\(\s*[`'"]([^`'"]+)[`'"]/g)) have.add(`${m[1].toUpperCase()} ${norm(m[2].replace(/^\*|^\$\{[^}]+\}/, ""))}`);
}
// Not frontend calls: probes and provider webhooks belong to the real backend only.
const IGNORE = /^(GET \/health|POST \/api\/payments\/webhooks)|^GET $/;
const missing = [...want].filter((k) => !IGNORE.test(k)).filter((k) => !have.has(k)).sort();
console.log(`contract ${want.size}, mocked ${want.size - missing.length}, missing ${missing.length}`);
if (process.argv.includes("--list")) console.log(missing.join("\n"));
// Informational until Phase 8 deletes the mocks: never fail CI on missing handlers.
process.exit(0);
