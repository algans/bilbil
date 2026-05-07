// In-memory live game state. DB'ye yazma sadece create + bitiş anında.
// Tüm "canlı" davranış (oyuncu listesi, host bağlantısı, soru durumu, skor) burada.
// Process restart = canlı oyun kaybı (kabul edilen MVP trade-off).

import { randomBytes } from "node:crypto";
import { calculateScore } from "./scoring";
import { rankPlayers, type LeaderboardEntry } from "./leaderboard";
import { validateNickname, suggestUniqueNickname } from "./validators";

export const MAX_PLAYERS_PER_SESSION = 50;
export const HOST_DISCONNECT_GRACE_MS = 2 * 60 * 1000; // Karar 8: 2 dk
export const LOBBY_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // Karar 7: 30 dk
export const ENDED_SESSION_TTL_MS = 10 * 60 * 1000; // Faz 3: ended sonrası 10 dk

export type SessionStatus = "lobby" | "in_progress" | "ended" | "abandoned";
export type Phase = "lobby" | "countdown" | "question" | "reveal" | "leaderboard" | "podium";

export interface Player {
  playerToken: string;
  nickname: string;
  socketId: string | null;
  joinedAt: number;
}

export interface SessionQuestion {
  id: string;
  prompt: string;
  order: number;
  timeLimitSec: number;
  options: SessionQuestionOption[];
}

export interface SessionQuestionOption {
  id: string;
  text: string;
  position: number;
  isCorrect: boolean;
}

export interface AnswerRecord {
  optionId: string | null;
  answeredAtMs: number;
  isCorrect: boolean;
  pointsAwarded: number;
}

