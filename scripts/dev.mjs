// `npm run dev`: start `next dev`, then compile the main pages in the background so the first visit doesn't wait on
// Turbopack's on-demand compile (cold: 15–70 s per route; warm: <1 s). The FS cache keeps them warm across restarts.
import { spawn } from "node:child_process";

const port = process.env.PORT ?? "3000";
const base = `http://localhost:${port}`;
const ROUTES = ["/en", "/en/services", "/en/pricing", "/en/how-it-works", "/en/knowledge", "/en/updates", "/en/about", "/en/contact", "/en/faq", "/en/track", "/en/login"];

const next = spawn("next", ["dev", "-p", port, ...process.argv.slice(2)], { stdio: "inherit", shell: process.platform === "win32" });
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => next.kill(sig));
next.on("exit", (code) => process.exit(code ?? 0));

const up = async () => { for (;;) { try { await fetch(`${base}/manifest.webmanifest`); return; } catch { await new Promise((r) => setTimeout(r, 300)); } } };
await up();
const t0 = Date.now();
for (const r of ROUTES) await fetch(base + r, { headers: { "x-dev-warm": "1" } }).catch(() => {}); // one at a time: parallel compiles thrash
console.log(`\x1b[32m✓\x1b[0m warmed ${ROUTES.length} pages in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
