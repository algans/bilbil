// Mockup #10 — Quiz Önizleme. 2 sütun: meta + soru thumbnails.
// "Oyun Başlat" butonu Faz 2'de aktif olacak — şu an disabled.

import Link from "next/link";
import { notFound } from "next/navigation";
import { getQuizForCurrentUser } from "@/lib/actions/quiz";
import { createGameSessionAction } from "@/lib/actions/game";

export const metadata = { title: "Bilbil — Quiz Önizleme" };

export default async function QuizPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quiz = await getQuizForCurrentUser(id);
  if (!quiz) notFound();

  const totalSec = quiz.questions.reduce((sum, q) => sum + q.timeLimitSec, 0);
  const totalMinutes = Math.max(1, Math.round(totalSec / 60));

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-slate-600 hover:text-slate-900">
          ← Quiz&apos;lerim
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: meta + CTA */}
        <div className="space-y-4 lg:col-span-1">
          <div>
            <span className="bg-brand/10 text-brand rounded px-2 py-0.5 text-xs font-semibold">
              {quiz.questions.length} soru
            </span>
            <h1 className="display mt-2 text-3xl">{quiz.title}</h1>
            {quiz.description ? (
              <p className="mt-1 text-sm text-slate-600">{quiz.description}</p>
            ) : null}
          </div>
          <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-sm">
            <Row label="Soru sayısı" value={quiz.questions.length.toString()} />
            <Row label="Toplam süre" value={`~ ${totalMinutes} dk`} />
            <Row label="Oluşturulma" value={formatDate(quiz.createdAt)} />
          </div>
          <form action={createGameSessionAction.bind(null, quiz.id)}>
            <button
              type="submit"
              className="bg-brand shadow-brand/30 hover:bg-brand-dark w-full rounded-xl py-4 font-bold tracking-wider text-white uppercase shadow-lg transition hover:scale-[1.02]"
            >
              ▶ Oyunu Başlat
            </button>
          </form>
          <Link
            href={`/quizzes/${quiz.id}/edit`}
            className="block w-full rounded-md border border-slate-300 py-2 text-center text-sm font-medium hover:bg-white"
          >
            Düzenle
          </Link>
        </div>

        {/* Right: question previews */}
        <div className="space-y-2 lg:col-span-2">
          <p className="mb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">
            Sorular
          </p>
          {quiz.questions.map((q, idx) => (
            <div
              key={q.id}
              className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3"
            >
              <span className="mt-0.5 font-mono text-xs text-slate-400">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">{q.prompt}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {q.options.length} şık · {q.timeLimitSec}s
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}
