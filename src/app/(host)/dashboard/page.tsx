// Mockup #8 — Dashboard. Boş ve dolu state'ler.

import Link from "next/link";
import { listQuizzesForCurrentUser } from "@/lib/actions/quiz";
import { QuizCard } from "@/components/dashboard/QuizCard";
import { EmptyDashboard } from "@/components/dashboard/EmptyDashboard";

export const metadata = { title: "Bilbil — Quiz'lerim" };

export default async function DashboardPage() {
  const quizzes = await listQuizzesForCurrentUser();
  const totalGames = quizzes.reduce((sum, q) => sum + q._count.sessions, 0);

  if (quizzes.length === 0) return <EmptyDashboard />;

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="display text-3xl">Quiz&apos;lerim</h1>
          <p className="text-sm text-slate-500">
            {quizzes.length} quiz · {totalGames} oyun oynandı
          </p>
        </div>
        <Link
          href="/quizzes/new"
          className="bg-brand hover:bg-brand-dark rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm transition"
        >
          + Yeni Quiz
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {quizzes.map((q) => (
          <QuizCard
            key={q.id}
            id={q.id}
            title={q.title}
            questionCount={q._count.questions}
            sessionCount={q._count.sessions}
            updatedAt={q.updatedAt}
          />
        ))}
        <Link
          href="/quizzes/new"
          className="hover:border-brand/40 hover:bg-brand/5 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 p-4 text-center transition"
        >
          <span className="mb-1 text-2xl text-slate-400">+</span>
          <p className="text-sm font-medium text-slate-700">Yeni Quiz</p>
        </Link>
      </div>
    </main>
  );
}
