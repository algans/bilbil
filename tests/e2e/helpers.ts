// E2E test helpers — mock email JSON dosyalarından doğrulama linki çıkarma.

import { promises as fs } from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";

const EMAILS_DIR = path.join(process.cwd(), "tmp", "emails");

export interface SentEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
  sentAt: string;
}

export async function listSentEmails(): Promise<SentEmail[]> {
  try {
    const files = await fs.readdir(EMAILS_DIR);
    const records = await Promise.all(
      files
        .filter((f) => f.endsWith(".json"))
        .map(
          async (f) => JSON.parse(await fs.readFile(path.join(EMAILS_DIR, f), "utf8")) as SentEmail
        )
    );
    return records.sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

export async function findLatestEmailFor(to: string): Promise<SentEmail | null> {
  const all = await listSentEmails();
  const filtered = all.filter((e) => e.to === to);
  return filtered.length ? filtered[filtered.length - 1] : null;
}

export function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : null;
}

export async function waitForEmail(
  to: string,
  opts: { timeoutMs?: number } = {}
): Promise<SentEmail> {
  const timeout = opts.timeoutMs ?? 10_000;
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const email = await findLatestEmailFor(to);
    if (email) return email;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Email to ${to} did not arrive within ${timeout}ms`);
}

// Test verisi izolasyonu için unique email/şifre üretimi.
export function uniqueEmail(prefix = "user"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@bilbil.test`;
}

// Helper: kayıt + doğrulama + giriş tek seferde.
export async function registerVerifyLogin(
  page: Page,
  user: { displayName: string; email: string; password: string }
) {
  await page.goto("/register");
  await page.fill('input[name="displayName"]', user.displayName);
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.check('input[name="acceptTerms"]');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/verify-email\/sent/);

  const email = await waitForEmail(user.email);
  const url = extractFirstUrl(email.text);
  if (!url) throw new Error("Verification URL not found in email");
  await page.goto(url);
  // Otomatik 3 sn redirect ya da manuel "Devam Et" — direkt /login'e gidelim.
  await page.goto("/login?verified=1");

  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/);
}
