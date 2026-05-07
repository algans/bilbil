"use client";

// Mockup #21 nickname → #22 lobby waiting. Tek client component, state-driven.
// Phase'ler: "nickname" → "joining" → "waiting"
// Reconnect: sayfa açılışında sessionStorage'da playerToken varsa otomatik reconnect dener.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getSocket } from "@/lib/socket-client";
import type { LobbyPlayerDTO } from "@/lib/socket-events";

const TOKEN_STORAGE_KEY = "bilbil:playerToken";

interface Props {
  pin: string;
  quizTitle: string;
}

type Phase = "nickname" | "joining" | "waiting";

export function PlayerJoinFlow({ pin, quizTitle }: Props) {
  const [phase, setPhase] = useState<Phase>("nickname");
  const [nicknameInput, setNicknameInput] = useState("");
  const [activeNickname, setActiveNickname] = useState<string | null>(null);
  const [otherPlayers, setOtherPlayers] = useState<LobbyPlayerDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const reconnectAttempted = useRef(false);

  // Reconnect: sessionStorage'da token varsa try.
  useEffect(() => {
    if (reconnectAttempted.current) return;
    reconnectAttempted.current = true;
    const token = typeof window !== "undefined" ? sessionStorage.getItem(TOKEN_STORAGE_KEY) : null;
    if (!token) return;

    const socket = getSocket();
    const tryReconnect = () =>
      socket.emit("player:reconnect", { playerToken: token }, (ack) => {
        if (ack.ok && ack.pin === pin) {
          setActiveNickname(ack.nickname);
          setPhase("waiting");
        } else if (!ack.ok) {
          // Token geçersiz — sil, normal akışla devam et.
          sessionStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      });

    if (socket.connected) tryReconnect();
    else socket.once("connect", tryReconnect);
  }, [pin]);

  // Lobby state listener — waiting phase'inde diğer oyuncuları göster.
  useEffect(() => {
    const socket = getSocket();
    function onState(payload: { players: LobbyPlayerDTO[] }) {
      setOtherPlayers(payload.players.filter((p) => p.nickname !== activeNickname && p.connected));
    }
    socket.on("lobby:state", onState);
    socket.on("lobby:player_joined", onState);
    socket.on("lobby:player_left", onState);
    socket.on("session:abandoned", () => {
      setError("Oyun host tarafından kapatıldı");
      setPhase("nickname");
    });
    return () => {
      socket.off("lobby:state", onState);
      socket.off("lobby:player_joined", onState);
      socket.off("lobby:player_left", onState);
      socket.off("session:abandoned");
    };
  }, [activeNickname]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (phase === "joining" || phase === "waiting") return;
    setError(null);
    setPhase("joining");
    const socket = getSocket();
    const trimmed = nicknameInput.trim();
    socket.emit("player:join", { pin, nickname: trimmed }, (ack) => {
      if (!ack.ok) {
        setError(ack.message);
        setPhase("nickname");
        return;
      }
      sessionStorage.setItem(TOKEN_STORAGE_KEY, ack.playerToken);
      setActiveNickname(ack.nickname);
      setPhase("waiting");
    });
  }

  if (phase === "waiting" && activeNickname) {
    return (
      <LobbyWaiting
        pin={pin}
        quizTitle={quizTitle}
        nickname={activeNickname}
        otherPlayers={otherPlayers}
      />
    );
  }

  // Nickname / joining ekranı (mockup #21)
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

        {error ? (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            ⚠ {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-md space-y-4">
          <input
            type="text"
            value={nicknameInput}
            onChange={(e) => setNicknameInput(e.target.value)}
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
            disabled={phase === "joining"}
            className="bg-brand shadow-brand/30 w-full rounded-2xl py-4 font-bold tracking-wider text-white uppercase shadow-lg transition active:scale-95 disabled:opacity-60"
          >
            {phase === "joining" ? "Katılıyor..." : "Katıl"}
          </button>
        </form>
      </main>
    </div>
  );
}

function LobbyWaiting({
  pin,
  quizTitle,
  nickname,
  otherPlayers,
}: {
  pin: string;
  quizTitle: string;
  nickname: string;
  otherPlayers: LobbyPlayerDTO[];
}) {
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
              {otherPlayers.length > 12 ? (
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium">
                  +{otherPlayers.length - 12}
                </span>
              ) : null}
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
