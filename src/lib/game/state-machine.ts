// In-memory live game state. DB'ye yazma sadece create + bitiş anında.
// Tüm "canlı" davranış (oyuncu listesi, host bağlantısı, soru durumu) burada.
// Process restart = canlı oyun kaybı (kabul edilen MVP trade-off).

import { randomBytes } from "node:crypto";
import { validateNickname, suggestUniqueNickname } from "./validators";

export const MAX_PLAYERS_PER_SESSION = 50;
export const HOST_DISCONNECT_GRACE_MS = 2 * 60 * 1000; // Karar 8: 2 dk
export const LOBBY_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // Karar 7: 30 dk

export type SessionStatus = "lobby" | "in_progress" | "ended" | "abandoned";

export interface Player {
  playerToken: string;
  nickname: string;
  socketId: string | null;
  joinedAt: number;
}

export interface LiveSession {
  sessionId: string; // DB GameSession.id
  pin: string;
  hostId: string;
  hostSocketId: string | null;
  hostDisconnectedAt: number | null;
  quizId: string;
  quizTitle: string;
  status: SessionStatus;
  players: Map<string, Player>; // playerToken -> Player
  createdAt: number;
  startedAt: number | null;
}

export interface CreateSessionInput {
  sessionId: string;
  pin: string;
  hostId: string;
  hostSocketId: string;
  quizId: string;
  quizTitle: string;
}

type AddPlayerOk = { ok: true; player: Player; suggested: boolean };
type AddPlayerErr = {
  ok: false;
  reason:
    | "session_not_found"
    | "session_full"
    | "session_not_lobby"
    | "too_short"
    | "too_long"
    | "invalid_chars"
    | "reserved"
    | "profanity";
};
export type AddPlayerResult = AddPlayerOk | AddPlayerErr;

export type DisconnectResult =
  | { kind: "host"; session: LiveSession }
  | { kind: "player"; session: LiveSession; player: Player }
  | { kind: "unknown" };

export interface CleanupResult {
  abandoned: string[]; // PIN'ler
}

function generatePlayerToken(): string {
  return randomBytes(24).toString("base64url");
}

export class GameSessionManager {
  private sessionsByPin = new Map<string, LiveSession>();
  private playerTokenIndex = new Map<string, string>(); // playerToken -> pin
  private socketIndex = new Map<
    string,
    { kind: "host" | "player"; pin: string; playerToken?: string }
  >();

  createSession(input: CreateSessionInput): LiveSession {
    if (this.sessionsByPin.has(input.pin)) {
      throw new Error(`PIN zaten aktif: ${input.pin}`);
    }
    const session: LiveSession = {
      sessionId: input.sessionId,
      pin: input.pin,
      hostId: input.hostId,
      hostSocketId: input.hostSocketId,
      hostDisconnectedAt: null,
      quizId: input.quizId,
      quizTitle: input.quizTitle,
      status: "lobby",
      players: new Map(),
      createdAt: Date.now(),
      startedAt: null,
    };
    this.sessionsByPin.set(input.pin, session);
    this.socketIndex.set(input.hostSocketId, { kind: "host", pin: input.pin });
    return session;
  }

  getByPin(pin: string): LiveSession | null {
    return this.sessionsByPin.get(pin) ?? null;
  }

  hasActivePin(pin: string): boolean {
    return this.sessionsByPin.has(pin);
  }

  removeSession(pin: string): void {
    const s = this.sessionsByPin.get(pin);
    if (!s) return;
    if (s.hostSocketId) this.socketIndex.delete(s.hostSocketId);
    for (const [token, p] of s.players) {
      this.playerTokenIndex.delete(token);
      if (p.socketId) this.socketIndex.delete(p.socketId);
    }
    this.sessionsByPin.delete(pin);
  }

  addPlayer(pin: string, nicknameInput: string, socketId: string): AddPlayerResult {
    const session = this.sessionsByPin.get(pin);
    if (!session) return { ok: false, reason: "session_not_found" };
    if (session.status !== "lobby") return { ok: false, reason: "session_not_lobby" };
    if (session.players.size >= MAX_PLAYERS_PER_SESSION) {
      return { ok: false, reason: "session_full" };
    }

    const validation = validateNickname(nicknameInput);
    if (!validation.ok) return { ok: false, reason: validation.reason };

    const taken = new Set(Array.from(session.players.values()).map((p) => p.nickname));
    const finalNickname = suggestUniqueNickname(validation.nickname, taken);
    const suggested = finalNickname !== validation.nickname;

    const player: Player = {
      playerToken: generatePlayerToken(),
      nickname: finalNickname,
      socketId,
      joinedAt: Date.now(),
    };
    session.players.set(player.playerToken, player);
    this.playerTokenIndex.set(player.playerToken, pin);
    this.socketIndex.set(socketId, { kind: "player", pin, playerToken: player.playerToken });
    return { ok: true, player, suggested };
  }

