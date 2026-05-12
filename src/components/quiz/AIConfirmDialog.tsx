"use client";

// Kaydetmeden önce 2. onay dialog'u.
// Plan'da kullanıcı isteği: "veriyi yazmadan önce kullanıcıdan son bir onay alalım".

import { AnimatePresence, motion } from "framer-motion";
import type { QuizFormInput } from "@/lib/validation/quiz";

interface AIConfirmDialogProps {
  isOpen: boolean;
  quiz: QuizFormInput;
  isSaving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function AIConfirmDialog({
  isOpen,
  quiz,
  isSaving,
  onCancel,
  onConfirm,
}: AIConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-sm"
            aria-hidden="true"
            onClick={!isSaving ? onCancel : undefined}
          />
          <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="ai-confirm-title"
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="pointer-events-auto w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
            >
              <h3
                id="ai-confirm-title"
                className="display mb-2 text-lg font-semibold text-slate-900"
              >
                Quiz&apos;i kaydet?
              </h3>
              <p className="mb-1 text-sm text-slate-700">
                Başlık: <span className="font-medium">{quiz.title}</span>
              </p>
              <p className="text-sm text-slate-500">
                {quiz.questions.length} soru veritabanına yazılacak ve yayınlanacak.
              </p>
              {quiz.description && (
                <p className="mt-2 text-xs text-slate-500 italic">
                  &ldquo;{quiz.description}&rdquo;
                </p>
              )}

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isSaving}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isSaving}
                  className="bg-brand hover:bg-brand-dark rounded-md px-4 py-1.5 text-sm font-medium text-white shadow-sm transition disabled:opacity-50"
                >
                  {isSaving ? "Kaydediliyor..." : "Evet, kaydet"}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