export interface LiveSession {
  sessionId: string;
  pin: string;
  hostId: string;
  hostSocketId: string | null;
  hostDisconnectedAt: number | null;
  quizId: string;
  quizTitle: string;
  status: SessionStatus;
  phase: Phase;
  players: Map<string, Player>;
  questions: SessionQuestion[];
  currentQuestionIndex: number; // -1 = henüz başlamadı
  questionStartedAtMs: number | null;
  /** questionId → (playerToken → AnswerRecord). */
  answers: Map<string, Map<string, AnswerRecord>>;
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
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

export type SubmitAnswerResult =
  | { ok: true; record: AnswerRecord }
  | {
      ok: false;
      reason:
        | "session_not_found"
        | "wrong_phase"
        | "no_question"
        | "already_answered"
        | "invalid_option"
        | "player_not_found";
    };

export type DisconnectResult =
  | { kind: "host"; session: LiveSession }
  | { kind: "player"; session: LiveSession; player: Player }
  | { kind: "unknown" };

export interface CleanupResult {
  abandoned: string[];
  expired: string[]; // ended/abandoned sonrası 10 dk geçen
}

function generatePlayerToken(): string {
  return randomBytes(24).toString("base64url");
}

export class GameSessionManager {
  private sessionsByPin = new Map<string, LiveSession>();
  private playerTokenIndex = new Map<string, string>();
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
      hostSocketId: input.hostSocketId || null,
      hostDisconnectedAt: null,
      quizId: input.quizId,
      quizTitle: input.quizTitle,
      status: "lobby",
      phase: "lobby",
      players: new Map(),
      questions: [],
      currentQuestionIndex: -1,
      questionStartedAtMs: null,
      answers: new Map(),
      createdAt: Date.now(),
      startedAt: null,
      endedAt: null,
    };
    this.sessionsByPin.set(input.pin, session);
    if (input.hostSocketId) {
      this.socketIndex.set(input.hostSocketId, { kind: "host", pin: input.pin });
    }
    return session;
  }

  loadQuestions(pin: string, questions: SessionQuestion[]): void {
    const session = this.sessionsByPin.get(pin);
    if (!session) return;
    session.questions = questions.slice().sort((a, b) => a.order - b.order);
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
    if (session.status !== "lobby" || session.phase !== "lobby") {
      return { ok: false, reason: "session_not_lobby" };
    }
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

  // ──────────────────────────── Faz 3 — Question Lifecycle ────────────────────────────

  /** Host "Oyunu Başlat" basınca: lobby → countdown (host kontrolünde, ilk soruya hazır). */
  startGame(pin: string, nowMs: number = Date.now()): boolean {
    const session = this.sessionsByPin.get(pin);
    if (!session) return false;
    if (session.phase !== "lobby") return false;
    if (session.questions.length === 0) return false;
    if (session.players.size === 0) return false;
    session.status = "in_progress";
    session.phase = "countdown";
    session.startedAt = nowMs;
    session.currentQuestionIndex = 0;
    return true;
  }

  /** Countdown bitince soruyu aç → server-side timestamp burada set edilir. */
  openCurrentQuestion(pin: string, nowMs: number = Date.now()): SessionQuestion | null {
    const session = this.sessionsByPin.get(pin);
    if (!session) return null;
    if (session.phase !== "countdown") return null;
    const q = this.getCurrentQuestion(pin);
    if (!q) return null;
    session.phase = "question";
    session.questionStartedAtMs = nowMs;
    session.answers.set(q.id, new Map());
    return q;
  }

  /** Soruyu kapat (timer doldu veya tüm oyuncular cevapladı). Otomatik scoring uygulanır. */
  closeCurrentQuestion(pin: string): SessionQuestion | null {
    const session = this.sessionsByPin.get(pin);
    if (!session) return null;
    if (session.phase !== "question") return null;
    const q = this.getCurrentQuestion(pin);
    if (!q) return null;

    // Cevapsız (timeout) oyunculara penalty kaydı: optionId=null, answeredAt=totalTime, score=0
    const answersForQ = session.answers.get(q.id) ?? new Map();
    const totalTimeMs = q.timeLimitSec * 1000;
    for (const player of session.players.values()) {
      if (!answersForQ.has(player.playerToken)) {
        answersForQ.set(player.playerToken, {
          optionId: null,
          answeredAtMs: totalTimeMs,
          isCorrect: false,
          pointsAwarded: 0,
        });
      }
    }
    session.answers.set(q.id, answersForQ);
    session.phase = "reveal";
    session.questionStartedAtMs = null;
    return q;
  }

  recordAnswer(
    playerToken: string,
    optionId: string,
    nowMs: number = Date.now()
  ): SubmitAnswerResult {
    const found = this.getPlayerByToken(playerToken);
    if (!found) return { ok: false, reason: "player_not_found" };
    const session = found.session;
    if (session.phase !== "question") return { ok: false, reason: "wrong_phase" };
    if (session.questionStartedAtMs === null) return { ok: false, reason: "wrong_phase" };

    const q = this.getCurrentQuestion(session.pin);
    if (!q) return { ok: false, reason: "no_question" };
    const option = q.options.find((o) => o.id === optionId);
    if (!option) return { ok: false, reason: "invalid_option" };

    const answersForQ = session.answers.get(q.id) ?? new Map<string, AnswerRecord>();
    if (answersForQ.has(playerToken)) return { ok: false, reason: "already_answered" };

    const answeredAtMs = Math.max(0, nowMs - session.questionStartedAtMs);
    const totalTimeMs = q.timeLimitSec * 1000;
    const points = calculateScore({
      isCorrect: option.isCorrect,
      answeredAtMs,
      totalTimeMs,
    });
    const record: AnswerRecord = {
      optionId,
      answeredAtMs,
      isCorrect: option.isCorrect,
      pointsAwarded: points,
    };
    answersForQ.set(playerToken, record);
    session.answers.set(q.id, answersForQ);
    return { ok: true, record };
  }

  allPlayersAnswered(pin: string): boolean {
    const session = this.sessionsByPin.get(pin);
    if (!session) return false;
    const q = this.getCurrentQuestion(pin);
    if (!q) return false;
    const answersForQ = session.answers.get(q.id);
    if (!answersForQ) return false;
    return answersForQ.size >= session.players.size;
  }

  countAnswers(pin: string): number {
    const session = this.sessionsByPin.get(pin);
    if (!session) return 0;
    const q = this.getCurrentQuestion(pin);
    if (!q) return 0;
    return session.answers.get(q.id)?.size ?? 0;
  }

  /** Host "Leaderboard'a Geç" basınca: reveal → leaderboard (ara) veya podium (son soru). */
  advanceFromReveal(pin: string): { phase: "leaderboard" | "podium" } | null {
    const session = this.sessionsByPin.get(pin);
    if (!session) return null;
    if (session.phase !== "reveal") return null;
    const isLast = session.currentQuestionIndex >= session.questions.length - 1;
    if (isLast) {
      session.phase = "podium";
      session.status = "ended";
      session.endedAt = Date.now();
      return { phase: "podium" };
    }
    session.phase = "leaderboard";
    return { phase: "leaderboard" };
  }

  /** Host "Sonraki Soru →" basınca: leaderboard → countdown. */
  advanceToNextQuestion(pin: string): boolean {
    const session = this.sessionsByPin.get(pin);
    if (!session) return false;
    if (session.phase !== "leaderboard") return false;
    if (session.currentQuestionIndex >= session.questions.length - 1) return false;
    session.currentQuestionIndex += 1;
    session.phase = "countdown";
    return true;
  }

  endSession(pin: string, status: Extract<SessionStatus, "ended" | "abandoned">): void {
    const session = this.sessionsByPin.get(pin);
    if (!session) return;
    session.status = status;
    if (!session.endedAt) session.endedAt = Date.now();
  }

  getCurrentQuestion(pin: string): SessionQuestion | null {
    const session = this.sessionsByPin.get(pin);
    if (!session) return null;
    if (session.currentQuestionIndex < 0) return null;
    return session.questions[session.currentQuestionIndex] ?? null;
  }

  /** Toplam skor — leaderboard hesaplaması için. */
  getPlayerTotalScore(session: LiveSession, playerToken: string): number {
    let total = 0;
    for (const answersForQ of session.answers.values()) {
      const r = answersForQ.get(playerToken);
      if (r) total += r.pointsAwarded;
    }
    return total;
  }

  /** Tüm oyuncuların yanıt zamanları (ortalama tie-break için). */
  getPlayerAnswerTimes(session: LiveSession, playerToken: string): number[] {
    const out: number[] = [];
    for (const answersForQ of session.answers.values()) {
      const r = answersForQ.get(playerToken);
      if (r) out.push(r.answeredAtMs);
    }
    return out;
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

    const player = entry.playerToken ? session.players.get(entry.playerToken) : undefined;
    if (!player) {
      this.socketIndex.delete(socketId);
      return { kind: "unknown" };
    }
    player.socketId = null;
    this.socketIndex.delete(socketId);
    return { kind: "player", session, player };
  }

  // Periyodik temizlik: host disconnect grace dolarsa, lobby idle dolarsa,
  // ya da ended/abandoned session'lar 10dk'dan eskiyse silinir.
  cleanup(now: number = Date.now()): CleanupResult {
    const abandoned: string[] = [];
    const expired: string[] = [];
    for (const session of this.sessionsByPin.values()) {
      if (session.status === "lobby" || session.status === "in_progress") {
        const hostGone =
          session.hostDisconnectedAt !== null &&
          now - session.hostDisconnectedAt > HOST_DISCONNECT_GRACE_MS;
        const lobbyIdle =
          session.status === "lobby" &&
          session.phase === "lobby" &&
          now - session.createdAt > LOBBY_IDLE_TIMEOUT_MS;

        if (hostGone || lobbyIdle) {
          session.status = "abandoned";
          session.phase = "lobby";
          if (!session.endedAt) session.endedAt = now;
          abandoned.push(session.pin);
        }
      } else if (
        (session.status === "ended" || session.status === "abandoned") &&
        session.endedAt !== null &&
        now - session.endedAt > ENDED_SESSION_TTL_MS
      ) {
        expired.push(session.pin);
      }
    }
    for (const pin of [...abandoned, ...expired]) this.removeSession(pin);
    return { abandoned, expired };
  }

  // ─────────────── DTO'lar (UI'a yayın) ───────────────

  toLobbyStateDTO(pin: string): LobbyStateDTO | null {
    const session = this.sessionsByPin.get(pin);
    if (!session) return null;
    return {
      pin: session.pin,
      status: session.status,
      phase: session.phase,
      quizTitle: session.quizTitle,
      hostConnected: session.hostSocketId !== null,
      players: Array.from(session.players.values()).map((p) => ({
        nickname: p.nickname,
        connected: p.socketId !== null,
        joinedAt: p.joinedAt,
      })),
    };
  }

  toQuestionStateDTO(pin: string): QuestionStateDTO | null {
    const session = this.sessionsByPin.get(pin);
    if (!session) return null;
    if (session.phase !== "question" || session.questionStartedAtMs === null) return null;
    const q = this.getCurrentQuestion(pin);
    if (!q) return null;
    return {
      questionId: q.id,
      questionIndex: session.currentQuestionIndex,
      totalQuestions: session.questions.length,
      prompt: q.prompt,
      options: q.options
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((o) => ({ id: o.id, text: o.text, position: o.position })),
      timeLimitSec: q.timeLimitSec,
      startedAtMs: session.questionStartedAtMs,
      deadlineAtMs: session.questionStartedAtMs + q.timeLimitSec * 1000,
    };
  }

  toRevealStateDTO(pin: string, playerToken?: string): RevealStateDTO | null {
    const session = this.sessionsByPin.get(pin);
    if (!session) return null;
    const q = this.getCurrentQuestion(pin);
    if (!q) return null;
    const answersForQ = session.answers.get(q.id) ?? new Map<string, AnswerRecord>();

    const correctOption = q.options.find((o) => o.isCorrect);
    if (!correctOption) return null;

    const perOptionCounts: Record<string, number> = {};
    for (const o of q.options) perOptionCounts[o.id] = 0;
    for (const r of answersForQ.values()) {
      if (r.optionId) perOptionCounts[r.optionId] = (perOptionCounts[r.optionId] ?? 0) + 1;
    }

    const myAnswer = playerToken ? (answersForQ.get(playerToken) ?? null) : null;

    return {
      questionId: q.id,
      questionIndex: session.currentQuestionIndex,
      totalQuestions: session.questions.length,
      prompt: q.prompt,
      options: q.options
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((o) => ({ id: o.id, text: o.text, position: o.position })),
      correctOptionId: correctOption.id,
      perOptionCounts,
      myAnswer: myAnswer
        ? {
            optionId: myAnswer.optionId,
            isCorrect: myAnswer.isCorrect,
            pointsAwarded: myAnswer.pointsAwarded,
          }
        : null,
      isLast: session.currentQuestionIndex >= session.questions.length - 1,
    };
  }

  toLeaderboardDTO(pin: string, limit: number = 10): LeaderboardDTO | null {
    const session = this.sessionsByPin.get(pin);
    if (!session) return null;
    const entries = this.computeLeaderboard(session);
    return {
      questionIndex: session.currentQuestionIndex,
      totalQuestions: session.questions.length,
      isLast: session.currentQuestionIndex >= session.questions.length - 1,
      entries: entries.slice(0, limit).map((e) => ({
        rank: e.rank,
        nickname: e.nickname,
        totalScore: e.totalScore,
        averageAnswerTimeMs: Number.isFinite(e.averageAnswerTimeMs)
          ? Math.round(e.averageAnswerTimeMs)
          : null,
      })),
      totalPlayers: session.players.size,
    };
  }

  toPodiumDTO(pin: string): PodiumDTO | null {
    const session = this.sessionsByPin.get(pin);
    if (!session) return null;
    const entries = this.computeLeaderboard(session);
    return {
      quizTitle: session.quizTitle,
      totalPlayers: session.players.size,
      totalQuestions: session.questions.length,
      entries: entries.map((e) => ({
        rank: e.rank,
        nickname: e.nickname,
        totalScore: e.totalScore,
      })),
    };
  }

  /** Player'ın sıralamasını ve skorunu döndür (player ekranı için). */
  getPlayerRank(
    pin: string,
    playerToken: string
  ): { rank: number; nickname: string; totalScore: number; totalPlayers: number } | null {
    const session = this.sessionsByPin.get(pin);
    if (!session) return null;
    const entries = this.computeLeaderboard(session);
    const me = entries.find((e) => e.playerToken === playerToken);
    if (!me) return null;
    return {
      rank: me.rank,
      nickname: me.nickname,
      totalScore: me.totalScore,
      totalPlayers: entries.length,
    };
  }

  computeLeaderboard(session: LiveSession): LeaderboardEntry[] {
    return rankPlayers(
      Array.from(session.players.values()).map((p) => ({
        playerToken: p.playerToken,
        nickname: p.nickname,
        totalScore: this.getPlayerTotalScore(session, p.playerToken),
        answerTimesMs: this.getPlayerAnswerTimes(session, p.playerToken),
      }))
    );
  }

  /** Persist için: tüm cevaplar (PlayerAnswer + PlayerResult). */
  collectFinalRecords(pin: string): {
    results: Array<{ nickname: string; finalScore: number; finalRank: number }>;
    answers: Array<{
      questionId: string;
      nickname: string;
      optionId: string | null;
      answeredAtMs: number;
      pointsAwarded: number;
      isCorrect: boolean;
    }>;
  } | null {
    const session = this.sessionsByPin.get(pin);
    if (!session) return null;

    const ranked = this.computeLeaderboard(session);
    const tokenToNickname = new Map<string, string>();
    for (const p of session.players.values()) tokenToNickname.set(p.playerToken, p.nickname);

    const results = ranked.map((e) => ({
      nickname: e.nickname,
      finalScore: e.totalScore,
      finalRank: e.rank,
    }));

    const answers: Array<{
      questionId: string;
      nickname: string;
      optionId: string | null;
      answeredAtMs: number;
      pointsAwarded: number;
      isCorrect: boolean;
    }> = [];
    for (const [questionId, perPlayer] of session.answers.entries()) {
      for (const [playerToken, rec] of perPlayer.entries()) {
        const nickname = tokenToNickname.get(playerToken);
        if (!nickname) continue;
        answers.push({
          questionId,
          nickname,
          optionId: rec.optionId,
          answeredAtMs: rec.answeredAtMs,
          pointsAwarded: rec.pointsAwarded,
          isCorrect: rec.isCorrect,
        });
      }
    }

    return { results, answers };
  }
}

