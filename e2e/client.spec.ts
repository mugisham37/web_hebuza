import { expect, test } from "@playwright/test";
import { noIssues, SHOTS, visit, watch } from "./helpers";

test("client", async ({ page }, info) => {
  const issues = watch(page, [/401 .*\/api\/auth\/session/, /status of 401/]); // probe before sign-in
  await visit(page, "/en/login", "client-login");
  await page.getByRole("radio", { name: "Email" }).check({ force: true }); // styled label covers the sr-only input
  await page.getByRole("textbox", { name: /email/i }).fill("client@example.test");
  await page.getByRole("textbox", { name: "Password" }).fill("Demo-pass-1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  issues.length = 0; // pre-sign-in probe noise
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Demo");
  await page.screenshot({ path: `${SHOTS}/client-dashboard.png` });

  // Apply wizard: answer yes, fill details, upload one document, mark the rest for later, submit.
  await visit(page, "/en/apply/activating-tin-status-from-dormancy", "client-apply-0");
  await page.evaluate(() => localStorage.clear()); // drop drafts from earlier runs
  await page.reload();
  await page.waitForLoadState("networkidle");
  const main = page.locator("main");
  for (const r of await main.getByText("Yes", { exact: true }).all()) await r.click(); // segmented label
  await page.getByRole("button", { name: "Start application" }).click();
  for (let step = 1; step < 6; step++) {
    await page.waitForTimeout(500);
    for (const tb of await main.locator("input:not([type=radio]):not([type=checkbox]):not([type=file]):not([disabled]), textarea").all()) {
      if (!(await tb.isVisible()) || (await tb.inputValue())) continue;
      const type = await tb.getAttribute("type"), name = `${await tb.getAttribute("name")} ${await tb.getAttribute("id")} ${await tb.getAttribute("aria-label")}`;
      await tb.fill(type === "date" ? (/dob|birth/i.test(name) ? "1990-01-01" : "2027-06-01") : type === "email" ? "client@example.test" : type === "tel" ? "788000000" : /national|nid/i.test(name) ? "1199080012345678" : type === "number" ? "1" : "E2E answer");
    }
    const nid = main.getByRole("textbox", { name: "National ID number" }); // draft may hold a stale value
    if (await nid.isVisible()) await nid.fill("1199080012345678");
    const fileIn = main.locator("input[type=file]").first(); // documents step: upload the first required document
    if (await fileIn.count())
      await fileIn.setInputFiles({ name: "national-id.pdf", mimeType: "application/pdf", buffer: Buffer.from(`%PDF-1.4\n% ${Date.now()}\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF`) });
    for (const s of await main.locator("select").all()) if ((await s.isVisible()) && !(await s.inputValue())) await s.selectOption({ index: 1 });
    const submit = page.getByRole("button", { name: "Submit request" });
    if (await submit.isVisible()) {
      for (const c of await main.getByRole("checkbox").all()) if (!(await c.isChecked())) await c.check();
      await page.screenshot({ path: `${SHOTS}/client-apply-review.png` });
      const put = page.waitForResponse((r) => r.request().method() === "PUT" && !r.url().includes("/api/")); // presigned PUT straight to object storage (MinIO locally, R2 when deployed)
      const done = page.waitForResponse((r) => /\/api\/documents\/[^/]+\/complete/.test(r.url()));
      await submit.click();
      expect((await put).status()).toBeLessThan(300);
      expect((await done).status()).toBeLessThan(300);
      break;
    }
    await page.getByRole("button", { name: "Continue" }).click();
  }
  await expect(page.getByRole("heading", { name: "Request submitted!" })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/client-apply-done.png` });
  const code = (await main.getByText(/HBZ-[A-Z0-9]{6}/).first().textContent())!.match(/HBZ-[A-Z0-9]{6}/)![0];
  await visit(page, `/en/requests/${code}`, "client-apply-case");
  await expect(page.getByText(code).first()).toBeVisible();
  // The client case view has no documents tab; the case read model lists the active requirement upload.
  const kase = await (await page.request.get(`/api/applications/${code}`)).text();
  expect(kase).toMatch(/national[-_]id/i);

  // Document vault upload (library, not tied to a case).
  await visit(page, "/en/documents", "client-documents");
  await page.getByRole("button", { name: /upload/i }).first().click();
  const dlg = page.getByRole("dialog");
  const put = page.waitForResponse((r) => r.request().method() === "PUT" && !r.url().includes("/api/")); // presigned PUT straight to object storage (MinIO locally, R2 when deployed)
  const done = page.waitForResponse((r) => /\/api\/(me\/)?documents\/[^/]+\/complete/.test(r.url()));
  await dlg.locator("input[type=file]").first().setInputFiles({ name: "id.pdf", mimeType: "application/pdf", buffer: Buffer.from(`%PDF-1.4\n% ${Date.now()}\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF`) });
  expect((await put).status()).toBeLessThan(300);
  expect((await done).status()).toBeLessThan(300);
  await page.screenshot({ path: `${SHOTS}/client-upload-done.png` });

  await visit(page, "/en/requests", "client-requests");
  await page.getByRole("link", { name: "HBZ-2RT8LM" }).click();
  await expect(page).toHaveURL(/requests\/HBZ-2RT8LM/);
  await expect(page.getByText("HBZ-2RT8LM").first()).toBeVisible();
  await page.getByRole("tab", { name: "Messages" }).click();
  const box = page.locator("main textarea, main [contenteditable=true]").first();
  await box.fill("E2E chat message");
  const sent = page.waitForResponse((r) => r.request().method() === "POST" && /messages|chat|conversations/.test(r.url()));
  await box.press("Enter").catch(() => {});
  if (!(await sent.then(() => true, () => false))) await page.getByRole("button", { name: /send/i }).click();
  await expect(page.getByText("E2E chat message").first()).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/client-request-detail.png` });

  await visit(page, "/en/billing", "client-billing");
  await expect(page.getByText(/INV-HBZ-/).first()).toBeVisible();
  await visit(page, "/en/settings", "client-settings");
  await page.getByRole("textbox", { name: "Full name" }).fill("Demo Client");
  const saved = page.waitForResponse((r) => ["PATCH", "PUT", "POST"].includes(r.request().method()) && r.url().includes("/api/"));
  await page.getByRole("button", { name: "Save changes" }).click();
  expect((await saved).status()).toBeLessThan(400);
  noIssues(issues, info);
});
