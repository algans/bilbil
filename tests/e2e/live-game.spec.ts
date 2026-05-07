// Faz 3 — Multi-client live game e2e: 1 host + 2 player full game.
//
// Bu MVP'nin "doğrulama testi". Lobby → countdown → 2 soru → reveal → leaderboard → podium.
// Default question time 20sn — tüm oyuncular cevap verince server otomatik kapatır,
// timer dolmasını beklemez (allPlayersAnswered → autoCloseQuestion).
//
// Senaryo:
// - Quiz: "Live Game Test" — 2 soru, her soruda 4 şık (A/B/C/D), default ilk şık doğru.
// - Player Ayşe: 1. soru A (doğru), 2. soru A (doğru) → toplam ~2000 puan
// - Player Mehmet: 1. soru B (yanlış), 2. soru A (doğru) → toplam ~500-1000 puan
// - Beklenen final: Ayşe 1., Mehmet 2.
//
// Multi-client paralel: 3 ayrı browser context (host, player1, player2).

import { test, expect, type Page } from "@playwright/test";
import { uniqueEmail, registerVerifyLogin } from "./helpers";

test.describe("Live Game — full multi-client flow", () => {
  test("host + 2 player: lobby → countdown → 2 soru → reveal → leaderboard → podium", async ({
    browser,
  }) => {
    test.setTimeout(120_000); // ~2dk yeterli, 4sn countdown × 2 + paralel browser açma

    // ----- Host setup -----
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    await registerVerifyLogin(hostPage, {
      displayName: "Game Host",
      email: uniqueEmail("gamehost"),
      password: "Karpuz123",
    });
    await createTwoQuestionQuiz(hostPage, "Live Game Test");

    await hostPage.click('text="▶ Oyunu Başlat"');
    await hostPage.waitForURL(/\/host\/[0-9]{6}$/, { timeout: 15_000 });
    const pin = hostPage.url().match(/\/host\/([0-9]{6})$/)![1];

    // PIN ekranda
    const formattedPin = `${pin.slice(0, 3)} ${pin.slice(3)}`;
    await expect(hostPage.getByText(formattedPin)).toBeVisible({ timeout: 10_000 });

    // ----- 2 player join -----
    const p1Context = await browser.newContext();
    const p1Page = await p1Context.newPage();
    await joinAsPlayer(p1Page, pin, "Ayşe");

    const p2Context = await browser.newContext();
    const p2Page = await p2Context.newPage();
    await joinAsPlayer(p2Page, pin, "Mehmet");

    // Host'ta her ikisi de gözüksün
    await expect(hostPage.getByText("Ayşe", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(hostPage.getByText("Mehmet", { exact: true })).toBeVisible({ timeout: 10_000 });

    // ----- Host "Oyunu Başlat" -----
    const startBtn = hostPage.getByTestId("host-start-game");
    await expect(startBtn).toBeEnabled({ timeout: 5_000 });
    await startBtn.click();

    // Countdown ekranı (host) — "Hazır ol!"
    await expect(hostPage.getByText("Hazır ol!").first()).toBeVisible({ timeout: 5_000 });
    // Player1 de countdown görsün
    await expect(p1Page.getByText("Hazır ol!").first()).toBeVisible({ timeout: 5_000 });

    // ----- Soru 1 açılması (4sn countdown sonra) -----
    await expect(hostPage.getByText("Soru 1")).toBeVisible({ timeout: 10_000 });
    await expect(p1Page.getByTestId("answer-option-0")).toBeVisible({ timeout: 5_000 });

    // Player1 → A şıkkı (position 0, doğru)
    await p1Page.getByTestId("answer-option-0").click();
    // Player2 → B şıkkı (position 1, yanlış)
    await p2Page.getByTestId("answer-option-1").click();

    // Tüm oyuncular cevap verdi → otomatik kapanış → reveal
    // Host: "Leaderboard →" butonu (son soru değil, ara soru)
    const advanceBtn1 = hostPage.getByTestId("host-advance-from-reveal");
    await expect(advanceBtn1).toBeVisible({ timeout: 10_000 });
    await expect(advanceBtn1).toContainText("Leaderboard");

    // Player1 reveal banner doğru
    await expect(p1Page.getByTestId("player-reveal-banner")).toContainText("Doğru", {
      timeout: 5_000,
    });
    // Player2 reveal banner yanlış
    await expect(p2Page.getByTestId("player-reveal-banner")).toContainText("Yanlış", {
      timeout: 5_000,
    });

    // ----- Host: Leaderboard'a geç -----
    await advanceBtn1.click();
    // Leaderboard host ekranında, Ayşe 1.
    await expect(hostPage.getByTestId("leaderboard-entry-1")).toContainText("Ayşe", {
      timeout: 10_000,
    });
    await expect(hostPage.getByTestId("leaderboard-entry-2")).toContainText("Mehmet");

    // ----- Host: Sonraki Soru -----
    const nextBtn = hostPage.getByTestId("host-next-question");
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();

    // Countdown
    await expect(hostPage.getByText("Hazır ol!").first()).toBeVisible({ timeout: 5_000 });
    // Soru 2
    await expect(hostPage.getByText("Soru 2")).toBeVisible({ timeout: 10_000 });
    await expect(p1Page.getByTestId("answer-option-0")).toBeVisible({ timeout: 5_000 });

    // İkisi de A (doğru)
    await p1Page.getByTestId("answer-option-0").click();
    await p2Page.getByTestId("answer-option-0").click();

    // Reveal — son soru: "Podyum →" butonu
    const advanceBtn2 = hostPage.getByTestId("host-advance-from-reveal");
    await expect(advanceBtn2).toBeVisible({ timeout: 10_000 });
    await expect(advanceBtn2).toContainText("Podyum");
    await advanceBtn2.click();

    // ----- Podium -----
    await expect(hostPage.getByTestId("podium-place-1")).toContainText("Ayşe", { timeout: 10_000 });
    await expect(hostPage.getByTestId("podium-place-2")).toContainText("Mehmet");

    // Player1: kendi rank "1."
    await expect(p1Page.getByTestId("player-final-rank")).toContainText("1", { timeout: 10_000 });
    // Player2: kendi rank "2."
    await expect(p2Page.getByTestId("player-final-rank")).toContainText("2", { timeout: 10_000 });

    // History: host /history sayfasında bu oyun gözükmeli
    await hostPage.goto("/history");
    await expect(hostPage.getByText("Live Game Test").first()).toBeVisible({ timeout: 10_000 });
    // Şampiyon olarak Ayşe gözüksün
    await expect(hostPage.getByText(/Ayşe/).first()).toBeVisible({ timeout: 5_000 });

    await hostContext.close();
    await p1Context.close();
    await p2Context.close();
  });
});

// ─────────── helpers ───────────

async function createTwoQuestionQuiz(page: Page, title: string): Promise<void> {
  await page.goto("/dashboard");
  await page.click('text="+ Yeni Quiz"');
  await page.waitForURL(/\/quizzes\/new/);
  await page.fill('input[placeholder*="Türkiye Coğrafyası"]', title);

  // Q1
  const q1 = page.getByTestId("question-card-0");
  await q1.locator('input[placeholder="Soru metni..."]').fill("Q1: A doğru mu?");
  await q1.locator('input[placeholder^="Şık"]').nth(0).fill("A doğru");
  await q1.locator('input[placeholder^="Şık"]').nth(1).fill("B yanlış");
  await q1.locator('input[placeholder^="Şık"]').nth(2).fill("C yanlış");
  await q1.locator('input[placeholder^="Şık"]').nth(3).fill("D yanlış");

  // Q2 ekle
  await page.click('text="+ Soru Ekle"');
  const q2 = page.getByTestId("question-card-1");
  await q2.locator('input[placeholder="Soru metni..."]').fill("Q2: A doğru mu?");
  await q2.locator('input[placeholder^="Şık"]').nth(0).fill("A doğru");
  await q2.locator('input[placeholder^="Şık"]').nth(1).fill("B yanlış");
  await q2.locator('input[placeholder^="Şık"]').nth(2).fill("C yanlış");
  await q2.locator('input[placeholder^="Şık"]').nth(3).fill("D yanlış");

  await page.click("text=Yayınla");
  await page.waitForURL(/\/quizzes\/[a-z0-9]+$/, { timeout: 15_000 });
}

async function joinAsPlayer(page: Page, pin: string, nickname: string): Promise<void> {
  await page.goto(`/play/${pin}`);
  await page.fill('input[type="text"]', nickname);
  await page.click('button[type="submit"]');
  await expect(page.getByText(`Hazırsın ${nickname}!`)).toBeVisible({ timeout: 10_000 });
}
