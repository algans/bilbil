// AI Asistan rapor akışı — mock mode (AI_MOCK=1, SQL execution bypass).
// mock-responses.ts içindeki REPORT_RE keyword'leri sayesinde "kim kazandı" gibi
// sorular doğrudan report_answer fixture döner.

import { test, expect } from "@playwright/test";
import { uniqueEmail, registerVerifyLogin } from "./helpers";

test.describe("AI Asistan — rapor akışı (mock mode)", () => {
  test("'son oyunu kim kazandı' → report_answer balonu görünür", async ({ page }) => {
    const email = uniqueEmail("ai-report");
    await registerVerifyLogin(page, {
      displayName: "Report Host",
      email,
      password: "Karpuz123",
    });

    // Empty dashboard
    await expect(page.getByText("Henüz quiz oluşturmadın")).toBeVisible();

    // AI Asistan butonu (yeni label)
    await page.getByRole("button", { name: /AI Asistan/i }).click();
    await expect(page.getByRole("dialog", { name: /AI Asistan/i })).toBeVisible();
    await expect(page.getByText(/geçmiş oyunların hakkında/i)).toBeVisible();

    // Rapor sorusu sor
    await page.getByLabel("Mesajınız").fill("Son oyunu kim kazandı?");
    await page.getByRole("button", { name: "Gönder" }).click();

    // Mock cevabı geliyor mu (Mehmet 4200 puanla kazandı)
    await expect(page.getByText(/Mehmet.*4200/i)).toBeVisible({ timeout: 10_000 });
  });

  test("aynı modalda önce rapor sonra quiz — ikisi de doğru render", async ({ page }) => {
    const email = uniqueEmail("ai-mixed");
    await registerVerifyLogin(page, {
      displayName: "Mixed Host",
      email,
      password: "Karpuz123",
    });

    await page.getByRole("button", { name: /AI Asistan/i }).click();
    await expect(page.getByRole("dialog", { name: /AI Asistan/i })).toBeVisible();

    // 1) Önce rapor sor
    await page.getByLabel("Mesajınız").fill("en çok kazanan oyuncum kim?");
    await page.getByRole("button", { name: "Gönder" }).click();
    await expect(page.getByText(/En çok kazanan/i)).toBeVisible({ timeout: 10_000 });

    // 2) Şimdi quiz iste
    await page.getByLabel("Mesajınız").fill("matematik quiz yap");
    await page.getByRole("button", { name: "Gönder" }).click();
    await expect(page.getByText(/İstediğin konuda quiz hazır/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Temel Matematik").first()).toBeVisible();
  });
});
