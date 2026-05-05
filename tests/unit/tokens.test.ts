import { describe, it, expect } from "vitest";
import {
  generateToken,
  expiresAt,
  VERIFICATION_TOKEN_TTL_MS,
  RESET_TOKEN_TTL_MS,
} from "@/lib/auth/tokens";

describe("generateToken", () => {
  it("URL-safe base64 string üretir", () => {
    const t = generateToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(t.length).toBeGreaterThanOrEqual(40);
  });

  it("aynı çağrıda farklı token'lar üretir", () => {
    expect(generateToken()).not.toBe(generateToken());
  });
});

describe("expiresAt", () => {
  it("verification token 24 saat sonrası", () => {
    const exp = expiresAt(VERIFICATION_TOKEN_TTL_MS);
    const diff = exp.getTime() - Date.now();
    expect(diff).toBeGreaterThan(23 * 60 * 60 * 1000);
    expect(diff).toBeLessThan(25 * 60 * 60 * 1000);
  });

  it("reset token 1 saat sonrası", () => {
    const exp = expiresAt(RESET_TOKEN_TTL_MS);
    const diff = exp.getTime() - Date.now();
    expect(diff).toBeGreaterThan(59 * 60 * 1000);
    expect(diff).toBeLessThan(61 * 60 * 1000);
  });
});
