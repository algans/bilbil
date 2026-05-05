import { test, expect } from "@playwright/test";
import { uniqueEmail, waitForEmail, extractFirstUrl, registerVerifyLogin } from "./helpers";

test.describe("Auth flow", () => {
  test("kayıt → doğrulama → giriş → dashboard", async ({ page }) => {
    const email = uniqueEmail("alice");
    const password = "Karpuz123";

    // Kayıt
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "Hesap oluştur" })).toBeVisible();
    await page.fill('input[name="displayName"]', "Alice Test");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.check('input[name="acceptTerms"]');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/verify-email\/sent/);
    await expect(page.getByRole("heading", { name: "E-postanı kontrol et" })).toBeVisible();

    // Doğrulama bağlantısını mock email'den al
    const sent = await waitForEmail(email);
    expect(sent.subject).toContain("Bilbil");
    const url = extractFirstUrl(sent.text);
    expect(url).toBeTruthy();
    await page.goto(url!);
    await expect(page.getByText("Hesabın hazır")).toBeVisible();

    // Login
    await page.goto("/login?verified=1");
    await expect(page.getByText("E-posta doğrulandı.")).toBeVisible();
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/dashboard/);
    await expect(page.getByText("Henüz quiz oluşturmadın")).toBeVisible();
  });

  test("doğrulanmamış kullanıcı login olamaz", async ({ page }) => {
    const email = uniqueEmail("bob");
    const password = "Karpuz123";

    await page.goto("/register");
    await page.fill('input[name="displayName"]', "Bob Test");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.check('input[name="acceptTerms"]');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/verify-email\/sent/);

    // Doğrulama yapmadan giriş dene
    await page.goto("/login");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    await expect(page.getByText(/E-postanı henüz doğrulamadın/i)).toBeVisible();
  });

  test("yanlış şifrede generic hata", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "yok@bilbil.test");
    await page.fill('input[name="password"]', "Yanlis123");
    await page.click('button[type="submit"]');
    await expect(page.getByText("E-posta veya şifre hatalı")).toBeVisible();
  });

  test("şifremi unuttum başarı banner'ı gösterir", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.fill('input[name="email"]', uniqueEmail("nobody"));
    await page.click('button[type="submit"]');
    await expect(page.getByText("Bağlantı gönderildi")).toBeVisible();
  });

  test("giriş yapmamış kullanıcı /dashboard'a giderse /login'e gider", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/);
  });

  test("giriş yapmış kullanıcı /login'e giderse /dashboard'a gider", async ({ page }) => {
    const email = uniqueEmail("redirect");
    const password = "Karpuz123";
    await registerVerifyLogin(page, { displayName: "Redirect Test", email, password });

    await page.goto("/login");
    await page.waitForURL(/\/dashboard/);
  });
});
