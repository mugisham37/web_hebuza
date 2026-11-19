// Money-path journeys (spec/04-journeys: visitor, client-individual, internal-agent, finance-officer). Steps drive the API
// where the UI step is a provider hand-off (MoMo sandbox prompt) and assert the result in the UI. Needs the API with
// PAYMENTS_STUB=true or MTN sandbox keys (MTN_MOMO_TARGET_ENVIRONMENT=sandbox); never run against production money.
import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { noIssues, staffLogin, visit, watch } from "./helpers";

const ORIGIN = { origin: process.env.E2E_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}` }; // API CSRF origin check
const post = (r: APIRequestContext, url: string, data: unknown) =>
  r.post(url, { headers: { ...ORIGIN, "idempotency-key": randomUUID() }, data });
const data = async <T>(res: Awaited<ReturnType<APIRequestContext["get"]>>) => {
  expect(res.status(), `${res.url()} ${await res.text()}`).toBeLessThan(400);
  return ((await res.json()) as { data: T }).data;
};
const PRE_LOGIN = [/401 .*\/api\/auth\/session/, /status of 401/];
async function clientLogin(page: Page) {
  await page.goto("/en/login");
  await page.getByRole("radio", { name: "Email" }).check({ force: true });
  await page.getByRole("textbox", { name: /email/i }).fill("client@example.test");
  await page.getByRole("textbox", { name: "Password" }).fill("Demo-pass-1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}
/** Submits a request through the API (the wizard itself is covered in client.spec). */
async function newCase(page: Page) {
  const services = await data<{ services?: { slug: string }[]; items?: { slug: string }[] }>(await page.request.get("/api/services?limit=20"));
  const slug = (services.services ?? services.items ?? [])[0]?.slug ?? "activating-tin-status-from-dormancy";
  const out = await data<{ code: string; payment_required: boolean }>(await post(page.request, "/api/applications", {
    service_slug: slug, tier: "standard", idempotency_key: `e2e-${randomUUID()}`,
    personal_info: { fullName: "Demo Client", phone: "+250788000000", email: "client@example.test", consent: true }, service_data: {},
  }));
  return out;
}
async function payMomo(page: Page, code: string) {
  const p = await data<{ transactionId: string; status: string }>(await post(page.request, "/api/payments/initiate", { application_code: code, method: "momo", phone_number: "+250788000000", operator: "mtn" }));
  // The sandbox approves the USSD prompt itself; poll like the pay page does ("never 'did it work?'").
  await expect.poll(async () => (await data<{ status: string }>(await page.request.get(`/api/payments/${p.transactionId}/status`))).status, { timeout: 60_000, intervals: [2_000] })
    .toMatch(/success|completed|confirmed|paid/i);
  return p.transactionId;
}

test("visitor → apply → pay with MoMo → receipt", async ({ page }, info) => {
  const issues = watch(page, PRE_LOGIN);
  await visit(page, "/en/services", "m-visitor-services");
  await page.locator("main a[href*='/services/']").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await clientLogin(page);
  issues.length = 0;
  const kase = await newCase(page);
  expect(kase.code).toMatch(/^HBZ-/);
  test.skip(!kase.payment_required, "service has no upfront payment");
  await visit(page, `/en/pay/${kase.code}`, "m-pay");
  await payMomo(page, kase.code);
  await visit(page, `/en/requests/${kase.code}`, "m-paid-case");
  const receipt = await page.request.get(`/api/applications/${kase.code}/payment/receipt`);
  expect(receipt.status()).toBeLessThan(400);
  await visit(page, "/en/billing", "m-billing-receipt");
  noIssues(issues, info);
});

test("agent delivers → client downloads the deliverable", async ({ browser }, info) => {
  const agent = await (await browser.newContext()).newPage();
  const issues = watch(agent);
  await staffLogin(agent, "agent");
  await visit(agent, "/en/agent/cases", "m-agent-cases");
  // Upload into the first assigned case with an empty deliverable slot (same flow as staff.spec "agent").
  await agent.locator("main a[href*='/agent/cases/']").first().click();
  await agent.getByRole("tab", { name: /deliverables/i }).click().catch(() => {});
  const file = agent.locator("main input[type=file]").first();
  if (await file.count()) {
    const put = agent.waitForResponse((r) => r.request().method() === "PUT" && !r.url().includes("/api/"));
    await file.setInputFiles({ name: "result.pdf", mimeType: "application/pdf", buffer: Buffer.from(`%PDF-1.4\n% ${Date.now()}\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF`) });
    expect((await put).status()).toBeLessThan(300);
  }
  noIssues(issues, info);

  const client = await (await browser.newContext()).newPage();
  const cIssues = watch(client, PRE_LOGIN);
  await clientLogin(client);
  cIssues.length = 0;
  await visit(client, "/en/documents", "m-client-deliverables");
  const list = await data<{ items?: { id: string; released?: boolean; locked?: boolean }[] } | { id: string; released?: boolean }[]>(await client.request.get("/api/me/deliverables"));
  const items = Array.isArray(list) ? list : (list.items ?? []);
  const ready = items.find((d) => d.released !== false && !(d as { locked?: boolean }).locked);
  test.skip(!ready, "no released, paid deliverable in the seed yet (release needs manager approval + payment)");
  const dl = await client.request.get(`/api/deliverables/${ready!.id}/download`, { maxRedirects: 0 });
  expect([200, 302, 303, 307]).toContain(dl.status());
  expect((await post(client.request, `/api/deliverables/${ready!.id}/receipt`, {})).status()).toBeLessThan(400);
  noIssues(cIssues, info);
});

test("finance: invoice → payment → receipt", async ({ page }, info) => {
  const issues = watch(page);
  await staffLogin(page, "finance");
  await visit(page, "/en/finance/invoices", "m-fin-invoices");
  await page.locator("main a[href*='/finance/invoices/']").first().click();
  await expect(page.getByText(/INV-/).first()).toBeVisible();
  await visit(page, "/en/finance/payments", "m-fin-payments");
  await visit(page, "/en/finance/payments/proofs", "m-fin-proofs");
  await visit(page, "/en/finance/reconciliation", "m-fin-recon");
  noIssues(issues, info);

  // The client sees the receipt for a paid invoice.
  const client = await (await page.context().browser()!.newContext()).newPage();
  const cIssues = watch(client, PRE_LOGIN);
  await clientLogin(client);
  cIssues.length = 0;
  const receipts = await data<{ items?: { no: string }[] } | { no: string }[]>(await client.request.get("/api/me/receipts"));
  const first = (Array.isArray(receipts) ? receipts : (receipts.items ?? []))[0];
  test.skip(!first, "no paid invoice for the demo client yet");
  const pdf = await client.request.get(`/api/me/receipts/${first!.no}/pdf`);
  expect(pdf.status()).toBeLessThan(400);
  expect(pdf.headers()["content-type"]).toMatch(/pdf/);
  noIssues(cIssues, info);
});

test("client cancels a paid case → refund request → finance reviews", async ({ browser }, info) => {
  const client = await (await browser.newContext()).newPage();
  const issues = watch(client, PRE_LOGIN);
  await clientLogin(client);
  issues.length = 0;
  const kase = await newCase(client);
  test.skip(!kase.payment_required, "service has no upfront payment");
  await payMomo(client, kase.code);
  const cancel = await post(client.request, `/api/applications/${kase.code}/cancel`, { reason: "E2E: changed my mind before work started" });
  expect(cancel.status(), await cancel.text()).toBeLessThan(400);
  const refund = await post(client.request, "/api/me/refunds", { caseRef: kase.code, reason: "cancelled", details: "E2E refund", method: "momo", idempotencyKey: randomUUID() });
  expect(refund.status(), await refund.text()).toBeLessThan(400);
  await visit(client, "/en/help/refunds", "m-client-refunds");
  noIssues(issues, info);

  const fin = await (await browser.newContext()).newPage();
  const fIssues = watch(fin);
  await staffLogin(fin, "finance");
  await visit(fin, "/en/finance/refunds", "m-fin-refunds");
  await expect(fin.getByText(kase.code).first()).toBeVisible();
  noIssues(fIssues, info);
});
