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
  phase: "lobby" | "countdown" | "question" | "reveal" | "leaderboard" | "podium";
  quizTitle: string;
  hostConnected: boolean;
  players: LobbyPlayerDTO[];
}

export interface QuestionOptionDTO {
  id: string;
  text: string;
  position: number;
}

export interface QuestionOpenedPayload {
  questionId: string;
  questionIndex: number;
  totalQuestions: number;
  prompt: string;
  options: QuestionOptionDTO[];
  timeLimitSec: number;
  startedAtMs: number;
  deadlineAtMs: number;
}

export interface CountdownPayload {
  questionIndex: number;
  totalQuestions: number;
  /** Toplam countdown süresi (saniye). Client kendi countdown ring'ini çalıştırır. */
  countdownSec: number;
  /** Server tarafında bu zamanda soru açılacak. */
  opensAtMs: number;
}

export interface RevealPayload {
  questionId: string;
  questionIndex: number;
  totalQuestions: number;
  prompt: string;
  options: QuestionOptionDTO[];
  correctOptionId: string;
  perOptionCounts: Record<string, number>;
  /** Sadece player'a dolu, host'a null. */
  myAnswer: { optionId: string | null; isCorrect: boolean; pointsAwarded: number } | null;
  isLast: boolean;
}

export interface LeaderboardEntryPayload {
  rank: number;
  nickname: string;
  totalScore: number;
  averageAnswerTimeMs: number | null;
}

export interface LeaderboardPayload {
  questionIndex: number;
  totalQuestions: number;
  isLast: boolean;
  entries: LeaderboardEntryPayload[];
  totalPlayers: number;
}

export interface PodiumPayload {
  quizTitle: string;
  totalPlayers: number;
  totalQuestions: number;
  entries: Array<{ rank: number; nickname: string; totalScore: number }>;
  /** Player'a kendi sırası. Host'a null. */
  myRank: { rank: number; nickname: string; totalScore: number; totalPlayers: number } | null;
}

export interface AnswerProgressPayload {
  answered: number;
  total: number;
}

// ---- Server → Client ----
export interface ServerToClientEvents {
  // Lobby
  "lobby:state": (payload: LobbyStatePayload) => void;
  "lobby:player_joined": (payload: { nickname: string; players: LobbyPlayerDTO[] }) => void;
  "lobby:player_left": (payload: { nickname: string; players: LobbyPlayerDTO[] }) => void;
  "host:gone": (payload: { graceMs: number }) => void;
  "session:abandoned": (payload: { reason: "host_gone" | "lobby_idle" | "cancelled" }) => void;
  // Question lifecycle (Faz 3)
  "game:countdown": (payload: CountdownPayload) => void;
  "game:question_opened": (payload: QuestionOpenedPayload) => void;
  "game:answer_progress": (payload: AnswerProgressPayload) => void;
  "game:reveal": (payload: RevealPayload) => void;
  "game:leaderboard": (payload: LeaderboardPayload) => void;
  "game:final_results": (payload: PodiumPayload) => void;
  // Hata
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
  // Question lifecycle (Faz 3)
  "host:start_game": (payload: { pin: string }, ack: (r: Ack) => void) => void;
  "host:show_leaderboard": (payload: { pin: string }, ack: (r: Ack) => void) => void;
  "host:next_question": (payload: { pin: string }, ack: (r: Ack) => void) => void;
  "player:submit_answer": (
    payload: { optionId: string },
    ack: (r: Ack<{ pointsAwarded: number; isCorrect: boolean }>) => void
  ) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export type SocketData = Record<string, never>;
