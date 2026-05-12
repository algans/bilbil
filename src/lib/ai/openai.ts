// OpenAI provider singleton (Vercel AI SDK).
// Model hardcoded default: `gpt-4o-mini` — fiyat/performans dengesi en iyi.
// AI_MODEL env var ile override edilebilir (örn. test ortamında veya prod'da deneme).

import { createOpenAI } from "@ai-sdk/openai";

const apiKey = process.env.OPENAI_API_KEY;

export const openai = createOpenAI({
  apiKey: apiKey ?? "test-key-placeholder",
});

export const AI_MODEL = process.env.AI_MODEL ?? "gpt-4o-mini";

/** Mock mode aktif mi? AI_MOCK=1 set edilirse OpenAI'a hiç gitmez, fixture döner. */
export function isAIMockMode(): boolean {
  return process.env.AI_MOCK === "1";
}

/** OPENAI_API_KEY yoksa true. Route handler'da kontrol edip 503 dönebiliriz. */
export function isAIConfigured(): boolean {
  return Boolean(apiKey) || isAIMockMode();
}
