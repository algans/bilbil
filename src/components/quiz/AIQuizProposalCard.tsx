"use client";

// AI proposal preview card — chat'in altında sticky.
// İlk 3 soru gösterilir, gerisi "daha fazla" ile expand.
// "Onayla & Kaydet" → AIConfirmDialog → createQuizAction (mevcut server action).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createQuizAction } from "@/lib/actions/quiz";
import type { QuizFormInput } from "@/lib/validation/quiz";
import { AIConfirmDialog } from "@/components/quiz/AIConfirmDialog";

interface AIQuizProposalCardProps {
  quiz: QuizFormInput;
  onClose: () => void;
  onError: (message: string) => void;
}

export function AIQuizProposalCard({ quiz, onClose, onError }: AIQuizProposalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const visibleQuestions = expanded ? quiz.questions : quiz.questions.slice(0, 3);

  async function handleConfirm() {
    setIsSaving(true);
    try {
      const result = await createQuizAction(quiz);
      if (result.ok) {
        onClose();
        router.push(`/quizzes/${result.id}`);
      } else {
        onError(result.message ?? "Kayıt sırasında bir hata oluştu");
        setShowConfirm(false);
      }
    } catch {
      onError("Sunucuya ulaşılamadı");
      setShowConfirm(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="border-t border-slate-200 bg-gradient-to-br from-slate-50 to-white px-5 py-3"
      >
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="mb-0.5 text-xs font-medium text-emerald-700">
              <span aria-hidden="true">✓</span> Hazır quiz
            </p>
            <p className="truncate font-semibold text-slate-900">{quiz.title}</p>
            {quiz.description && (
              <p className="mt-0.5 line-clamp-1 text-xs text-slate-600">{quiz.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={isSaving}
            className="bg-brand hover:bg-brand-dark shrink-0 rounded-md px-3 py-1.5 text-xs font-medium text-white shadow-sm transition disabled:opacity-50"
          >
            Onayla &amp; Kaydet
          </button>
        </div>

        <p className="mb-1.5 text-xs text-slate-500">{quiz.questions.length} soru</p>

        <ul className="space-y-1">
          {visibleQuestions.map((q, i) => (
            <li key={i} className="text-xs leading-relaxed text-slate-700">
              <span className="font-medium text-slate-900">{i + 1}.</span> {q.prompt}
              <span className="ml-1 text-slate-400">({q.timeLimitSec}s)</span>
            </li>
          ))}
        </ul>

        {quiz.questions.length > 3 && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-brand mt-2 text-xs font-medium hover:underline"
          >
            {expanded ? "Gizle" : `${quiz.questions.length - 3} soru daha göster ↓`}
          </button>
        )}

        <p className="mt-2 text-[11px] text-slate-400">
          Değişiklik için aşağıya yaz: &quot;3. soruyu kolaylaştır&quot;, &quot;süreyi 30 yap&quot;
          vb.
        </p>
      </motion.div>

      <AIConfirmDialog
        isOpen={showConfirm}
        quiz={quiz}
        isSaving={isSaving}
        onCancel={() => setShowConfirm(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
}
