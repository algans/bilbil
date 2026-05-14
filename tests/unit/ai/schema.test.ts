import { describe, it, expect } from "vitest";
import { aiResponseSchema, openaiOutputSchema, routerOutputSchema } from "@/lib/ai/quiz-schema";

describe("aiResponseSchema (client-facing)", () => {
  it("kind=report_answer parse eder", () => {
    const result = aiResponseSchema.safeParse({
      kind: "report_answer",
      answer: "Son oyununu Mehmet 4200 puanla kazandı.",
    });
    expect(result.success).toBe(true);
  });

  it("kind=report_answer answer alanı boşsa reddeder", () => {
    const result = aiResponseSchema.safeParse({ kind: "report_answer", answer: "" });
    expect(result.success).toBe(false);
  });

  it("kind=propose hala parse eder (regression)", () => {
    const result = aiResponseSchema.safeParse({
      kind: "propose",
      summary: "Hazır",
      quiz: {
        title: "T",
        description: null,
        questions: [
          {
            prompt: "x?",
            timeLimitSec: 15,
            options: [
              { text: "a", position: 0, isCorrect: true },
              { text: "b", position: 1, isCorrect: false },
              { text: "c", position: 2, isCorrect: false },
              { text: "d", position: 3, isCorrect: false },
            ],
          },
        ],
      },
    });
    expect(result.success).toBe(true);
  });
});

describe("routerOutputSchema (internal)", () => {
  it("kind=sql parse eder", () => {
    const result = routerOutputSchema.safeParse({
      kind: "sql",
      sql: "SELECT 1",
      intent: "test",
    });
    expect(result.success).toBe(true);
  });

  it("kind=sql sql alanı SELECT ile başlamıyorsa reddeder", () => {
    const result = routerOutputSchema.safeParse({
      kind: "sql",
      sql: "DELETE FROM users",
      intent: "x",
    });
    expect(result.success).toBe(false);
  });
});

describe("openaiOutputSchema (flat-nullable for strict mode)", () => {
  it("kind=sql flat payload parse eder", () => {
    const result = openaiOutputSchema.safeParse({
      kind: "sql",
      text: null,
      reason: null,
      summary: null,
      quiz: null,
      answer: null,
      sql: "SELECT 1",
      intent: "x",
    });
    expect(result.success).toBe(true);
  });
});
