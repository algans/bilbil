"use client";

// Host game phase router. Socket'i tek noktadan yönetir, phase'e göre alt component render eder.

import { useEffect, useState, useCallback } from "react";
import { getSocket } from "@/lib/socket-client";
import type {
  CountdownPayload,
  LeaderboardPayload,
  LobbyPlayerDTO,
  PodiumPayload,
  QuestionOpenedPayload,
  RevealPayload,
} from "@/lib/socket-events";
import { HostLobby } from "./HostLobby";
import { CountdownView } from "./CountdownView";
import { HostQuestionView } from "./HostQuestionView";
import { RevealView } from "./RevealView";
import { LeaderboardView } from "./LeaderboardView";
import { PodiumView } from "./PodiumView";
import { ConnectionBanner } from "./ConnectionBanner";
import { SessionAbandonedView } from "./SessionAbandonedView";

interface Props {
  pin: string;
  quizTitle: string;
  questionCount: number;
}

type Phase = "lobby" | "countdown" | "question" | "reveal" | "leaderboard" | "podium" | "abandoned";
type ConnState = "connecting" | "connected" | "error";
type AbandonReason = "host_gone" | "lobby_idle" | "cancelled";

export function HostGameOrchestrator({ pin, quizTitle, questionCount }: Props) {
  const [phase, setPhase] = useState<Phase>("lobby");
  const [players, setPlayers] = useState<LobbyPlayerDTO[]>([]);
  const [connState, setConnState] = useState<ConnState>("connecting");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  const [countdown, setCountdown] = useState<CountdownPayload | null>(null);
  const [question, setQuestion] = useState<QuestionOpenedPayload | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [reveal, setReveal] = useState<RevealPayload | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardPayload | null>(null);
  const [podium, setPodium] = useState<PodiumPayload | null>(null);
  const [abandonReason, setAbandonReason] = useState<AbandonReason>("host_gone");

  useEffect(() => {
    const socket = getSocket();

    function attach() {
      socket.emit("host:join_session", { pin }, (ack) => {
        if (!ack.ok) {
          setConnState("error");
          setErrorMsg(ack.message);
        } else {
          setConnState("connected");
          setErrorMsg(null);
        }
      });
    }

    if (socket.connected) attach();
    else socket.once("connect", attach);

    socket.on("connect", attach);
    socket.on("disconnect", () => setConnState("connecting"));

    socket.on("lobby:state", (payload) => {
      setPlayers(payload.players);
      // Phase reflect — sadece lobby'de geriye dönüş için
      if (payload.phase === "lobby") setPhase("lobby");
    });
    socket.on("lobby:player_joined", ({ players: ps }) => setPlayers(ps));
    socket.on("lobby:player_left", ({ players: ps }) => setPlayers(ps));
    socket.on("session:abandoned", (p) => {
      setAbandonReason(p.reason);
      setPhase("abandoned");
    });

    socket.on("game:countdown", (p) => {
      setCountdown(p);
      setPhase("countdown");
    });
    socket.on("game:question_opened", (p) => {
      setQuestion(p);
      setAnsweredCount(0);
      setPhase("question");
    });
    socket.on("game:answer_progress", (p) => setAnsweredCount(p.answered));
    socket.on("game:reveal", (p) => {
      setReveal(p);
      setPhase("reveal");
    });
    socket.on("game:leaderboard", (p) => {
      setLeaderboard(p);
      setPhase("leaderboard");
    });
    socket.on("game:final_results", (p) => {
      setPodium(p);
      setPhase("podium");
    });

    return () => {
      socket.off("connect", attach);
      socket.off("disconnect");
      socket.off("lobby:state");
      socket.off("lobby:player_joined");
      socket.off("lobby:player_left");
      socket.off("session:abandoned");
      socket.off("game:countdown");
      socket.off("game:question_opened");
      socket.off("game:answer_progress");
      socket.off("game:reveal");
      socket.off("game:leaderboard");
      socket.off("game:final_results");
    };
  }, [pin]);

  const handleStartGame = useCallback(() => {
    setStartError(null);
    const socket = getSocket();
    socket.emit("host:start_game", { pin }, (ack) => {
      if (!ack.ok) setStartError(ack.message);
    });
  }, [pin]);

  const handleAdvanceFromReveal = useCallback(() => {
    const socket = getSocket();
    socket.emit("host:show_leaderboard", { pin }, () => {});
  }, [pin]);

  const handleNextQuestion = useCallback(() => {
    const socket = getSocket();
    socket.emit("host:next_question", { pin }, () => {});
  }, [pin]);

  if (phase === "abandoned") {
    return (
      <SessionAbandonedView
        variant="host"
        reason={abandonReason}
        ctaHref="/dashboard"
        ctaLabel="Dashboard"
      />
    );
  }

  if (phase === "countdown" && countdown) {
    return (
      <>
        <ConnectionBanner state={connState} message={errorMsg} />
        <CountdownView
          opensAtMs={countdown.opensAtMs}
          countdownSec={countdown.countdownSec}
          questionIndex={countdown.questionIndex}
          totalQuestions={countdown.totalQuestions}
          variant="host"
        />
      </>
    );
  }

  if (phase === "question" && question) {
    return (
      <>
        <ConnectionBanner state={connState} message={errorMsg} />
        <HostQuestionView
          question={question}
          answeredCount={answeredCount}
          totalPlayers={players.length}
        />
      </>
    );
  }

  if (phase === "reveal" && reveal) {
    return (
      <>
        <ConnectionBanner state={connState} message={errorMsg} />
        <RevealView variant="host" reveal={reveal} onAdvance={handleAdvanceFromReveal} />
      </>
    );
  }

  if (phase === "leaderboard" && leaderboard) {
    return (
      <>
        <ConnectionBanner state={connState} message={errorMsg} />
        <LeaderboardView variant="host" leaderboard={leaderboard} onAdvance={handleNextQuestion} />
      </>
    );
  }

  if (phase === "podium" && podium) {
    return <PodiumView variant="host" podium={podium} />;
  }

  // Lobby (default)
  return (
    <>
      <ConnectionBanner state={connState} message={errorMsg} />
      <HostLobby
        pin={pin}
        quizTitle={quizTitle}
        questionCount={questionCount}
        players={players}
        connState={connState}
        errorMsg={errorMsg}
        onStartGame={handleStartGame}
        startDisabled={connState !== "connected" || players.length === 0 || questionCount === 0}
        startError={startError}
      />
    </>
  );
}
