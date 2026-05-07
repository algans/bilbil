"use client";

// Podium ekranları — host büyük ekran (mockup #19) + player kazandı/kazanmadı (mockup #27a/27b).

import Link from "next/link";
import { motion } from "framer-motion";
import type { PodiumPayload } from "@/lib/socket-events";

interface HostProps {
  variant: "host";
  podium: PodiumPayload;
  sessionId?: string;
}

interface PlayerProps {
  variant: "player";
  podium: PodiumPayload;
  nickname: string;
}

type Props = HostProps | PlayerProps;

export function PodiumView(props: Props) {
  if (props.variant === "host") return <HostPodium {...props} />;
  return <PlayerPodium {...props} />;
}

// Mockup'taki konfeti renk + boyut paleti birebir
const CONFETTI_PIECES = [
  { left: "8%", delay: "0s", w: "w-3", h: "h-3", color: "bg-amber-400" },
  { left: "18%", delay: "0.4s", w: "w-2", h: "h-4", color: "bg-rose-400" },
  { left: "28%", delay: "0.8s", w: "w-3", h: "h-2", color: "bg-emerald-400" },
  { left: "42%", delay: "1.2s", w: "w-2", h: "h-3", color: "bg-blue-400" },
  { left: "55%", delay: "0.2s", w: "w-3", h: "h-3", color: "bg-yellow-300" },
  { left: "68%", delay: "0.6s", w: "w-2", h: "h-4", color: "bg-pink-400" },
  { left: "82%", delay: "1s", w: "w-3", h: "h-2", color: "bg-violet-300" },
  { left: "92%", delay: "1.4s", w: "w-2", h: "h-3", color: "bg-amber-300" },
];

