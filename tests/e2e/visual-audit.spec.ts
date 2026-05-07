// Visual audit — gerçek render edilen sayfaları screenshot'la + mockup'larla yan yana karşılaştır.
// Bu spec normal test suite'e dahil değil; sadece manuel olarak çalıştırılır:
//   npx playwright test tests/visual-audit.spec.ts --project=chromium
//
// Çıktı: /tmp/bilbil-audit/real/*.png + /tmp/bilbil-audit/mockup/*.png +
//        /tmp/bilbil-audit/index.html (yan yana görsel karşılaştırma rapor)
//
// Live game ekranları (lobby/question/reveal/leaderboard/podium) state-driven —
// orchestrator'ı tetiklemek karmaşık. Bu audit static page'leri kapsıyor +
// mockup'tan canlı oyun ekranlarını ayrıca screenshot'luyor.

import { test, expect } from "@playwright/test";
import { promises as fs } from "node:fs";
import path from "node:path";
import { uniqueEmail, registerVerifyLogin } from "./helpers";

const OUT_DIR = "/tmp/bilbil-audit";
const REAL_DIR = path.join(OUT_DIR, "real");
const MOCKUP_DIR = path.join(OUT_DIR, "mockup");
const VIEWPORT = { width: 1280, height: 800 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };
const HOST_VIEWPORT = { width: 1920, height: 1080 };

interface PageEntry {
  id: string;
  label: string;
  realScreenshot: string;
  mockupScreenshot: string;
  notes?: string;
}

const entries: PageEntry[] = [];

test.describe.configure({ mode: "serial" });

// Sadece RUN_AUDIT=1 ile çalışır — normal e2e suite'i etkilemesin.
test.skip(process.env.RUN_AUDIT !== "1", "Visual audit — sadece RUN_AUDIT=1 ile koşar");

test.beforeAll(async () => {
  await fs.mkdir(REAL_DIR, { recursive: true });
  await fs.mkdir(MOCKUP_DIR, { recursive: true });
});

test("01 — Landing (mockup #1B)", async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const file = path.join(REAL_DIR, "01-landing.png");
  await page.screenshot({ path: file, fullPage: false });
  entries.push({
    id: "01-landing",
    label: "Landing — mockup #1B Demo Centric",
    realScreenshot: file,
    mockupScreenshot: "07-public.html",
  });
});

test("02 — Login (mockup #6)", async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  const file = path.join(REAL_DIR, "02-login.png");
  await page.screenshot({ path: file, fullPage: false });
  entries.push({
    id: "02-login",
    label: "Login — mockup #6 / 3",
    realScreenshot: file,
    mockupScreenshot: "06-auth.html",
  });
});

test("03 — Register (mockup #4)", async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await page.goto("/register");
  await page.waitForLoadState("networkidle");
  const file = path.join(REAL_DIR, "03-register.png");
  await page.screenshot({ path: file, fullPage: false });
  entries.push({
    id: "03-register",
    label: "Register — mockup #4",
    realScreenshot: file,
    mockupScreenshot: "06-auth.html",
  });
});

test("04 — Forgot password (mockup #5)", async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await page.goto("/forgot-password");
  await page.waitForLoadState("networkidle");
  const file = path.join(REAL_DIR, "04-forgot.png");
  await page.screenshot({ path: file, fullPage: false });
  entries.push({
    id: "04-forgot",
    label: "Forgot password — mockup #5",
    realScreenshot: file,
    mockupScreenshot: "06-auth.html",
  });
});

test("05 — PIN entry (mockup #2 mobile)", async ({ page }) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.goto("/play");
  await page.waitForLoadState("networkidle");
  const file = path.join(REAL_DIR, "05-pin-entry.png");
  await page.screenshot({ path: file, fullPage: false });
  entries.push({
    id: "05-pin-entry",
    label: "PIN entry — mockup #2 (mobile)",
    realScreenshot: file,
    mockupScreenshot: "07-public.html",
  });
});

