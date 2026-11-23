import { expect, test } from "@playwright/test";

test("role picker themes the sign-in", async ({ page }) => {
  await page.goto("/en/login");
  const group = page.getByRole("radiogroup", { name: "Sign in as" });
  await expect(group.getByRole("radio", { name: "Client" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("link", { name: /create an account/i })).toBeVisible();

  await group.getByRole("radio", { name: "Finance" }).click();
  await expect(page).toHaveURL(/[?&]as=finance/);
  await expect(page.locator("[data-role]").first()).toHaveAttribute("data-role", "finance");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Team sign.in\s·\sFinance/);
  await expect(page.getByRole("link", { name: /create an account/i })).toHaveCount(0);
  await expect(page.getByText(/Access is by invitation/)).toBeVisible();

  await page.keyboard.press("ArrowRight"); // roving focus: Finance → Marketing
  await expect(page).toHaveURL(/[?&]as=marketing/);
});

test("legacy /team/sign-in lands on /login?as=ops with next", async ({ page }) => {
  await page.goto("/en/team/sign-in?next=%2Fops");
  await expect(page).toHaveURL(/\/en\/login\?.*as=ops/);
  expect(new URL(page.url()).searchParams.get("next")).toBe("/ops");
});
