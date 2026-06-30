import { expect, test } from "@playwright/test";

test("home page shows the restored build composer", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Build\.\s+Preview\.\s+Ship\./i })).toBeVisible();
  await expect(page.getByLabel("Describe what to build")).toBeVisible();
  await expect(page.getByRole("button", { name: "Open prompt actions" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start build" })).toBeVisible();
});
