"use client";

import { useState } from "react";
import { TimerRing } from "./TimerRing";
import { AnswerShapeIcon } from "./AnswerShapeIcon";
import { styleForPosition } from "@/lib/game/answer-style";
import type { QuestionOpenedPayload } from "@/lib/socket-events";

interface Props {
  question: QuestionOpenedPayload;
  nickname: string;
  totalScore: number;
  onSubmit: (optionId: string) => void;
}

/**
 * Mockup #19 Varyant B (Dengeli) — birebir.
 * Mobile-first, light tema, timer ring + 4-buton grid (renk + şekil).
 * Cevap seçilince lock-in (değiştirilemez), buton seçili olarak parlar.
 */
export function PlayerQuestionView({ question, nickname, totalScore, onSubmit }: Props) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  const handleSelect = (optionId: string) => {
    if (selectedOptionId !== null) return; // lock-in
    setSelectedOptionId(optionId);
    onSubmit(optionId);
  };

  const totalMs = question.timeLimitSec * 1000;

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      {/* Top bar: timer ring + score + Q idx */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <TimerRing deadlineAtMs={question.deadlineAtMs} totalMs={totalMs} size={48} />
          <div>
            <p className="text-xs font-medium text-slate-500">Soru</p>
            <p className="text-sm font-bold">
              {question.questionIndex + 1} / {question.totalQuestions}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="max-w-[140px] truncate text-xs font-medium text-slate-500">{nickname}</p>
          <p className="text-brand text-sm font-bold">{totalScore.toLocaleString("tr-TR")} puan</p>
        </div>
      </div>

      {/* Question */}
      <div className="px-5 py-5">
        <p className="display text-xl leading-snug text-slate-900 sm:text-2xl">{question.prompt}</p>
      </div>

      {/* 4 button grid */}
      <div className="grid flex-1 grid-cols-2 content-end gap-2.5 p-4">
        {question.options.map((opt) => {
          const style = styleForPosition(opt.position);
          const isSelected = selectedOptionId === opt.id;
          const isDimmed = selectedOptionId !== null && !isSelected;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelect(opt.id)}
              disabled={selectedOptionId !== null}
              className={`${style.bgClass} flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-2xl py-4 font-bold text-white shadow-lg transition active:scale-95 ${
                isSelected ? "ring-offset-brand scale-105 ring-4 ring-white ring-offset-4" : ""
              } ${isDimmed ? "opacity-30" : ""} disabled:cursor-not-allowed`}
              data-testid={`answer-option-${opt.position}`}
              aria-label={`${style.label} şıkkı: ${opt.text}`}
            >
              <AnswerShapeIcon shape={style.shape} className="h-8 w-8" />
              <span className="px-2 text-center text-base">{opt.text}</span>
            </button>
          );
        })}
      </div>

      <div className="px-4 pb-6 text-center">
        <p className="text-xs text-slate-500">
          {selectedOptionId === null ? "Bir cevap seç · değiştirilemez" : "Cevabın gönderildi!"}
        </p>
      </div>
    </div>
  );
}
