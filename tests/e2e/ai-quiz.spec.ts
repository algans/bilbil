// AI ile Quiz Oluşturma — e2e (mock mode).
// AI_MOCK=1 ile dev server çalışır (playwright.config.ts'de set), OpenAI çağrılmaz.
// Mock cevaplar src/lib/ai/mock-responses.ts'den gelir (keyword-based deterministik).

import { test, expect } from "@playwright/test";
import { uniqueEmail, registerVerifyLogin } from "./helpers";

test.describe("AI ile Quiz Oluştur (mock mode)", () => {
  test("matematik konusu → propose → onay → quiz detayına yönlenir", async ({ page }) => {
    const email = uniqueEmail("ai-host");
    await registerVerifyLogin(page, {
      displayName: "AI Host",
      email,
      password: "Karpuz123",
    });

    // Empty dashboard
    await expect(page.getByText("Henüz quiz oluşturmadın")).toBeVisible();

    // AI butonuna bas (empty state'teki DashboardAIButton)
    await page.getByRole("button", { name: /AI ile Quiz Oluştur/i }).click();

    // Modal açıldı
    await expect(page.getByRole("dialog", { name: /AI ile Quiz Oluştur/i })).toBeVisible();
    await expect(page.getByText(/Selam! Hangi konuda quiz/i)).toBeVisible();

    // Mesaj gönder — mock "matematik" keyword'ü propose döner
    await page.getByLabel("Mesajınız").fill("5 soru matematik");
    await page.getByRole("button", { name: "Gönder" }).click();

    // Asistan summary mesajı + Proposal card
    await expect(page.getByText(/İstediğin konuda quiz hazır/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Temel Matematik").first()).toBeVisible();
    await expect(page.getByText(/3 soru/).first()).toBeVisible();

    // Onayla & Kaydet → confirm dialog
    await page.getByRole("button", { name: /Onayla.*Kaydet/i }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await expect(page.getByText(/Quiz'i kaydet/i)).toBeVisible();

    // Evet, kaydet
    await page.getByRole("button", { name: "Evet, kaydet" }).click();

    // Quiz detayına yönlenmeli
    await page.waitForURL(/\/quizzes\/[a-z0-9]+$/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Temel Matematik" })).toBeVisible();
    await expect(page.getByText("2 + 3 kaçtır?")).toBeVisible();
  });

  test("off-topic istek refuse ile reddedilir", async ({ page }) => {
    const email = uniqueEmail("ai-refuse");
    await registerVerifyLogin(page, {
      displayName: "Refuse Host",
      email,
      password: "Karpuz123",
    });

    await page.getByRole("button", { name: /AI ile Quiz Oluştur/i }).click();
    await page.getByLabel("Mesajınız").fill("bana bir şiir yaz");
    await page.getByRole("button", { name: "Gönder" }).click();

    await expect(page.getByText(/Sadece quiz oluşturmana yardım edebilirim/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("modal ESC ile kapanır", async ({ page }) => {
    const email = uniqueEmail("ai-esc");
    await registerVerifyLogin(page, {
      displayName: "Esc Host",
      email,
      password: "Karpuz123",
    });

    await page.getByRole("button", { name: /AI ile Quiz Oluştur/i }).click();
    await expect(page.getByRole("dialog", { name: /AI ile Quiz Oluştur/i })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: /AI ile Quiz Oluştur/i })).not.toBeVisible();
  });
});
