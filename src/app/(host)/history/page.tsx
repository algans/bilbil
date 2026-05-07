// Mockup #12 — Geçmiş Oyunlar listesi (host'un kendi oyunları).
// Soru-soru analytics Faz 4'te. Şu an: liste + tıklayınca leaderboard reveal.

import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/dal";

export const metadata = { title: "Bilbil — Geçmiş Oyunlar" };

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = await requireUser();

  const sessions = await db.gameSession.findMany({
    where: {
      hostId: user.id,
      status: { in: ["ended", "abandoned"] },
    },
    orderBy: { endedAt: "desc" },
    select: {
      id: true,
      pin: true,
      status: true,
      endedAt: true,
      createdAt: true,
      quiz: { select: { title: true } },
      results: {
        where: { finalRank: 1 },
        select: { nickname: true, finalScore: true },
      },
      _count: { select: { results: true } },
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6">
        <h1 className="display text-3xl">Geçmiş Oyunlar</h1>
        <p className="mt-1 text-sm text-slate-500">
          {sessions.length} {sessions.length === 1 ? "oyun" : "oyun"} bulundu
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
          <p className="text-slate-500">Henüz tamamlanmış oyun yok.</p>
          <Link
            href="/dashboard"
            className="text-brand mt-2 inline-block text-sm font-medium hover:underline"
          >
            Dashboard&apos;a dön →
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-xs tracking-wider text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Quiz</th>
                <th className="px-4 py-3 text-left font-semibold">PIN</th>
                <th className="px-4 py-3 text-left font-semibold">Oyuncu</th>
                <th className="px-4 py-3 text-left font-semibold">Tarih</th>
                <th className="px-4 py-3 text-left font-semibold">Şampiyon</th>
                <th className="px-4 py-3 text-left font-semibold">Durum</th>
                <th className="px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map((s) => {
                const winner = s.results[0];
                const date = s.endedAt ?? s.createdAt;
                const formatted = new Intl.DateTimeFormat("tr-TR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(date));
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{s.quiz.title}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{s.pin}</td>
                    <td className="px-4 py-3">{s._count.results}</td>
                    <td className="px-4 py-3 text-slate-500">{formatted}</td>
                    <td className="px-4 py-3 font-medium">
                      {winner ? (
                        <>
                          🥇 {winner.nickname} ({winner.finalScore.toLocaleString("tr-TR")})
                        </>
                      ) : (
                        <span className="text-slate-400">— (yarıda)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {s.status === "ended" ? (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          Tamamlandı
                        </span>
                      ) : (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          Yarıda
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/history/${s.id}`}
                        className="text-brand text-xs font-medium hover:underline"
                      >
                        Detay →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
