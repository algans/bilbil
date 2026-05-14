// LLM structured output Zod schema'sı.
// Client'a giden union: ask | propose | refuse | report_answer
// Internal router output union (AI Call #1): ask | propose | refuse | sql
//   → sql kind asla client'a gönderilmez; server SQL'i çalıştırıp summarizer'a verir.

import { z } from "zod";

const aiOptionSchema = z.object({
  text: z.string().trim().min(1).max(160),
  position: z.number().int().min(0).max(3),
  isCorrect: z.boolean(),
});

const aiQuestionSchema = z
  .object({
    prompt: z.string().trim().min(1).max(280),
    timeLimitSec: z.number().int().min(5).max(120),
    options: z.array(aiOptionSchema).length(4),
  })
  .refine((q) => q.options.filter((o) => o.isCorrect).length === 1, {
    message: "Her soruda tam olarak bir doğru cevap olmalı",
  })
  .refine(
    (q) => {
      const positions = q.options.map((o) => o.position).sort();
      return positions.every((p, i) => p === i);
    },
    { message: "Şık pozisyonları 0, 1, 2, 3 sırasında olmalı (her biri tek)" }
  );

const aiQuizSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullable(),
  questions: z.array(aiQuestionSchema).min(1).max(50),
});

/** Client'a giden response — server her zaman bu union'dan birini döner. */
export const aiResponseSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("ask"),
    text: z.string().trim().min(1).max(400),
  }),
  z.object({
    kind: z.literal("propose"),
    quiz: aiQuizSchema,
    summary: z.string().trim().min(1).max(280),
  }),
  z.object({
    kind: z.literal("refuse"),
    reason: z.string().trim().min(1).max(280),
  }),
  z.object({
    kind: z.literal("report_answer"),
    answer: z.string().trim().min(1).max(800),
  }),
]);

/** AI Call #1 (router) çıktısı — sadece server-side, client görmez. */
export const routerOutputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("ask"),
    text: z.string().trim().min(1).max(400),
  }),
  z.object({
    kind: z.literal("propose"),
    quiz: aiQuizSchema,
    summary: z.string().trim().min(1).max(280),
  }),
  z.object({
    kind: z.literal("refuse"),
    reason: z.string().trim().min(1).max(280),
  }),
  z.object({
    kind: z.literal("sql"),
    sql: z
      .string()
      .trim()
      .min(1)
      .max(2000)
      .refine((s) => /^\s*SELECT\b/i.test(s), {
        message: "SQL SELECT ile başlamalı",
      }),
    intent: z.string().trim().min(1).max(200),
  }),
]);

/** OpenAI strict structured outputs schema'sı (flat-nullable).
 *
 * `oneOf` (discriminatedUnion → oneOf) strict mode'da yasak; `anyOf` kısıtlı.
 * Tüm alanları tek object'te nullable olarak tanımlıyoruz; route handler runtime'da
 * `kind`'a göre normalize edip ilgili union schema'sına parse ediyor.
 *
 * Bu schema HEM router HEM summarizer için ortak kullanılır (en üst kapsayıcı).
 */
export const openaiOutputSchema = z.object({
  kind: z.enum(["ask", "propose", "refuse", "report_answer", "sql"]).describe("Cevap tipi"),
  text: z.string().nullable().describe("Sadece kind='ask' için doldur; diğerlerinde null"),
  reason: z
    .string()
    .nullable()
    .describe("Sadece kind='refuse' için doldur (ret gerekçesi); diğerlerinde null"),
  summary: z
    .string()
    .nullable()
    .describe("Sadece kind='propose' için doldur (kısa özet); diğerlerinde null"),
  quiz: aiQuizSchema
    .nullable()
    .describe("Sadece kind='propose' için doldur (tam quiz); diğerlerinde null"),
  answer: z
    .string()
    .nullable()
    .describe("Sadece kind='report_answer' için doldur (doğal dil cevap); diğerlerinde null"),
  sql: z
    .string()
    .nullable()
    .describe("Sadece kind='sql' için doldur (SELECT sorgusu); diğerlerinde null"),
  intent: z
    .string()
    .nullable()
    .describe("Sadece kind='sql' için doldur (sorgu amacı, debug için); diğerlerinde null"),
});

export type AIResponseParsed = z.infer<typeof aiResponseSchema>;
export type RouterOutputParsed = z.infer<typeof routerOutputSchema>;
export type OpenAIOutputRaw = z.infer<typeof openaiOutputSchema>;
