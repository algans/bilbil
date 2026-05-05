import { describe, it, expect } from "vitest";
import { quizFormSchema, MIN_QUESTIONS, OPTIONS_PER_QUESTION } from "@/lib/validation/quiz";

const validOptions = (correctIdx: number) =>
  Array.from({ length: OPTIONS_PER_QUESTION }, (_, i) => ({
    text: `Şık ${i + 1}`,
    isCorrect: i === correctIdx,
    position: i,
  }));

const validQuestion = (prompt = "Türkiye'nin başkenti?") => ({
  prompt,
  timeLimitSec: 20,
  options: validOptions(0),
});

describe("quizFormSchema", () => {
  it("geçerli quiz'i kabul eder", () => {
    const r = quizFormSchema.safeParse({
      title: "Türkiye Coğrafyası",
      description: "Şehirler, nehirler",
      questions: [validQuestion(), validQuestion("İkinci soru?")],
    });
    expect(r.success).toBe(true);
  });

  it(`en az ${MIN_QUESTIONS} soru ister`, () => {
    const r = quizFormSchema.safeParse({
      title: "Boş Quiz",
      description: null,
      questions: [],
    });
    expect(r.success).toBe(false);
  });

  it("title boş olamaz", () => {
    const r = quizFormSchema.safeParse({
      title: "",
      description: null,
      questions: [validQuestion()],
    });
    expect(r.success).toBe(false);
  });

  it("title 120 karakterden uzun olamaz", () => {
    const r = quizFormSchema.safeParse({
      title: "x".repeat(121),
      description: null,
      questions: [validQuestion()],
    });
    expect(r.success).toBe(false);
  });

  it("description opsiyonel — boş string null'a çevrilir", () => {
    const r = quizFormSchema.safeParse({
      title: "Test",
      description: "",
      questions: [validQuestion()],
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.description).toBeNull();
  });

  it("soru promptu boş olamaz", () => {
    const r = quizFormSchema.safeParse({
      title: "Test",
      description: null,
      questions: [{ ...validQuestion(), prompt: "" }],
    });
    expect(r.success).toBe(false);
  });

  it("4 şık olmazsa reddeder", () => {
    const r = quizFormSchema.safeParse({
      title: "Test",
      description: null,
      questions: [{ ...validQuestion(), options: validOptions(0).slice(0, 3) }],
    });
    expect(r.success).toBe(false);
  });

  it("hiç doğru cevap yoksa reddeder", () => {
    const r = quizFormSchema.safeParse({
      title: "Test",
      description: null,
      questions: [
        {
          ...validQuestion(),
          options: validOptions(0).map((o) => ({ ...o, isCorrect: false })),
        },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("birden fazla doğru cevap varsa reddeder", () => {
    const r = quizFormSchema.safeParse({
      title: "Test",
      description: null,
      questions: [
        {
          ...validQuestion(),
          options: validOptions(0).map((o, i) => ({ ...o, isCorrect: i < 2 })),
        },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("şık metni boş olamaz", () => {
    const r = quizFormSchema.safeParse({
      title: "Test",
      description: null,
      questions: [
        {
          ...validQuestion(),
          options: validOptions(0).map((o, i) => (i === 0 ? { ...o, text: "" } : o)),
        },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("timeLimitSec 5-120 arası olmalı", () => {
    const tooLow = quizFormSchema.safeParse({
      title: "Test",
      description: null,
      questions: [{ ...validQuestion(), timeLimitSec: 3 }],
    });
    expect(tooLow.success).toBe(false);
    const tooHigh = quizFormSchema.safeParse({
      title: "Test",
      description: null,
      questions: [{ ...validQuestion(), timeLimitSec: 999 }],
    });
    expect(tooHigh.success).toBe(false);
  });
});
