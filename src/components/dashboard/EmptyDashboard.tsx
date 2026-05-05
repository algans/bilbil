// Mockup #8a — Empty state. SVG illustration + ana CTA.

import Link from "next/link";

export function EmptyDashboard() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl bg-white p-12 text-center shadow-sm">
        <svg
          className="text-brand/30 mb-6 h-32 w-32"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 64 64"
        >
          <rect x="14" y="20" width="36" height="32" rx="3" fill="currentColor" opacity={0.2} />
          <rect x="10" y="14" width="36" height="32" rx="3" fill="currentColor" opacity={0.4} />
          <rect x="6" y="8" width="36" height="32" rx="3" fill="white" stroke="currentColor" />
          <line x1={12} y1={16} x2={32} y2={16} strokeLinecap="round" />
          <line x1={12} y1={22} x2={28} y2={22} strokeLinecap="round" opacity={0.5} />
          <circle cx={14} cy={32} r={2} />
          <line x1={20} y1={32} x2={34} y2={32} strokeLinecap="round" opacity={0.5} />
        </svg>
        <p className="display mb-2 text-2xl">Henüz quiz oluşturmadın</p>
        <p className="mb-6 max-w-sm text-sm text-slate-600">
          İlk quiz&apos;ini birkaç dakikada hazırla, oyuncularını PIN ile davet et
        </p>
        <Link
          href="/quizzes/new"
          className="bg-brand hover:bg-brand-dark rounded-md px-6 py-2.5 font-medium text-white shadow-sm transition"
        >
          + İlk Quiz&apos;imi Oluştur
        </Link>
      </div>
    </main>
  );
}
