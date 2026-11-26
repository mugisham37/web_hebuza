import { test, type Page } from "@playwright/test";
import { LOCALES, PERSONA, shoot, save, staffLogin } from "./lib";

// System dashboard guide shots (src/content/guides/workspaces/system.ts). Opens dialogs only; never saves.
const WS = "system";
test.use({ viewport: { width: 1440, height: 900 } });

/** Another person's detail page (an executive, so Grant role / Remove are shown; never yourself). */
const person = async (p: Page, l: string, tab?: string) => {
  await p.goto(`/${l}/system/users?role=staff:executive`, { waitUntil: "domcontentloaded" });
  const href = await p.locator('main a[href*="/system/users/"]').filter({ hasNot: p.locator(".text-fg-subtle") }).first().getAttribute("href", { timeout: 10_000 });
  await p.goto(`${href}${tab ? `?tab=${tab}` : ""}`, { waitUntil: "domcontentloaded" });
  await p.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
};
const click = (sel: string) => async (p: Page) => {
  await p.locator(sel).first().click({ timeout: 10_000 });
  await p.waitForTimeout(500);
};

for (const l of LOCALES)
  test(`${WS} ${l}`, async ({ page: p }) => {
    test.setTimeout(900_000);
    await staffLogin(p, PERSONA.system);
    const s = (spec: Parameters<typeof shoot>[3]) => shoot(p, WS, l, spec);
    await s({ id: "system-overview", path: "/system", before: async (x) => { await x.locator("section[aria-labelledby=setup-h]").waitFor({ timeout: 10_000 }); await x.evaluate(() => { const t = document.querySelector("section[aria-labelledby=setup-h]")!.getBoundingClientRect().top; window.scrollBy(0, t - 150); }); }, focus: 'main section:has(a[href*="/system/ops?tab=monitoring"])', marks: ["section[aria-labelledby=setup-h]", 'main section:has(> a[href*="/system/ops?tab=monitoring"])', 'main section:has(> a[href$="/system/users"])'] });
    await s({ id: "system-shell", path: "/system", marks: ["a[data-role=system]", "[data-guide=help-button]", "aside nav"] });
    await s({ id: "system-users", path: "/system/users", marks: ["[data-guide=system-invite]", "main [data-guide=ops-views]", "main input[type=search]", "main table tbody tr"] });
    await s({ id: "system-invite", path: "/system/users?dialog=invite", marks: ["dialog[open] input[type=email]", "fieldset[aria-describedby=inv-roles-hint]", "[data-guide=system-invite-send]"] });
    await s({ id: "system-user-roles", before: (x) => person(x, l, "roles"), marks: ["[data-guide=system-grant-role]", "[data-guide=system-role-remove]"] });
    await s({ id: "system-grant", before: async (x) => { await person(x, l, "roles"); await click("[data-guide=system-grant-role]")(x); }, marks: ["dialog[open] select", "dialog[open] textarea", "dialog[open] input[type=date]", "[data-guide=system-grant-submit]"] });
    await s({ id: "system-user-security", before: (x) => person(x, l, "security"), marks: ["[data-guide=system-reset-password]", "[data-guide=system-mfa-reset]", "[data-guide=system-respond]"] });
    await s({ id: "system-user-menu", before: async (x) => { await person(x, l); await click("main header button[aria-expanded]")(x); }, marks: ["[role=menu]"] });
    await s({ id: "system-roles", path: "/system/roles", marks: ["main table", 'main a[href$="/system/roles/matrix"]'] });
    await s({ id: "system-matrix", path: "/system/roles/matrix", marks: ["table[role=grid]"] });
    await s({ id: "system-approvals", path: "/system/approvals", marks: ["[data-guide=system-appr-search]", "[data-guide=system-appr-areas]"] });
    await s({ id: "system-approval", path: "/system/approvals?state=decided", before: click("[data-guide=system-appr-review]"), marks: ["dialog[open]"] });
    await s({ id: "system-access-reviews", path: "/system/access-reviews", marks: ["[data-guide=system-ar-open]", "#hist-h"] });
    await s({ id: "system-access-review", path: "/system/access-reviews", before: async (x) => { await x.goto((await x.locator("[data-guide=system-ar-open]").first().getAttribute("href"))!, { waitUntil: "domcontentloaded" }); await x.waitForLoadState("networkidle").catch(() => {}); }, marks: ["[data-guide=system-ar-decision]"] });
    await s({ id: "system-sod", path: "/system/sod", marks: ["[data-guide=system-sod-waiver]", "main table"] });
    await s({ id: "system-sod-waiver", path: "/system/sod", before: click("[data-guide=system-sod-waiver]"), marks: ["#userId", "#pair", "#why", "#expiresAt"] });
    await s({ id: "system-identity", path: "/system/identity", marks: ["main [data-guide=ops-views]", "[data-guide=system-idc-review]"] });
    await s({ id: "system-identity-dialog", path: "/system/identity", before: click("[data-guide=system-idc-review]"), marks: ["dialog[open] input[type=checkbox]", "dialog[open] textarea"] });
    await p.setViewportSize({ width: 1440, height: 1100 }); // request button sits below the fold when the "new here" banner shows
    await s({ id: "system-break-glass", path: "/system/break-glass", focus: "#minutes", marks: ["#reason", "#incident", "#minutes", "[data-guide=system-bg-request]"] });
    await s({ id: "system-settings", path: "/system/settings", marks: ["[data-guide=system-settings-groups]"] });
    await p.setViewportSize({ width: 1440, height: 2200 }); // idle timeout sits far above the MFA field
    await s({ id: "system-settings-security", path: "/system/settings/security", focus: '[id="set-security.idle_minutes.staff"]', marks: ['[id="set-security.mfa_staff"]', '[id="set-security.idle_minutes.staff"]'] });
    await p.setViewportSize({ width: 1440, height: 900 });
    await s({ id: "system-integrations", path: "/system/integrations", marks: ["main input[type=search]", "[id^=ig-]"] });
    await s({ id: "system-integration", path: "/system/integrations", before: async (x) => { await click('main a[href*="/system/integrations/"]:not([href*="tab="])')(x); await x.waitForLoadState("networkidle").catch(() => {}); }, marks: ["main [role=tablist]", "[data-guide=system-int-test]"] });
    await s({ id: "system-notifications", path: "/system/notifications", marks: ["main [role=tablist]"] });
    await s({ id: "system-audit", path: "/system/audit", marks: ["[data-guide=system-audit-search]", "[data-guide=system-audit-export]", "main table tbody tr"] });
    await s({ id: "system-audit-entry", path: "/system/audit", before: click("main table tbody tr button"), marks: ["dialog[open]"] });
    await s({ id: "system-privacy", path: "/system/privacy?tab=requests", marks: ["main [role=tablist]", 'main ul:has(a[href*="/system/privacy/requests/"])'] });
    await s({ id: "system-ops", path: "/system/ops", marks: ["main [role=tablist]"] });
    await s({ id: "system-ops-incidents", path: "/system/ops?tab=incidents", marks: ["[data-guide=system-new-incident]"] });
  });
test.afterAll(() => save(WS));
