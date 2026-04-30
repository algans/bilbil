import { test, expect } from "@playwright/test";

// Faz 0 smoke test — ana sayfa yükleniyor mu?
test("ana sayfa yükleniyor", async ({ page }) => {
  await page.goto("/");
  // Next.js default landing veya bizim landing — şimdilik sayfa hata vermeden yüklensin
  await expect(page.locator("body")).toBeVisible();
});
