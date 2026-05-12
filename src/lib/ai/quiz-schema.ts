// LLM structured output Zod schema'sı.
// `quizFormSchema` (src/lib/validation/quiz.ts) ile uyumlu — propose çıktısı doğrudan
// createQuizAction'a verilebilir. `id` field'ı LLM'den beklenmiyor (sadece edit'te kullanılır).

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

/** Internal type-safe model — mock ve test'lerin kullandığı discriminated union. */
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
]);

/** OpenAI strict structured outputs schema'sı.
 *
 * Neden flat: OpenAI structured outputs strict mode'da `oneOf` (Zod discriminatedUnion → oneOf)
 * yasak ve `anyOf` çok kısıtlı. Bu yüzden tüm alanları tek object'te nullable olarak tanımlıyoruz;
 * route handler runtime'da `kind` field'ına göre normalize edip `aiResponseSchema`'ya parse ediyor.
 */
export const openaiOutputSchema = z.object({
  kind: z.enum(["ask", "propose", "refuse"]).describe("Cevap tipi"),
  text: z
    .string()
    .nullable()
    .describe("Sadece kind='ask' için doldur (kullanıcıya soru); diğerlerinde null"),
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
});

export type AIResponseParsed = z.infer<typeof aiResponseSchema>;
export type OpenAIOutputRaw = z.infer<typeof openaiOutputSchema>;
