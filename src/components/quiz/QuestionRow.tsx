"use client";

// Mockup #9 Variant A — tek soru kartı.
// 4 sabit cevap rengi: kırmızı üçgen / mavi elmas / sarı daire / yeşil kare.

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { QuestionInput } from "@/lib/validation/quiz";
import { OPTIONS_PER_QUESTION } from "@/lib/validation/quiz";

interface Props {
  id: string;
  index: number;
  question: QuestionInput;
  onChange: (update: Partial<QuestionInput>) => void;
  onRemove?: () => void;
  error?: string;
}

// Tailwind v4 dinamik class'ları scan etmez — her renk için açık class set'i.
const ANSWER_META = [
  {
    icon: TriangleIcon,
    name: "Kırmızı üçgen",
    iconColor: "text-answer-red",
    accent: "accent-answer-red",
    bgSoft: "bg-answer-red/10",
    borderSoft: "border-answer-red/30",
    borderActive: "border-answer-red",
  },
  {
    icon: DiamondIcon,
    name: "Mavi elmas",
    iconColor: "text-answer-blue",
    accent: "accent-answer-blue",
    bgSoft: "bg-answer-blue/10",
    borderSoft: "border-answer-blue/30",
    borderActive: "border-answer-blue",
  },
  {
    icon: CircleIcon,
    name: "Sarı daire",
    iconColor: "text-answer-yellow",
    accent: "accent-answer-yellow",
    bgSoft: "bg-answer-yellow/10",
    borderSoft: "border-answer-yellow/30",
    borderActive: "border-answer-yellow",
  },
  {
    icon: SquareIcon,
    name: "Yeşil kare",
    iconColor: "text-answer-green",
    accent: "accent-answer-green",
    bgSoft: "bg-answer-green/10",
    borderSoft: "border-answer-green/30",
    borderActive: "border-answer-green",
  },
] as const;

const TIME_OPTIONS = [10, 15, 20, 30, 60, 90, 120];

export function QuestionRow({ id, index, question, onChange, onRemove, error }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  function setOption(optIdx: number, update: { text?: string; isCorrect?: boolean }) {
    const newOptions = question.options.map((o, i) => {
      if (i === optIdx) return { ...o, ...update };
      // Tek doğru cevap kuralı: bu seçim doğru olarak işaretlendiyse diğerlerini false yap.
      if (update.isCorrect === true) return { ...o, isCorrect: false };
      return o;
    });
    onChange({ options: newOptions });
  }

  const correctIdx = question.options.findIndex((o) => o.isCorrect);

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`question-card-${index}`}
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Soruyu sürükle (sıra ${index + 1})`}
          className="flex cursor-grab items-center gap-2 text-slate-400 active:cursor-grabbing"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <circle cx={7} cy={5} r={1.5} />
            <circle cx={13} cy={5} r={1.5} />
            <circle cx={7} cy={10} r={1.5} />
            <circle cx={13} cy={10} r={1.5} />
            <circle cx={7} cy={15} r={1.5} />
            <circle cx={13} cy={15} r={1.5} />
          </svg>
          <span className="text-xs font-semibold text-slate-500">SORU {index + 1}</span>
        </button>
        <div className="flex items-center gap-2">
          <select
            value={question.timeLimitSec}
            onChange={(e) => onChange({ timeLimitSec: Number(e.target.value) })}
            className="rounded border border-slate-200 px-2 py-1 text-xs"
          >
            {TIME_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}s
              </option>
            ))}
          </select>
          {onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              aria-label="Soruyu sil"
              className="text-slate-400 hover:text-rose-600"
            >
              🗑
            </button>
          ) : null}
        </div>
      </div>

      <input
        value={question.prompt}
        onChange={(e) => onChange({ prompt: e.target.value })}
        placeholder="Soru metni..."
        className="focus:border-brand mb-3 w-full border-b border-slate-200 px-0 py-1 text-base font-medium focus:outline-none"
      />
      {error ? <p className="-mt-2 mb-2 text-xs text-rose-600">{error}</p> : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {Array.from({ length: OPTIONS_PER_QUESTION }, (_, i) => i).map((i) => {
          const meta = ANSWER_META[i];
          const opt = question.options[i];
          const isCorrect = opt?.isCorrect;
          return (
            <label
              key={i}
              className={`flex items-center gap-2 rounded-lg p-2 transition ${meta.bgSoft} ${
                isCorrect ? `border-2 ${meta.borderActive}` : `border ${meta.borderSoft}`
              }`}
            >
              <input
                type="radio"
                name={`q-${id}-correct`}
                checked={!!isCorrect}
                onChange={() => setOption(i, { isCorrect: true })}
                aria-label={`${meta.name} - doğru cevap işaretle`}
                className={meta.accent}
              />
              <meta.icon className={`h-4 w-4 flex-shrink-0 ${meta.iconColor}`} />
              <input
                value={opt?.text ?? ""}
                onChange={(e) => setOption(i, { text: e.target.value })}
                placeholder={`Şık ${i + 1}`}
                className={`flex-1 bg-transparent text-sm focus:outline-none ${isCorrect ? "font-semibold" : ""}`}
              />
            </label>
          );
        })}
      </div>
      {correctIdx >= 0 && question.options[correctIdx]?.text ? (
        <p className="mt-2 text-xs text-slate-500">✓ Doğru cevabı işaretledin</p>
      ) : (
        <p className="mt-2 text-xs text-amber-600">
          ! Doğru cevabı şıkkın yanındaki radyo ile işaretle
        </p>
      )}
    </div>
  );
}

// Mockup'taki 4 sabit cevap şekli.
function TriangleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3 L22 21 L2 21 Z" />
    </svg>
  );
}
function DiamondIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2 L22 12 L12 22 L2 12 Z" />
    </svg>
  );
}
function CircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx={12} cy={12} r={9} />
    </svg>
  );
}
function SquareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x={4} y={4} width={16} height={16} rx={1} />
    </svg>
  );
}
