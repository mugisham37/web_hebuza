import { expect, test } from "@playwright/test";
import { noIssues, SHOTS, visit, watch } from "./helpers";

test("public visitor", async ({ page }, info) => {
  const issues = watch(page, [/401 .*\/api\/auth\/session/, /status of 401/]); // anonymous session probe
  await visit(page, "/en", "public-home");
  await visit(page, "/en/services", "public-services");
  await page.locator('main a[href*="/services/"]:not([href*="/services/c/"])').first().click();
  await expect(page).toHaveURL(/\/services\/[a-z0-9-]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/public-service-detail.png` });
  await visit(page, "/en/pricing", "public-pricing");

  await visit(page, "/en/track", "public-track");
  await page.getByRole("textbox", { name: "Tracking code" }).fill("HBZ-1ZQ9YU");
  await page.getByRole("button", { name: "Track" }).click();
  await expect(page.getByText("Investment certificate (RDB)").first()).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/public-track-result.png` });

  await visit(page, "/en/contact", "public-contact");
  await page.getByRole("textbox", { name: "Your name" }).fill("E2E Visitor");
  await page.getByRole("textbox", { name: "Phone or email" }).fill("e2e.visitor@example.test");
  await page.getByRole("combobox", { name: "Topic" }).selectOption({ index: 1 });
  await page.getByRole("textbox", { name: "Message" }).fill("Hello from the end-to-end run, please call me back.");
  await page.getByRole("checkbox").first().check();
  const sent = page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/api/"));
  await page.getByRole("button", { name: "Send message" }).click();
  expect((await sent).status()).toBeLessThan(400);
  await page.screenshot({ path: `${SHOTS}/public-contact-sent.png` });

  await page.getByRole("button", { name: "Ask HEBUZA" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/public-assistant.png` });
  noIssues(issues, info);
});
