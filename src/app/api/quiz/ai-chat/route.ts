// AI Quiz Chat — POST endpoint.
// Akış: auth → rate-limit → step-count → (mock VEYA OpenAI generateText) → JSON response.
//
// Streaming kullanmıyoruz: structured output ile partial chunks schema-validate edilemiyor;
// 1-2s wait + "yazıyor..." UX yeterli. Schema garantili JSON ile parse hatası riskini sıfırlıyoruz.
//
// Mock mode (AI_MOCK=1): mock-responses.ts'den keyword-based deterministik cevap döner.
// Test/CI'da OPENAI_API_KEY gerekmeden çalışır.

import { NextResponse, type NextRequest } from "next/server";
import { generateText, Output } from "ai";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { captureError, logEvent } from "@/lib/observability";
import { openai, AI_MODEL, isAIMockMode, isAIConfigured } from "@/lib/ai/openai";
import { systemPrompt, MAX_USER_MESSAGES } from "@/lib/ai/system-prompt";
import { aiResponseSchema, openaiOutputSchema, type AIResponseParsed } from "@/lib/ai/quiz-schema";
import { getMockResponse } from "@/lib/ai/mock-responses";
import type { AIChatApiError, AIChatApiResponse } from "@/lib/ai/types";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(2000),
      })
    )
    .min(1)
    .max(110), // ~50 user + 50 assistant + ek güvenlik payı (intro mesaj client'ta filtreleniyor)
});

function errorResponse(error: AIChatApiError["error"], message: string, status: number) {
  const body: AIChatApiError = { ok: false, error, message };
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  // 1. AUTH
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse("unauthorized", "Giriş yapmalısın", 401);
  }
  const userId = session.user.id;

  // 2. RATE LIMIT — saat içinde 20 mesaj
  if (!rateLimit({ key: `ai-chat:${userId}`, limit: 20, windowMs: 60 * 60_000 })) {
    return errorResponse("rate_limit", "Saat içinde çok fazla AI isteği yaptın. Biraz bekle.", 429);
  }

  // 3. BODY PARSE
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("invalid_input", "Geçersiz JSON", 400);
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("invalid_input", "Mesaj formatı geçersiz", 400);
  }
  const { messages } = parsed.data;

  // 4. STEP COUNT — kullanıcı 6'dan fazla mesaj atmışsa force-close
  const userMessageCount = messages.filter((m) => m.role === "user").length;
  if (userMessageCount > MAX_USER_MESSAGES) {
    return errorResponse("force_close", "Mesaj limiti doldu. Baştan başla.", 410);
  }
  const remaining = Math.max(0, MAX_USER_MESSAGES - userMessageCount);

  // 5. AI CALL — mock veya gerçek
  try {
    if (isAIMockMode()) {
      const output = getMockResponse(messages);
      const result: AIChatApiResponse = { ok: true, output, remaining };
      return NextResponse.json(result);
    }

    if (!isAIConfigured()) {
      return errorResponse(
        "ai_unavailable",
        "AI servisi yapılandırılmamış. OPENAI_API_KEY gerekli.",
        503
      );
    }

    // OpenAI strict structured outputs `oneOf`/`anyOf` reddediyor → discriminatedUnion
    // doğrudan gönderilemiyor. Flat schema (tüm alanlar tek object'te nullable) gönderiyoruz,
    // runtime'da `kind` field'ına göre internal discriminated union'a normalize ediyoruz.
    const { experimental_output: raw } = await generateText({
      model: openai(AI_MODEL),
      system: systemPrompt({ userMessageCount, hostId: userId }),
      messages,
      experimental_output: Output.object({ schema: openaiOutputSchema }),
      temperature: 0.7,
    });

    const normalized: AIResponseParsed =
      raw.kind === "ask"
        ? { kind: "ask", text: raw.text ?? "" }
        : raw.kind === "propose"
          ? {
              kind: "propose",
              quiz: raw.quiz ?? { title: "", description: null, questions: [] },
              summary: raw.summary ?? "",
            }
          : { kind: "refuse", reason: raw.reason ?? "" };

    const validated = aiResponseSchema.safeParse(normalized);
    if (!validated.success) {
      captureError(new Error("AI çıktı validation failed"), {
        tags: { scope: "api.ai-chat.parse", userId },
        extra: { raw, issues: validated.error.issues },
      });
      return errorResponse(
        "ai_unavailable",
        "AI cevabı beklenen formatta değil — tekrar dene.",
        502
      );
    }
    const output = validated.data;

    logEvent("ai", "chat", {
      userId,
      model: AI_MODEL,
      messages: messages.length,
      kind: output.kind,
    });

    const result: AIChatApiResponse = { ok: true, output, remaining };
    return NextResponse.json(result);
  } catch (err) {
    captureError(err, {
      tags: { scope: "api.ai-chat", userId },
      extra: { messagesCount: messages.length },
    });
    return errorResponse("ai_unavailable", "AI servisinde bir hata oluştu. Tekrar dene.", 502);
  }
}