// ─────────────── DTO interface'leri ───────────────

export interface LobbyStateDTO {
  pin: string;
  status: SessionStatus;
  phase: Phase;
  quizTitle: string;
  hostConnected: boolean;
  players: Array<{ nickname: string; connected: boolean; joinedAt: number }>;
}

export interface QuestionOptionDTO {
  id: string;
  text: string;
  position: number;
}

export interface QuestionStateDTO {
  questionId: string;
  questionIndex: number;
  totalQuestions: number;
  prompt: string;
  options: QuestionOptionDTO[];
  timeLimitSec: number;
  startedAtMs: number;
  deadlineAtMs: number;
}

export interface RevealStateDTO {
  questionId: string;
  questionIndex: number;
  totalQuestions: number;
  prompt: string;
  options: QuestionOptionDTO[];
  correctOptionId: string;
  perOptionCounts: Record<string, number>;
  myAnswer: { optionId: string | null; isCorrect: boolean; pointsAwarded: number } | null;
  isLast: boolean;
}

export interface LeaderboardEntryDTO {
  rank: number;
  nickname: string;
  totalScore: number;
  averageAnswerTimeMs: number | null;
}

export interface LeaderboardDTO {
  questionIndex: number;
  totalQuestions: number;
  isLast: boolean;
  entries: LeaderboardEntryDTO[];
  totalPlayers: number;
}

export interface PodiumDTO {
  quizTitle: string;
  totalPlayers: number;
  totalQuestions: number;
  entries: Array<{ rank: number; nickname: string; totalScore: number }>;
}

// Singleton — tüm sunucu içi state burada.
declare global {
  var __bilbil_gameManager: GameSessionManager | undefined;
}

export const gameManager: GameSessionManager =
  globalThis.__bilbil_gameManager ?? (globalThis.__bilbil_gameManager = new GameSessionManager());
