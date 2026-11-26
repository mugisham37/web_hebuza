// Shared capture helpers for the dashboard guide scripts (scripts/guides/ws-<workspace>.spec.ts).
// Each script signs in as a demo persona, opens screens and calls shoot(); afterAll(() => save(ws)) writes
// src/content/guides/shots/<ws>.json. Images: public/guides/shots/<locale>/<id>.jpg (ids are prefixed "<ws>-").
import { createHmac } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import type { Page } from "@playwright/test";

export const LOCALES = ["rw", "en", "fr"] as const;
export type Spec = {
  id: string;
  /** path without locale, e.g. "/finance/refunds" */
  path?: string;
  /** CSS selectors, in the order the guide's `marks` labels describe them; prefer [data-guide=…] */
  marks: string[];
  /** run after the page loads (open a tab, a dialog…) */
  before?: (p: Page) => Promise<void>;
  /** element to scroll into view (defaults to the first mark) */
  focus?: string;
};
type Mark = { x: number; y: number; w: number; h: number };
const OUT = "public/guides/shots";
const ORIGIN = { origin: process.env.GUIDES_ORIGIN ?? "http://localhost:3000" };
const dbs = new Map<
  string,
  Record<
    string,
    Record<string, { w: number; h: number; marks: (Mark | null)[] }>
  >
>();
const db = (ws: string) => {
  if (!dbs.has(ws)) {
    const f = `src/content/guides/shots/${ws}.json`;
    dbs.set(ws, existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : {});
  }
  return dbs.get(ws)!;
};
export const SAMPLE_FILE = {
  name: "national-id.png",
  mimeType: "image/png",
  buffer: readFileSync("scripts/guides/sample-id.png"),
}; // not a PDF: the PDF preview hangs page.screenshot

export async function shoot(p: Page, ws: string, l: string, s: Spec) {
  const { width: W, height: H } = p.viewportSize() ?? {
    width: 1440,
    height: 900,
  };
  if (s.path) await p.goto(`/${l}${s.path}`, { waitUntil: "domcontentloaded" });
  await p.waitForLoadState("networkidle", { timeout: 3_000 }).catch(() => {});
  if (s.before)
    await s
      .before(p)
      .catch((e) => console.warn(`[${l}] ${s.id}: before() failed: ${e}`));
  await p.addStyleTag({
    content:
      "nextjs-portal,.floating-helper,section[aria-labelledby=nps-q]{display:none!important} html{scroll-behavior:auto!important} *{caret-color:transparent!important;transition:none!important;animation:none!important}",
  });
  const anchor = s.focus ?? s.marks[0];
  if (anchor) {
    const el = p.locator(anchor).first();
    if (await el.count())
      await el
        .evaluate((e, h) => {
          const r = e.getBoundingClientRect();
          if (r.top < 140 || r.bottom > h - 40)
            window.scrollTo({
              top: window.scrollY + r.top - h / 3,
              behavior: "instant",
            });
        }, H)
        .catch(() => {});
  }
  await p.waitForTimeout(600);
  const marks: (Mark | null)[] = [];
  for (const sel of s.marks) {
    const b = await p
      .locator(sel)
      .first()
      .boundingBox({ timeout: 1500 })
      .catch(() => null);
    if (!b || b.y + b.height < 0 || b.y > H) {
      console.warn(`[${l}] ${s.id}: no visible match for ${sel}`);
      marks.push(null);
      continue;
    }
    const pad = 4,
      x = Math.max(0, b.x - pad),
      y = Math.max(0, b.y - pad);
    marks.push({
      x: +((x / W) * 100).toFixed(2),
      y: +((y / H) * 100).toFixed(2),
      w: +((Math.min(W - x, b.width + pad * 2) / W) * 100).toFixed(2),
      h: +((Math.min(H - y, b.height + pad * 2) / H) * 100).toFixed(2),
    });
  }
  mkdirSync(`${OUT}/${l}`, { recursive: true });
  await p.screenshot({
    path: `${OUT}/${l}/${s.id}.jpg`,
    type: "jpeg",
    quality: 78,
    timeout: 30_000,
  });
  (db(ws)[s.id] ??= {})[l] = { w: W, h: H, marks };
  save(ws); // after every shot, so a crash keeps what was captured
}
export function save(ws: string) {
  mkdirSync("src/content/guides/shots", { recursive: true });
  writeFileSync(
    `src/content/guides/shots/${ws}.json`,
    JSON.stringify(db(ws)) + "\n",
  );
}

function totp(b32: string) {
  const bits = [...b32]
    .map((c) =>
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
        .indexOf(c)
        .toString(2)
        .padStart(5, "0"),
    )
    .join("");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((x) => parseInt(x, 2)));
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const h = createHmac("sha1", key).update(msg).digest();
  const o = h[19] & 15;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1e6).padStart(6, "0");
}
/** Demo staff personas (server/src/db/seed/auth.ts). */
export const PERSONA = {
  agent: "eric.habimana@hebuza.example",
  work: "jean-paul.nkurunziza@ingabo.example",
  ops: "diane.mukamana@hebuza.example",
  finance: "patrick.niyonzima@hebuza.example",
  marketing: "grace.mutesi@hebuza.example",
  procurement: "josiane.uwera@hebuza.example",
  partners: "pm@example.test",
  exec: "alice.mutoni@hebuza.example",
  system: "innocent.kayitare@hebuza.example",
} as const;
export async function staffLogin(p: Page, email: string) {
  const r = await p.request.post("/api/auth/staff/login", {
    headers: ORIGIN,
    data: { email, password: "Demo-pass-staff-1!" },
  });
  const j = await r.json().catch(() => ({}));
  if (j?.data?.mfaRequired)
    await p.request.post("/api/auth/mfa/verify", {
      headers: ORIGIN,
      data: { code: totp("JBSWY3DPEHPK3PXP") },
    });
  else await p.request.post("/api/auth/mfa/snooze", { headers: ORIGIN });
}
export async function clientLogin(p: Page) {
  const r = await p.request.post("/api/auth/login", {
    headers: ORIGIN,
    data: {
      identifierType: "email",
      identifier: "client@example.test",
      password: "Demo-pass-1",
    },
  });
  if (!r.ok()) throw new Error(`client login ${r.status()} ${await r.text()}`);
}
