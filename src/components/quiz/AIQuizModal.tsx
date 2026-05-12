"use client";

// AI Quiz Modal — Framer Motion backdrop + slide-up card.
// Header: brand mor gradient, "✨ AI ile Quiz Oluştur"
// Body: AIChatBody (sohbet + proposal preview)
// Tek girdi noktası: Dashboard → DashboardAIButton → bu modal.

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { AIChatBody } from "@/components/quiz/AIChatBody";

interface AIQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIQuizModal({ isOpen, onClose }: AIQuizModalProps) {
  // ESC tuşu ile kapama
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    // Body scroll kilitle
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
            aria-hidden="true"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-quiz-modal-title"
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl md:inset-auto md:top-1/2 md:left-1/2 md:max-h-[80vh] md:-translate-x-1/2 md:-translate-y-1/2"
          >
            <header className="from-brand-deep to-brand flex items-center justify-between bg-gradient-to-r px-5 py-3.5 text-white">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="text-lg">
                  ✨
                </span>
                <h2 id="ai-quiz-modal-title" className="text-base font-semibold">
                  AI ile Quiz Oluştur
                </h2>
              </div>
              <button
                onClick={onClose}
                type="button"
                aria-label="Kapat"
                className="rounded-full p-1 text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <svg
                  width={20}
                  height={20}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1={18} y1={6} x2={6} y2={18} />
                  <line x1={6} y1={6} x2={18} y2={18} />
                </svg>
              </button>
            </header>

            <div className="flex flex-1 flex-col overflow-hidden">
              <AIChatBody onClose={onClose} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