  getPlayerByToken(playerToken: string): { session: LiveSession; player: Player } | null {
    const pin = this.playerTokenIndex.get(playerToken);
    if (!pin) return null;
    const session = this.sessionsByPin.get(pin);
    if (!session) return null;
    const player = session.players.get(playerToken);
    if (!player) return null;
    return { session, player };
  }

  removePlayer(playerToken: string): void {
    const found = this.getPlayerByToken(playerToken);
    if (!found) return;
    if (found.player.socketId) this.socketIndex.delete(found.player.socketId);
    found.session.players.delete(playerToken);
    this.playerTokenIndex.delete(playerToken);
  }

  reconnectPlayer(
    playerToken: string,
    newSocketId: string
  ): { session: LiveSession; player: Player } | null {
    const found = this.getPlayerByToken(playerToken);
    if (!found) return null;
    if (found.player.socketId) this.socketIndex.delete(found.player.socketId);
    found.player.socketId = newSocketId;
    this.socketIndex.set(newSocketId, { kind: "player", pin: found.session.pin, playerToken });
    return found;
  }

  disconnectHost(pin: string): void {
    const session = this.sessionsByPin.get(pin);
    if (!session) return;
    if (session.hostSocketId) this.socketIndex.delete(session.hostSocketId);
    session.hostSocketId = null;
    session.hostDisconnectedAt = Date.now();
  }

  reconnectHost(pin: string, newSocketId: string): boolean {
    const session = this.sessionsByPin.get(pin);
    if (!session) return false;
    session.hostSocketId = newSocketId;
    session.hostDisconnectedAt = null;
    this.socketIndex.set(newSocketId, { kind: "host", pin });
    return true;
  }

  endSession(pin: string, status: Extract<SessionStatus, "ended" | "abandoned">): void {
    const session = this.sessionsByPin.get(pin);
    if (!session) return;
    session.status = status;
  }

  // Disconnect olduğunda hangi rol? Cevap üst katmanda Socket.IO event'lerini
  // doğru yere yöneltmek için kullanılır.
  handleSocketDisconnect(socketId: string): DisconnectResult {
    const entry = this.socketIndex.get(socketId);
    if (!entry) return { kind: "unknown" };

    const session = this.sessionsByPin.get(entry.pin);
    if (!session) {
      this.socketIndex.delete(socketId);
      return { kind: "unknown" };
    }

    if (entry.kind === "host") {
      this.disconnectHost(entry.pin);
      return { kind: "host", session };
    }

    // player
    const player = entry.playerToken ? session.players.get(entry.playerToken) : undefined;
    if (!player) {
      this.socketIndex.delete(socketId);
      return { kind: "unknown" };
    }
    player.socketId = null;
    this.socketIndex.delete(socketId);
    return { kind: "player", session, player };
  }

  // Periyodik temizlik. Üst katmandan setInterval ile çağrılır.
  cleanup(now: number = Date.now()): CleanupResult {
    const abandoned: string[] = [];
    for (const session of this.sessionsByPin.values()) {
      if (session.status !== "lobby" && session.status !== "in_progress") continue;

      const hostGone =
        session.hostDisconnectedAt !== null &&
        now - session.hostDisconnectedAt > HOST_DISCONNECT_GRACE_MS;
      const lobbyIdle =
        session.status === "lobby" && now - session.createdAt > LOBBY_IDLE_TIMEOUT_MS;

      if (hostGone || lobbyIdle) {
        session.status = "abandoned";
        abandoned.push(session.pin);
      }
    }
    for (const pin of abandoned) this.removeSession(pin);
    return { abandoned };
  }

  // Snapshot — UI'a yayınlamak için sade veri.
  toLobbyStateDTO(pin: string): LobbyStateDTO | null {
    const session = this.sessionsByPin.get(pin);
    if (!session) return null;
    return {
      pin: session.pin,
      status: session.status,
      quizTitle: session.quizTitle,
      hostConnected: session.hostSocketId !== null,
      players: Array.from(session.players.values()).map((p) => ({
        nickname: p.nickname,
        connected: p.socketId !== null,
        joinedAt: p.joinedAt,
      })),
    };
  }
}

export interface LobbyStateDTO {
  pin: string;
  status: SessionStatus;
  quizTitle: string;
  hostConnected: boolean;
  players: Array<{
    nickname: string;
    connected: boolean;
    joinedAt: number;
  }>;
}

// Singleton — Faz 2 boyunca tek manager. Tüm sunucu içi state burada.
// Eğer scale-out gerekirse Faz 5+'da Redis adapter'a taşınır.
declare global {
  var __bilbil_gameManager: GameSessionManager | undefined;
}

export const gameManager: GameSessionManager =
  globalThis.__bilbil_gameManager ?? (globalThis.__bilbil_gameManager = new GameSessionManager());
