"use client";

// Mockup #9 Variant A — Long Form Drag-Drop quiz creation/edit.
// 4 sabit cevap rengi (kırmızı üçgen / mavi elmas / sarı daire / yeşil kare).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { QuestionRow } from "./QuestionRow";
import {
  DEFAULT_TIME_LIMIT_SEC,
  OPTIONS_PER_QUESTION,
  quizFormSchema,
  type QuizFormInput,
} from "@/lib/validation/quiz";
import { createQuizAction, updateQuizAction } from "@/lib/actions/quiz";

interface Props {
  mode: "create" | "edit";
  initial?: QuizFormInput & { id: string };
  onCancelHref?: string;
}

let tempIdCounter = 0;
const tempId = () => `tmp_${++tempIdCounter}`;

function emptyQuestion(): QuizFormInput["questions"][number] & { _key: string } {
  return {
    _key: tempId(),
    prompt: "",
    timeLimitSec: DEFAULT_TIME_LIMIT_SEC,
    options: Array.from({ length: OPTIONS_PER_QUESTION }, (_, i) => ({
      text: "",
      isCorrect: i === 0,
      position: i,
    })),
  };
}

type FormQuestion = QuizFormInput["questions"][number] & { _key: string };

export function QuizForm({ mode, initial, onCancelHref = "/dashboard" }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [questions, setQuestions] = useState<FormQuestion[]>(() =>
    initial?.questions.length
      ? initial.questions.map((q) => ({ ...q, _key: q.id ?? tempId() }))
      : [emptyQuestion()]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setQuestions((qs) => {
      const oldIdx = qs.findIndex((q) => q._key === active.id);
      const newIdx = qs.findIndex((q) => q._key === over.id);
      if (oldIdx < 0 || newIdx < 0) return qs;
      return arrayMove(qs, oldIdx, newIdx);
    });
  }

  function addQuestion() {
    setQuestions((qs) => [...qs, emptyQuestion()]);
  }

  function updateQuestion(key: string, update: Partial<FormQuestion>) {
    setQuestions((qs) => qs.map((q) => (q._key === key ? { ...q, ...update } : q)));
  }

  function removeQuestion(key: string) {
    setQuestions((qs) => (qs.length > 1 ? qs.filter((q) => q._key !== key) : qs));
  }

  function handleSubmit() {
    setServerError(null);
    setFieldErrors({});
    const payload: QuizFormInput = {
      title,
      description: description || null,
      questions: questions.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        timeLimitSec: q.timeLimitSec,
        options: q.options.map((o, i) => ({
          id: o.id,
          text: o.text,
          isCorrect: o.isCorrect,
          position: i,
        })),
      })),
    };

    const parsed = quizFormSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors as Record<string, string[]>);
      setServerError(
        "Lütfen tüm soruları ve şıkları doldurun, her soruda bir doğru cevap işaretleyin."
      );
      return;
    }

    startTransition(async () => {
      if (mode === "create") {
        const result = await createQuizAction(parsed.data);
        if (!result.ok) {
          setServerError(result.message);
          if (result.errors) setFieldErrors(result.errors);
          return;
        }
        router.push(`/quizzes/${result.id}`);
      } else if (initial?.id) {
        const result = await updateQuizAction(initial.id, parsed.data);
        if (!result.ok) {
          setServerError(result.message);
          if (result.errors) setFieldErrors(result.errors);
          return;
        }
        router.push(`/quizzes/${initial.id}`);
        router.refresh();
      }
    });
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50">
      {/* Sticky action bar */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
          <p className="text-sm text-slate-500">
            {mode === "create" ? "Yeni Quiz" : "Quiz Düzenle"}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(onCancelHref)}
              className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              type="button"
            >
              İptal
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="bg-brand hover:bg-brand-dark rounded-md px-4 py-1.5 text-sm font-medium text-white shadow-sm disabled:opacity-60"
              type="button"
            >
              {isPending ? "Kaydediliyor…" : mode === "create" ? "Yayınla" : "Kaydet"}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-4 p-5">
        {serverError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {serverError}
          </div>
        ) : null}

        {/* Title + description */}
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <div>
            <label className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Quiz Başlığı
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn. Türkiye Coğrafyası"
              className="w-full border-0 px-0 py-1 text-lg font-semibold placeholder:text-slate-400 focus:ring-0 focus:outline-none"
            />
            {fieldErrors.title?.[0] ? (
              <p className="text-xs text-rose-600">{fieldErrors.title[0]}</p>
            ) : null}
          </div>
          <div>
            <label className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Açıklama (opsiyonel)
            </label>
            <input
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kısa bir açıklama"
              className="w-full border-0 px-0 py-0.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Questions */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={questions.map((q) => q._key)}
            strategy={verticalListSortingStrategy}
          >
            {questions.map((q, idx) => (
              <QuestionRow
                key={q._key}
                id={q._key}
                index={idx}
                question={q}
                onChange={(update) => updateQuestion(q._key, update)}
                onRemove={questions.length > 1 ? () => removeQuestion(q._key) : undefined}
                error={
                  fieldErrors[`questions.${idx}.prompt`]?.[0] ??
                  fieldErrors[`questions.${idx}`]?.[0]
                }
              />
            ))}
          </SortableContext>
        </DndContext>

        <button
          onClick={addQuestion}
          type="button"
          className="hover:border-brand/40 hover:bg-brand/5 hover:text-brand w-full rounded-lg border-2 border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 transition"
        >
          + Soru Ekle
        </button>
      </div>
    </div>
  );
}
