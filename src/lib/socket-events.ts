// Socket.IO event sözleşmesi — server ve client paylaşır.
// PLAN.md "Socket.IO Event Sözleşmesi" bölümüyle uyumlu.

export interface LobbyPlayerDTO {
  nickname: string;
  connected: boolean;
  joinedAt: number;
}

export interface LobbyStatePayload {
  pin: string;
  status: "lobby" | "in_progress" | "ended" | "abandoned";
  quizTitle: string;
  hostConnected: boolean;
  players: LobbyPlayerDTO[];
}

// ---- Server → Client ----
export interface ServerToClientEvents {
  "lobby:state": (payload: LobbyStatePayload) => void;
  "lobby:player_joined": (payload: { nickname: string; players: LobbyPlayerDTO[] }) => void;
  "lobby:player_left": (payload: { nickname: string; players: LobbyPlayerDTO[] }) => void;
  "host:gone": (payload: { graceMs: number }) => void;
  "session:abandoned": (payload: { reason: "host_gone" | "lobby_idle" | "cancelled" }) => void;
  error: (payload: { code: string; message: string }) => void;
}

// ---- Client → Server ----
type AckOk<T = void> = T extends void ? { ok: true } : { ok: true } & T;
type AckErr = { ok: false; code: string; message: string };
export type Ack<T = void> = AckOk<T> | AckErr;

export interface ClientToServerEvents {
  "host:join_session": (payload: { pin: string }, ack: (r: Ack) => void) => void;
  "player:join": (
    payload: { pin: string; nickname: string },
    ack: (r: Ack<{ playerToken: string; nickname: string }>) => void
  ) => void;
  "player:reconnect": (
    payload: { playerToken: string },
    ack: (r: Ack<{ pin: string; nickname: string }>) => void
  ) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

// Faz 3+'da socket başına saklanan veri için (örn. cached playerToken).
// Şimdilik boş; type alias olarak kullanmak interface lint kuralından kaçar.
export type SocketData = Record<string, never>;
