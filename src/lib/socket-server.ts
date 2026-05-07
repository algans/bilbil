// Server-side Socket.IO handlers — Faz 2 (lobby) + Faz 3 (question lifecycle).
//
// Server-side timer'lar (countdown + question) burada yönetilir.
// Game state için src/lib/game/state-machine.ts singleton kullanılır.
// DB persist sadece game ended olunca (single transaction).

import type { Server, Socket } from "socket.io";
import { db } from "@/lib/db";
import { gameManager, type LiveSession } from "@/lib/game/state-machine";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "@/lib/socket-events";

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type SIO = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

const ROOM_PREFIX = "session:";
const COUNTDOWN_SEC = 4;
const roomFor = (pin: string) => `${ROOM_PREFIX}${pin}`;

// PIN başına aktif timer referansları — clearTimeout için tutuluyor.
const pendingTimers = new Map<string, NodeJS.Timeout>();
function clearPendingTimer(pin: string): void {
  const t = pendingTimers.get(pin);
  if (t) {
    clearTimeout(t);
    pendingTimers.delete(pin);
  }
}

export function attachSocketHandlers(io: IO): void {
  io.on("connection", (socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    socket.on("host:join_session", async (payload, ack) => {
      try {
        await handleHostJoin(io, socket, payload.pin, ack);
      } catch (err) {
        console.error("[host:join_session]", err);
        ack({ ok: false, code: "internal", message: "Beklenmeyen bir hata oluştu" });
      }
    });

    socket.on("player:join", async (payload, ack) => {
      try {
        await handlePlayerJoin(io, socket, payload.pin, payload.nickname, ack);
      } catch (err) {
        console.error("[player:join]", err);
        ack({ ok: false, code: "internal", message: "Beklenmeyen bir hata oluştu" });
      }
    });

    socket.on("player:reconnect", async (payload, ack) => {
      try {
        handlePlayerReconnect(io, socket, payload.playerToken, ack);
      } catch (err) {
        console.error("[player:reconnect]", err);
        ack({ ok: false, code: "internal", message: "Beklenmeyen bir hata oluştu" });
      }
    });

    socket.on("host:start_game", async (payload, ack) => {
      try {
        await handleHostStartGame(io, payload.pin, ack);
      } catch (err) {
        console.error("[host:start_game]", err);
        ack({ ok: false, code: "internal", message: "Beklenmeyen bir hata oluştu" });
      }
    });

    socket.on("host:show_leaderboard", async (payload, ack) => {
      try {
        await handleHostShowLeaderboard(io, payload.pin, ack);
      } catch (err) {
        console.error("[host:show_leaderboard]", err);
        ack({ ok: false, code: "internal", message: "Beklenmeyen bir hata oluştu" });
      }
    });

    socket.on("host:next_question", async (payload, ack) => {
      try {
        handleHostNextQuestion(io, payload.pin, ack);
      } catch (err) {
        console.error("[host:next_question]", err);
        ack({ ok: false, code: "internal", message: "Beklenmeyen bir hata oluştu" });
      }
    });

    socket.on("player:submit_answer", async (payload, ack) => {
      try {
        handlePlayerSubmitAnswer(io, socket, payload.optionId, ack);
      } catch (err) {
        console.error("[player:submit_answer]", err);
        ack({ ok: false, code: "internal", message: "Beklenmeyen bir hata oluştu" });
      }
    });

    socket.on("disconnect", () => {
      const result = gameManager.handleSocketDisconnect(socket.id);
      if (result.kind === "host") {
        io.to(roomFor(result.session.pin)).emit("host:gone", {
          graceMs: 2 * 60 * 1000,
        });
        broadcastLobby(io, result.session.pin);
      } else if (result.kind === "player") {
        broadcastLobby(io, result.session.pin);
      }
    });
  });

  // Periyodik cleanup — host disconnect grace, lobby idle, ended TTL.
  setInterval(() => {
    const { abandoned, expired } = gameManager.cleanup();
    for (const pin of abandoned) {
      io.to(roomFor(pin)).emit("session:abandoned", { reason: "host_gone" });
      clearPendingTimer(pin);
      void db.gameSession
        .updateMany({
          where: { pin, status: { in: ["lobby", "in_progress"] } },
          data: { status: "abandoned", endedAt: new Date() },
        })
        .catch((e) => console.error("[cleanup db update]", e));
    }
    for (const pin of expired) {
      clearPendingTimer(pin);
    }
  }, 30_000);
}

