// AI Asistan Chat — POST endpoint.
// İki mod tek endpoint'te:
//   1. QUIZ — mevcut quiz oluşturma akışı (ask | propose | refuse).
//   2. RAPOR — router SQL üretir, server çalıştırır, summarizer doğal dile çevirir.
//
// Akış: auth → rate-limit → step-count → router AI call →
//   (kind=sql ise) SQL execute → summarizer AI call →
//   final response (client'a ask|propose|refuse|report_answer).
//
// Mock mode (AI_MOCK=1): SQL execution bypass, mock-responses.ts fixture döner.

import { NextResponse, type NextRequest } from "next/server";
import { generateText, Output } from "ai";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { captureError, logEvent } from "@/lib/observability";
import { openai, AI_MODEL, isAIMockMode, isAIConfigured } from "@/lib/ai/openai";
import { systemPrompt, MAX_USER_MESSAGES } from "@/lib/ai/system-prompt";
import { summarizerSystemPrompt, buildSummarizerInput } from "@/lib/ai/summarizer-prompt";
import {
  aiResponseSchema,
  routerOutputSchema,
  openaiOutputSchema,
  type AIResponseParsed,
  type RouterOutputParsed,
} from "@/lib/ai/quiz-schema";
import { getMockResponse } from "@/lib/ai/mock-responses";
import { executeReportSql } from "@/lib/ai/report-executor";
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
    .max(110),
});

function errorResponse(error: AIChatApiError["error"], message: string, status: number) {
  const body: AIChatApiError = { ok: false, error, message };
  return NextResponse.json(body, { status });
}

/** OpenAI flat-nullable çıktısını router union'a normalize eder. */
function normalizeRouterOutput(raw: z.infer<typeof openaiOutputSchema>): RouterOutputParsed {
  switch (raw.kind) {
    case "ask":
      return { kind: "ask", text: raw.text ?? "" };
    case "propose":
      return {
        kind: "propose",
        quiz: raw.quiz ?? { title: "", description: null, questions: [] },
        summary: raw.summary ?? "",
      };
    case "refuse":
      return { kind: "refuse", reason: raw.reason ?? "" };
    case "sql":
      return { kind: "sql", sql: raw.sql ?? "", intent: raw.intent ?? "" };
    case "report_answer":
      // Router report_answer dönmemeli (summarizer'ın işi); refuse'a düşür.
      return { kind: "refuse", reason: "Beklenmedik cevap formatı." };
  }
}

/** OpenAI flat çıktısını summarizer union'a (report_answer | refuse) normalize eder. */
function normalizeSummarizerOutput(raw: z.infer<typeof openaiOutputSchema>): AIResponseParsed {
  switch (raw.kind) {
    case "report_answer":
      return { kind: "report_answer", answer: raw.answer ?? "" };
    case "refuse":
      return { kind: "refuse", reason: raw.reason ?? "" };
    default:
      return { kind: "refuse", reason: "Sonuç işlenirken bir sorun oluştu." };
  }
}

export async function POST(req: NextRequest) {
  // 1. AUTH
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse("unauthorized", "Giriş yapmalısın", 401);
  }
  const userId = session.user.id;

  // 2. RATE LIMIT
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

  // 4. STEP COUNT
  const userMessageCount = messages.filter((m) => m.role === "user").length;
  if (userMessageCount > MAX_USER_MESSAGES) {
    return errorResponse("force_close", "Mesaj limiti doldu. Baştan başla.", 410);
  }
  const remaining = Math.max(0, MAX_USER_MESSAGES - userMessageCount);

  try {
    // 5. MOCK MODE — AI yok, fixture döner. SQL execution bypass.
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

    // 6. AI CALL #1 — Router (intent + SQL/quiz üretimi)
    const { experimental_output: routerRaw } = await generateText({
      model: openai(AI_MODEL),
      system: systemPrompt({ userMessageCount, hostId: userId }),
      messages,
      experimental_output: Output.object({ schema: openaiOutputSchema }),
      temperature: 0.7,
    });

    const routerNormalized = normalizeRouterOutput(routerRaw);
    const routerValidated = routerOutputSchema.safeParse(routerNormalized);
    if (!routerValidated.success) {
      captureError(new Error("Router output validation failed"), {
        tags: { scope: "api.ai-chat.router-parse", userId },
        extra: { raw: routerRaw, issues: routerValidated.error.issues },
      });
      return errorResponse(
        "ai_unavailable",
        "AI cevabı beklenen formatta değil — tekrar dene.",
        502
      );
    }
    const routerOut = routerValidated.data;

    logEvent("ai", "router", {
      userId,
      model: AI_MODEL,
      messages: messages.length,
      kind: routerOut.kind,
    });

    // 7. Eğer ask/propose/refuse → direkt client'a dön (eski akış)
    if (routerOut.kind !== "sql") {
      const result: AIChatApiResponse = { ok: true, output: routerOut, remaining };
      return NextResponse.json(result);
    }

    // 8. SQL EXECUTION
    let rows: Record<string, unknown>[] = [];
    let executionError: string | null = null;
    try {
      rows = await executeReportSql(routerOut.sql);
      logEvent("ai", "sql-executed", {
        userId,
        sql: routerOut.sql.slice(0, 200),
        rowCount: rows.length,
      });
    } catch (err) {
      executionError = err instanceof Error ? err.message : String(err);
      captureError(err, {
        tags: { scope: "api.ai-chat.sql-execute", userId },
        extra: { sql: routerOut.sql },
      });
    }

    // 9. AI CALL #2 — Summarizer
    const lastUserMsg = messages.filter((m) => m.role === "user").at(-1)?.content ?? "";

    const summarizerInput = buildSummarizerInput({
      originalQuestion: lastUserMsg,
      sql: routerOut.sql,
      rows,
      executionError,
    });

    const { experimental_output: summarizerRaw } = await generateText({
      model: openai(AI_MODEL),
      system: summarizerSystemPrompt(),
      messages: [{ role: "user", content: summarizerInput }],
      experimental_output: Output.object({ schema: openaiOutputSchema }),
      temperature: 0.5,
    });

    const summarizerNormalized = normalizeSummarizerOutput(summarizerRaw);
    const summarizerValidated = aiResponseSchema.safeParse(summarizerNormalized);
    if (!summarizerValidated.success) {
      captureError(new Error("Summarizer output validation failed"), {
        tags: { scope: "api.ai-chat.summarizer-parse", userId },
        extra: { raw: summarizerRaw, issues: summarizerValidated.error.issues },
      });
      return errorResponse(
        "ai_unavailable",
        "Rapor cevabı işlenirken hata oluştu — tekrar dene.",
        502
      );
    }

    const output = summarizerValidated.data;
    logEvent("ai", "summarizer", {
      userId,
      model: AI_MODEL,
      kind: output.kind,
      hadError: Boolean(executionError),
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
