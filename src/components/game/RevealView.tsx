"use client";

import { motion } from "framer-motion";
import { AnswerShapeIcon } from "./AnswerShapeIcon";
import { styleForPosition } from "@/lib/game/answer-style";
import type { RevealPayload } from "@/lib/socket-events";

interface HostProps {
  variant: "host";
  reveal: RevealPayload;
  onAdvance: () => void;
}

interface PlayerProps {
  variant: "player";
  reveal: RevealPayload;
  nickname: string;
  totalScore: number;
}

type Props = HostProps | PlayerProps;

/** Mockup #17 (host) ve mockup #20 (player) reveal ekranları. */
export function RevealView(props: Props) {
  if (props.variant === "host") return <HostReveal {...props} />;
  return <PlayerReveal {...props} />;
}

function HostReveal({ reveal, onAdvance }: HostProps) {
  const totalAnswers = Object.values(reveal.perOptionCounts).reduce((s, c) => s + c, 0);

  return (
    <div className="via-brand-dark to-brand flex min-h-dvh flex-col bg-gradient-to-br from-emerald-900 p-6 text-white md:p-10">
      <div className="mb-4 flex items-center justify-between">
        <p className="display text-2xl">
          Soru {reveal.questionIndex + 1} / {reveal.totalQuestions} ·{" "}
          <span className="text-emerald-300">Cevap</span>
        </p>
        <button
          type="button"
          onClick={onAdvance}
          className="text-brand rounded-xl bg-white px-6 py-2.5 font-black tracking-wider uppercase shadow-lg transition hover:scale-105"
          data-testid="host-advance-from-reveal"
        >
          {reveal.isLast ? "Podyum →" : "Leaderboard →"}
        </button>
      </div>

      <div className="px-4 pt-2 pb-4">
        <p className="display text-2xl leading-tight text-white/80 md:text-3xl">{reveal.prompt}</p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        {reveal.options.map((opt) => {
          const style = styleForPosition(opt.position);
          const isCorrect = opt.id === reveal.correctOptionId;
          return (
            <div
              key={opt.id}
              className={`${style.bgClass} flex items-center gap-3 rounded-2xl px-5 py-3 shadow ${
                isCorrect
                  ? "ring-offset-brand-dark shadow-2xl ring-4 shadow-emerald-500/50 ring-emerald-300 ring-offset-2"
                  : "opacity-40"
              }`}
            >
              <AnswerShapeIcon shape={style.shape} className="h-9 w-9 flex-shrink-0" />
              <span className="display text-xl">{opt.text}</span>
              {isCorrect && (
                <div className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-white">
                  <svg
                    className="h-6 w-6 text-emerald-600"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-auto">
        <p className="mb-2 text-xs tracking-wider text-white/60 uppercase">
          Cevap dağılımı ({totalAnswers} oyuncu)
        </p>
        <div className="grid grid-cols-4 gap-2">
          {reveal.options.map((opt) => {
            const style = styleForPosition(opt.position);
            const count = reveal.perOptionCounts[opt.id] ?? 0;
            const max = Math.max(1, ...Object.values(reveal.perOptionCounts));
            const heightPct = max > 0 ? (count / max) * 100 : 0;
            const isCorrect = opt.id === reveal.correctOptionId;
            return (
              <div key={opt.id}>
                <div
                  className={`h-24 ${style.bgSoftClass} relative overflow-hidden rounded-xl ${
                    isCorrect ? "ring-2 ring-emerald-300" : ""
                  }`}
                >
                  <div
                    className={`absolute right-0 bottom-0 left-0 ${style.bgClass} transition-all duration-500`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <p
                  className={`mt-1 text-center text-sm font-bold ${
                    isCorrect ? "text-emerald-300" : ""
                  }`}
                >
                  {count} {style.glyph} {isCorrect ? "✓" : ""}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PlayerReveal({ reveal, nickname, totalScore }: PlayerProps) {
  const myAnswer = reveal.myAnswer;
  const isCorrect = myAnswer?.isCorrect === true;
  const optionsByPos = reveal.options.slice().sort((a, b) => a.position - b.position);

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 pt-4 pb-3">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Soru {reveal.questionIndex + 1} / {reveal.totalQuestions}
          </p>
          <p className="text-sm font-bold">Cevap zamanı</p>
        </div>
        <div className="text-right">
          <p className="max-w-[140px] truncate text-xs font-medium text-slate-500">{nickname}</p>
          <p className="text-brand text-sm font-bold">{totalScore.toLocaleString("tr-TR")} puan</p>
        </div>
      </div>

      <div className="px-5 py-5">
        <p className="display text-lg leading-snug text-slate-900">{reveal.prompt}</p>
      </div>

      {myAnswer && (
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 16 }}
          className={`mx-4 my-2 rounded-2xl p-5 text-center text-white ${
            isCorrect
              ? "bg-gradient-to-br from-emerald-500 to-emerald-600"
              : myAnswer.optionId === null
                ? "bg-gradient-to-br from-slate-500 to-slate-600"
                : "bg-gradient-to-br from-rose-500 to-rose-600"
          }`}
          data-testid="player-reveal-banner"
        >
          <p className="display mb-1 text-3xl">
            {isCorrect ? "Doğru! 🎉" : myAnswer.optionId === null ? "Süre doldu" : "Yanlış"}
          </p>
          <p className="text-sm opacity-90">
            {isCorrect
              ? `+${myAnswer.pointsAwarded} puan kazandın`
              : myAnswer.optionId === null
                ? "Bu sefer cevap veremedin"
                : "Bir dahaki sefere!"}
          </p>
        </motion.div>
      )}

      <div className="mt-auto grid grid-cols-2 gap-2.5 p-4">
        {optionsByPos.map((opt) => {
          const style = styleForPosition(opt.position);
          const correct = opt.id === reveal.correctOptionId;
          return (
            <div
              key={opt.id}
              className={`${style.bgClass} flex min-h-[80px] flex-col items-center justify-center gap-1 rounded-2xl py-4 font-bold text-white ${
                correct ? "shadow-lg ring-4 ring-emerald-300" : "opacity-40"
              }`}
            >
              <AnswerShapeIcon shape={style.shape} className="h-7 w-7" />
              <span className="px-2 text-center text-sm">{opt.text}</span>
              {correct && <span className="text-xs">✓</span>}
            </div>
          );
        })}
      </div>

      <div className="px-4 pb-6 text-center">
        <p className="text-xs text-slate-500">Host sıralamayı gösteriyor…</p>
      </div>
    </div>
  );
}
