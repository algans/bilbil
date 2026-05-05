// Quiz form validation. CRUD'a giren tüm veri buradan geçer.
// Server action ve istemci formunda paylaşılan tek kaynak.

import { z } from "zod";

export const MIN_QUESTIONS = 1;
export const MAX_QUESTIONS = 100;
export const OPTIONS_PER_QUESTION = 4; // Kahoot tarzı sabit
export const MIN_TIME_LIMIT_SEC = 5;
export const MAX_TIME_LIMIT_SEC = 120;
export const DEFAULT_TIME_LIMIT_SEC = 20;

export const optionSchema = z.object({
  id: z.string().optional(), // edit'te mevcut option'ı korumak için
  text: z
    .string()
    .trim()
    .min(1, "Şık metni boş olamaz")
    .max(160, "Şık metni en fazla 160 karakter olabilir"),
  isCorrect: z.boolean(),
  position: z
    .number()
    .int()
    .min(0)
    .max(OPTIONS_PER_QUESTION - 1),
});

export const questionSchema = z
  .object({
    id: z.string().optional(),
    prompt: z
      .string()
      .trim()
      .min(1, "Soru metni boş olamaz")
      .max(280, "Soru metni en fazla 280 karakter olabilir"),
    timeLimitSec: z
      .number()
      .int()
      .min(MIN_TIME_LIMIT_SEC, `Süre en az ${MIN_TIME_LIMIT_SEC} saniye olmalı`)
      .max(MAX_TIME_LIMIT_SEC, `Süre en fazla ${MAX_TIME_LIMIT_SEC} saniye olabilir`),
    options: z
      .array(optionSchema)
      .length(OPTIONS_PER_QUESTION, `Her soruda tam olarak ${OPTIONS_PER_QUESTION} şık olmalı`),
  })
  .refine(
    (q) => q.options.filter((o) => o.isCorrect).length === 1,
    "Her soruda tam olarak bir doğru cevap işaretlenmeli"
  );

export const quizFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Quiz başlığı gerekli")
    .max(120, "Başlık en fazla 120 karakter olabilir"),
  description: z
    .string()
    .trim()
    .max(500, "Açıklama en fazla 500 karakter olabilir")
    .nullable()
    .optional()
    .transform((v) => (v === undefined || v === "" ? null : v)),
  questions: z
    .array(questionSchema)
    .min(MIN_QUESTIONS, `En az ${MIN_QUESTIONS} soru gerekli`)
    .max(MAX_QUESTIONS, `En fazla ${MAX_QUESTIONS} soru ekleyebilirsin`),
});

export type QuizFormInput = z.infer<typeof quizFormSchema>;
export type QuestionInput = z.infer<typeof questionSchema>;
export type OptionInput = z.infer<typeof optionSchema>;