test("06-12 — host pages (login + dashboard + quiz CRUD + history)", async ({ page }) => {
  test.setTimeout(120_000);

  await page.setViewportSize(VIEWPORT);
  await registerVerifyLogin(page, {
    displayName: "Audit Host",
    email: uniqueEmail("audit"),
    password: "Karpuz123",
  });

  // 06 — Empty dashboard
  const fileEmpty = path.join(REAL_DIR, "06-dashboard-empty.png");
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: fileEmpty, fullPage: false });
  entries.push({
    id: "06-dashboard-empty",
    label: "Dashboard empty — mockup #8a",
    realScreenshot: fileEmpty,
    mockupScreenshot: "05-host-dashboard.html",
  });

  // Bir quiz oluştur
  await page.click('text="+ İlk Quiz\'imi Oluştur"');
  await page.waitForURL(/\/quizzes\/new/);
  const fileNew = path.join(REAL_DIR, "07-quiz-new.png");
  await page.screenshot({ path: fileNew, fullPage: false });
  entries.push({
    id: "07-quiz-new",
    label: "Quiz creation Variant A — mockup #9",
    realScreenshot: fileNew,
    mockupScreenshot: "05-host-dashboard.html",
  });

  // Form doldur + yayınla
  await page.fill('input[placeholder*="Türkiye Coğrafyası"]', "Türkiye Coğrafyası Audit");
  const q1 = page.getByTestId("question-card-0");
  await q1.locator('input[placeholder="Soru metni..."]').fill("En uzun nehir hangisi?");
  await q1.locator('input[placeholder^="Şık"]').nth(0).fill("Kızılırmak");
  await q1.locator('input[placeholder^="Şık"]').nth(1).fill("Sakarya");
  await q1.locator('input[placeholder^="Şık"]').nth(2).fill("Yeşilırmak");
  await q1.locator('input[placeholder^="Şık"]').nth(3).fill("Fırat");

  // Filled question card screenshot
  const fileQuestion = path.join(REAL_DIR, "07b-quiz-new-filled.png");
  await page.screenshot({ path: fileQuestion, fullPage: false });
  entries.push({
    id: "07b-quiz-new-filled",
    label: "Quiz creation (dolu) — mockup #9",
    realScreenshot: fileQuestion,
    mockupScreenshot: "05-host-dashboard.html",
  });

  await page.click("text=Yayınla");
  await page.waitForURL(/\/quizzes\/[a-z0-9]+$/, { timeout: 15000 });

  // 08 — Quiz preview
  const filePreview = path.join(REAL_DIR, "08-quiz-preview.png");
  await page.screenshot({ path: filePreview, fullPage: false });
  entries.push({
    id: "08-quiz-preview",
    label: "Quiz preview — mockup #10",
    realScreenshot: filePreview,
    mockupScreenshot: "05-host-dashboard.html",
  });

  // 09 — Dashboard (filled)
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  const fileFilled = path.join(REAL_DIR, "09-dashboard-filled.png");
  await page.screenshot({ path: fileFilled, fullPage: false });
  entries.push({
    id: "09-dashboard-filled",
    label: "Dashboard filled — mockup #8b",
    realScreenshot: fileFilled,
    mockupScreenshot: "05-host-dashboard.html",
  });

  // 10 — History (boş)
  await page.goto("/history");
  await page.waitForLoadState("networkidle");
  const fileHistory = path.join(REAL_DIR, "10-history-list.png");
  await page.screenshot({ path: fileHistory, fullPage: false });
  entries.push({
    id: "10-history-list",
    label: "History list — mockup #12",
    realScreenshot: fileHistory,
    mockupScreenshot: "05-host-dashboard.html",
  });
});

