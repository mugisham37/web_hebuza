// Guide screenshots: walks the real app with the demo accounts (local stack only — it submits demo requests) and saves,
// per locale, a JPEG of each screen plus the rectangles of the elements each guide points at.
//   pnpm guides:shots            (needs `next dev`/`next start` on :3000 and the API with demo seed data)
// Output: public/guides/shots/<locale>/<id>.jpg and src/content/guides/shots.json ({ id: { locale: { w, h, marks } } }).
// Marks are % of the image so the overlay scales with it; a selector that matches nothing is logged and skipped.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { test, type Page } from "@playwright/test";

const LOCALES = ["rw", "en", "fr"] as const;
type Mark = { x: number; y: number; w: number; h: number };
type Spec = {
  id: string;
  path?: string;
  marks: string[];
  before?: (p: Page) => Promise<void>;
  focus?: string;
  /** Taller viewport for screens whose marks don't fit in 800px. */
  h?: number;
};
const OUT = "public/guides/shots",
  JSON_OUT = "src/content/guides/shots.json";
const db: Record<
  string,
  Record<string, { w: number; h: number; marks: (Mark | null)[] }>
> = existsSync(JSON_OUT) ? JSON.parse(readFileSync(JSON_OUT, "utf8")) : {};
const ORIGIN = { origin: "http://localhost:3000" };
// An image, not a PDF: Chromium's PDF preview hangs page.screenshot.
const PDF = { name: "national-id.png", mimeType: "image/png", buffer: readFileSync("scripts/guides/sample-id.png") };

async function clean(p: Page) {
  await p.addStyleTag({
    content:
      "nextjs-portal,.floating-helper,section[aria-labelledby=nps-q]{display:none!important} html{scroll-behavior:auto!important} *{caret-color:transparent!important;transition:none!important;animation:none!important}",
  });
}
async function shoot(p: Page, l: string, s: Spec) {
  if (s.h) await p.setViewportSize({ width: 1280, height: s.h });
  const { width: W, height: H } = p.viewportSize() ?? { width: 1280, height: 800 };
  if (s.path) await p.goto(`/${l}${s.path}`, { waitUntil: "domcontentloaded" });
  await p.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  if (s.before) await s.before(p);
  await clean(p);
  const anchor = s.focus ?? s.marks[0];
  // Instant scroll: put the first target ~1/3 down the screen (below the fixed header) when it is not already in view.
  if (anchor) {
    const el = p.locator(anchor).first();
    if (await el.count()) await el.evaluate((e, h) => { const r = e.getBoundingClientRect(); if (r.top < 120 || r.bottom > h - 40) window.scrollTo({ top: window.scrollY + r.top - h / 3, behavior: "instant" }); }, H).catch(() => {});
  }
  await p.waitForTimeout(700);
  const marks: (Mark | null)[] = [];
  for (const sel of s.marks) {
    const b = await p
      .locator(sel)
      .first()
      .boundingBox()
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
  });
  (db[s.id] ??= {})[l] = { w: W, h: H, marks };
}

async function client(p: Page) {
  // API sign-in (sets the session cookies on this context); the login screen itself is captured separately.
  const r = await p.request.post("/api/auth/login", { headers: ORIGIN, data: { identifierType: "email", identifier: "client@example.test", password: "Demo-pass-1" } });
  if (!r.ok()) throw new Error(`client login ${r.status()} ${await r.text()}`);
}
/** Fills whatever the current wizard step shows (same rules as e2e/client.spec), locale-independent. */
async function fillStep(p: Page) {
  const main = p.locator("main");
  // Repeating tables (e.g. shareholders) need one row before they validate.
  // Fields with a format: fill them first so the generic pass below skips them.
  for (const [sel, v] of [["main input#nationalId, main #nationalId input, main input[inputmode=numeric]", "1199080012345678"], ["main #dob input", "1990-01-01"]] as const)
    for (const el of await p.locator(sel).all()) if ((await el.isVisible()) && !(await el.inputValue())) await el.fill(v);
  await p.evaluate(() => {
    const seen = new Set<string>();
    const unnamed = [...document.querySelectorAll<HTMLInputElement>("main form input[type=radio]:not([name])"), ...document.querySelectorAll<HTMLInputElement>("main form input[type=radio][name='']")];
    unnamed.forEach((r, i) => { if (i % 2 === 0) r.click(); }); // Yes / No pairs: the first option is "Yes"
    document.querySelectorAll<HTMLInputElement>("main form input[type=radio][name]:not([name=''])").forEach((r) => { if (!seen.has(r.name)) { seen.add(r.name); if (!document.querySelector(`main form input[type=radio][name='${r.name}']:checked`)) r.click(); } });
  });
  // After the radios: the shareholders table only shows once "Ltd" is picked. Add a row only to an empty table (one row = 100%).
  await p.waitForTimeout(300);
  for (const add of await p.locator("main fieldset:not(:has(input)) [data-guide=add-row]").all()) if (await add.isVisible()) { await add.click(); await p.waitForTimeout(300); }
  for (const tb of await main
    .locator(
      "input:not([type=radio]):not([type=checkbox]):not([type=file]):not([disabled]), textarea",
    )
    .all()) {
    if (!(await tb.isVisible()) || (await tb.inputValue())) continue;
    const type = await tb.getAttribute("type"),
      // Group-table inputs get generated ids; the field key (e.g. shareholders-0-sh-shares) sits on the wrapper.
      name = await tb.evaluate((e: HTMLInputElement) => `${e.name} ${e.id} ${e.parentElement?.closest("[id]")?.id ?? ""}`);
    await tb.fill(
      type === "date"
        ? /dob|birth/i.test(name)
          ? "1990-01-01"
          : "2027-06-01"
        : type === "email"
          ? "client@example.test"
          : type === "tel"
            ? "788000000"
            : /shares/i.test(name)
              ? "100"
              : /national|nid|sh-id/i.test(name)
              ? "1199080012345678"
              : type === "number"
                ? "1"
                : /name/i.test(name) ? "Demo Client" : "General trading",
    );
  }
  for (const s of await main.locator("select").all())
    if ((await s.isVisible()) && !(await s.inputValue()))
      await s.selectOption({ index: 1 });
}

