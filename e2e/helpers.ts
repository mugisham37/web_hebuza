import { expect, type Page, type TestInfo } from "@playwright/test";
import { createHmac } from "node:crypto";
export const SHOTS = process.env.E2E_SHOTS ?? "/tmp/e2e-shots";
export type Issues = string[];
export function watch(page: Page, allow: RegExp[] = []): Issues {
  const issues: Issues = [];
  (page as unknown as { __issues?: Issues }).__issues = issues;
  page.on("console", (m) => { if (m.type() === "error" && !allow.some((r) => r.test(m.text()))) issues.push(`console: ${m.text().slice(0, Number(process.env.E2E_MSGLEN ?? 300))} @ ${page.url()} ${process.env.E2E_MSGLEN ? JSON.stringify(m.location()) : ""}`); });
  page.on("pageerror", (e) => issues.push(`pageerror: ${e.message.slice(0, 300)} @ ${page.url()}`));
  page.context().on("response", async (r) => { const u = r.url(); if (r.status() >= 400 && !allow.some((x) => x.test(`${r.status()} ${u}`))) issues.push(`http ${r.status()} ${r.request().method()} ${u} ${r.request().postData()?.slice(0, 400) ?? ""} -> ${(await r.text().catch(() => "")).slice(0, 400)}`); });
  return issues;
}
export async function visit(page: Page, path: string, name: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
  if (await page.getByRole("heading", { name: "Oops" }).isVisible()) throw new Error(`error boundary on ${path}\n${(page as unknown as { __issues?: Issues }).__issues?.join("\n") ?? ""}`);
  await expect(page.locator("main, [role=main]").first()).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false });
}
const STAFF: Record<string, string> = {
  sm: "diane.mukamana@hebuza.example", agent: "eric.habimana@hebuza.example", ext: "jean-paul.nkurunziza@ingabo.example",
  finance: "patrick.niyonzima@hebuza.example", marketing: "grace.mutesi@hebuza.example", procurement: "josiane.uwera@hebuza.example",
  exec: "alice.mutoni@hebuza.example", sysadmin: "innocent.kayitare@hebuza.example", field: "emmanuel.mugabo@hebuza.example",
};
export async function staffLogin(page: Page, who: keyof typeof STAFF | string) {
  const headers = { origin: process.env.E2E_BASE_URL ?? "http://localhost:3000" }; // API CSRF origin check
  let last = "";
  for (let i = 0; i < 4; i++) { // TOTP replay guard / auth rate limit: a failed code voids the challenge, so restart
    if (i) await page.waitForTimeout(31_000 - (Date.now() % 30_000));
    const r = await page.request.post("/api/auth/staff/login", { headers, data: { email: STAFF[who], password: "Demo-pass-staff-1!" } });
    if (!r.ok()) { last = `login ${r.status()} ${await r.text()}`; continue; }
    const v = await page.request.post("/api/auth/mfa/verify", { headers, data: { code: totp("JBSWY3DPEHPK3PXP") } });
    if (v.ok()) return;
    last = `${v.status()} ${await v.text()}`;
  }
  throw new Error(`mfa failed: ${last}`);
}
export function dumpIssues(issues: Issues) { return issues.join("\n"); }
export function noIssues(issues: Issues, info: TestInfo) {
  info.annotations.push(...issues.map((d) => ({ type: "issue", description: d })));
  expect(issues, issues.join("\n")).toEqual([]);
}
// RFC 6238 SHA1/6 digits/30 s — otplib isn't a web dependency.
function totp(b32: string) {
  const bits = [...b32].map((c) => "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(c).toString(2).padStart(5, "0")).join("");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const h = createHmac("sha1", key).update(msg).digest(); const o = h[19] & 15;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}
