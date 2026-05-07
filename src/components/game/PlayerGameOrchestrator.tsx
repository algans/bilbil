"use client";

// Player game phase router. Socket'i tek noktadan yönetir, phase'e göre alt component render eder.
// Reconnect: sayfa açılışında sessionStorage'da playerToken varsa otomatik reconnect dener.

import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket-client";
import type {
  CountdownPayload,
  LeaderboardPayload,
  LobbyPlayerDTO,
  PodiumPayload,
  QuestionOpenedPayload,
  RevealPayload,
} from "@/lib/socket-events";
import { PlayerNicknameForm } from "./PlayerNicknameForm";
import { PlayerWaitingLobby } from "./PlayerWaitingLobby";
import { CountdownView } from "./CountdownView";
import { PlayerQuestionView } from "./PlayerQuestionView";
import { RevealView } from "./RevealView";
import { LeaderboardView } from "./LeaderboardView";
import { PodiumView } from "./PodiumView";
import { ConnectionBanner } from "./ConnectionBanner";
import { SessionAbandonedView } from "./SessionAbandonedView";

const TOKEN_STORAGE_KEY = "bilbil:playerToken";

interface Props {
  pin: string;
  quizTitle: string;
}

type Phase =
  | "nickname"
  | "lobby"
  | "countdown"
  | "question"
  | "reveal"
  | "leaderboard"
  | "podium"
  | "abandoned";
type AbandonReason = "host_gone" | "lobby_idle" | "cancelled";

