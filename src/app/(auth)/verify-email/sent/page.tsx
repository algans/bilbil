// Kayıt sonrası "e-postanı kontrol et" sayfası.
// Mockup'ta bu özel bir ekran değil — auth-card şablonunu kullandık.

import Link from "next/link";
import { LogoBlock } from "@/components/auth/LogoBlock";

export const metadata = {
  title: "Bilbil — E-postanı Kontrol Et",
};

export default async function VerifyEmailSentPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return (
    <div className="auth-card w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center">
      <LogoBlock />
      <div className="bg-brand/10 mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full">
        <svg
          className="text-brand h-12 w-12"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
          />
        </svg>
      </div>
      <h1 className="display mb-2 text-2xl">E-postanı kontrol et</h1>
      <p className="mb-2 text-sm text-slate-600">
        Doğrulama bağlantısını gönderdik
        {email ? <strong className="mt-1 block">{email}</strong> : null}
      </p>
      <p className="mb-6 text-xs text-slate-500">
        Bağlantıya tıklayarak hesabını aktifleştir. 5 dk içinde gelmezse spam&apos;a bak.
      </p>
      <Link
        href="/login"
        className="block w-full rounded-md border border-slate-300 py-2.5 text-sm font-medium hover:bg-slate-50"
      >
        Giriş&apos;e dön
      </Link>
    </div>
  );
}
