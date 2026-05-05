import { describe, it, expect } from "vitest";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  passwordStrength,
} from "@/lib/validation/auth";

describe("registerSchema", () => {
  it("geçerli kayıt verisini kabul eder", () => {
    const r = registerSchema.safeParse({
      displayName: "Sefer Algan",
      email: "test@bilbil.app",
      password: "Karpuz123",
      acceptTerms: true,
    });
    expect(r.success).toBe(true);
  });

  it("ad soyad 2 karakterden kısaysa reddeder", () => {
    const r = registerSchema.safeParse({
      displayName: "A",
      email: "test@bilbil.app",
      password: "Karpuz123",
      acceptTerms: true,
    });
    expect(r.success).toBe(false);
  });

  it("geçersiz email reddeder", () => {
    const r = registerSchema.safeParse({
      displayName: "Sefer Algan",
      email: "not-an-email",
      password: "Karpuz123",
      acceptTerms: true,
    });
    expect(r.success).toBe(false);
  });

  it("8 karakterden kısa şifreyi reddeder", () => {
    const r = registerSchema.safeParse({
      displayName: "Sefer Algan",
      email: "test@bilbil.app",
      password: "Krp1",
      acceptTerms: true,
    });
    expect(r.success).toBe(false);
  });

  it("rakam içermeyen şifreyi reddeder", () => {
    const r = registerSchema.safeParse({
      displayName: "Sefer Algan",
      email: "test@bilbil.app",
      password: "KarpuzKarpuz",
      acceptTerms: true,
    });
    expect(r.success).toBe(false);
  });

  it("KVKK onayı yoksa reddeder", () => {
    const r = registerSchema.safeParse({
      displayName: "Sefer Algan",
      email: "test@bilbil.app",
      password: "Karpuz123",
      acceptTerms: false,
    });
    expect(r.success).toBe(false);
  });

  it("emaili lowercase yapar ve trim'ler", () => {
    const r = registerSchema.safeParse({
      displayName: "Sefer Algan",
      email: "  TEST@BILBIL.APP  ",
      password: "Karpuz123",
      acceptTerms: true,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("test@bilbil.app");
  });
});

describe("loginSchema", () => {
  it("geçerli login verisini kabul eder", () => {
    const r = loginSchema.safeParse({ email: "test@bilbil.app", password: "Karpuz123" });
    expect(r.success).toBe(true);
  });

  it("boş email reddeder", () => {
    const r = loginSchema.safeParse({ email: "", password: "Karpuz123" });
    expect(r.success).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("geçerli emaili kabul eder", () => {
    const r = forgotPasswordSchema.safeParse({ email: "test@bilbil.app" });
    expect(r.success).toBe(true);
  });
});

describe("resetPasswordSchema", () => {
  it("eşleşen şifreleri kabul eder", () => {
    const r = resetPasswordSchema.safeParse({
      password: "Karpuz123",
      confirmPassword: "Karpuz123",
    });
    expect(r.success).toBe(true);
  });

  it("eşleşmeyen şifreleri reddeder", () => {
    const r = resetPasswordSchema.safeParse({
      password: "Karpuz123",
      confirmPassword: "Karpuz999",
    });
    expect(r.success).toBe(false);
  });
});

describe("passwordStrength", () => {
  it("kısa şifre weak", () => {
    expect(passwordStrength("abc").level).toBe("weak");
  });

  it("uzunluk + harf + rakam medium", () => {
    expect(passwordStrength("karpuz123").level).toBe("medium");
  });

  it("uzunluk + büyük/küçük harf + rakam strong", () => {
    expect(passwordStrength("Karpuz123").level).toBe("strong");
  });

  it("12+ karakter ve özel karakter strong", () => {
    expect(passwordStrength("Karpuz123!XX").level).toBe("strong");
  });

  it("level 0-4 arası score döner", () => {
    expect(passwordStrength("").score).toBe(0);
    expect(passwordStrength("Karpuz123").score).toBeGreaterThanOrEqual(3);
  });
});
