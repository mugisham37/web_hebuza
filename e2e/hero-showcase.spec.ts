import { expect, test } from "@playwright/test";

test("hero showcase: category tabs switch the poster; pause stops autoplay", async ({ page }) => {
  await page.goto("/en");
  // First view is the intro ("who we are"); the button switches to the category menu and stops auto-switching.
  await expect(page.getByText("Whatever your business needs — sorted by local experts.")).toBeVisible();
  await page.getByRole("button", { name: "Browse categories" }).click();
  const tabs = page.getByRole("tablist", { name: "Browse categories" }).getByRole("tab");
  await expect(tabs).toHaveCount(6);
  await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
  await tabs.nth(1).click();
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  const poster = page.getByRole("tabpanel");
  await expect(poster.locator('[aria-roledescription="slide"]:not([aria-hidden="true"]) h2')).toBeVisible();
  await page.getByRole("button", { name: "Pause slideshow" }).click();
  await expect(page.getByRole("button", { name: "Play slideshow" })).toBeVisible();
  await tabs.nth(1).press("ArrowDown"); // roving focus: keyboard moves to the next category
  await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
});

test("header search finds a service", async ({ page }) => {
  await page.goto("/en");
  const search = page.getByRole("combobox").first();
  await search.fill("vat");
  await expect(page.getByRole("listbox").first().getByRole("option").first()).toBeVisible();
});
