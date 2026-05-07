"use client";

// Mockup #15 birebir — Host Lobby büyük ekran (presentation-only).
// Socket bağlantısı HostGameOrchestrator'da yönetilir; bu component sadece görünüm.

import Link from "next/link";
import type { LobbyPlayerDTO } from "@/lib/socket-events";

interface Props {
  pin: string;
  quizTitle: string;
  questionCount: number;
  players: LobbyPlayerDTO[];
  connState: "connecting" | "connected" | "error";
  errorMsg: string | null;
  onStartGame: () => void;
  startDisabled: boolean;
  startError?: string | null;
}

export function HostLobby({
  pin,
  quizTitle,
  questionCount,
  players,
  connState,
  errorMsg,
  onStartGame,
  startDisabled,
  startError,
}: Props) {
  const playerCount = players.length;
  const formattedPin = `${pin.slice(0, 3)} ${pin.slice(3)}`;
  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin.replace(/^https?:\/\//, "")
      : "bilbil.app";

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-900 p-4">
      <div className="from-brand-deep via-brand-dark to-brand relative flex h-full min-h-[calc(100vh-5.5rem)] flex-col overflow-hidden rounded-2xl bg-gradient-to-br text-white shadow-2xl">
        <div className="flex items-center justify-between px-8 pt-6">
          <div className="flex items-center gap-3">
            <div className="text-brand flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl font-black">
              B
            </div>
            <div>
              <p className="display text-2xl">Bilbil</p>
              <p className="text-xs text-white/60">
                {quizTitle} · {questionCount} soru
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs tracking-wider text-white/60 uppercase">Oyuncular</p>
            <p className="display text-3xl">
              <span className="text-accent">{playerCount}</span>
              <span className="text-white/50"> / 50</span>
            </p>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-8">
          <div className="text-center">
            <p className="mb-2 text-sm tracking-[0.2em] text-white/60 uppercase">{appUrl}/play</p>
            <p className="display-mega text-[clamp(4rem,16vw,8rem)] leading-none tracking-tight tabular-nums">
              {formattedPin}
            </p>
            <p className="mt-2 text-sm text-white/60">PIN ile katıl</p>
            {connState !== "connected" && (
              <p className="mt-3 text-xs text-amber-300">
                {connState === "error" ? `⚠ ${errorMsg ?? "Bağlantı hatası"}` : "Bağlanıyor..."}
              </p>
            )}
          </div>
        </div>

        <div className="px-8 pb-6">
          <p className="mb-3 text-xs tracking-wider text-white/60 uppercase">Katılan oyuncular</p>
          <div className="mb-4 flex min-h-[2.5rem] flex-wrap gap-2">
            {players.length === 0 ? (
              <span className="rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-sm text-white/50 italic">
                Henüz kimse katılmadı...
              </span>
            ) : (
              players.map((p) => (
                <span
                  key={p.nickname}
                  className={`rounded-full border px-4 py-1.5 text-sm font-semibold backdrop-blur ${
                    p.connected
                      ? "border-white/20 bg-white/15 text-white"
                      : "border-white/10 bg-white/5 text-white/50 line-through"
                  }`}
                  data-testid={`lobby-player-${p.nickname}`}
                >
                  {p.nickname}
                </span>
              ))
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onStartGame}
              disabled={startDisabled}
              title={
                startDisabled
                  ? playerCount === 0
                    ? "En az 1 oyuncu gerekli"
                    : "Oyun şu anda başlatılamaz"
                  : undefined
              }
              data-testid="host-start-game"
              className="bg-accent shadow-accent/40 rounded-xl px-8 py-3 font-black tracking-wider text-slate-900 uppercase shadow-lg transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              Oyunu Başlat →
            </button>
            <Link
              href="/dashboard"
              className="rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-medium text-white/80 backdrop-blur hover:bg-white/20"
            >
              İptal
            </Link>
            {startError && <p className="text-sm text-rose-300">{startError}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
