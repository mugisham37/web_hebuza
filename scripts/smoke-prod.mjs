#!/usr/bin/env node
// Production smoke / synthetic check: health, home, a service page, the login page. Exits 1 on any failure so CI
// (and the hourly synthetic workflow) alerts by failing. Usage: SMOKE_URL=https://hebuza.rw SMOKE_API=https://api.hebuza.rw pnpm smoke:prod
const WEB = (process.env.SMOKE_URL ?? "https://hebuza.rw").replace(/\/$/, "");
const API = (process.env.SMOKE_API ?? WEB).replace(/\/$/, "");
const SLOW_MS = Number(process.env.SMOKE_SLOW_MS ?? 3000);

const checks = [
  { name: "api health", url: `${API}/health/ready`, expect: (r) => r.status === 200 },
  { name: "home (rw)", url: `${WEB}/rw`, expect: (r, b) => r.status === 200 && /<main/i.test(b) },
  { name: "services list", url: `${WEB}/en/services`, expect: (r, b) => r.status === 200 && /href="\/en\/services\/[^"]+"/.test(b) },
  { name: "login page", url: `${WEB}/en/login`, expect: (r, b) => r.status === 200 && /password/i.test(b) },
];

let failed = 0;
for (const c of checks) {
  const t = Date.now();
  try {
    const r = await fetch(c.url, { redirect: "follow", signal: AbortSignal.timeout(15_000), headers: { "user-agent": "hebuza-synthetic/1" } });
    const body = await r.text();
    const ms = Date.now() - t;
    const ok = c.expect(r, body);
    if (!ok) failed++;
    console.log(`${ok ? "ok  " : "FAIL"} ${c.name} ${r.status} ${ms}ms${ms > SLOW_MS ? " (slow)" : ""}`);
    if (ok && c.name === "services list") {
      const slug = body.match(/href="\/en\/services\/([^"/?#]+)"/)?.[1];
      const s = await fetch(`${WEB}/en/services/${slug}`, { signal: AbortSignal.timeout(15_000) });
      const sok = s.status === 200;
      if (!sok) failed++;
      console.log(`${sok ? "ok  " : "FAIL"} service page /en/services/${slug} ${s.status}`);
    }
  } catch (e) {
    failed++;
    console.log(`FAIL ${c.name} ${String(e)}`);
  }
}
process.exit(failed ? 1 : 0);
