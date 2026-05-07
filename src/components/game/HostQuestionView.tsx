"use client";

import { TimerRing } from "./TimerRing";
import { AnswerShapeIcon } from "./AnswerShapeIcon";
import { styleForPosition } from "@/lib/game/answer-style";
import type { QuestionOpenedPayload } from "@/lib/socket-events";

interface Props {
  question: QuestionOpenedPayload;
  answeredCount: number;
  totalPlayers: number;
}

/**
 * Mockup #16 birebir — Host büyük ekran. Mor gradient, dev tipografi,
 * timer ring sağ üst, soru ortada büyük, 4 şık alt grid'de.
 * Doğru cevap GİZLİ (server da göndermez).
 */
export function HostQuestionView({ question, answeredCount, totalPlayers }: Props) {
  const totalMs = question.timeLimitSec * 1000;

  return (
    <div className="from-brand-deep via-brand-dark to-brand flex min-h-dvh flex-col bg-gradient-to-br p-6 text-white md:p-10">
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs tracking-wider text-white/60 uppercase">Soru</p>
          <p className="display text-2xl md:text-3xl">
            {question.questionIndex + 1} / {question.totalQuestions}
          </p>
        </div>

        <TimerRing
          deadlineAtMs={question.deadlineAtMs}
          totalMs={totalMs}
          size={80}
          strokeColor="#F59E0B"
          trackColor="rgba(255,255,255,0.15)"
          numberClass="display text-2xl text-white"
        />

        <div className="text-right">
          <p className="text-xs tracking-wider text-white/60 uppercase">Cevaplayan</p>
          <p className="display text-2xl md:text-3xl">
            <span className="text-accent">{answeredCount}</span> / {totalPlayers}
          </p>
        </div>
      </div>

      {/* Question */}
      <div className="flex flex-1 items-center justify-center px-4 text-center md:px-12">
        <p className="display-mega text-[clamp(2rem,5vw,4rem)] leading-tight">{question.prompt}</p>
      </div>

      {/* 4 options grid */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:gap-4">
        {question.options.map((opt) => {
          const style = styleForPosition(opt.position);
          return (
            <div
              key={opt.id}
              className={`${style.bgClass} flex items-center gap-3 rounded-2xl px-4 py-4 shadow-lg md:gap-4 md:px-6`}
            >
              <AnswerShapeIcon
                shape={style.shape}
                className="h-8 w-8 flex-shrink-0 md:h-12 md:w-12"
              />
              <span className="display text-xl md:text-3xl">{opt.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
