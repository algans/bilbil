"use client";

import Link from "next/link";
import type { PodiumPayload } from "@/lib/socket-events";

interface HostProps {
  variant: "host";
  podium: PodiumPayload;
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

function HostPodium({ podium }: HostProps) {
  const top3 = podium.entries.slice(0, 3);
  const winner = top3[0];

  return (
    <div className="from-brand-deep via-brand to-brand-dark relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-b p-6 text-white md:p-10">
      {/* Konfeti */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="confetti-piece absolute top-0 h-3 w-2"
            style={{
              left: `${(i * 5 + 5) % 100}%`,
              animationDelay: `${(i * 0.2) % 2}s`,
              backgroundColor: [
                "#F59E0B",
                "#EF4444",
                "#10B981",
                "#3B82F6",
                "#FBBF24",
                "#EC4899",
                "#8B5CF6",
              ][i % 7],
            }}
          />
        ))}
      </div>

      <div className="relative z-10 mb-8 text-center">
        <p className="text-sm tracking-[0.3em] text-white/70 uppercase">{podium.quizTitle}</p>
        {winner && (
          <p className="display-mega mt-2 text-3xl md:text-5xl">🏆 Şampiyon · {winner.nickname}</p>
        )}
      </div>

      <div className="relative z-10 flex flex-1 items-end justify-center gap-4 px-4 md:gap-6 md:px-12">
        {/* 2nd */}
        {top3[1] && (
          <Step
            entry={top3[1]}
            place={2}
            ringClass="ring-slate-300"
            barClass="from-slate-300 to-slate-400"
            textClass="text-slate-900"
            heightClass="h-32"
            avatarSize="w-20 h-20"
            scoreClass="text-2xl text-slate-200"
            nameClass="text-xl"
          />
        )}
        {/* 1st */}
        {top3[0] && (
          <Step
            entry={top3[0]}
            place={1}
            ringClass="ring-amber-300 shadow-2xl shadow-amber-500/50"
            barClass="from-amber-400 to-amber-500"
            textClass="text-amber-900"
            heightClass="h-44"
            avatarSize="w-24 h-24"
            scoreClass="text-3xl text-amber-300 display"
            nameClass="text-2xl"
            crown
          />
        )}
        {/* 3rd */}
        {top3[2] && (
          <Step
            entry={top3[2]}
            place={3}
            ringClass="ring-orange-300"
            barClass="from-orange-400 to-orange-500"
            textClass="text-orange-900"
            heightClass="h-24"
            avatarSize="w-16 h-16"
            scoreClass="text-xl text-orange-200"
            nameClass="text-lg"
          />
        )}
      </div>

      <div className="relative z-10 mt-8 text-center">
        <Link
          href="/dashboard"
          className="text-brand inline-block rounded-xl bg-white px-6 py-2.5 font-black tracking-wider uppercase shadow-lg transition hover:scale-105"
        >
          Dashboard&apos;a Dön
        </Link>
      </div>
    </div>
  );
}

interface StepProps {
  entry: { rank: number; nickname: string; totalScore: number };
  place: 1 | 2 | 3;
  ringClass: string;
  barClass: string;
  textClass: string;
  heightClass: string;
  avatarSize: string;
  scoreClass: string;
  nameClass: string;
  crown?: boolean;
}

function Step({
  entry,
  place,
  ringClass,
  barClass,
  textClass,
  heightClass,
  avatarSize,
  scoreClass,
  nameClass,
  crown,
}: StepProps) {
  return (
    <div className="text-center" data-testid={`podium-place-${place}`}>
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
          className={`${avatarSize} display mx-auto mb-2 flex items-center justify-center rounded-full bg-white text-3xl text-slate-700 ring-4 ${ringClass}`}
        >
          {entry.nickname.charAt(0).toUpperCase()}
        </div>
      </div>
      <p className={`display ${nameClass} mx-auto max-w-[140px] truncate`}>{entry.nickname}</p>
      <p className={`font-bold ${scoreClass}`}>{entry.totalScore.toLocaleString("tr-TR")}</p>
      <div
        className={`bg-gradient-to-b ${barClass} mt-2 rounded-t-xl px-6 py-3 ${heightClass} flex items-start justify-center`}
      >
        <span className={`display-mega ${place === 1 ? "text-6xl" : "text-4xl"} ${textClass}`}>
          {place}
        </span>
      </div>
    </div>
  );
}

function PlayerPodium({ podium, nickname }: PlayerProps) {
  const myRank = podium.myRank;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-violet-50 via-white to-violet-50 p-6 text-center">
      <p className="mb-2 text-sm tracking-[0.3em] text-slate-500 uppercase">{podium.quizTitle}</p>
      <p className="display mb-1 text-3xl text-slate-900">Oyun Bitti</p>
      {myRank ? (
        <>
          <p className="display-mega text-brand my-4 text-7xl" data-testid="player-final-rank">
            {myRank.rank}.
          </p>
          <p className="display mb-2 text-xl">{myRank.nickname}</p>
          <p className="text-brand text-2xl font-bold">
            {myRank.totalScore.toLocaleString("tr-TR")} puan
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {myRank.totalPlayers} oyuncu arasında {myRank.rank}.
          </p>
        </>
      ) : (
        <p className="text-lg text-slate-700">{nickname}</p>
      )}

      <Link
        href="/play"
        className="bg-brand mt-10 inline-block rounded-xl px-6 py-3 font-black tracking-wider text-white uppercase shadow-lg transition hover:scale-105"
      >
        Yeni PIN&apos;e Katıl
      </Link>
    </div>
  );
}
