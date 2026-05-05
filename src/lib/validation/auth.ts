// Auth form validation şemaları (kayıt / giriş / şifre sıfırlama).
// Mockup #4 register'daki şifre güçlülük göstergesi passwordStrength() ile beslenir.

import { z } from "zod";

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "E-posta adresi gerekli")
  .email("Geçerli bir e-posta adresi gir");

// Kayıt için minimum şifre kuralları (Faz 1 — sade ama güvenli):
// 8+ karakter, en az 1 harf, en az 1 rakam.
// Strength meter ek olarak "güçlü"yü teşvik eder ama kayıtı engellemez.
const passwordField = z
  .string()
  .min(8, "Şifre en az 8 karakter olmalı")
  .regex(/[a-zA-ZçğıöşüÇĞİÖŞÜ]/, "Şifre en az bir harf içermeli")
  .regex(/[0-9]/, "Şifre en az bir rakam içermeli");

export const registerSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Ad soyad en az 2 karakter olmalı")
    .max(60, "Ad soyad en fazla 60 karakter olabilir"),
  email: emailField,
  password: passwordField,
  acceptTerms: z.literal(true, {
    error: "Devam etmek için kullanıcı sözleşmesini kabul etmelisin",
  }),
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Şifre gerekli"),
});

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export const resetPasswordSchema = z
  .object({
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Şifreler eşleşmiyor",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export type PasswordStrengthLevel = "empty" | "weak" | "medium" | "strong";

export interface PasswordStrength {
  score: number; // 0..4 (kaç segment dolu)
  level: PasswordStrengthLevel;
  label: string; // mockup'taki Türkçe etiket
}

// Mockup #4 password strength meter'ı bu fonksiyon besler — 4 segmentli bar.
// Hesap stratejisi: uzunluk + karakter çeşitliliği. zxcvbn gibi entropy lib'i
// 4kg ekler, MVP için bu basit heuristik yeterli.
export function passwordStrength(password: string): PasswordStrength {
  if (password.length === 0) {
    return { score: 0, level: "empty", label: "Boş" };
  }

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-zçğıöşü]/.test(password) && /[A-ZÇĞİÖŞÜ]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ]/.test(password)) score++;

  // Mockup'la hizalı: 4-segmentli bar. "Karpuz123" gibi sağlam ama özel karaktersiz
  // şifre = 3/4 dolu "Güçlü" gözükür (mockup'ta 3 segment yeşil + "Güçlü" etiketi var).
  if (score <= 1) return { score: 1, level: "weak", label: "Zayıf" };
  if (score === 2) return { score: 2, level: "medium", label: "Orta" };
  return { score: Math.min(score, 4), level: "strong", label: "Güçlü" };
}
