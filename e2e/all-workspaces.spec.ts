import { expect, test } from "@playwright/test";

// Needs a live API with seeded data where the demo sysadmin holds "All workspaces" (System › Users › Roles).
test.skip(!process.env.E2E_ALL_WORKSPACES, "set E2E_ALL_WORKSPACES=1 against a seeded API");

const TABS: [string, RegExp][] = [
  ["Client", /\/dashboard/], ["Agent", /\/agent/], ["Work", /\/work/], ["Ops", /\/ops/], ["Finance", /\/finance/],
  ["Marketing", /\/marketing/], ["Procurement", /\/procurement/], ["Partners", /\/partners/], ["Executive", /\/exec/], ["System", /\/system/],
];

test("all-workspaces sysadmin moves through every workspace from the top bar", async ({ page }) => {
  await page.goto("/en/login?as=system");
  await page.getByLabel(/email/i).fill("innocent.kayitare@hebuza.example");
  await page.getByLabel(/password/i).first().fill("Demo-pass-staff-1!");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/system/);
  const bar = page.getByRole("navigation", { name: /switch/i });
  await expect(bar.getByRole("link")).toHaveCount(10);
  for (const [name, url] of TABS) {
    await bar.getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(url);
    await expect(bar.getByRole("link", { name, exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  }
});
