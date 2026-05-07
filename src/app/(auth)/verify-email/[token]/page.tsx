// Mockup #7a (success) + #7b (error) birebir.
// Server component — token'ı server'da consume eder, sonra UI verir.
// 7a'da 3 saniye sonra otomatik /login'e yönlendirme client-side meta refresh ile.

import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoBlock } from "@/components/auth/LogoBlock";
import { consumeVerificationToken } from "@/lib/actions/auth";
import { ResendVerificationButton } from "@/components/auth/ResendVerificationButton";

export const metadata = {
  title: "Bilbil — E-posta Doğrula",
};

export default async function VerifyEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Özel slug: "sent" — VerifyEmailSent sayfasına yönlendir
  if (token === "sent") redirect("/verify-email/sent");

  const result = await consumeVerificationToken(token);

  if (result.ok) {
    return (
      <div className="auth-card w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center">
        <LogoBlock />
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <svg
            className="h-12 w-12 text-emerald-600"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="display mb-2 text-2xl">Hesabın hazır</h1>
        <p className="mb-6 text-sm text-slate-600">
          E-postanı doğruladık. Şimdi ilk quizini oluşturabilirsin.
        </p>
        <Link
          href="/login?verified=1"
          className="bg-brand hover:bg-brand-dark block w-full rounded-md py-2.5 font-medium text-white shadow-sm transition"
        >
          Devam Et →
        </Link>
        <meta httpEquiv="refresh" content="3;url=/login?verified=1" />
        <p className="mt-4 text-xs text-slate-500">3 saniye içinde otomatik yönlendirileceksin</p>
      </div>
    );
  }

  return (
    <div className="auth-card w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center">
      <LogoBlock />
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-rose-100">
        <svg
          className="h-12 w-12 text-rose-600"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
          />
        </svg>
      </div>
      <h1 className="display mb-2 text-2xl">Bağlantı geçersiz</h1>
      <p className="mb-6 text-sm text-slate-600">
        {result.reason === "expired"
          ? "Bu doğrulama bağlantısı 24 saat içinde kullanılmadığı için süresi doldu."
          : "Bu doğrulama bağlantısı bulunamadı."}
      </p>
      <ResendVerificationButton />
      <p className="mt-4 text-xs text-slate-500">
        Sorun devam ediyor mu?{" "}
        <a href="mailto:destek@bilbil.app" className="text-brand hover:underline">
          Destek
        </a>
      </p>
    </div>
  );
}
