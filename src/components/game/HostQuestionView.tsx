"use client";

import { motion } from "framer-motion";
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

      {/* Question — overflow scroll for very long prompts */}
      <motion.div
        key={question.questionId}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-2 text-center md:px-12"
      >
        <p className="display-mega text-[clamp(1.75rem,4.5vw,3.5rem)] leading-tight">
          {question.prompt}
        </p>
      </motion.div>

      {/* 4 options grid — staggered */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:mt-6 md:gap-4">
        {question.options.map((opt, idx) => {
          const style = styleForPosition(opt.position);
          return (
            <motion.div
              key={opt.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 + idx * 0.06, ease: "easeOut" }}
              className={`${style.bgClass} flex items-center gap-3 rounded-2xl px-4 py-4 shadow-lg md:gap-4 md:px-6`}
            >
              <AnswerShapeIcon
                shape={style.shape}
                className="h-8 w-8 flex-shrink-0 md:h-12 md:w-12"
              />
              <span className="display text-xl md:text-3xl">{opt.text}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
