"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

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
 * Her saniye değişiminde scale + fade animasyonu (Framer Motion).
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
  void countdownSec;

  const isPlayer = variant === "player";
  const numberClass = isPlayer
    ? "display-mega text-brand text-9xl"
    : "display-mega text-accent text-[clamp(8rem,30vw,20rem)] leading-none";
  const numberStyle = isPlayer ? undefined : { textShadow: "0 0 40px rgba(245,158,11,0.5)" };

  const wrapperClass = isPlayer
    ? "flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-violet-50 via-white to-violet-50 p-6 text-center"
    : "from-brand-deep via-brand-dark to-brand flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br p-12 text-center text-white";

  return (
    <div className={wrapperClass}>
      <p
        className={`mb-3 text-sm tracking-[0.3em] uppercase ${
          isPlayer ? "text-slate-500" : "text-white/70"
        }`}
      >
        Soru {questionIndex + 1} / {totalQuestions}
      </p>
      <p
        className={`mb-${isPlayer ? "6" : "8"} ${isPlayer ? "text-sm text-slate-600" : "text-2xl font-bold text-white/80"}`}
      >
        Hazır ol!
      </p>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={String(display)}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.4, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className={numberClass}
          style={numberStyle}
        >
          {display}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
