// Mockup #13 — Oyun analitiği detay sayfası.
// Faz 3 kapsamı: leaderboard reveal (kim 1., 2., ...). Soru-soru detay Faz 4.

import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/dal";

export const metadata = { title: "Bilbil — Oyun Sonucu" };

export const dynamic = "force-dynamic";

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
      quiz: { select: { title: true, _count: { select: { questions: true } } } },
      results: { orderBy: { finalRank: "asc" } },
      _count: { select: { results: true, answers: true } },
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

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6">
        <Link href="/history" className="text-sm text-slate-600 hover:text-slate-900">
          ← Geçmiş Oyunlar
        </Link>
      </div>

      <div className="mb-6">
        <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
          Oyun · {formatted}
        </p>
        <h1 className="display mt-1 text-3xl">{session.quiz.title}</h1>
        <p className="mt-1 text-sm text-slate-600">
          PIN <span className="font-mono">{session.pin}</span> · {session._count.results} oyuncu ·{" "}
          {session.quiz._count.questions} soru
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

      {session.results.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center text-slate-500">
          Sonuç kaydı yok.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="display text-xl">Sıralama</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs tracking-wider text-slate-500 uppercase">
              <tr>
                <th className="w-16 px-6 py-3 text-left font-semibold">#</th>
                <th className="px-4 py-3 text-left font-semibold">Oyuncu</th>
                <th className="px-6 py-3 text-right font-semibold">Skor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {session.results.map((r) => {
                const medal =
                  r.finalRank === 1
                    ? "🥇"
                    : r.finalRank === 2
                      ? "🥈"
                      : r.finalRank === 3
                        ? "🥉"
                        : null;
                return (
                  <tr key={r.id}>
                    <td className="px-6 py-3 font-bold text-slate-700">
                      {medal ? `${medal} ${r.finalRank}` : r.finalRank}
                    </td>
                    <td className="px-4 py-3 font-medium">{r.nickname}</td>
                    <td className="text-brand px-6 py-3 text-right font-bold">
                      {r.finalScore.toLocaleString("tr-TR")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-slate-400">
        Soru-soru analytics Faz 4&apos;te eklenecek
      </p>
    </div>
  );
}
