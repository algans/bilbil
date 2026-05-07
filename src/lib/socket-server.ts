// Server-side Socket.IO handlers — Faz 2 lobby akışı.
// Faz 3'te question lifecycle event'leri burada uzayacak.

import type { Server, Socket } from "socket.io";
import { db } from "@/lib/db";
import { gameManager } from "@/lib/game/state-machine";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "@/lib/socket-events";

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type SIO = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

const ROOM_PREFIX = "session:";
const roomFor = (pin: string) => `${ROOM_PREFIX}${pin}`;

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

    socket.on("disconnect", () => {
      const result = gameManager.handleSocketDisconnect(socket.id);
      if (result.kind === "host") {
        // Host'a bildirim → grace period başlasın
        io.to(roomFor(result.session.pin)).emit("host:gone", {
          graceMs: 2 * 60 * 1000,
        });
        broadcastLobby(io, result.session.pin);
      } else if (result.kind === "player") {
        broadcastLobby(io, result.session.pin);
      }
    });
  });

  // Periyodik cleanup — host disconnect grace dolarsa ya da lobby idle dolarsa
  // session abandoned'e çekilir.
  setInterval(() => {
    const { abandoned } = gameManager.cleanup();
    for (const pin of abandoned) {
      io.to(roomFor(pin)).emit("session:abandoned", { reason: "host_gone" });
      // DB'yi de güncelle
      void db.gameSession
        .updateMany({
          where: { pin, status: { in: ["lobby", "in_progress"] } },
          data: { status: "abandoned", endedAt: new Date() },
        })
        .catch((e) => console.error("[cleanup db update]", e));
    }
  }, 30_000);
}

async function handleHostJoin(
  io: IO,
  socket: SIO,
  pin: string,
  ack: (r: { ok: true } | { ok: false; code: string; message: string }) => void
): Promise<void> {
  // DB'den session'ı çek + güvenlik kontrolü
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
  if (!dbSession) {
    return ack({ ok: false, code: "not_found", message: "Session bulunamadı" });
  }
  if (dbSession.status === "ended" || dbSession.status === "abandoned") {
    return ack({ ok: false, code: "session_closed", message: "Bu oyun zaten kapanmış" });
  }

  // hostId doğrulaması yapmıyoruz çünkü Socket.IO context'inde auth yok;
  // host page'i layout'ta zaten requireUser ile auth altına aldı, oraya
  // ulaşan kişi giriş yapmış host. Daha sıkı doğrulama Faz 4'te (cookie auth
  // socket handshake'ine taşınabilir).

  let live = gameManager.getByPin(pin);
  if (!live) {
    // Sayfa yüklenince ilk join — in-memory state'i kur.
    live = gameManager.createSession({
      sessionId: dbSession.id,
      pin,
      hostId: dbSession.hostId,
      hostSocketId: socket.id,
      quizId: dbSession.quizId,
      quizTitle: dbSession.quiz.title,
    });
  } else {
    // Reconnect — host hızlı F5 yaptıysa in-memory state hayatta.
    gameManager.reconnectHost(pin, socket.id);
  }

  void socket.join(roomFor(pin));
  ack({ ok: true });
  broadcastLobby(io, pin);
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
  // In-memory'de yoksa (host henüz bağlanmamış) DB'den hydrate et.
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
      hostSocketId: "", // host henüz yok
      quizId: dbSession.quizId,
      quizTitle: dbSession.quiz.title,
    });
    // Boş hostSocketId'yi mark olarak silebiliriz ama in-memory'de string allow ediyor.
    // hostDisconnectedAt = null olduğu için grace period başlamaz; host bağlanınca reconnect olur.
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
  broadcastLobby(io, result.session.pin);
}

function broadcastLobby(io: IO, pin: string): void {
  const dto = gameManager.toLobbyStateDTO(pin);
  if (!dto) return;
  io.to(roomFor(pin)).emit("lobby:state", dto);
}

function lobbyPlayersDTO(pin: string) {
  return gameManager.toLobbyStateDTO(pin)?.players ?? [];
}
