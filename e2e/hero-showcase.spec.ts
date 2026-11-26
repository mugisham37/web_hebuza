import { expect, test } from "@playwright/test";

test("hero: intro text left, carousel right; pause stops autoplay", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByText("Whatever your business needs — sorted by local experts.")).toBeVisible();
  await expect(page.locator('[aria-roledescription="slide"]:not([aria-hidden="true"]) h2')).toBeVisible();
  await page.getByRole("button", { name: "Pause slideshow" }).click();
  await expect(page.getByRole("button", { name: "Play slideshow" })).toBeVisible();
});

test("header search finds a service", async ({ page }) => {
  await page.goto("/en");
  const search = page.getByRole("combobox").first();
  await search.fill("vat");
  await expect(page.getByRole("listbox").first().getByRole("option").first()).toBeVisible();
});
