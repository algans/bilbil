"use client";

// Mockup #22 — Player lobby waiting (presentation-only).

import type { LobbyPlayerDTO } from "@/lib/socket-events";

interface Props {
  pin: string;
  quizTitle: string;
  nickname: string;
  otherPlayers: LobbyPlayerDTO[];
}

export function PlayerWaitingLobby({ pin, quizTitle, nickname, otherPlayers }: Props) {
  const initial = nickname.charAt(0).toLocaleUpperCase("tr-TR");

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="bg-brand flex h-6 w-6 items-center justify-center rounded font-bold text-white">
              B
            </div>
            <span className="font-bold">Bilbil</span>
          </div>
          <span className="font-mono text-slate-500">PIN {pin}</span>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="relative mb-6 h-20 w-20">
          <div className="bg-brand/20 absolute inset-0 animate-ping rounded-full" />
          <div className="bg-brand absolute inset-2 flex items-center justify-center rounded-full text-2xl font-bold text-white">
            {initial}
          </div>
        </div>
        <p className="display mb-1 text-2xl">Hazırsın {nickname}!</p>
        <p className="mb-2 text-sm text-slate-500">Soru gelmesini bekliyoruz...</p>
        <p className="mb-6 text-xs text-slate-400">{quizTitle}</p>

        <div className="w-full max-w-sm rounded-2xl bg-slate-50 p-4">
          <p className="mb-3 text-xs font-semibold tracking-wider text-slate-500 uppercase">
            Diğer Oyuncular · {otherPlayers.length}
          </p>
          {otherPlayers.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Sen birincisin, başkaları geliyor...</p>
          ) : (
            <div className="flex flex-wrap justify-center gap-1.5">
              {otherPlayers.slice(0, 12).map((p) => (
                <span
                  key={p.nickname}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium"
                >
                  {p.nickname}
                </span>
              ))}
              {otherPlayers.length > 12 && (
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium">
                  +{otherPlayers.length - 12}
                </span>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="px-5 pb-8">
        <p className="text-center text-xs text-slate-400">💡 Hızlı doğru cevap = daha çok puan</p>
      </footer>
    </div>
  );
}
