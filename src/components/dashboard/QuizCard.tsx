// Mockup #8b birebir — Quiz card.
// Yayınlanmış quiz: brand "X soru" badge + "Başlat" CTA (preview sayfasına götürür).
// Taslak quiz: slate "Taslak" badge + "Düzenle" CTA.

import Link from "next/link";

interface Props {
  id: string;
  title: string;
  questionCount: number;
  sessionCount: number;
  updatedAt: Date;
  isPublished: boolean;
}

export function QuizCard({
  id,
  title,
  questionCount,
  sessionCount,
  updatedAt,
  isPublished,
}: Props) {
  const lastUpdated = formatRelative(updatedAt);
  const isDraft = !isPublished;

  return (
    <div className="group hover:border-brand/30 rounded-lg border border-slate-200 bg-white p-4 transition hover:shadow-md">
      <div className="mb-2 flex items-start justify-between">
        {isDraft ? (
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
            Taslak
          </span>
        ) : (
          <span className="bg-brand/10 text-brand rounded px-2 py-0.5 text-xs font-semibold">
            {questionCount} soru
          </span>
        )}
        <Link
          href={`/quizzes/${id}/edit`}
          className="-mt-1 text-slate-400 transition hover:text-slate-700"
          aria-label="Düzenle"
        >
          ⋯
        </Link>
      </div>
      <Link href={`/quizzes/${id}`} className="block">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {isDraft
            ? `Henüz oynanmadı · ${questionCount} soru`
            : sessionCount > 0
              ? `Son: ${lastUpdated} · ${sessionCount} oyun`
              : "Henüz oynanmadı"}
        </p>
      </Link>
      {isDraft ? (
        <Link
          href={`/quizzes/${id}/edit`}
          className="mt-3 block w-full rounded border border-slate-300 py-1.5 text-center text-xs font-medium hover:bg-slate-50"
        >
          Düzenle
        </Link>
      ) : (
        <Link
          href={`/quizzes/${id}`}
          className="bg-brand hover:bg-brand-dark mt-3 block w-full rounded py-1.5 text-center text-xs font-medium text-white transition"
        >
          Başlat
        </Link>
      )}
    </div>
  );
}

function formatRelative(date: Date): string {
  const ms = Date.now() - date.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days === 0) return "bugün";
  if (days === 1) return "dün";
  if (days < 7) return `${days} gün önce`;
  if (days < 30) return `${Math.floor(days / 7)} hafta önce`;
  if (days < 365) return `${Math.floor(days / 30)} ay önce`;
  return `${Math.floor(days / 365)} yıl önce`;
}
