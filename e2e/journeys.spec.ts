// One journey per persona in spec/04-journeys (13 files). Each walks the persona's main screens on the production build:
// visit() asserts no error boundary, a visible <main>, takes a screenshot and runs the axe WCAG A/AA scan; noIssues()
// fails on console errors, page errors, HTTP ≥ 400 and serious/critical a11y violations collected along the way.
import { expect, test, type Page } from "@playwright/test";
import { noIssues, staffLogin, visit, watch } from "./helpers";

const walk = async (page: Page, prefix: string, paths: string[]) => {
  for (const p of paths) await visit(page, `/en${p}`, `${prefix}${p.replace(/[/?=&]+/g, "-") || "-home"}`);
};
async function clientLogin(page: Page) {
  await visit(page, "/en/login", "j-client-login");
  await page.getByRole("radio", { name: "Email" }).check({ force: true });
  await page.getByRole("textbox", { name: /email/i }).fill("client@example.test");
  await page.getByRole("textbox", { name: "Password" }).fill("Demo-pass-1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}
const PRE_LOGIN = [/401 .*\/api\/auth\/session/, /status of 401/];

test("visitor: discover → service → assistant → track → book @mobile", async ({ page }, info) => {
  const issues = watch(page);
  await walk(page, "j-visitor", ["", "/services", "/pricing", "/how-it-works", "/faq", "/knowledge", "/updates", "/about", "/contact", "/track", "/book", "/assistant", "/legal"]);
  await page.goto("/en/services");
  await page.locator("main a[href*='/services/']").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  noIssues(issues, info);
});

test("client (individual): dashboard → requests → documents → billing → messages → calendar → settings @mobile", async ({ page }, info) => {
  const issues = watch(page, PRE_LOGIN);
  await clientLogin(page);
  issues.length = 0;
  await walk(page, "j-client", ["/dashboard", "/requests", "/documents", "/billing", "/messages", "/notifications", "/history", "/bookings", "/dashboard/calendar", "/help", "/settings", "/settings/notifications", "/settings/privacy", "/settings/security"]);
  noIssues(issues, info);
});

test("client (company representative): organisation context and company requests", async ({ page }, info) => {
  const issues = watch(page, PRE_LOGIN);
  await clientLogin(page);
  issues.length = 0;
  await walk(page, "j-orgrep", ["/orgs", "/dashboard", "/requests", "/billing", "/documents"]);
  noIssues(issues, info);
});

test("internal agent: cases → inbox → calendar → clients → earnings", async ({ page }, info) => {
  const issues = watch(page);
  await staffLogin(page, "agent");
  await walk(page, "j-agent", ["/agent", "/agent/cases", "/agent/inbox", "/agent/inbox/templates", "/agent/calendar", "/agent/clients", "/agent/offers", "/agent/performance", "/agent/earnings", "/agent/profile"]);
  noIssues(issues, info);
});

test("external agent: offers → jobs → inbox → earnings → contract", async ({ page }, info) => {
  const issues = watch(page);
  await staffLogin(page, "ext");
  await walk(page, "j-ext", ["/work", "/work/offers", "/work/jobs", "/work/inbox", "/work/earnings", "/work/contract", "/work/profile", "/work/team"]);
  noIssues(issues, info);
});

test("field agent: prepare → visits → expenses → outbox @mobile", async ({ page }, info) => {
  const issues = watch(page);
  await staffLogin(page, "field");
  await walk(page, "j-field", ["/agent/field", "/agent/field/prepare", "/agent/field/expenses", "/agent/field/outbox", "/agent/field/earnings", "/agent/field/settings"]);
  noIssues(issues, info);
});

test("service manager: intake → assign → cases → workload → SLA → conversations", async ({ page }, info) => {
  const issues = watch(page);
  await staffLogin(page, "sm");
  await walk(page, "j-sm", ["/ops", "/ops/intake", "/ops/cases", "/ops/workload", "/ops/sla", "/ops/conversations", "/ops/tickets", "/ops/reviews", "/ops/bookings", "/ops/catalogue", "/ops/compliance-rules", "/ops/workforce", "/ops/companies", "/ops/field", "/ops/settings/statuses"]);
  noIssues(issues, info);
});

test("finance officer: invoices → payments → reconciliation → refunds → payouts → reports", async ({ page }, info) => {
  const issues = watch(page);
  await staffLogin(page, "finance");
  await walk(page, "j-fin", ["/finance", "/finance/quotes", "/finance/invoices", "/finance/payments", "/finance/payments/proofs", "/finance/receivables", "/finance/reconciliation", "/finance/refunds", "/finance/revenue", "/finance/payouts", "/finance/subscriptions", "/finance/payables", "/finance/approvals", "/finance/reports", "/finance/reports/fin.revenue", "/finance/reports/fin.subscriptions", "/finance/reports/definitions", "/finance/settings"]);
  noIssues(issues, info);
});

test("marketing officer: leads → campaigns → content → segments → reports", async ({ page }, info) => {
  const issues = watch(page);
  await staffLogin(page, "marketing");
  await walk(page, "j-mkt", ["/marketing", "/marketing/leads", "/marketing/customers", "/marketing/campaigns", "/marketing/segments", "/marketing/sequences", "/marketing/templates", "/marketing/content", "/marketing/knowledge", "/marketing/faqs", "/marketing/updates", "/marketing/landing", "/marketing/seo", "/marketing/inbox", "/marketing/feedback", "/marketing/referrals", "/marketing/reports"]);
  noIssues(issues, info);
});

test("procurement officer: requests → orders → receipts → bills → payments → ageing", async ({ page }, info) => {
  const issues = watch(page);
  await staffLogin(page, "procurement");
  await walk(page, "j-proc", ["/procurement", "/procurement/suppliers", "/procurement/contracts", "/procurement/requests", "/procurement/orders", "/procurement/receipts", "/procurement/bills", "/procurement/payments", "/procurement/deposits", "/procurement/ageing", "/procurement/reports"]);
  noIssues(issues, info);
});

test("partner manager: partner records, agreements, actions, meetings, commissions", async ({ page }, info) => {
  const issues = watch(page);
  await staffLogin(page, "pm"); // seed persona mock-partners (pm@example.test, staff:partner_manager)
  await walk(page, "j-prt", ["/partners", "/partners/agreements", "/partners/actions", "/partners/meetings", "/partners/commissions", "/partners/reports"]);
  noIssues(issues, info);
});

test("senior management: overview → approvals → reports", async ({ page }, info) => {
  const issues = watch(page);
  await staffLogin(page, "exec");
  await walk(page, "j-exec", ["/exec", "/exec/approvals", "/finance/reports", "/finance/reports/fin.revenue"]);
  noIssues(issues, info);
});

test("system administrator: users → roles → audit → settings → notifications → ops", async ({ page }, info) => {
  const issues = watch(page);
  await staffLogin(page, "sysadmin");
  await walk(page, "j-sys", ["/system", "/system/users", "/system/roles", "/system/roles/matrix", "/system/access-reviews", "/system/approvals", "/system/sod", "/system/identity", "/system/audit", "/system/audit/integrity", "/system/audit/sensitive", "/system/settings", "/system/integrations", "/system/notifications", "/system/privacy", "/system/ops", "/system/ops?tab=backups", "/system/break-glass"]);
  noIssues(issues, info);
});
