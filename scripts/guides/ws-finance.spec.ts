import { test, type Page } from "@playwright/test";
import { LOCALES, PERSONA, shoot, save, staffLogin } from "./lib";

// Finance dashboard captures. Read-only: opens screens and dialogs, never approves, pays, voids or sends.
const WS = "finance";
const firstRow = async (p: Page, url: RegExp) => {
  await p.locator("main table tbody tr").first().dblclick();
  await p.waitForURL(url, { timeout: 10_000 });
  await p.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
};
test.use({ viewport: { width: 1440, height: 900 } });
for (const l of LOCALES)
  test(`${WS} ${l}`, async ({ page }) => {
    test.setTimeout(900_000);
    await staffLogin(page, PERSONA.finance);
    const s = (spec: Parameters<typeof shoot>[3]) => shoot(page, WS, l, spec);
    await s({ id: "finance-overview", path: "/finance", before: async (p) => { await p.locator("#fin-queues").waitFor({ timeout: 10_000 }); await p.evaluate(() => window.scrollBy(0, 120)); }, focus: "#fin-queues", marks: ["main h1", "section[aria-labelledby=fin-queues]"] });
    await s({ id: "finance-help", path: "/finance", marks: ["[data-guide=help-button]"] });
    await s({ id: "finance-approvals", path: "/finance/approvals", marks: ["main [role=tablist]", "main table"] });
    await s({ id: "finance-quotes", path: "/finance/quotes", marks: ["[data-guide=finance-new-quote]", "main [role=toolbar]", "main table"] });
    await s({ id: "finance-quote-new", path: "/finance/quotes?new=1", marks: ["dialog[open] select"], focus: "dialog[open]" });
    await s({ id: "finance-invoices", path: "/finance/invoices", marks: ['a[href$="/finance/invoices/new"]', "main [role=toolbar]", "main table"] });
    await s({ id: "finance-invoice-new", path: "/finance/invoices/new", marks: ["main select"] });
    await s({
      id: "finance-invoice-detail",
      path: "/finance/invoices",
      before: (p) => firstRow(p, /\/finance\/invoices\/[^/]+$/),
      marks: ["main [role=tablist]", 'a[href*="tab=record"]', "[data-guide=finance-inv-remind]", "[data-guide=finance-inv-void]"],
    });
    await s({ id: "finance-payments", path: "/finance/payments", marks: ["[data-guide=finance-record-payment]", 'main a[href*="/finance/payments/proofs"]', "main [role=toolbar]", "main table"] });
    await s({ id: "finance-record-payment", path: "/finance/payments?tab=record", marks: ["dialog[open]"] });
    await s({ id: "finance-proofs", path: "/finance/payments/proofs", marks: ["main section:has(> ul)"] });
    await s({ id: "finance-recon", path: "/finance/reconciliation", marks: ["[data-guide=finance-recon-verify]", 'main a[href*="/finance/reconciliation/import"]', "[data-guide=finance-close-day]"] });
    await s({ id: "finance-recon-import", path: "/finance/reconciliation/import", marks: ["main ol"] });
    await s({ id: "finance-receivables", path: "/finance/receivables", marks: ["main table"] });
    await s({
      id: "finance-receivables-client",
      path: "/finance/receivables",
      before: async (p) => {
        await p.locator("main table").last().locator("tbody tr").first().dblclick();
        await p.locator("dialog[open]").waitFor({ timeout: 10_000 });
      },
      marks: ["dialog[open] [role=tablist]", "[data-guide=finance-rcv-remind]"],
      focus: "dialog[open]",
    });
    await s({ id: "finance-refunds", path: "/finance/refunds", marks: ["[data-guide=finance-refund-create]", "main [role=toolbar]", "main table"] });
    await s({ id: "finance-field", path: "/finance/field", marks: ["main [role=tablist]", "main table"] });
    await s({ id: "finance-revenue", path: "/finance/revenue", marks: ["main [role=toolbar]", "main table"] });
    await s({ id: "finance-revenue-rules", path: "/finance/revenue?tab=rules", marks: ['main a[href*="/finance/revenue/rules/new"]'] });
    await s({ id: "finance-payouts", path: "/finance/payouts", marks: ['main a[href$="/finance/payouts/new"]', "main [role=toolbar]", "main table"] });
    await s({ id: "finance-payout-new", path: "/finance/payouts/new", marks: ["main h1"] });
    await s({ id: "finance-subscriptions", path: "/finance/subscriptions", marks: ["main [role=tablist]"] });
    await s({ id: "finance-payables", path: "/finance/payables", marks: ["main [role=toolbar]"] });
    await s({ id: "finance-reports", path: `/finance/reports?q=${l === "en" ? "VAT" : "TVA"}`, marks: ["main input", 'main a[href*="/finance/reports/accounting-export"]'] });
    await s({ id: "finance-settings", path: "/finance/settings/tax", marks: ['main a[href*="/finance/settings/numbering"]', "[data-guide=finance-settings-propose]"] });
  });
test.afterAll(() => save(WS));
