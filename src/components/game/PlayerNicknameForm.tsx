"use client";

// Mockup #21 — nickname girişi (presentation-only).

import { useState } from "react";
import Link from "next/link";

interface Props {
  pin: string;
  quizTitle: string;
  onSubmit: (nickname: string) => void;
  submitting: boolean;
  error: string | null;
}

export function PlayerNicknameForm({ pin, quizTitle, onSubmit, submitting, error }: Props) {
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    onSubmit(value.trim());
  }

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 text-xs">
          <Link href="/play" className="flex items-center gap-1.5">
            <div className="bg-brand flex h-6 w-6 items-center justify-center rounded font-bold text-white">
              B
            </div>
            <span className="font-bold">Bilbil</span>
          </Link>
          <span className="font-mono text-slate-500">PIN {pin}</span>
        </div>
      </header>

      <main className="flex flex-1 flex-col justify-center px-6">
        <p className="display mb-2 text-center text-3xl">Adın ne?</p>
        <p className="mb-8 text-center text-sm text-slate-500">
          Diğer oyuncular bu isimle görecek · Quiz: <strong>{quizTitle}</strong>
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            ⚠ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-md space-y-4">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Mehmet"
            maxLength={20}
            minLength={2}
            required
            autoFocus
            className="focus:border-brand w-full rounded-2xl border-2 border-slate-200 py-4 text-center text-2xl font-bold focus:outline-none"
          />
          <p className="text-center text-xs text-slate-400">2-20 karakter</p>
          <button
            type="submit"
            disabled={submitting}
            className="bg-brand shadow-brand/30 w-full rounded-2xl py-4 font-bold tracking-wider text-white uppercase shadow-lg transition active:scale-95 disabled:opacity-60"
          >
            {submitting ? "Katılıyor..." : "Katıl"}
          </button>
        </form>
      </main>
    </div>
  );
}
