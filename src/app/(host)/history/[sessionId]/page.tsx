// Mockup #13 birebir — Oyun Analitiği detay sayfası.
// Summary cards (4x) + Soru Bazlı Doğruluk (bar chart) + Final Sıralama (detaylı card list).

import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/dal";

export const metadata = { title: "Bilbil — Oyun Sonucu" };

export const dynamic = "force-dynamic";

interface QuestionStat {
  questionId: string;
  prompt: string;
  order: number;
  correctCount: number;
  totalAnswered: number;
}

interface PlayerStat {
  nickname: string;
  finalRank: number;
  finalScore: number;
  correctCount: number;
  totalAnswered: number;
  averageAnswerTimeMs: number;
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const user = await requireUser();

  const session = await db.gameSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      pin: true,
      hostId: true,
      status: true,
      startedAt: true,
      endedAt: true,
      createdAt: true,
      quiz: {
        select: {
          title: true,
          questions: {
            orderBy: { order: "asc" },
            select: { id: true, prompt: true, order: true },
          },
        },
      },
      results: { orderBy: { finalRank: "asc" } },
      answers: {
        select: { questionId: true, nickname: true, isCorrect: true, answeredAtMs: true },
      },
    },
  });

  if (!session || session.hostId !== user.id) notFound();

  const date = session.endedAt ?? session.createdAt;
  const formatted = new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(date));

  const durationSec =
    session.startedAt && session.endedAt
      ? Math.round(
          (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000
        )
      : null;

  // Soru bazlı istatistikler
  const questionStats: QuestionStat[] = session.quiz.questions.map((q) => {
    const qAnswers = session.answers.filter((a) => a.questionId === q.id);
    const correctCount = qAnswers.filter((a) => a.isCorrect).length;
    return {
      questionId: q.id,
      prompt: q.prompt,
      order: q.order,
      correctCount,
      totalAnswered: qAnswers.length,
    };
  });

  // Oyuncu bazlı istatistikler
  const playerStats: PlayerStat[] = session.results.map((r) => {
    const pAnswers = session.answers.filter((a) => a.nickname === r.nickname);
    const correctCount = pAnswers.filter((a) => a.isCorrect).length;
    const totalTime = pAnswers.reduce((sum, a) => sum + a.answeredAtMs, 0);
    const avgTime = pAnswers.length > 0 ? totalTime / pAnswers.length : 0;
    return {
      nickname: r.nickname,
      finalRank: r.finalRank,
      finalScore: r.finalScore,
      correctCount,
      totalAnswered: pAnswers.length,
      averageAnswerTimeMs: avgTime,
    };
  });

  // Genel istatistikler
  const totalAnswers = session.answers.length;
  const totalCorrect = session.answers.filter((a) => a.isCorrect).length;
  const overallAccuracy = totalAnswers > 0 ? (totalCorrect / totalAnswers) * 100 : 0;
  const overallAvgMs =
    totalAnswers > 0
      ? session.answers.reduce((sum, a) => sum + a.answeredAtMs, 0) / totalAnswers
      : 0;
  const hardestQuestion = [...questionStats]
    .filter((q) => q.totalAnswered > 0)
    .sort((a, b) => a.correctCount / a.totalAnswered - b.correctCount / b.totalAnswered)[0];

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6">
        <Link href="/history" className="text-sm text-slate-600 hover:text-slate-900">
          ← Geçmiş Oyunlar
        </Link>
      </div>

      {/* Header — meta */}
      <div className="mb-6">
        <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
          Oyun · {formatted}
        </p>
        <h1 className="display mt-1 text-3xl">{session.quiz.title}</h1>
        <p className="mt-1 text-sm text-slate-600">
          PIN <span className="font-mono">{session.pin}</span> · {session.results.length} oyuncu ·{" "}
          {session.quiz.questions.length} soru
          {durationSec !== null && (
            <>
              {" "}
              · ~{Math.floor(durationSec / 60)} dk {durationSec % 60}sn
            </>
          )}
          {" · "}
          {session.status === "ended" ? (
            <span className="font-semibold text-emerald-700">Tamamlandı</span>
          ) : (
            <span className="font-semibold text-amber-700">Yarıda kaldı</span>
          )}
        </p>
      </div>

      {/* Summary cards — mockup #13 birebir */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs tracking-wider text-slate-500 uppercase">Oyuncu</p>
          <p className="display mt-1 text-2xl">{session.results.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs tracking-wider text-slate-500 uppercase">Doğruluk</p>
          <p className="display mt-1 text-2xl text-emerald-600">{Math.round(overallAccuracy)}%</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs tracking-wider text-slate-500 uppercase">Ort. cevap süresi</p>
          <p className="display mt-1 text-2xl">{(overallAvgMs / 1000).toFixed(1)}s</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs tracking-wider text-slate-500 uppercase">En zor soru</p>
          {hardestQuestion ? (
            <>
              <p className="mt-1 truncate text-sm font-semibold">{hardestQuestion.prompt}</p>
              <p className="text-xs font-bold text-rose-600">
                {Math.round((hardestQuestion.correctCount / hardestQuestion.totalAnswered) * 100)}%
                doğru
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-slate-400">—</p>
          )}
        </div>
      </div>

      {/* Soru Bazlı Doğruluk — bar chart */}
      {questionStats.length > 0 && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Soru Bazlı Doğruluk</h3>
            <p className="text-xs text-slate-500">
              {session.results.length} oyuncu × {questionStats.length} soru
            </p>
          </div>
          <div className="space-y-2">
            {questionStats.map((q) => {
              const accuracy = q.totalAnswered > 0 ? (q.correctCount / q.totalAnswered) * 100 : 0;
              const isLow = accuracy < 50;
              return (
                <div key={q.questionId} className="flex items-center gap-3">
                  <span className="w-6 font-mono text-xs text-slate-500">
                    {String(q.order).padStart(2, "0")}
                  </span>
                  <p className="flex-1 truncate text-xs text-slate-700">{q.prompt}</p>
                  <div className="h-3 w-32 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full ${isLow ? "bg-rose-500" : "bg-emerald-500"}`}
                      style={{ width: `${accuracy}%` }}
                    />
                  </div>
                  <span
                    className={`w-10 text-right text-xs font-bold ${
                      isLow ? "text-rose-600" : "text-slate-700"
                    }`}
                  >
                    {q.correctCount}/{q.totalAnswered}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Final Sıralama — detaylı card list */}
      {playerStats.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="mb-3 font-semibold">Final Sıralama</h3>
          <div className="space-y-1.5 text-sm">
            {playerStats.map((p) => {
              const cardBg =
                p.finalRank === 1
                  ? "bg-amber-50"
                  : p.finalRank === 2
                    ? "bg-slate-50"
                    : p.finalRank === 3
                      ? "bg-orange-50"
                      : "";
              const numColor =
                p.finalRank === 1
                  ? "text-amber-700"
                  : p.finalRank === 2
                    ? "text-slate-600"
                    : p.finalRank === 3
                      ? "text-orange-700"
                      : "text-slate-500";
              const avatarBg =
                p.finalRank === 1
                  ? "bg-amber-200 text-amber-800"
                  : p.finalRank === 2
                    ? "bg-slate-300 text-slate-700"
                    : p.finalRank === 3
                      ? "bg-orange-200 text-orange-800"
                      : "bg-slate-200 text-slate-600";
              return (
                <div
                  key={p.nickname}
                  className={`flex items-center gap-3 rounded-md p-2 ${cardBg}`}
                >
                  <span className={`display w-6 text-center text-lg ${numColor}`}>
                    {p.finalRank}
                  </span>
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${avatarBg}`}
                  >
                    {p.nickname.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 truncate font-semibold">{p.nickname}</span>
                  <span className="hidden text-xs text-slate-500 sm:inline">
                    {p.correctCount}/{p.totalAnswered} doğru ·{" "}
                    {(p.averageAnswerTimeMs / 1000).toFixed(1)}s ort
                  </span>
                  <span className="font-bold">{p.finalScore.toLocaleString("tr-TR")}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
