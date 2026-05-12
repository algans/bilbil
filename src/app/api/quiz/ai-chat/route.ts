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
import { aiResponseSchema } from "@/lib/ai/quiz-schema";
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
    .max(20),
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

    const { experimental_output: output } = await generateText({
      model: openai(AI_MODEL),
      system: systemPrompt(userMessageCount),
      messages,
      experimental_output: Output.object({ schema: aiResponseSchema }),
      temperature: 0.7,
    });

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
