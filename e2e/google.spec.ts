import { expect, test } from "@playwright/test";
// Google sign-in in mock mode (server GOOGLE_OAUTH_MOCK=1: start → callback directly; callback takes mock_email/mock_sub).
test("google signup: new user lands on /dashboard", async ({ page }) => {
  const s = await (await page.request.get("/api/platform/public-settings")).json();
  test.skip(!(s.data ?? s).googleSignIn, "googleSignIn is off");
  await page.goto("/en/signup");
  const btn = page.getByRole("link", { name: "Sign up with Google" });
  await expect(btn).toBeVisible();
  const id = Date.now();
  const href = (await btn.getAttribute("href"))!;
  await page.goto(`${href}&mock_email=g${id}@example.com&mock_sub=${id}`);
  await expect(page).toHaveURL(/\/dashboard/);
});
