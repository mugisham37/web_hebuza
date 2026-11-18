// src/shared/** mirrors server/src/domain/** (display only). Warns when the server folder is absent, fails on drift.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const shared = join(import.meta.dirname, "../src/shared"), domain = join(import.meta.dirname, "../../server/src/domain");
if (!existsSync(domain)) { console.warn("check:mirror — ../server not found, skipped"); process.exit(0); }

const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
// Mirror = server file + one header line, with @/domain/ imports spelled @/shared/.
const norm = (p, mirror) => {
  let s = readFileSync(p, "utf8");
  if (mirror && p.endsWith(".ts")) s = s.slice(s.indexOf("\n") + 1).replaceAll("@/shared/", "@/domain/");
  return createHash("sha256").update(s).digest("hex");
};
const drift = [];
for (const f of walk(shared)) {
  const rel = relative(shared, f), src = join(domain, rel);
  if (!existsSync(src)) drift.push(`${rel}: no server counterpart`);
  else if (norm(f, true) !== norm(src, false)) drift.push(`${rel}: differs from server/src/domain/${rel}`);
}
if (drift.length) { console.error(`check:mirror — ${drift.length} drifted file(s):\n  ${drift.join("\n  ")}`); process.exit(1); }
console.log("check:mirror ok");
