import { test, type Page } from "@playwright/test";
import { LOCALES, PERSONA, shoot, save, staffLogin } from "./lib";

// Procurement dashboard captures. Read-only: opens screens and forms, never saves, sends or issues anything.
const WS = "procurement";
const firstRow = async (p: Page, url: RegExp) => {
  await p.locator("main table tbody tr").first().dblclick();
  await p.waitForURL(url, { timeout: 10_000 });
  await p.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
};
test.use({ viewport: { width: 1440, height: 900 } });
for (const l of LOCALES)
  test(`${WS} ${l}`, async ({ page }) => {
    test.setTimeout(900_000);
    await staffLogin(page, PERSONA.procurement);
    const s = (spec: Parameters<typeof shoot>[3]) => shoot(page, WS, l, spec);
    await s({ id: "procurement-home", path: "/procurement", marks: ["main h1"] });
    await s({ id: "procurement-help", path: "/procurement", marks: ["[data-guide=help-button]"] });
    await s({ id: "procurement-suppliers", path: "/procurement/suppliers", marks: ["[data-guide=procurement-add-supplier]", "main table"] });
    await s({ id: "procurement-supplier-new", path: "/procurement/suppliers?sheet=new", marks: ["dialog[open]"] });
    await s({ id: "procurement-supplier-profile", path: "/procurement/suppliers", before: (p) => firstRow(p, /\/procurement\/suppliers\/[^/?]+/), marks: ["main [role=toolbar]"] });
    await s({ id: "procurement-contracts", path: "/procurement/contracts", marks: ["[data-guide=procurement-add-contract]", "main [role=toolbar]", "main table"] });
    await s({ id: "procurement-contract-detail", path: "/procurement/contracts", before: (p) => firstRow(p, /\/procurement\/contracts\/[^/?]+/), marks: ["main [role=toolbar]"] });
    await s({ id: "procurement-requests", path: "/procurement/requests", marks: ["[data-guide=procurement-request-purchase]", "main article"] });
    await s({ id: "procurement-pr-sheet", path: "/procurement/requests?pr=new", marks: ["dialog[open]"] });
    await s({ id: "procurement-orders", path: "/procurement/orders", marks: ["[data-guide=procurement-new-po]", "main [role=toolbar]", "main table"] });
    await s({ id: "procurement-order-detail", path: "/procurement/orders", before: (p) => firstRow(p, /\/procurement\/orders\/[^/?]+/), marks: ["main h1"] });
    await s({ id: "procurement-receipts", path: "/procurement/receipts", marks: ["[data-guide=procurement-record-grn]", "main [role=toolbar]"] });
    await s({ id: "procurement-grn-sheet", path: "/procurement/receipts?sheet=grn", marks: ["dialog[open]"] });
    await s({ id: "procurement-bills", path: "/procurement/bills", marks: ['main a[href$="/procurement/bills/new"]', "main [role=toolbar]", "main table"] });
    await s({ id: "procurement-bill-new", path: "/procurement/bills/new", marks: ["main form"] });
    await s({ id: "procurement-bill-detail", path: "/procurement/bills", before: (p) => firstRow(p, /\/procurement\/bills\/[^/?]+/), marks: ["main [role=tablist]"] });
    await s({ id: "procurement-payments", path: "/procurement/payments", marks: ["main table"] });
    await s({ id: "procurement-deposits", path: "/procurement/deposits", marks: ["[data-guide=procurement-record-deposit]", "main [role=toolbar]"] });
    await s({ id: "procurement-reports", path: "/procurement/reports", marks: ["main [role=toolbar]"] });
    await s({ id: "procurement-settings", path: "/procurement/settings", marks: ["main dl"] });
  });
test.afterAll(() => save(WS));
