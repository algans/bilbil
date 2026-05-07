// Bilbil — Custom Next.js + Socket.IO server.
// Faz 2: Lobby akışı (host:join_session, player:join, lobby:state events).

import { createServer } from "node:http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { attachSocketHandlers } from "./src/lib/socket-server";
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

void app.prepare().then(() => {
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
