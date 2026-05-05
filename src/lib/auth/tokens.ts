// Token üretimi (e-posta doğrulama + şifre sıfırlama).
// crypto.randomBytes 32 byte → URL-safe base64 (~43 char).

import { randomBytes } from "node:crypto";

export function generateToken(byteLength = 32): string {
  return randomBytes(byteLength).toString("base64url");
}

export const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 saat
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 saat

export function expiresAt(ttlMs: number): Date {
  return new Date(Date.now() + ttlMs);
}
