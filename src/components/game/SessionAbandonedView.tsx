"use client";

import Link from "next/link";

interface Props {
  /** Player için "/play", host için "/dashboard". */
  ctaHref: string;
  ctaLabel: string;
  reason?: "host_gone" | "lobby_idle" | "cancelled";
  variant?: "host" | "player";
}

/**
 * Mockup #20 — Oyun sonlandırıldı state'i.
 * Host disconnect 2dk grace bittiğinde veya lobby idle 30dk dolduğunda gösterilir.
 */
export function SessionAbandonedView({
  ctaHref,
  ctaLabel,
  reason = "host_gone",
  variant = "player",
}: Props) {
  const titles: Record<NonNullable<Props["reason"]>, string> = {
    host_gone: "Oyun bitirildi",
    lobby_idle: "Oyun zaman aşımına uğradı",
    cancelled: "Oyun iptal edildi",
  };
  const subtitles: Record<NonNullable<Props["reason"]>, string> = {
    host_gone: "Host bağlantısı koptu (2 dk timeout)",
    lobby_idle: "Lobby 30 dakika boyunca açık kaldığı için kapatıldı",
    cancelled: "Host oyunu sonlandırdı",
  };

  if (variant === "host") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-12 text-center text-white">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border-2 border-amber-400 bg-amber-500/20">
          <svg
            className="h-12 w-12 text-amber-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <p className="display-mega mb-3 text-4xl">{titles[reason]}</p>
        <p className="mb-2 max-w-xl text-lg text-white/70">{subtitles[reason]}</p>
        <p className="mb-8 max-w-xl text-sm text-white/50">
          Mevcut oyuncular için kısmi sonuçlar saklanmaya çalışıldı.
        </p>
        <Link
          href={ctaHref}
          className="bg-brand rounded-xl px-6 py-3 font-black tracking-wider text-white uppercase shadow-lg transition hover:scale-105"
        >
          {ctaLabel}
        </Link>
      </div>
    );
  }

  // Player varyantı — dark slate (mockup error state'leri ile uyumlu)
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 text-center text-white">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-amber-400 bg-amber-500/20">
        <svg
          className="h-10 w-10 text-amber-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
      </div>
      <p className="display-mega mb-3 text-3xl">{titles[reason]}</p>
      <p className="mb-8 max-w-sm text-sm text-white/70">{subtitles[reason]}</p>
      <Link
        href={ctaHref}
        className="bg-brand rounded-xl px-6 py-3 font-black tracking-wider text-white uppercase shadow-lg transition hover:scale-105"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
