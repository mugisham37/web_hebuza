import { test } from "@playwright/test";
import { noIssues, staffLogin, visit, watch } from "./helpers";
// Pass 1: every persona's key pages render with no console errors / failed /api calls.
const PAGES: Record<string, string[]> = {
  public: ["/en", "/en/services", "/en/services/activating-tin-status-from-dormancy", "/en/pricing", "/en/track", "/en/contact"],
  sm: ["/en/ops", "/en/ops/cases", "/en/ops/catalogue"],
  agent: ["/en/agent", "/en/agent/offers", "/en/agent/cases"],
  ext: ["/en/agent", "/en/agent/offers"],
  finance: ["/en/finance/invoices", "/en/finance/approvals", "/en/finance/payments"],
  procurement: ["/en/procurement/suppliers", "/en/procurement/orders"],
  marketing: ["/en/marketing/customers", "/en/marketing/campaigns", "/en/marketing/content"],
  sysadmin: ["/en/system/users", "/en/system/audit"],
  field: ["/en/agent/field"],
  exec: ["/en/exec"],
};
for (const [who, paths] of Object.entries(PAGES)) {
  test(`smoke ${who}`, async ({ page }, info) => {
    // anonymous session probe 401 is the expected "not signed in" answer
    const issues = watch(page, who === "public" ? [/401 .*\/api\/auth\/session/, /status of 401/] : []);
    if (who !== "public") await staffLogin(page, who);
    for (const p of paths) await visit(page, p, `smoke-${who}${p.replaceAll("/", "_")}`);
    noIssues(issues, info);
  });
}