export function PlayerGameOrchestrator({ pin, quizTitle }: Props) {
  const [phase, setPhase] = useState<Phase>("nickname");
  const [nickname, setNickname] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [players, setPlayers] = useState<LobbyPlayerDTO[]>([]);
  const [totalScore, setTotalScore] = useState(0);

  const [countdown, setCountdown] = useState<CountdownPayload | null>(null);
  const [question, setQuestion] = useState<QuestionOpenedPayload | null>(null);
  const [reveal, setReveal] = useState<RevealPayload | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardPayload | null>(null);
  const [podium, setPodium] = useState<PodiumPayload | null>(null);
  const [connState, setConnState] = useState<"connecting" | "connected" | "error">("connecting");
  const [abandonReason, setAbandonReason] = useState<AbandonReason>("host_gone");

  const reconnectTried = useRef(false);

  // Reconnect attempt
  useEffect(() => {
    if (reconnectTried.current) return;
    reconnectTried.current = true;
    const token = typeof window !== "undefined" ? sessionStorage.getItem(TOKEN_STORAGE_KEY) : null;
    if (!token) return;
    const socket = getSocket();
    const tryReconnect = () =>
      socket.emit("player:reconnect", { playerToken: token }, (ack) => {
        if (ack.ok && ack.pin === pin) {
          setNickname(ack.nickname);
          setPhase("lobby");
        } else if (!ack.ok) {
          sessionStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      });
    if (socket.connected) tryReconnect();
    else socket.once("connect", tryReconnect);
  }, [pin]);

  // Subscribe to game events (always — works once nickname is set or reconnect)
  useEffect(() => {
    const socket = getSocket();

    function onLobby(payload: { players: LobbyPlayerDTO[] }) {
      setPlayers(payload.players);
    }

    socket.on("lobby:state", (payload) => {
      setPlayers(payload.players);
      if (payload.phase === "lobby" && nickname) setPhase("lobby");
    });
    socket.on("lobby:player_joined", onLobby);
    socket.on("lobby:player_left", onLobby);
    socket.on("connect", () => setConnState("connected"));
    socket.on("disconnect", () => setConnState("connecting"));

    socket.on("session:abandoned", (p) => {
      setAbandonReason(p.reason);
      setPhase("abandoned");
    });
    socket.on("host:gone", () => {
      // Grace period başladı — şimdilik sadece banner; abandoned event'i 2dk sonra geliyor
    });

    socket.on("game:countdown", (p) => {
      setCountdown(p);
      setPhase("countdown");
    });
    socket.on("game:question_opened", (p) => {
      setQuestion(p);
      setPhase("question");
    });
    socket.on("game:reveal", (p) => {
      setReveal(p);
      // Reveal'den sonra toplam skor güncellenmeli — server payload'unda değil ama
      // myAnswer.pointsAwarded zaten o sorudan kazanılan puan. Toplama ekle.
      if (p.myAnswer?.pointsAwarded) {
        setTotalScore((s) => s + p.myAnswer!.pointsAwarded);
      }
      setPhase("reveal");
    });
    socket.on("game:leaderboard", (p) => {
      setLeaderboard(p);
      setPhase("leaderboard");
    });
    socket.on("game:final_results", (p) => {
      setPodium(p);
      if (p.myRank) setTotalScore(p.myRank.totalScore);
      setPhase("podium");
    });

    return () => {
      socket.off("lobby:state");
      socket.off("lobby:player_joined", onLobby);
      socket.off("lobby:player_left", onLobby);
      socket.off("session:abandoned");
      socket.off("game:countdown");
      socket.off("game:question_opened");
      socket.off("game:reveal");
      socket.off("game:leaderboard");
      socket.off("game:final_results");
    };
  }, [nickname]);

  const handleNicknameSubmit = useCallback(
    (input: string) => {
      setSubmitting(true);
      setError(null);
      const socket = getSocket();
      socket.emit("player:join", { pin, nickname: input }, (ack) => {
        setSubmitting(false);
        if (!ack.ok) {
          setError(ack.message);
          return;
        }
        sessionStorage.setItem(TOKEN_STORAGE_KEY, ack.playerToken);
        setNickname(ack.nickname);
        setPhase("lobby");
      });
    },
    [pin]
  );

  const handleAnswerSubmit = useCallback((optionId: string) => {
    const socket = getSocket();
    socket.emit("player:submit_answer", { optionId }, () => {
      // ack içeriği reveal'da zaten işlenecek; UI tarafı immediate "lock-in" yapıyor
    });
  }, []);

  // Render by phase — content variable + tek noktada banner wrap
  let content: React.ReactNode;
  if (phase === "abandoned") {
    content = (
      <SessionAbandonedView
        variant="player"
        reason={abandonReason}
        ctaHref="/play"
        ctaLabel="Yeni PIN'e Katıl"
      />
    );
  } else if (phase === "nickname" || !nickname) {
    content = (
      <PlayerNicknameForm
        pin={pin}
        quizTitle={quizTitle}
        onSubmit={handleNicknameSubmit}
        submitting={submitting}
        error={error}
      />
    );
  } else if (phase === "lobby") {
    const otherPlayers = players.filter((p) => p.nickname !== nickname && p.connected);
    content = (
      <PlayerWaitingLobby
        pin={pin}
        quizTitle={quizTitle}
        nickname={nickname}
        otherPlayers={otherPlayers}
      />
    );
  } else if (phase === "countdown" && countdown) {
    content = (
      <CountdownView
        opensAtMs={countdown.opensAtMs}
        countdownSec={countdown.countdownSec}
        questionIndex={countdown.questionIndex}
        totalQuestions={countdown.totalQuestions}
        variant="player"
      />
    );
  } else if (phase === "question" && question) {
    content = (
      <PlayerQuestionView
        question={question}
        nickname={nickname}
        totalScore={totalScore}
        onSubmit={handleAnswerSubmit}
      />
    );
  } else if (phase === "reveal" && reveal) {
    content = (
      <RevealView variant="player" reveal={reveal} nickname={nickname} totalScore={totalScore} />
    );
  } else if (phase === "leaderboard" && leaderboard) {
    content = (
      <LeaderboardView
        variant="player"
        leaderboard={leaderboard}
        nickname={nickname}
        totalScore={totalScore}
      />
    );
  } else if (phase === "podium" && podium) {
    content = <PodiumView variant="player" podium={podium} nickname={nickname} />;
  } else {
    content = (
      <PlayerWaitingLobby
        pin={pin}
        quizTitle={quizTitle}
        nickname={nickname ?? ""}
        otherPlayers={players.filter((p) => p.nickname !== nickname)}
      />
    );
  }

  return (
    <>
      <ConnectionBanner state={connState} />
      {content}
    </>
  );
}
