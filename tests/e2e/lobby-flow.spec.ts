// Multi-client e2e — 1 host + 2 player parallel.
// Senaryo:
// 1. Host kayıt + giriş + quiz oluştur + "Oyunu Başlat" → /host/[pin]'e iner
// 2. PIN ekranda gözükür
// 3. 2 player browser context açılır, /play'den PIN giriyor → nickname → lobby
// 4. Host ekranında 2 player nickname olarak gözükür
// 5. Player çıkışı host'a yansır mı (basit kontrol)

import { test, expect, type Page } from "@playwright/test";
import { uniqueEmail, registerVerifyLogin } from "./helpers";

test.describe("Live Lobby — multi-client", () => {
  test("host quiz başlatır, 2 player katılır, lobby canlı güncellenir", async ({ browser }) => {
    // ----- Host setup: quiz oluştur -----
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const hostEmail = uniqueEmail("host");
    await registerVerifyLogin(hostPage, {
      displayName: "Lobby Host",
      email: hostEmail,
      password: "Karpuz123",
    });
    await createSimpleQuiz(hostPage, "Lobby Test Quiz");

    // Quiz preview'da "Oyunu Başlat"
    await hostPage.click('text="▶ Oyunu Başlat"');
    await hostPage.waitForURL(/\/host\/[0-9]{6}$/, { timeout: 15000 });
    const hostUrl = hostPage.url();
    const pin = hostUrl.match(/\/host\/([0-9]{6})$/)![1];
    expect(pin).toMatch(/^[0-9]{6}$/);

    // PIN ekranda gözüksün ve quiz title gözüksün
    const formattedPin = `${pin.slice(0, 3)} ${pin.slice(3)}`;
    await expect(hostPage.getByText(formattedPin)).toBeVisible({ timeout: 10000 });
    await expect(hostPage.getByText("Lobby Test Quiz")).toBeVisible();

    // ----- Player 1 -----
    const p1Context = await browser.newContext();
    const p1Page = await p1Context.newPage();
    await joinAsPlayer(p1Page, pin, "Ayşe");

    // Host'ta Ayşe gözüksün
    await expect(hostPage.getByText("Ayşe", { exact: true })).toBeVisible({ timeout: 10000 });

    // ----- Player 2 -----
    const p2Context = await browser.newContext();
    const p2Page = await p2Context.newPage();
    await joinAsPlayer(p2Page, pin, "Mehmet");

    await expect(hostPage.getByText("Mehmet", { exact: true })).toBeVisible({ timeout: 10000 });
    // Sayaç 2 / 50 olmalı
    await expect(hostPage.locator("text=/2.*\\/.*50/")).toBeVisible();

    // Player 1, lobby waiting state'inde Mehmet'i diğer oyuncular listesinde görsün
    await expect(p1Page.getByText("Mehmet")).toBeVisible({ timeout: 10000 });

    await hostContext.close();
    await p1Context.close();
    await p2Context.close();
  });

  test("aynı nickname _2 ile join olur", async ({ browser }) => {
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const hostEmail = uniqueEmail("dupehost");
    await registerVerifyLogin(hostPage, {
      displayName: "Dupe Host",
      email: hostEmail,
      password: "Karpuz123",
    });
    await createSimpleQuiz(hostPage, "Dupe Test");
    await hostPage.click('text="▶ Oyunu Başlat"');
    await hostPage.waitForURL(/\/host\/[0-9]{6}$/, { timeout: 15000 });
    const pin = hostPage.url().match(/\/host\/([0-9]{6})$/)![1];

    const p1Context = await browser.newContext();
    const p1Page = await p1Context.newPage();
    await joinAsPlayer(p1Page, pin, "Zeynep");

    const p2Context = await browser.newContext();
    const p2Page = await p2Context.newPage();
    // p2 aynı "Zeynep" yazar ama server "Zeynep_2" suggest eder
    await p2Page.goto(`/play/${pin}`);
    await p2Page.fill('input[type="text"]', "Zeynep");
    await p2Page.click('button[type="submit"]');
    await expect(p2Page.getByText("Hazırsın Zeynep_2!")).toBeVisible({ timeout: 10000 });
    // Host listesinde her iki isim de var
    await expect(hostPage.getByText("Zeynep", { exact: true })).toBeVisible();
    await expect(hostPage.getByText("Zeynep_2", { exact: true })).toBeVisible();

    await hostContext.close();
    await p1Context.close();
    await p2Context.close();
  });

  test("küfür içeren nickname reddedilir", async ({ browser, page }) => {
    // Host setup'ı önce yap (kayıt + quiz + PIN)
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const hostEmail = uniqueEmail("filterhost");
    await registerVerifyLogin(hostPage, {
      displayName: "Filter Host",
      email: hostEmail,
      password: "Karpuz123",
    });
    await createSimpleQuiz(hostPage, "Filter Test");
    await hostPage.click('text="▶ Oyunu Başlat"');
    await hostPage.waitForURL(/\/host\/[0-9]{6}$/, { timeout: 15000 });
    const pin = hostPage.url().match(/\/host\/([0-9]{6})$/)![1];

    // Şimdi başka context'te "eşek" denemesi
    await page.goto(`/play/${pin}`);
    await page.fill('input[type="text"]', "eşek");
    await page.click('button[type="submit"]');
    await expect(page.getByText(/uygun değil/i)).toBeVisible();

    await hostContext.close();
  });

  test("geçersiz PIN /play?error=invalid'e yönlendirir", async ({ page }) => {
    await page.goto("/play/000000");
    await page.waitForURL(/\/play\?error=invalid/);
    await expect(page.getByText(/PIN bulunamadı veya oyun başlamış/i)).toBeVisible();
  });
});

// ===== helpers =====

async function createSimpleQuiz(hostPage: Page, title: string) {
  await hostPage.click('text="+ Yeni Quiz"');
  await hostPage.waitForURL(/\/quizzes\/new/);
  await hostPage.fill('input[placeholder*="Türkiye Coğrafyası"]', title);

  const q1 = hostPage.getByTestId("question-card-0");
  await q1.locator('input[placeholder="Soru metni..."]').fill("Soru?");
  const opts = q1.locator('input[placeholder^="Şık"]');
  await opts.nth(0).fill("A");
  await opts.nth(1).fill("B");
  await opts.nth(2).fill("C");
  await opts.nth(3).fill("D");

  await hostPage.click("text=Yayınla");
  await hostPage.waitForURL(/\/quizzes\/[a-z0-9]+$/, { timeout: 15000 });
}

async function joinAsPlayer(page: Page, pin: string, nickname: string) {
  await page.goto(`/play/${pin}`);
  await page.fill('input[type="text"]', nickname);
  await page.click('button[type="submit"]');
  await expect(page.getByText(`Hazırsın ${nickname}!`)).toBeVisible({ timeout: 10000 });
}
