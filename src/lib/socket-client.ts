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
    transports: ["websocket", "polling"],
    reconnection: true,
  });
  return cached;
}

export function disconnectSocket(): void {
  if (cached) {
    cached.disconnect();
    cached = null;
  }
}
