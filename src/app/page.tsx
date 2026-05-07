// Mockup #1B birebir — Demo Centric landing.
// h-dvh single viewport (kullanıcı tercihi: scroll yok). How it Works 3-kart compact grid.

import Link from "next/link";

export const metadata = {
  title: "Bilbil — Sınıf, ekip ve etkinlikler için canlı quiz",
  description: "Saniyeler içinde quiz oluştur. 6 haneli PIN paylaş, oyuncular telefondan katılır.",
};

export default function LandingPage() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-white">
      {/* Top nav */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-brand flex h-7 w-7 items-center justify-center rounded-lg font-bold text-white">
              B
            </div>
            <span className="font-bold">Bilbil</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900">
              Giriş Yap
            </Link>
            <Link
              href="/register"
              className="bg-brand hover:bg-brand-dark rounded-md px-4 py-1.5 text-sm font-medium text-white"
            >
              Kayıt Ol
            </Link>
          </div>
        </div>
      </header>

      {/* Hero — flex-1 ile kalan yüksekliği doldurur */}
      <section className="flex flex-1 items-center justify-center overflow-hidden bg-gradient-to-br from-violet-50 via-white to-amber-50">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-6 px-6 py-4 lg:grid-cols-2 lg:gap-12">
          <div className="min-w-0">
            <span className="bg-brand/10 text-brand mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold tracking-wider uppercase">
              <span className="bg-brand h-1.5 w-1.5 rounded-full" />
              Yeni · Türkçe canlı quiz
            </span>
            <h1 className="display-mega mb-3 text-5xl leading-tight md:text-6xl xl:text-7xl">
              Bilgini <span className="text-brand">hızla</span> sına
            </h1>
            <p className="mb-5 text-base text-slate-600 lg:text-lg">
              PIN ile katıl, telefondan cevapla. Hız + doğruluk = puan. 50 oyuncuya kadar canlı
              oyun.
            </p>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="bg-brand shadow-brand/30 rounded-xl px-6 py-3 text-center font-bold tracking-wider text-white uppercase shadow-lg transition hover:scale-105"
              >
                Quiz Oluştur
              </Link>
              <PinJoinForm />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 sm:gap-4 sm:text-sm">
              <Badge>Ücretsiz</Badge>
              <Badge>Anonim katılım</Badge>
              <Badge>Türkçe</Badge>
            </div>
          </div>

          <div className="hidden justify-center lg:flex">
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* How it Works — 3-kart compact (mockup #1B birebir) */}
      <section className="border-t border-slate-200 bg-slate-50 px-6 py-6 md:py-8">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 text-center md:grid-cols-3">
          <div>
            <div className="text-a-red mb-1 text-2xl font-black">1.</div>
            <p className="mb-1 font-semibold">Quiz oluştur</p>
            <p className="text-xs text-slate-600">Birkaç dakikada sorular hazır</p>
          </div>
          <div>
            <div className="text-a-blue mb-1 text-2xl font-black">2.</div>
            <p className="mb-1 font-semibold">PIN paylaş</p>
            <p className="text-xs text-slate-600">Oyuncular kayıt olmadan girer</p>
          </div>
          <div>
            <div className="text-a-green mb-1 text-2xl font-black">3.</div>
            <p className="mb-1 font-semibold">Canlı oyna</p>
            <p className="text-xs text-slate-600">Hız + bilgi = lider sıralaması</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-6 py-2 text-xs text-slate-500">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <span>© 2026 Bilbil</span>
          <div className="flex gap-4">
            <span>Gizlilik</span>
            <span>KVKK</span>
            <span>İletişim</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1">
      <svg className="h-4 w-4 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
      {children}
    </span>
  );
}

function PinJoinForm() {
  return (
    <form
      action="/play"
      method="get"
      className="flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-3 py-1.5"
    >
      <input
        name="pin"
        type="text"
        inputMode="numeric"
        maxLength={6}
        pattern="[0-9]{6}"
        placeholder="PIN gir"
        className="w-full flex-1 bg-transparent font-mono text-base font-bold placeholder:text-slate-400 focus:outline-none"
      />
      <button
        type="submit"
        className="bg-accent rounded-lg px-3 py-1.5 font-bold text-slate-900 transition hover:scale-105"
      >
        →
      </button>
    </form>
  );
}

// Telefon mockup'ı (mockup'taki canlı oyun ekranı statik snapshot).
function PhoneMockup() {
  return (
    <div className="phone-frame-responsive relative rounded-[36px] bg-black p-3 shadow-2xl">
      <div className="flex h-full flex-col overflow-hidden rounded-[28px] bg-white">
        <div className="flex h-7 items-center justify-center">
          <div className="h-5 w-20 rounded-full bg-black" />
        </div>
        <div className="flex items-center justify-between px-3 pt-2 pb-2">
          <div className="flex items-center gap-1.5">
            <div className="relative h-9 w-9">
              <svg className="h-9 w-9 -rotate-90" viewBox="0 0 36 36">
                <circle cx={18} cy={18} r={15} fill="none" stroke="#e2e8f0" strokeWidth={3} />
                <circle
                  cx={18}
                  cy={18}
                  r={15}
                  fill="none"
                  stroke="#7C3AED"
                  strokeWidth={3}
                  strokeDasharray={94}
                  strokeDashoffset={33}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                13
              </span>
            </div>
            <p className="text-xs font-bold">3/10</p>
          </div>
          <p className="text-brand text-xs font-bold">1.240</p>
        </div>
        <div className="px-3 py-2">
          <p className="display text-sm leading-snug">Türkiye&apos;nin en uzun nehri?</p>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-1.5 p-2">
          <AnswerTile color="bg-a-red" label="Kızılırmak" shape="triangle" />
          <AnswerTile color="bg-a-blue" label="Sakarya" shape="diamond" />
          <AnswerTile color="bg-a-yellow" label="Yeşilırmak" shape="circle" />
          <AnswerTile color="bg-a-green" label="Fırat" shape="square" />
        </div>
      </div>
    </div>
  );
}

function AnswerTile({
  color,
  label,
  shape,
}: {
  color: string;
  label: string;
  shape: "triangle" | "diamond" | "circle" | "square";
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-0.5 rounded-lg ${color} text-xs font-bold text-white`}
    >
      <Shape shape={shape} />
      <span>{label}</span>
    </div>
  );
}

function Shape({ shape }: { shape: "triangle" | "diamond" | "circle" | "square" }) {
  const cls = "h-5 w-5";
  if (shape === "triangle")
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="white">
        <path d="M12 3 L22 21 L2 21 Z" />
      </svg>
    );
  if (shape === "diamond")
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="white">
        <path d="M12 2 L22 12 L12 22 L2 12 Z" />
      </svg>
    );
  if (shape === "circle")
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="white">
        <circle cx={12} cy={12} r={9} />
      </svg>
    );
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="white">
      <rect x={4} y={4} width={16} height={16} rx={1} />
    </svg>
  );
}
