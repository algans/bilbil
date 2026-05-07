// Bilbil — Custom Next.js + Socket.IO server.
// Faz 2: Lobby akışı. Faz 3: question lifecycle. Faz 4: orphan cleanup + observability.

import { createServer } from "node:http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { attachSocketHandlers } from "./src/lib/socket-server";
import { db } from "./src/lib/db";
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "./src/lib/socket-events";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = Number(process.env.PORT) || 3000;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

/**
 * Process restart sonrası orphan session cleanup:
 * Önceki process'te in-memory'de yaşayan ama process restart'ta kaybolan
 * `lobby` veya `in_progress` durumundaki session'ları DB'de `abandoned`'e çevir.
 * Aksi halde DB'de yetim "in_progress" kayıtlar birikir + history sayfasında karışıklık.
 */
async function cleanupOrphanSessions(): Promise<void> {
  try {
    const result = await db.gameSession.updateMany({
      where: { status: { in: ["lobby", "in_progress"] } },
      data: { status: "abandoned", endedAt: new Date() },
    });
    if (result.count > 0) {
      console.log(`[bootstrap] ${result.count} orphan session(s) abandoned'e çekildi`);
    }
  } catch (e) {
    console.error("[bootstrap] orphan cleanup hatası:", e);
  }
}

void app.prepare().then(async () => {
  await cleanupOrphanSessions();

  const httpServer = createServer(handler);

  const io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: { origin: dev ? "*" : process.env.NEXT_PUBLIC_APP_URL },
  });

  attachSocketHandlers(io);

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`▸ Bilbil ready on http://${hostname}:${port}`);
      console.log(`▸ Socket.IO listening on same port`);
    });
});
