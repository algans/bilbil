// Mockup #8b — Quiz card. Hover'da brand kenarlık.
// "Başlat" Faz 2'de aktif olacak — şimdilik link var ama route yok, "Önizle" yapalım.

import Link from "next/link";

interface Props {
  id: string;
  title: string;
  questionCount: number;
  sessionCount: number;
  updatedAt: Date;
}

export function QuizCard({ id, title, questionCount, sessionCount, updatedAt }: Props) {
  const lastUpdated = formatRelative(updatedAt);
  return (
    <div className="group hover:border-brand/30 rounded-lg border border-slate-200 bg-white p-4 transition hover:shadow-md">
      <div className="mb-2 flex items-start justify-between">
        <span className="bg-brand/10 text-brand rounded px-2 py-0.5 text-xs font-semibold">
          {questionCount} soru
        </span>
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
          {sessionCount > 0 ? `Son: ${lastUpdated} · ${sessionCount} oyun` : "Henüz oynanmadı"}
        </p>
      </Link>
      <Link
        href={`/quizzes/${id}`}
        className="bg-brand mt-3 block w-full rounded py-1.5 text-center text-xs font-medium text-white"
      >
        Önizle
      </Link>
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
