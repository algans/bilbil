"use server";

// Server actions — auth flow.
// useActionState ile kullanıldığı için imza: (prevState, formData) => state

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { db } from "@/lib/db";
import { signIn, signOut, EmailNotVerifiedError } from "@/lib/auth";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";
import { sendEmail } from "@/lib/email/mock";
import { verificationEmail, passwordResetEmail } from "@/lib/email/templates";
import {
  generateToken,
  expiresAt,
  VERIFICATION_TOKEN_TTL_MS,
  RESET_TOKEN_TTL_MS,
} from "@/lib/auth/tokens";
import { rateLimit } from "@/lib/rate-limit";

export type ActionState =
  | undefined
  | {
      ok: true;
      message?: string;
    }
  | {
      ok: false;
      message?: string;
      errors?: Record<string, string[]>;
    };

/**
 * Runtime'da request origin'ini hesapla — proxy/tunnel arkasında doğru URL üretmek için.
 * Cloudflare tunnel + Vercel + Fly.io her birinde `x-forwarded-proto`/`host` header'ları gelir.
 * Env fallback (`NEXT_PUBLIC_APP_URL`) sadece header yoksa devreye girer.
 */
async function getRequestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

/** İstek yapan IP'yi header'lardan çıkar. Proxy/tunnel arkasında x-forwarded-for öncelikli. */
async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

// ---------------- REGISTER ----------------
export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ip = await getClientIp();
  if (!rateLimit({ key: `register:${ip}`, limit: 5, windowMs: 60_000 })) {
    return { ok: false, message: "Çok fazla deneme yaptın. Lütfen biraz bekle." };
  }

  const parsed = registerSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    acceptTerms: formData.get("acceptTerms") === "on",
  });

  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const { displayName, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    // E-posta tekrarı: güvenlik perspektifinden generic mesaj vermek tercih edilir
    // (enumeration önleme), ama Faz 1'de UX'i bozmamak için açık veriyoruz.
    return { ok: false, errors: { email: ["Bu e-posta zaten kayıtlı"] } };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await db.user.create({
    data: { email, displayName, passwordHash },
    select: { id: true, email: true, displayName: true },
  });

  await sendVerificationLink(user.id, user.email, user.displayName);

  redirect(`/verify-email/sent?email=${encodeURIComponent(email)}`);
}

// ---------------- LOGIN ----------------
export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ip = await getClientIp();
  if (!rateLimit({ key: `login:${ip}`, limit: 10, windowMs: 60_000 })) {
    return { ok: false, message: "Çok fazla deneme yaptın. Lütfen biraz bekle." };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      // Auth.js v5 cause.err hata zincirini takip ederek bizim custom error'ımıza ulaşıyoruz
      const cause = (err as { cause?: { err?: unknown } }).cause?.err;
      if (cause instanceof EmailNotVerifiedError) {
        return {
          ok: false,
          message:
            "E-postanı henüz doğrulamadın. Doğrulama bağlantısı için tekrar gönder bağlantısını kullanabilirsin.",
        };
      }
      return { ok: false, message: "E-posta veya şifre hatalı" };
    }
    throw err;
  }

  redirect("/dashboard");
}

// ---------------- LOGOUT ----------------
export async function logoutAction() {
  await signOut({ redirect: false });
  redirect("/");
}

// ---------------- FORGOT PASSWORD ----------------
export async function requestPasswordResetAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });

  // Enumeration önleme: kullanıcı var olsun ya da olmasın aynı başarı mesajı.
  if (user) {
    const token = generateToken();
    await db.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt: expiresAt(RESET_TOKEN_TTL_MS) },
    });
    const resetUrl = `${await getRequestOrigin()}/reset-password/${token}`;
    const tmpl = passwordResetEmail({ displayName: user.displayName, resetUrl });
    await sendEmail({ to: user.email, ...tmpl });
  }

  return {
    ok: true,
    message: "Bağlantı gönderildi. E-postanın gelen kutusunu kontrol et.",
  };
}

// ---------------- RESET PASSWORD ----------------
export async function resetPasswordAction(
  token: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const record = await db.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.consumedAt || record.expiresAt < new Date()) {
    return {
      ok: false,
      message:
        "Bu sıfırlama bağlantısı geçersiz veya süresi dolmuş. Lütfen yeni bir bağlantı talep et.",
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    db.passwordResetToken.update({
      where: { token },
      data: { consumedAt: new Date() },
    }),
  ]);

  redirect("/login?reset=1");
}

// ---------------- VERIFY EMAIL ----------------
// Bu bir Server Action olarak değil, Server Component'ten çağrılıyor (page'in kendisinde).
export async function consumeVerificationToken(
  token: string
): Promise<{ ok: true } | { ok: false; reason: "invalid" | "expired" }> {
  const record = await db.emailVerificationToken.findUnique({ where: { token } });
  if (!record) return { ok: false, reason: "invalid" };
  if (record.expiresAt < new Date()) {
    await db.emailVerificationToken.delete({ where: { token } }).catch(() => {});
    return { ok: false, reason: "expired" };
  }

  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    }),
    db.emailVerificationToken.deleteMany({ where: { userId: record.userId } }),
  ]);

  return { ok: true };
}

// ---------------- RESEND VERIFICATION ----------------
export async function resendVerificationAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) return { ok: false, message: "E-posta adresi gerekli" };

  const user = await db.user.findUnique({ where: { email } });
  if (user && !user.emailVerifiedAt) {
    await sendVerificationLink(user.id, user.email, user.displayName);
  }
  return { ok: true, message: "Doğrulama bağlantısını yeniden gönderdik." };
}

// ---------------- helpers ----------------
async function sendVerificationLink(userId: string, email: string, displayName: string) {
  const token = generateToken();
  await db.emailVerificationToken.create({
    data: { userId, email, token, expiresAt: expiresAt(VERIFICATION_TOKEN_TTL_MS) },
  });
  const verifyUrl = `${await getRequestOrigin()}/verify-email/${token}`;
  const tmpl = verificationEmail({ displayName, verifyUrl });
  await sendEmail({ to: email, ...tmpl });
}
