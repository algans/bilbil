import { test, expect } from "@playwright/test";

// Smoke test — landing sayfasının ana mesajları gözüksün.
test("landing yükleniyor (mockup #1B)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Bilgini")).toBeVisible();
  await expect(page.getByRole("link", { name: "Quiz Oluştur" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Giriş Yap/ })).toBeVisible();
});

// Sub-4f: health endpoint deploy probe için kritik.
test("/api/health 200 + db ok döner", async ({ request }) => {
  const r = await request.get("/api/health");
  expect(r.status()).toBe(200);
  const body = await r.json();
  expect(body.status).toBe("ok");
  expect(body.db).toBe("ok");
  expect(typeof body.uptime).toBe("number");
});
