// Client-side Socket.IO wrapper. Tek bağlantı paylaşır.

"use client";

import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@/lib/socket-events";

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let cached: GameSocket | null = null;

export function getSocket(): GameSocket {
  if (cached && cached.connected) return cached;
  cached = io({
    autoConnect: true,
    // Polling önce, sonra WebSocket'e upgrade — Cloudflare tunnel / reverse proxy
    // arkasında daha robust (WebSocket-only handshake bazı edge case'lerde fail eder).
    transports: ["polling", "websocket"],
    upgrade: true,
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
  });
  return cached;
}

export function disconnectSocket(): void {
  if (cached) {
    cached.disconnect();
    cached = null;
  }
}