test("13 — Host lobby (mockup #15)", async ({ browser }) => {
  test.setTimeout(120_000);
  const ctx = await browser.newContext({ viewport: HOST_VIEWPORT });
  const page = await ctx.newPage();
  await registerVerifyLogin(page, {
    displayName: "Lobby Audit",
    email: uniqueEmail("lobby-audit"),
    password: "Karpuz123",
  });
  // Hızlı quiz
  await page.goto("/quizzes/new");
  await page.fill('input[placeholder*="Türkiye Coğrafyası"]', "Lobby Audit Quiz");
  const q1 = page.getByTestId("question-card-0");
  await q1.locator('input[placeholder="Soru metni..."]').fill("Test soru?");
  await q1.locator('input[placeholder^="Şık"]').nth(0).fill("A");
  await q1.locator('input[placeholder^="Şık"]').nth(1).fill("B");
  await q1.locator('input[placeholder^="Şık"]').nth(2).fill("C");
  await q1.locator('input[placeholder^="Şık"]').nth(3).fill("D");
  await page.click("text=Yayınla");
  await page.waitForURL(/\/quizzes\/[a-z0-9]+$/, { timeout: 15000 });
  await page.click('text="▶ Oyunu Başlat"');
  await page.waitForURL(/\/host\/[0-9]{6}$/, { timeout: 15000 });
  await page.waitForTimeout(1000); // socket attach
  const file = path.join(REAL_DIR, "13-host-lobby.png");
  await page.screenshot({ path: file, fullPage: false });
  entries.push({
    id: "13-host-lobby",
    label: "Host lobby — mockup #15",
    realScreenshot: file,
    mockupScreenshot: "04-host-live-flow.html",
  });
  await ctx.close();
});

test("99 — generate index.html report", async () => {
  // Mockup HTML'lerini iframe içinde göster — kullanıcı yan yana karşılaştırabilsin
  const mockupBase = path.join(process.cwd(), "mockups");
  const reportRows = entries
    .map((e) => {
      const mockupPath = path.join(mockupBase, e.mockupScreenshot);
      const realRel = path.relative(OUT_DIR, e.realScreenshot);
      return `
        <section class="entry">
          <h2>${e.label}</h2>
          <p class="meta">id: <code>${e.id}</code> · mockup ref: <code>${e.mockupScreenshot}</code></p>
          <div class="grid">
            <div>
              <h3>Gerçek render</h3>
              <img src="${realRel}" alt="${e.id} real" />
            </div>
            <div>
              <h3>Mockup (referans)</h3>
              <iframe src="file://${mockupPath}" loading="lazy"></iframe>
            </div>
          </div>
        </section>
      `;
    })
    .join("\n");

  const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<title>Bilbil — Visual audit report</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; margin: 0; padding: 24px; background: #f1f5f9; }
  h1 { margin: 0 0 8px; }
  .lead { color: #475569; margin-bottom: 24px; }
  .entry { background: white; border-radius: 12px; padding: 20px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  .entry h2 { margin: 0 0 4px; font-size: 18px; }
  .meta { color: #64748b; font-size: 13px; margin: 0 0 16px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .grid h3 { margin: 0 0 8px; font-size: 13px; color: #334155; text-transform: uppercase; letter-spacing: 0.05em; }
  .grid img { width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; }
  .grid iframe { width: 100%; height: 600px; border: 1px solid #e2e8f0; border-radius: 8px; background: white; }
  code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
</style>
</head>
<body>
<h1>Bilbil — Visual Audit Report</h1>
<p class="lead">Gerçek render edilen sayfalar (sol) + mockup HTML referansları (sağ). Mockup'lar full <code>05-host-dashboard.html</code> gibi referans dosyaları — içinde ilgili ekran block'unu manuel scroll'la bulabilirsin.</p>
${reportRows}
</body>
</html>
`;
  await fs.writeFile(path.join(OUT_DIR, "index.html"), html, "utf8");

  expect(entries.length).toBeGreaterThan(0);
  console.log(`\n✅ Visual audit report: ${path.join(OUT_DIR, "index.html")}`);
  console.log(`   ${entries.length} ekran karşılaştırma için hazır.`);
});
