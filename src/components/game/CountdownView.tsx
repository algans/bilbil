"use client";

import { useEffect, useState } from "react";

interface Props {
  /** Server "soru ne zaman açılacak" timestamp (ms epoch). */
  opensAtMs: number;
  /** Toplam countdown süresi (saniye), genelde 4. */
  countdownSec: number;
  /** Mevcut soru index'i (1-based UI). */
  questionIndex: number;
  totalQuestions: number;
  /** Light theme (player) veya dark/host theme. */
  variant?: "host" | "player";
}

/**
 * 3-2-1 countdown ekranı. Server "opensAtMs" timestamp'iyle senkron çalışır.
 * Host'ta büyük dramatic görünüm, player'da kompakt.
 */
export function CountdownView({
  opensAtMs,
  countdownSec,
  questionIndex,
  totalQuestions,
  variant = "host",
}: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  const remainingMs = Math.max(0, opensAtMs - now);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const display = remainingSec > 0 ? remainingSec : "Hazır!";
  void countdownSec; // toplam süreyi şu an UI'da kullanmıyoruz

  if (variant === "player") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-violet-50 via-white to-violet-50 p-6 text-center">
        <p className="mb-3 text-sm tracking-[0.3em] text-slate-500 uppercase">
          Soru {questionIndex + 1} / {totalQuestions}
        </p>
        <p className="mb-6 text-sm text-slate-600">Hazır ol!</p>
        <div className="display-mega text-brand text-9xl">{display}</div>
      </div>
    );
  }

  return (
    <div className="from-brand-deep via-brand-dark to-brand flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br p-12 text-center text-white">
      <p className="mb-3 text-sm tracking-[0.3em] text-white/70 uppercase">
        Soru {questionIndex + 1} / {totalQuestions}
      </p>
      <p className="mb-8 text-2xl font-bold text-white/80">Hazır ol!</p>
      <div
        className="display-mega text-accent text-[clamp(8rem,30vw,20rem)] leading-none"
        style={{ textShadow: "0 0 40px rgba(245,158,11,0.5)" }}
      >
        {display}
      </div>
    </div>
  );
}