function HostPodium({ podium, sessionId }: HostProps) {
  const top3 = podium.entries.slice(0, 3);
  const winner = top3[0];

  return (
    <div className="from-brand-deep via-brand to-brand-light relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-b p-6 text-white md:p-10">
      {/* Konfeti — mockup #19 birebir */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {CONFETTI_PIECES.map((piece, i) => (
          <div
            key={i}
            className={`confetti-piece absolute top-0 ${piece.w} ${piece.h} ${piece.color}`}
            style={{ left: piece.left, animationDelay: piece.delay }}
          />
        ))}
      </div>

      {/* Top — quiz title + şampiyon */}
      <div className="relative z-10 mb-8 text-center">
        <p className="text-sm tracking-[0.3em] text-white/70 uppercase">{podium.quizTitle}</p>
        {winner && (
          <p className="display-mega mt-1 text-4xl md:text-5xl">🏆 Şampiyon · {winner.nickname}</p>
        )}
      </div>

      {/* Podium 2-1-3 yerleşimi */}
      <div className="relative z-10 flex flex-1 items-end justify-center gap-4 px-4 md:gap-6 md:px-12">
        {/* 2nd (sol) */}
        {top3[1] && (
          <Step
            entry={top3[1]}
            place={2}
            avatarSize="w-20 h-20"
            avatarText="text-3xl text-slate-700"
            ringClass="ring-slate-300"
            barClass="from-slate-300 to-slate-400"
            barTextClass="text-slate-900"
            barHeight="h-32"
            nameClass="text-xl"
            scoreClass="text-2xl text-slate-200"
            barNumberClass="text-5xl"
          />
        )}
        {/* 1st (orta, en yüksek) */}
        {top3[0] && (
          <Step
            entry={top3[0]}
            place={1}
            avatarSize="w-24 h-24"
            avatarText="text-4xl text-amber-700"
            ringClass="ring-amber-300 shadow-2xl shadow-amber-500/50"
            barClass="from-amber-400 to-amber-500"
            barTextClass="text-amber-900"
            barHeight="h-44"
            nameClass="text-2xl"
            scoreClass="display text-3xl text-amber-300"
            barNumberClass="text-7xl"
            crown
          />
        )}
        {/* 3rd (sağ) */}
        {top3[2] && (
          <Step
            entry={top3[2]}
            place={3}
            avatarSize="w-16 h-16"
            avatarText="text-2xl text-orange-700"
            ringClass="ring-orange-300"
            barClass="from-orange-400 to-orange-500"
            barTextClass="text-orange-900"
            barHeight="h-24"
            nameClass="text-lg"
            scoreClass="text-xl text-orange-200"
            barNumberClass="text-4xl"
          />
        )}
      </div>

      {/* CTA'lar — mockup'ta 2 buton */}
      <div className="relative z-10 mt-8 flex items-center justify-center gap-3">
        <Link
          href="/dashboard"
          className="text-brand rounded-xl bg-white px-6 py-2.5 font-black tracking-wider uppercase shadow-lg transition hover:scale-105"
        >
          Yeni Oyun
        </Link>
        {sessionId && (
          <Link
            href={`/history/${sessionId}`}
            className="rounded-xl border border-white/30 bg-white/15 px-6 py-2.5 font-black tracking-wider text-white uppercase backdrop-blur transition hover:bg-white/25"
          >
            Tüm Sonuçları Gör
          </Link>
        )}
      </div>
    </div>
  );
}

interface StepProps {
  entry: { rank: number; nickname: string; totalScore: number };
  place: 1 | 2 | 3;
  avatarSize: string;
  avatarText: string;
  ringClass: string;
  barClass: string;
  barTextClass: string;
  barHeight: string;
  nameClass: string;
  scoreClass: string;
  barNumberClass: string;
  crown?: boolean;
}

function Step({
  entry,
  place,
  avatarSize,
  avatarText,
  ringClass,
  barClass,
  barTextClass,
  barHeight,
  nameClass,
  scoreClass,
  barNumberClass,
  crown,
}: StepProps) {
  // 3 → 2 → 1 sıralı pop-in (mockup'taki dramatic effect)
  const delay = (3 - place) * 0.5;
  return (
    <motion.div
      className="text-center"
      data-testid={`podium-place-${place}`}
      initial={{ opacity: 0, y: 60, scale: 0.7 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 180, damping: 14 }}
    >
      <div className="relative">
        {crown && (
          <svg
            className="absolute -top-10 left-1/2 h-12 w-12 -translate-x-1/2 text-amber-300"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M5 4h14v3a4 4 0 0 1-4 4h-1.5a4.5 4.5 0 0 1-3 0H9a4 4 0 0 1-4-4V4Z" />
          </svg>
        )}
        <div
          className={`${avatarSize} display mx-auto mb-2 flex items-center justify-center rounded-full bg-white ring-4 ${ringClass} ${avatarText}`}
        >
          {entry.nickname.charAt(0).toUpperCase()}
        </div>
      </div>
      <p className={`display ${nameClass} mx-auto max-w-[140px] truncate`}>{entry.nickname}</p>
      <p className={`font-bold ${scoreClass}`}>{entry.totalScore.toLocaleString("tr-TR")}</p>
      <div
        className={`bg-gradient-to-b ${barClass} mt-2 rounded-t-xl px-6 py-3 ${barHeight} flex items-start justify-center`}
      >
        <span className={`display-mega ${barNumberClass} ${barTextClass}`}>{place}</span>
      </div>
    </motion.div>
  );
}

// ──────────────────────── Player Podium ────────────────────────
// Mockup #27a (kazandı) → warm gradient + trophy + stats
// Mockup #27b (kazanmadı) → light tema + rank circle

function PlayerPodium({ podium, nickname }: PlayerProps) {
  const myRank = podium.myRank;
  const isWinner = myRank?.rank === 1;
  const champion = podium.entries[0];

  if (!myRank) {
    // Fallback — myRank yoksa basit bekleme
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-violet-50 via-white to-violet-50 p-6 text-center">
        <p className="display text-2xl text-slate-700">{nickname}</p>
        <p className="text-sm text-slate-500">Sonuçlar yükleniyor…</p>
      </div>
    );
  }

  if (isWinner) {
    return <PlayerPodiumWinner myRank={myRank} podium={podium} />;
  }

  return <PlayerPodiumCentilmen myRank={myRank} podium={podium} champion={champion} />;
}

