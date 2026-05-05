"use client";

// Mockup #4 register'daki 4 segmentli strength bar.
// Kullanıcı şifre yazarken canlı update.

import { passwordStrength } from "@/lib/validation/auth";

interface Props {
  password: string;
}

export function PasswordStrengthMeter({ password }: Props) {
  const s = passwordStrength(password);
  if (!password) return null;

  // Renk seçimi: weak=rose, medium=amber, strong=emerald
  const fillClass =
    s.level === "weak" ? "bg-rose-400" : s.level === "medium" ? "bg-amber-400" : "bg-emerald-400";
  const labelClass =
    s.level === "weak"
      ? "text-rose-600"
      : s.level === "medium"
        ? "text-amber-600"
        : "text-emerald-600";

  return (
    <div className="mt-2 flex items-center gap-1.5">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full ${i < s.score ? fillClass : "bg-slate-200"}`}
        />
      ))}
      <span className={`ml-1 text-xs font-semibold ${labelClass}`}>{s.label}</span>
    </div>
  );
}
