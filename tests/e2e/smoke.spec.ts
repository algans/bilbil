import { test, expect } from "@playwright/test";

// Smoke test — landing sayfasının ana mesajları gözüksün.
test("landing yükleniyor (mockup #1B)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Bilgini")).toBeVisible();
  await expect(page.getByRole("link", { name: "Quiz Oluştur" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Giriş Yap/ })).toBeVisible();
});
