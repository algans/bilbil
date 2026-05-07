"use client";

import { useEffect, useState } from "react";

interface Props {
  /** Server-authoritative deadline (ms epoch). */
  deadlineAtMs: number;
  /** Toplam soru süresi (ms) — ring oranı için. */
  totalMs: number;
  /** Ring boyutu (piksel) — default 48 (w-12 h-12). */
  size?: number;
  /** Ring rengi (Tailwind'te kullanılan stroke için #hex). */
  strokeColor?: string;
  /** Arka plan ring rengi. */
  trackColor?: string;
  /** Sayı text'i için class. */
  numberClass?: string;
  /** Süre dolunca callback. */
  onExpire?: () => void;
}

const CIRCUMFERENCE = 94; // 2 * π * 15 ≈ 94.25, mockup'tan
const RADIUS = 15;

export function TimerRing({
  deadlineAtMs,
  totalMs,
  size = 48,
  strokeColor = "#7C3AED",
  trackColor = "#e2e8f0",
  numberClass = "text-sm font-bold",
  onExpire,
}: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  const remainingMs = Math.max(0, deadlineAtMs - now);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const ratio = totalMs > 0 ? remainingMs / totalMs : 0;
  const dashOffset = CIRCUMFERENCE * (1 - ratio);

  useEffect(() => {
    if (remainingMs <= 0 && onExpire) onExpire();
  }, [remainingMs, onExpire]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size} viewBox="0 0 36 36" aria-hidden="true">
        <circle cx="18" cy="18" r={RADIUS} fill="none" stroke={trackColor} strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r={RADIUS}
          fill="none"
          stroke={strokeColor}
          strokeWidth="3"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 200ms linear" }}
        />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center ${numberClass}`}>
        {remainingSec}
      </span>
    </div>
  );
}
