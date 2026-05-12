// AI chat akışında kullanılan tip sözleşmeleri. Client ↔ server arasında paylaşılır.
// Schema (Zod) ayrı dosyada: src/lib/ai/quiz-schema.ts

import type { QuizFormInput } from "@/lib/validation/quiz";

/** Client'tan gelen chat mesajı — minimal shape, OpenAI'ın beklediği formata yakın. */
export interface AIChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** LLM'in döndüğü structured output — discriminated union. */
export type AIChatResponse =
  | { kind: "ask"; text: string }
  | { kind: "propose"; quiz: QuizFormInput; summary: string }
  | { kind: "refuse"; reason: string };

/** API route'un client'a döndüğü payload. */
export interface AIChatApiResponse {
  ok: true;
  output: AIChatResponse;
  /** Kullanıcıya kaç mesaj hakkı kaldı — UI uyarı için. */
  remaining: number;
}

/** Error response shape (4xx/5xx). */
export interface AIChatApiError {
  ok: false;
  error: "unauthorized" | "rate_limit" | "force_close" | "invalid_input" | "ai_unavailable";
  message: string;
}
