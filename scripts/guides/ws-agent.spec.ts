import { test, type Page } from "@playwright/test";
import { LOCALES, PERSONA, shoot, save, staffLogin } from "./lib";

const WS = "agent";
const G = (k: string) => `[data-guide="${k}"]`;
const DLG = "dialog[open]";
// the Replace button, or the drop zone of the first item not yet uploaded
const UPLOAD = `${G("case-upload")}, main div:has(> input[type=file][capture])`;
// scrolls the element near the top so what follows it fits in the shot
const toTop = (sel: string) => async (p: Page) => {
  await p.locator(sel).first().evaluate((e) => window.scrollBy({ top: e.getBoundingClientRect().top - 150, behavior: "instant" }));
};
const click = (sel: string) => async (p: Page) => {
  await p.locator(sel).first().click();
  await p.waitForTimeout(400);
};
// Opens the first case in the list (row click), then the given tab via ?tab=.
const openCase = (tab: string, then?: (p: Page) => Promise<void>) => async (p: Page) => {
  // click focuses the row; Enter opens it
  const row = p.locator("tbody tr").first();
  await row.click();
  await row.press("Enter");
  await p.waitForURL(/\/agent\/cases\/[^/?]+/, { timeout: 15_000 });
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
    await staffLogin(page, PERSONA.agent);
    const s = (spec: Parameters<typeof shoot>[3]) => shoot(page, WS, l, spec);
    await s({ id: "agent-today", path: "/agent", marks: [G("duty"), G("bell"), G("agent-today-offers"), G("help-button")] });
    await s({ id: "agent-duty", path: "/agent", before: click(G("duty")), marks: [G("duty"), "[role=menu]"] });
    await s({ id: "agent-help", path: "/agent", before: click(G("help-button")), marks: [DLG] });
    await s({ id: "agent-guides", path: "/agent/guides", marks: ['nav a[href$="/agent/guides"]'] });
    await s({ id: "agent-onboarding", path: "/agent/onboarding/profile", marks: [] });
    await s({ id: "agent-offers", path: "/agent/offers", marks: ["main [role=tablist]"] });
    // opening the dialogs only; nothing is accepted or declined
    await s({ id: "agent-cases", path: "/agent/cases", marks: ["[role=toolbar]", "main input"] });
    await s({ id: "agent-case-brief", path: "/agent/cases", before: openCase("brief"), marks: [G("case-tabs"), G("case-status"), G("case-propose"), G("case-outcome")] });
    await s({ id: "agent-case-docs", path: "/agent/cases", before: openCase("documents"), marks: [G("case-tabs")] });
    await s({ id: "agent-case-deliverables", path: "/agent/cases", before: openCase("deliverables", toTop(UPLOAD)), marks: [UPLOAD, G("case-submit")] });
    await s({ id: "agent-case-status", path: "/agent/cases", before: openCase("brief", click(G("case-status"))), marks: [DLG] });
    await s({ id: "agent-case-conversation", path: "/agent/cases", before: openCase("conversation"), marks: [G("msg-mode"), G("msg-attach"), G("msg-templates"), G("msg-cards"), G("msg-send")] });
    await s({ id: "agent-inbox", path: "/agent/inbox", marks: ["main input", 'main a[href*="/agent/inbox/templates"]'] });
    await s({ id: "agent-templates", path: "/agent/inbox/templates", marks: ["main [role=tablist]"] });
    await s({ id: "agent-calendar", path: "/agent/calendar", marks: [G("agent-cal-sync")] });
    await s({ id: "agent-calendar-sync", path: "/agent/calendar", before: click(G("agent-cal-sync")), marks: [DLG] });
    await s({ id: "agent-clients", path: "/agent/clients", marks: ["main input"] });
    await s({ id: "agent-earnings", path: "/agent/earnings", marks: [G("agent-earn-export")] });
    await s({ id: "agent-performance", path: "/agent/performance", marks: [] });
    await s({ id: "agent-profile", path: "/agent/profile", marks: [G("profile-sections")] });
    await s({ id: "agent-skills", path: "/agent/profile/skills", marks: [G("profile-sections")] });
    await s({ id: "agent-availability", path: "/agent/profile/availability", marks: [G("profile-sections")] });
  });
test.afterAll(() => save(WS));