function PlayerPodiumWinner({
  myRank,
  podium,
}: {
  myRank: NonNullable<PodiumPayload["myRank"]>;
  podium: PodiumPayload;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-b from-amber-400 via-orange-500 to-rose-500 text-white">
      {/* Konfeti */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {CONFETTI_PIECES.slice(0, 5).map((piece, i) => (
          <div
            key={i}
            className={`confetti-piece absolute top-0 ${piece.w} ${piece.h} ${piece.color}`}
            style={{ left: piece.left, animationDelay: piece.delay }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        {/* Trophy */}
        <motion.svg
          initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 12 }}
          className="mb-4 h-24 w-24 text-white drop-shadow-lg"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M5 4h14v3a4 4 0 0 1-4 4h-1.5a4.5 4.5 0 0 1-3 0H9a4 4 0 0 1-4-4V4Zm-2 0h2v3a6 6 0 0 0 6 6v3H9a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2h-2v-3a6 6 0 0 0 6-6V4h2v3a8 8 0 0 1-7 7.94V18h2a3 3 0 0 1 3 3v1H7v-1a3 3 0 0 1 3-3h2v-3.06A8 8 0 0 1 5 7V4H3a1 1 0 0 1 0-2h18a1 1 0 0 1 0 2h-2" />
        </motion.svg>
        <motion.p
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="display mb-1 text-5xl"
          data-testid="player-final-rank"
        >
          1. oldun!
        </motion.p>
        <p className="mb-6 text-sm text-white/90">Şampiyon {myRank.nickname} 🎉</p>
        <div className="mb-6 rounded-2xl border border-white/30 bg-white/20 px-6 py-3 backdrop-blur">
          <p className="text-xs tracking-wider text-white/80 uppercase">Toplam puan</p>
          <p className="display text-4xl">{myRank.totalScore.toLocaleString("tr-TR")}</p>
        </div>
        <div className="grid w-full max-w-xs grid-cols-1 gap-2 text-xs">
          <div className="rounded-lg bg-white/15 py-2">
            <p className="text-white/70">Toplam oyuncu</p>
            <p className="text-base font-bold">{myRank.totalPlayers}</p>
          </div>
        </div>
      </div>

      <div className="relative z-10 px-5 pb-6">
        <Link
          href="/play"
          className="block w-full rounded-2xl bg-white py-3 text-center font-bold tracking-wider text-rose-600 uppercase shadow-lg transition active:scale-95"
        >
          Tekrar Oyna
        </Link>
      </div>
      <span className="sr-only">{podium.quizTitle}</span>
    </div>
  );
}

function PlayerPodiumCentilmen({
  myRank,
  podium,
  champion,
}: {
  myRank: NonNullable<PodiumPayload["myRank"]>;
  podium: PodiumPayload;
  champion?: { rank: number; nickname: string; totalScore: number };
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="bg-brand/10 mb-4 flex h-20 w-20 items-center justify-center rounded-full"
        >
          <span className="display text-brand text-3xl" data-testid="player-final-rank">
            {myRank.rank}.
          </span>
        </motion.div>
        <p className="display mb-2 text-3xl">İyi oyundu, {myRank.nickname}</p>
        <p className="mb-6 text-sm text-slate-500">
          {myRank.totalPlayers} oyuncu arasında <strong>{myRank.rank}.</strong> oldun
        </p>
        <div className="mb-6 w-full max-w-xs rounded-2xl bg-slate-50 px-6 py-4">
          <p className="mb-1 text-xs tracking-wider text-slate-500 uppercase">Toplam puan</p>
          <p className="display text-brand text-3xl">{myRank.totalScore.toLocaleString("tr-TR")}</p>
        </div>
        {champion && (
          <p className="mt-2 text-xs text-slate-400">
            Şampiyon:{" "}
            <strong>
              {champion.nickname} ({champion.totalScore.toLocaleString("tr-TR")})
            </strong>
          </p>
        )}
      </div>
      <div className="space-y-2 px-5 pb-6">
        <Link
          href="/play"
          className="bg-brand block w-full rounded-2xl py-3 text-center font-bold tracking-wider text-white uppercase shadow-md transition active:scale-95"
        >
          Tekrar Oyna
        </Link>
      </div>
      <span className="sr-only">{podium.quizTitle}</span>
    </div>
  );
}