// ───────────────── Lobby handlers ─────────────────

async function handleHostJoin(
  io: IO,
  socket: SIO,
  pin: string,
  ack: (r: { ok: true } | { ok: false; code: string; message: string }) => void
): Promise<void> {
  const dbSession = await db.gameSession.findUnique({
    where: { pin },
    select: {
      id: true,
      hostId: true,
      quizId: true,
      status: true,
      quiz: {
        select: {
          title: true,
          questions: {
            include: { options: true },
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });
  if (!dbSession) {
    return ack({ ok: false, code: "not_found", message: "Session bulunamadı" });
  }
  if (dbSession.status === "ended" || dbSession.status === "abandoned") {
    return ack({ ok: false, code: "session_closed", message: "Bu oyun zaten kapanmış" });
  }

  let live = gameManager.getByPin(pin);
  if (!live) {
    live = gameManager.createSession({
      sessionId: dbSession.id,
      pin,
      hostId: dbSession.hostId,
      hostSocketId: socket.id,
      quizId: dbSession.quizId,
      quizTitle: dbSession.quiz.title,
    });
  } else {
    gameManager.reconnectHost(pin, socket.id);
  }

  // Soru listesi her host bağlanışında yenilenir (idempotent — başlamamışsa).
  if (live.phase === "lobby") {
    gameManager.loadQuestions(
      pin,
      dbSession.quiz.questions.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        order: q.order,
        timeLimitSec: q.timeLimitSec,
        options: q.options.map((o) => ({
          id: o.id,
          text: o.text,
          position: o.position,
          isCorrect: o.isCorrect,
        })),
      }))
    );
  }

  void socket.join(roomFor(pin));
  ack({ ok: true });
  // Host'a mevcut snapshot'ı gönder (state-driven)
  emitSnapshotToSocket(io, socket, pin, "host");
}

async function handlePlayerJoin(
  io: IO,
  socket: SIO,
  pin: string,
  nickname: string,
  ack: (
    r:
      | { ok: true; playerToken: string; nickname: string }
      | { ok: false; code: string; message: string }
  ) => void
): Promise<void> {
  if (!gameManager.hasActivePin(pin)) {
    const dbSession = await db.gameSession.findUnique({
      where: { pin },
      select: {
        id: true,
        hostId: true,
        quizId: true,
        status: true,
        quiz: { select: { title: true } },
      },
    });
    if (!dbSession || dbSession.status !== "lobby") {
      return ack({ ok: false, code: "not_found", message: "PIN geçersiz veya oyun başlamış" });
    }
    gameManager.createSession({
      sessionId: dbSession.id,
      pin,
      hostId: dbSession.hostId,
      hostSocketId: "",
      quizId: dbSession.quizId,
      quizTitle: dbSession.quiz.title,
    });
  }

  const result = gameManager.addPlayer(pin, nickname, socket.id);
  if (!result.ok) {
    const messages: Record<string, string> = {
      session_not_found: "PIN geçersiz",
      session_full: "Oyun dolu (max 50 oyuncu)",
      session_not_lobby: "Oyun zaten başlamış",
      too_short: "İsmin çok kısa",
      too_long: "İsmin çok uzun",
      invalid_chars: "İsmindeki karakterler geçerli değil",
      reserved: "Bu isim kullanılamaz",
      profanity: "Bu isim uygun değil",
    };
    return ack({
      ok: false,
      code: result.reason,
      message: messages[result.reason] ?? "Geçersiz nickname",
    });
  }

  void socket.join(roomFor(pin));
  ack({ ok: true, playerToken: result.player.playerToken, nickname: result.player.nickname });
  io.to(roomFor(pin)).emit("lobby:player_joined", {
    nickname: result.player.nickname,
    players: lobbyPlayersDTO(pin),
  });
  broadcastLobby(io, pin);
}

function handlePlayerReconnect(
  io: IO,
  socket: SIO,
  playerToken: string,
  ack: (
    r: { ok: true; pin: string; nickname: string } | { ok: false; code: string; message: string }
  ) => void
): void {
  const result = gameManager.reconnectPlayer(playerToken, socket.id);
  if (!result) {
    return ack({ ok: false, code: "not_found", message: "Oturum bulunamadı, yeniden katıl" });
  }
  void socket.join(roomFor(result.session.pin));
  ack({ ok: true, pin: result.session.pin, nickname: result.player.nickname });
  emitSnapshotToSocket(io, socket, result.session.pin, "player", playerToken);
}

// ───────────────── Question lifecycle handlers ─────────────────

async function handleHostStartGame(
  io: IO,
  pin: string,
  ack: (r: { ok: true } | { ok: false; code: string; message: string }) => void
): Promise<void> {
  const ok = gameManager.startGame(pin);
  if (!ok) {
    return ack({ ok: false, code: "cannot_start", message: "Oyun başlatılamadı (oyuncu / soru?)" });
  }
  await db.gameSession.update({
    where: { pin },
    data: { status: "in_progress", startedAt: new Date() },
  });
  ack({ ok: true });
  startCountdownAndOpenQuestion(io, pin);
}

function startCountdownAndOpenQuestion(io: IO, pin: string): void {
  const session = gameManager.getByPin(pin);
  if (!session) return;
  const opensAtMs = Date.now() + COUNTDOWN_SEC * 1000;
  io.to(roomFor(pin)).emit("game:countdown", {
    questionIndex: session.currentQuestionIndex,
    totalQuestions: session.questions.length,
    countdownSec: COUNTDOWN_SEC,
    opensAtMs,
  });
  clearPendingTimer(pin);
  pendingTimers.set(
    pin,
    setTimeout(() => {
      pendingTimers.delete(pin);
      const opened = gameManager.openCurrentQuestion(pin);
      if (!opened) return;
      const dto = gameManager.toQuestionStateDTO(pin);
      if (!dto) return;
      io.to(roomFor(pin)).emit("game:question_opened", dto);
      // Soru süresi dolunca otomatik kapat
      pendingTimers.set(
        pin,
        setTimeout(() => {
          pendingTimers.delete(pin);
          autoCloseQuestion(io, pin);
        }, opened.timeLimitSec * 1000)
      );
    }, COUNTDOWN_SEC * 1000)
  );
}

function autoCloseQuestion(io: IO, pin: string): void {
  const closed = gameManager.closeCurrentQuestion(pin);
  if (!closed) return;
  emitRevealToRoom(io, pin);
}

function emitRevealToRoom(io: IO, pin: string): void {
  const session = gameManager.getByPin(pin);
  if (!session) return;
  // Host'a myAnswer = null
  if (session.hostSocketId) {
    const hostDto = gameManager.toRevealStateDTO(pin);
    if (hostDto) io.to(session.hostSocketId).emit("game:reveal", hostDto);
  }
  // Her oyuncuya kendi myAnswer'ıyla
  for (const player of session.players.values()) {
    if (!player.socketId) continue;
    const dto = gameManager.toRevealStateDTO(pin, player.playerToken);
    if (dto) io.to(player.socketId).emit("game:reveal", dto);
  }
}

async function handleHostShowLeaderboard(
  io: IO,
  pin: string,
  ack: (r: { ok: true } | { ok: false; code: string; message: string }) => void
): Promise<void> {
  const result = gameManager.advanceFromReveal(pin);
  if (!result) {
    return ack({ ok: false, code: "wrong_phase", message: "Reveal aşamasında değil" });
  }
  ack({ ok: true });

  if (result.phase === "leaderboard") {
    const dto = gameManager.toLeaderboardDTO(pin);
    if (dto) io.to(roomFor(pin)).emit("game:leaderboard", dto);
  } else {
    // podium → DB persist + emit final
    await persistFinalResults(pin);
    emitFinalResults(io, pin);
  }
}

function handleHostNextQuestion(
  io: IO,
  pin: string,
  ack: (r: { ok: true } | { ok: false; code: string; message: string }) => void
): void {
  const ok = gameManager.advanceToNextQuestion(pin);
  if (!ok) {
    return ack({ ok: false, code: "wrong_phase", message: "Sonraki soruya geçilemiyor" });
  }
  ack({ ok: true });
  startCountdownAndOpenQuestion(io, pin);
}

function handlePlayerSubmitAnswer(
  io: IO,
  socket: SIO,
  optionId: string,
  ack: (
    r:
      | { ok: true; pointsAwarded: number; isCorrect: boolean }
      | { ok: false; code: string; message: string }
  ) => void
): void {
  // Player token'ı socket index'inden bul
  // socketIndex public değil — playerToken'ı doğrudan bulamayız.
  // Ancak gameManager.handleSocketDisconnect benzeri public API yok;
  // bu yüzden socket'in bağlı olduğu room'u (pin) çözüp player'ı bulalım.
  const rooms = Array.from(socket.rooms).filter((r) => r.startsWith(ROOM_PREFIX));
  if (rooms.length === 0) {
    return ack({ ok: false, code: "not_in_room", message: "Oyun odasında değilsin" });
  }
  const pin = rooms[0].slice(ROOM_PREFIX.length);
  const session = gameManager.getByPin(pin);
  if (!session) return ack({ ok: false, code: "session_not_found", message: "Oyun bulunamadı" });

  // Bu socket'in player'ı — players içinde socketId eşleşeni bul
  const player = Array.from(session.players.values()).find((p) => p.socketId === socket.id);
  if (!player) {
    return ack({ ok: false, code: "player_not_found", message: "Oyuncu kaydı yok" });
  }

  const result = gameManager.recordAnswer(player.playerToken, optionId);
  if (!result.ok) {
    const messages: Record<string, string> = {
      wrong_phase: "Soru aktif değil",
      no_question: "Soru bulunamadı",
      already_answered: "Cevabını zaten verdin",
      invalid_option: "Geçersiz şık",
      player_not_found: "Oyuncu bulunamadı",
      session_not_found: "Oyun bulunamadı",
    };
    return ack({
      ok: false,
      code: result.reason,
      message: messages[result.reason] ?? "Cevap kabul edilmedi",
    });
  }

  ack({ ok: true, pointsAwarded: result.record.pointsAwarded, isCorrect: result.record.isCorrect });

  // Host'a progress
  if (session.hostSocketId) {
    io.to(session.hostSocketId).emit("game:answer_progress", {
      answered: gameManager.countAnswers(pin),
      total: session.players.size,
    });
  }

  // Tüm oyuncular cevapladıysa erken kapat
  if (gameManager.allPlayersAnswered(pin)) {
    clearPendingTimer(pin);
    autoCloseQuestion(io, pin);
  }
}

// ───────────────── Persist + final ─────────────────

async function persistFinalResults(pin: string): Promise<void> {
  const session = gameManager.getByPin(pin);
  if (!session) return;
  const records = gameManager.collectFinalRecords(pin);
  if (!records) return;

  try {
    await db.$transaction(async (tx) => {
      await tx.gameSession.update({
        where: { id: session.sessionId },
        data: { status: "ended", endedAt: new Date() },
      });
      // Sıralı insertMany — duplicate (sessionId, nickname) constraint'i koruyor
      if (records.results.length > 0) {
        await tx.playerResult.createMany({
          data: records.results.map((r) => ({
            sessionId: session.sessionId,
            nickname: r.nickname,
            finalScore: r.finalScore,
            finalRank: r.finalRank,
          })),
          skipDuplicates: true,
        });
      }
      if (records.answers.length > 0) {
        await tx.playerAnswer.createMany({
          data: records.answers.map((a) => ({
            sessionId: session.sessionId,
            questionId: a.questionId,
            nickname: a.nickname,
            optionId: a.optionId,
            answeredAtMs: a.answeredAtMs,
            pointsAwarded: a.pointsAwarded,
            isCorrect: a.isCorrect,
          })),
        });
      }
    });
  } catch (e) {
    // MVP: persist hatasını logla, podium gene gösterilir
    console.error("[persistFinalResults]", e);
  }
}

function emitFinalResults(io: IO, pin: string): void {
  const session = gameManager.getByPin(pin);
  if (!session) return;
  const podium = gameManager.toPodiumDTO(pin);
  if (!podium) return;

  // Host'a myRank = null
  if (session.hostSocketId) {
    io.to(session.hostSocketId).emit("game:final_results", { ...podium, myRank: null });
  }
  // Her player'a kendi rank'ıyla
  for (const player of session.players.values()) {
    if (!player.socketId) continue;
    const myRank = gameManager.getPlayerRank(pin, player.playerToken);
    io.to(player.socketId).emit("game:final_results", { ...podium, myRank });
  }
}

// ───────────────── Snapshot (reconnect / initial) ─────────────────

function emitSnapshotToSocket(
  io: IO,
  socket: SIO,
  pin: string,
  role: "host" | "player",
  playerToken?: string
): void {
  const session = gameManager.getByPin(pin);
  if (!session) return;

  // Lobby state her zaman gönderilir (UI base'i için)
  const lobbyDTO = gameManager.toLobbyStateDTO(pin);
  if (lobbyDTO) socket.emit("lobby:state", lobbyDTO);

  if (session.phase === "lobby") return;

  if (session.phase === "countdown") {
    // Kalan süre yaklaşık — yeni socket için yeni countdown emit etsek de ok
    socket.emit("game:countdown", {
      questionIndex: session.currentQuestionIndex,
      totalQuestions: session.questions.length,
      countdownSec: COUNTDOWN_SEC,
      opensAtMs: Date.now() + COUNTDOWN_SEC * 1000, // Yaklaşık
    });
    return;
  }

  if (session.phase === "question") {
    const dto = gameManager.toQuestionStateDTO(pin);
    if (dto) socket.emit("game:question_opened", dto);
    return;
  }

  if (session.phase === "reveal") {
    const dto = gameManager.toRevealStateDTO(pin, role === "player" ? playerToken : undefined);
    if (dto) socket.emit("game:reveal", dto);
    return;
  }

  if (session.phase === "leaderboard") {
    const dto = gameManager.toLeaderboardDTO(pin);
    if (dto) socket.emit("game:leaderboard", dto);
    return;
  }

  if (session.phase === "podium") {
    const podium = gameManager.toPodiumDTO(pin);
    if (!podium) return;
    const myRank =
      role === "player" && playerToken ? gameManager.getPlayerRank(pin, playerToken) : null;
    socket.emit("game:final_results", { ...podium, myRank });
  }
}

// ───────────────── Lobby helpers ─────────────────

function broadcastLobby(io: IO, pin: string): void {
  const dto = gameManager.toLobbyStateDTO(pin);
  if (!dto) return;
  io.to(roomFor(pin)).emit("lobby:state", dto);
}

function lobbyPlayersDTO(pin: string) {
  return gameManager.toLobbyStateDTO(pin)?.players ?? [];
}

// LiveSession import unused fix — type only kullanım
export type { LiveSession };
