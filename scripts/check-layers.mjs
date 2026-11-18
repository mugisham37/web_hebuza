// Layer rules:
//  1. components: atoms → molecules → organisms; a layer never imports a higher one; at most one domain subfolder.
//  2. Frontend only: no backend code here (no src/server, "use server", or DB/queue/cache clients). The backend is a
//     separate service built against contract/openapi.json.
//  3. Components never import dummy data (src/mocks) directly — they call /api/* like the real backend; only the
//     MSW boot is allowed (organisms/layout/providers).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const src = join(root, "src");
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|mjs)$/.test(f) ? [p] : []; });
const RANK = { atoms: 0, molecules: 1, organisms: 2 };
const importRe = /(?:import|export)\s[^'"]*?from\s*["']([^"']+)["']|import\s*\(?\s*["']([^"']+)["']/g;
const bad = [];

for (const file of walk(src)) {
  const rel = relative(src, file).split(sep);
  const text = readFileSync(file, "utf8");
  const specs = [...text.matchAll(importRe)].map((m) => m[1] ?? m[2]);
    const top = rel[0];

  if (top === "components") {
    const layer = rel[1];
    if (!(layer in RANK)) bad.push(`${rel.join("/")}: unknown component layer "${layer}"`);
    if (rel.length > 4) bad.push(`${rel.join("/")}: more than one domain subfolder`);
    for (const s of specs) {
      const m = s.match(/^@\/components\/(atoms|molecules|organisms)\//);
      if (m && RANK[m[1]] > RANK[layer]) bad.push(`${rel.join("/")}: ${layer} imports ${m[1]} (${s})`);
    }
  }

  if (top === "server") bad.push(`${rel.join("/")}: backend code is not allowed in this frontend-only app`);
  if (/^\s*["']use server["']/m.test(text)) bad.push(`${rel.join("/")}: "use server" (no server actions in the frontend)`);
  for (const s of specs) {
    if (s.startsWith("@/server")) bad.push(`${rel.join("/")}: imports backend code (${s})`);
    if (/^@hebuza\//.test(s) || /(^|\/)server\//.test(s) && s.startsWith(".")) bad.push(`${rel.join("/")}: imports server code (${s}); talk to it over HTTP`);
    if (/^(drizzle-orm|postgres|ioredis|pg-boss|@aws-sdk\/|resend|@node-rs\/argon2)/.test(s)) bad.push(`${rel.join("/")}: imports a backend-only package (${s})`);
    if (top === "components" && s.startsWith("@/mocks") && s !== "@/mocks/boot") bad.push(`${rel.join("/")}: component imports dummy data (${s}); go through /api/*`);
  }
}

if (bad.length) { console.error(`check:layers — ${bad.length} violation(s):\n  ${bad.join("\n  ")}`); process.exit(1); }
console.log("check:layers ok");
