// Bilbil — Custom Next.js + Socket.IO server
// Faz 0: Sadece ping/pong testi. Faz 2'de gerçek game state handler'ları eklenecek.

import { createServer } from "node:http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = Number(process.env.PORT) || 3000;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

void app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new SocketIOServer(httpServer, {
    cors: { origin: dev ? "*" : process.env.NEXT_PUBLIC_APP_URL },
  });

  // Faz 0 smoke test: ping/pong
  io.on("connection", (socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    socket.on("ping", (cb: (response: string) => void) => {
      console.log(`[socket] ping from ${socket.id}`);
      cb("pong");
    });

    socket.on("disconnect", () => {
      console.log(`[socket] disconnected: ${socket.id}`);
    });
  });

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
