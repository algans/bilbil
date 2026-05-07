// Mockup #12 birebir — Geçmiş Oyunlar listesi (search + filter dropdown).

import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/dal";

export const metadata = { title: "Bilbil — Geçmiş Oyunlar" };

export const dynamic = "force-dynamic";

type StatusFilter = "all" | "ended" | "abandoned";

function parseStatus(input: string | undefined): StatusFilter {
  if (input === "ended" || input === "abandoned") return input;
  return "all";
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const statusFilter = parseStatus(params.status);

  const sessions = await db.gameSession.findMany({
    where: {
      hostId: user.id,
      status: statusFilter === "all" ? { in: ["ended", "abandoned"] } : statusFilter,
      ...(q
        ? {
            quiz: {
              title: { contains: q, mode: "insensitive" },
            },
          }
        : {}),
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
      {/* Header — search + filter (mockup birebir) */}
      <form
        method="get"
        className="mb-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <h1 className="display text-3xl">Geçmiş Oyunlar</h1>
        <div className="flex items-center gap-1">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Quiz adında ara..."
            className="focus:border-brand w-48 rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:outline-none"
          />
          <select
            name="status"
            defaultValue={statusFilter}
            className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
          >
            <option value="all">Tüm oyunlar</option>
            <option value="ended">Tamamlanan</option>
            <option value="abandoned">Yarıda kalan</option>
          </select>
          <button
            type="submit"
            className="bg-brand rounded-md px-3 py-1.5 text-sm font-semibold text-white"
          >
            Ara
          </button>
        </div>
      </form>

      <h2 className="display mb-4 text-xl">Geçmiş Oyunlar · {sessions.length}</h2>

      {sessions.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
          <p className="text-slate-500">
            {q || statusFilter !== "all"
              ? "Bu kriterlere uyan oyun bulunamadı."
              : "Henüz tamamlanmış oyun yok."}
          </p>
          {!q && statusFilter === "all" && (
            <Link
              href="/dashboard"
              className="text-brand mt-2 inline-block text-sm font-medium hover:underline"
            >
              Dashboard&apos;a dön →
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-xs tracking-wider text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Quiz</th>
                <th className="px-4 py-2 text-left font-semibold">PIN</th>
                <th className="px-4 py-2 text-left font-semibold">Oyuncu</th>
                <th className="px-4 py-2 text-left font-semibold">Tarih</th>
                <th className="px-4 py-2 text-left font-semibold">Şampiyon</th>
                <th className="px-4 py-2 text-left font-semibold">Durum</th>
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
