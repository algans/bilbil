// Mockup #2 — PIN giriş (mobile-first).
// Public route — auth gerekmez.

import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Bilbil — Oyuna Katıl" };

export default async function PinEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ pin?: string; error?: string }>;
}) {
  const { pin: prefilledPin, error } = await searchParams;

  // Form submission'ı server'a düşürmek yerine (server action), basit GET form
  // ile redirect yapıyoruz. /play?pin=XXXXXX → bu sayfada validate → /play/XXXXXX'e gönder.
  if (prefilledPin && /^[0-9]{6}$/.test(prefilledPin)) {
    redirect(`/play/${prefilledPin}`);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-brand flex h-7 w-7 items-center justify-center rounded-lg font-bold text-white">
              B
            </div>
            <span className="font-bold">Bilbil</span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-white to-violet-50 px-6 py-10">
        <div className="w-full max-w-md text-center">
          <p className="display text-3xl md:text-4xl">Oyun PIN&apos;i</p>
          <p className="mt-2 mb-8 text-sm text-slate-500">
            Host&apos;un büyük ekranda gösterdiği 6 haneli numarayı gir
          </p>

          {error === "invalid" ? (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              ⚠ Bu PIN bulunamadı veya oyun başlamış. Tekrar dene.
            </div>
          ) : null}

          <form action="/play" method="get" className="space-y-4">
            <input
              name="pin"
              type="text"
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]{6}"
              required
              autoFocus
              placeholder="······"
              className="focus:border-brand block w-full rounded-2xl border-2 border-slate-200 py-5 text-center font-mono text-5xl font-black tracking-[0.3em] tabular-nums focus:outline-none"
            />
            <p className="text-xs text-slate-400">6 hane numerik</p>
            <button
              type="submit"
              className="bg-brand shadow-brand/30 w-full rounded-2xl py-4 font-bold tracking-wider text-white uppercase shadow-lg transition active:scale-95"
            >
              Devam →
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
