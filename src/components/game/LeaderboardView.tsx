"use client";

import type { LeaderboardPayload } from "@/lib/socket-events";

interface HostProps {
  variant: "host";
  leaderboard: LeaderboardPayload;
  onAdvance: () => void;
}

interface PlayerProps {
  variant: "player";
  leaderboard: LeaderboardPayload;
  nickname: string;
  totalScore: number;
}

type Props = HostProps | PlayerProps;

export function LeaderboardView(props: Props) {
  if (props.variant === "host") return <HostLeaderboard {...props} />;
  return <PlayerLeaderboard {...props} />;
}

function HostLeaderboard({ leaderboard, onAdvance }: HostProps) {
  const remaining = leaderboard.totalQuestions - (leaderboard.questionIndex + 1);

  return (
    <div className="via-brand-deep to-brand-dark flex min-h-dvh flex-col bg-gradient-to-br from-violet-950 p-6 text-white md:p-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs tracking-wider text-white/60 uppercase">
            {leaderboard.questionIndex + 1} soru bitti · {remaining} kaldı
          </p>
          <p className="display text-3xl md:text-4xl">Sıralama</p>
        </div>
        <button
          type="button"
          onClick={onAdvance}
          className="bg-accent rounded-xl px-6 py-2.5 font-black tracking-wider text-slate-900 uppercase shadow-lg transition hover:scale-105"
          data-testid="host-next-question"
        >
          Sonraki Soru →
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-auto">
        {leaderboard.entries.length === 0 && (
          <p className="py-8 text-center text-white/60">Henüz sıralama yok</p>
        )}
        {leaderboard.entries.map((entry, idx) => {
          const isTop3 = idx < 3;
          const podiumStyles = [
            "bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950",
            "bg-gradient-to-r from-slate-300 to-slate-400 text-slate-900",
            "bg-gradient-to-r from-orange-400 to-orange-500 text-orange-950",
          ];
          return (
            <div
              key={entry.nickname}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 shadow md:gap-4 md:px-5 ${
                isTop3 ? podiumStyles[idx] : "bg-white/10"
              }`}
              data-testid={`leaderboard-entry-${entry.rank}`}
            >
              <span
                className={`display ${isTop3 ? "text-2xl md:text-3xl" : "text-xl"} w-8 md:w-10`}
              >
                {entry.rank}
              </span>
              <div
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full font-bold md:h-10 md:w-10 ${
                  isTop3 ? "bg-black/30" : "bg-white/20"
                }`}
              >
                {entry.nickname.charAt(0).toUpperCase()}
              </div>
              <span
                className={`display flex-1 truncate ${
                  isTop3 ? "text-xl md:text-2xl" : "text-lg md:text-xl"
                }`}
              >
                {entry.nickname}
              </span>
              <span className={`display ${isTop3 ? "text-xl md:text-2xl" : "text-lg md:text-xl"}`}>
                {entry.totalScore.toLocaleString("tr-TR")}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-center text-xs text-white/50">{leaderboard.totalPlayers} oyuncu</p>
    </div>
  );
}

function PlayerLeaderboard({ leaderboard, nickname, totalScore }: PlayerProps) {
  const myRank = leaderboard.entries.find((e) => e.nickname === nickname)?.rank ?? null;

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-br from-violet-50 via-white to-violet-50 p-6">
      <div className="mb-6 text-center">
        <p className="text-xs tracking-[0.3em] text-slate-500 uppercase">Sıralama</p>
        <p className="display mt-1 text-3xl text-slate-900">
          {myRank !== null ? `${myRank}. sıradasın` : nickname}
        </p>
        <p className="text-brand mt-1 text-2xl font-bold">
          {totalScore.toLocaleString("tr-TR")} puan
        </p>
      </div>

      <div className="max-h-[60vh] space-y-1.5 overflow-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-md">
        {leaderboard.entries.slice(0, 10).map((entry) => {
          const isMe = entry.nickname === nickname;
          return (
            <div
              key={entry.nickname}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                isMe ? "bg-brand/10 ring-brand ring-1" : ""
              }`}
            >
              <span className="w-6 text-center font-bold text-slate-700">{entry.rank}</span>
              <span className="flex-1 truncate text-sm font-semibold">{entry.nickname}</span>
              <span className="text-brand text-sm font-bold">
                {entry.totalScore.toLocaleString("tr-TR")}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-slate-500">Host sonraki soruyu açıyor…</p>
    </div>
  );
}
