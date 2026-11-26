import { test, type Page } from "@playwright/test";
import { LOCALES, PERSONA, shoot, save, staffLogin } from "./lib";

const WS = "work";
const G = (k: string) => `[data-guide="${k}"]`;
const DLG = "dialog[open]";
// the last drop zone, so the Submit button below it still fits in the shot
const UPLOAD = "main div:has(> input[type=file][capture]) >> nth=-1";
// scrolls the element near the top so what follows it fits in the shot
const toTop = (sel: string) => async (p: Page) => {
  await p.locator(sel).first().evaluate((e) => window.scrollBy({ top: e.getBoundingClientRect().top - 150, behavior: "instant" }));
};
const click = (sel: string) => async (p: Page) => {
  await p.locator(sel).first().click();
  await p.waitForTimeout(400);
};
// Opens the first job in the list (row click), then the given tab via ?tab=.
const openCase = (tab: string, then?: (p: Page) => Promise<void>) => async (p: Page) => {
  // click focuses the row; Enter opens it
  const row = p.locator("tbody tr").first();
  await row.click();
  await row.press("Enter");
  await p.waitForURL(/\/work\/jobs\/[^/?]+/, { timeout: 15_000 });
  const u = new URL(p.url());
  u.searchParams.set("tab", tab);
  await p.goto(u.toString(), { waitUntil: "domcontentloaded" });
  await p.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  if (then) await then(p);
};

test.use({ viewport: { width: 1440, height: 900 } });
for (const l of LOCALES)
  test(`${WS} ${l}`, async ({ page }) => {
    test.setTimeout(900_000);
    await staffLogin(page, PERSONA.work);
    const s = (spec: Parameters<typeof shoot>[3]) => shoot(page, WS, l, spec);
    await s({ id: "work-home", path: "/work", marks: [G("work-home-tiles"), G("help-button")] });
    await s({ id: "work-help", path: "/work", before: click(G("help-button")), marks: [DLG] });
    await s({ id: "work-guides", path: "/work/guides", marks: ['nav a[href$="/work/guides"]'] });
    await s({ id: "work-onboarding", path: "/work/onboarding/identity", marks: [] });
    await s({ id: "work-offers", path: "/work/offers", marks: ["main [role=tablist]"] });
    // opening the dialogs only; nothing is accepted or sent
    await s({ id: "work-jobs", path: "/work/jobs", marks: ["[role=toolbar]"] });
    await s({ id: "work-job-brief", path: "/work/jobs", before: openCase("brief"), marks: [G("case-tabs"), G("case-status"), G("case-propose"), G("case-outcome")] });
    await s({ id: "work-job-deliverables", path: "/work/jobs", before: openCase("deliverables", toTop(UPLOAD)), marks: [UPLOAD, G("case-submit")] });
    await s({ id: "work-job-conversation", path: "/work/jobs", before: openCase("conversation"), marks: [G("msg-mode"), G("msg-send")] });
    await s({ id: "work-inbox", path: "/work/inbox", marks: ["main input"] });
    await s({ id: "work-earnings", path: "/work/earnings", marks: ["main [role=tablist]"] });
    await s({ id: "work-statements", path: "/work/earnings?tab=statements", marks: ["main [role=tablist]"] });
    await s({ id: "work-invoices", path: "/work/earnings?tab=invoices", marks: ["main [role=tablist]"] });
    await s({ id: "work-contract", path: "/work/contract", marks: [G("work-contract-tabs")] });
    await s({ id: "work-licence", path: "/work/contract?tab=licence", marks: [G("work-contract-tabs")] });
    await s({ id: "work-renewal", path: "/work/contract?tab=renewal", marks: [G("work-contract-tabs")] });
    await s({ id: "work-profile", path: "/work/profile", marks: [G("profile-sections")] });
    await s({ id: "work-credentials", path: "/work/profile/credentials", marks: [G("profile-sections")] });
    await s({ id: "work-team", path: "/work/team", marks: [G("work-invite"), "main [role=tablist]"] });
  });
test.afterAll(() => save(WS));
