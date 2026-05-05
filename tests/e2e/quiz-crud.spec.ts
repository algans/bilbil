import { test, expect } from "@playwright/test";
import { uniqueEmail, registerVerifyLogin } from "./helpers";

test.describe("Quiz CRUD", () => {
  test("quiz oluşturma → preview → düzenleme → silme", async ({ page }) => {
    const email = uniqueEmail("host");
    await registerVerifyLogin(page, { displayName: "Quiz Host", email, password: "Karpuz123" });

    // /dashboard empty state
    await expect(page.getByText("Henüz quiz oluşturmadın")).toBeVisible();
    await page.click("text=+ İlk Quiz'imi Oluştur");
    await page.waitForURL(/\/quizzes\/new/);

    // Title + Description
    await page.fill('input[placeholder*="Türkiye Coğrafyası"]', "Test Quiz");
    await page.fill('input[placeholder="Kısa bir açıklama"]', "Açıklama");

    // Soru 1
    const q1 = page.getByTestId("question-card-0");
    await q1.locator('input[placeholder="Soru metni..."]').fill("İlk soru?");
    const optionInputs = q1.locator('input[placeholder^="Şık"]');
    await optionInputs.nth(0).fill("Cevap A");
    await optionInputs.nth(1).fill("Cevap B");
    await optionInputs.nth(2).fill("Cevap C");
    await optionInputs.nth(3).fill("Cevap D");

    // Soru 2 ekle
    await page.click("text=+ Soru Ekle");
    const q2 = page.getByTestId("question-card-1");
    await q2.locator('input[placeholder="Soru metni..."]').fill("İkinci soru?");
    const opts2 = q2.locator('input[placeholder^="Şık"]');
    await opts2.nth(0).fill("A2");
    await opts2.nth(1).fill("B2");
    await opts2.nth(2).fill("C2");
    await opts2.nth(3).fill("D2");
    // İkinci sorunun doğru cevabını B2 yap
    await q2.locator("input[type=radio]").nth(1).check();

    await page.click("text=Yayınla");
    await page.waitForURL(/\/quizzes\/[a-z0-9]+$/);

    // Preview ekranı
    await expect(page.getByRole("heading", { name: "Test Quiz" })).toBeVisible();
    await expect(page.getByText("İlk soru?")).toBeVisible();
    await expect(page.getByText("İkinci soru?")).toBeVisible();

    // Düzenleme: title değiştir
    await page.click("text=Düzenle");
    await page.waitForURL(/\/edit$/);
    const titleInput = page.locator('input[placeholder*="Türkiye Coğrafyası"]');
    await titleInput.fill("Test Quiz (güncel)");
    await page.click("text=Kaydet");
    await page.waitForURL(/\/quizzes\/[a-z0-9]+$/);
    await expect(page.getByRole("heading", { name: "Test Quiz (güncel)" })).toBeVisible();

    // Dashboard'a dön — kart var mı
    await page.goto("/dashboard");
    await expect(page.getByText("Test Quiz (güncel)")).toBeVisible();

    // Silme
    await page.click("text=Test Quiz (güncel)");
    await page.click("text=Düzenle");
    page.once("dialog", (d) => d.accept());
    await page.click("text=Quiz'i Sil");
    await page.waitForURL(/\/dashboard$/);
    await expect(page.getByText("Test Quiz (güncel)")).not.toBeVisible();
  });

  test("eksik şık metni validation hatası verir", async ({ page }) => {
    const email = uniqueEmail("validator");
    await registerVerifyLogin(page, {
      displayName: "Validator Host",
      email,
      password: "Karpuz123",
    });

    await page.goto("/quizzes/new");
    await page.fill('input[placeholder*="Türkiye Coğrafyası"]', "Eksik Quiz");
    const q1 = page.getByTestId("question-card-0");
    await q1.locator('input[placeholder="Soru metni..."]').fill("Soru?");
    // Sadece 2 şık doldur — kalan 2'si boş kalsın
    const optionInputs = q1.locator('input[placeholder^="Şık"]');
    await optionInputs.nth(0).fill("A");
    await optionInputs.nth(1).fill("B");

    await page.click("text=Yayınla");

    await expect(page.getByText(/tüm soruları ve şıkları doldurun/i)).toBeVisible();
  });
});