const PUBLIC: Spec[] = [
  {
    id: "signup",
    path: "/signup",
    h: 1200,
    marks: [
      "main a[href*='oauth/google']",
      "#identifier",
      "#name",
      "#password",
      "main button[type=submit]",
    ],
  },
  {
    id: "login",
    path: "/login",
    marks: [
      "#identifier",
      "#password",
      "main button[type=submit]",
      "main a[href*='/forgot']",
    ],
  },
  {
    id: "services",
    path: "/services",
    marks: ["main input[type=search]", "main select:visible"],
    focus: "main select:visible", // the sort control sits below the search; centring it keeps both in view
  },
  {
    id: "service",
    path: "/services/company-registration",
    marks: [
      "main a[href*='/apply/company-registration']",
      "main button[type=button]",
    ],
  },
  {
    id: "track",
    path: "/track",
    marks: ["main input", "main button[type=submit]"],
  },
];

for (const l of LOCALES) {
  test(`public ${l}`, async ({ page }) => {
    for (const s of PUBLIC) { await page.setViewportSize({ width: 1280, height: 800 }); await shoot(page, l, s); }
  });

  test(`client ${l}`, async ({ page }) => {
    test.setTimeout(600_000);
    await client(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await shoot(page, l, { id: "dash-guides", path: "/dashboard", marks: ["aside a[href$='/dashboard/guides']", "[data-guide=help-button]"] });
    await page.setViewportSize({ width: 1280, height: 800 });
    await shoot(page, l, {
      id: "dashboard",
      path: "/dashboard",
      marks: [
        "main a[href$='/services']",
        "[data-guide=need-upload]",
        "main a[href*='/pay/']",
      ],
    });
    // Apply, step by step (each run submits one demo request on the local stack).
    await page.goto(`/${l}/apply/company-registration`, {
      waitUntil: "domcontentloaded",
    });
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState("networkidle").catch(() => {});
    const submit = "main form button[type=submit]";
    await page.setViewportSize({ width: 1280, height: 1100 });
    await fillStep(page);
    await shoot(page, l, {
      id: "apply-0",
      marks: [
        "main form fieldset",
        "main form label:has(input[type=radio])",
        submit,
        "aside",
      ],
      focus: "main form",
    });
    for (let step = 1; step <= 4; step++) {
      await page.locator(submit).click();
      await page.waitForTimeout(800);
      await fillStep(page);
      // An upload replaces its drop zone, so always take the first one left; keep the last zone for the shot, upload it after.
      const files = page.locator("main input[type=file]:not([capture])");
      while ((await files.count()) > 1) { await files.first().setInputFiles(PDF); await page.waitForTimeout(800); }
      if (step === 4)
        for (const c of await page
          .locator("main form input[type=checkbox]")
          .all())
          if (!(await c.isChecked())) await c.check({ force: true });
      await page.waitForTimeout(500);
      await shoot(page, l, {
        id: `apply-${step}`,
        marks:
          step === 3
            ? ["main input[type=file]:not([capture]) >> xpath=..", submit]
            : step === 4
              ? ["main form fieldset", submit]
              : [
                  "main form input:not([type=radio]):not([type=hidden])",
                  submit,
                ],
        focus: "main form",
      });
      if (await files.count()) { await files.first().setInputFiles(PDF); await page.waitForTimeout(800); }
    }
    await page.locator(submit).click();
    await page
      .getByText(/HBZ-[A-Z0-9]{6}/)
      .first()
      .waitFor({ timeout: 30_000 });
    const code = (await page
      .getByText(/HBZ-[A-Z0-9]{6}/)
      .first()
      .textContent())!.match(/HBZ-[A-Z0-9]{6,7}/)![0];
    await shoot(page, l, {
      id: "apply-done",
      marks: [
        `main :text("${code}")`,
        "main a[href*='/pay/'], main a[href*='/requests/']",
      ],
    });
    await page.setViewportSize({ width: 1280, height: 1000 });
    await shoot(page, l, {
      id: "pay",
      path: `/pay/${code}`,
      marks: [
        "main label:has(input[name=method])",
        "main input[type=tel]",
        "main button[type=submit]",
      ],
    });
  });
}

test.afterAll(() => {
  mkdirSync("src/content/guides", { recursive: true });
  writeFileSync(JSON_OUT, JSON.stringify(db, null, 0) + "\n");
});
