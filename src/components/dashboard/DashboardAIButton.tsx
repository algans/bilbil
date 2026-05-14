"use client";

// Dashboard'da "AI ile Quiz Oluştur" butonu + modal toggle.
// Server Component olan dashboard sayfasında client island olarak render edilir.

import { useState } from "react";
import { AIQuizModal } from "@/components/quiz/AIQuizModal";

interface DashboardAIButtonProps {
  /** Stil varyantı: "primary" dolu mor; "secondary" outline (empty state için). */
  variant?: "primary" | "secondary";
  /** Boyut: header'da kompakt, empty state'te biraz daha büyük. */
  size?: "sm" | "md";
}

export function DashboardAIButton({ variant = "primary", size = "sm" }: DashboardAIButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const padding = size === "sm" ? "px-3.5 py-2" : "px-5 py-2.5";
  const textSize = size === "sm" ? "text-sm" : "text-sm";

  const base =
    variant === "primary"
      ? "bg-gradient-to-r from-brand to-brand-dark hover:from-brand-dark hover:to-brand-deep text-white shadow-sm"
      : "border border-brand/40 text-brand hover:bg-brand/5";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-md font-medium transition ${padding} ${textSize} ${base}`}
      >
        <span aria-hidden="true">✨</span>
        AI Asistan
      </button>
      <AIQuizModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
