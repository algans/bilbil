import { describe, it, expect } from "vitest";
import { aiResponseSchema } from "@/lib/ai/quiz-schema";
import { quizFormSchema } from "@/lib/validation/quiz";

// Bu testlerin amacı: LLM'in döneceği JSON'un (1) kendi schema'mıza uyduğunu
// ve (2) `propose` çıktısının doğrudan `quizFormSchema`'ya beslenebildiğini doğrulamak.

const validProposeFixture = {
  kind: "propose" as const,
  summary: "5 soruluk matematik quiz'i hazır.",
  quiz: {
    title: "Temel Matematik",
    description: "İlkokul seviyesi 4 işlem",
    questions: [
      {
        prompt: "2 + 2 kaçtır?",
        timeLimitSec: 15,
        options: [
          { text: "3", position: 0, isCorrect: false },
          { text: "4", position: 1, isCorrect: true },
          { text: "5", position: 2, isCorrect: false },
          { text: "22", position: 3, isCorrect: false },
        ],
      },
    ],
  },
};

describe("aiResponseSchema — discriminated union", () => {
  it("ask tipini doğru parse eder", () => {
    const parsed = aiResponseSchema.safeParse({
      kind: "ask",
      text: "Hangi konuda quiz olsun?",
    });
    expect(parsed.success).toBe(true);
  });

  it("propose tipini valid quiz ile doğru parse eder", () => {
    const parsed = aiResponseSchema.safeParse(validProposeFixture);
    expect(parsed.success).toBe(true);
  });

  it("refuse tipini doğru parse eder", () => {
    const parsed = aiResponseSchema.safeParse({
      kind: "refuse",
      reason: "Sadece quiz oluşturmana yardım edebilirim.",
    });
    expect(parsed.success).toBe(true);
  });

  it("bilinmeyen kind reddedilir", () => {
    const parsed = aiResponseSchema.safeParse({ kind: "chat", text: "hi" });
    expect(parsed.success).toBe(false);
  });

  it("propose: 3 şıklı soru reddedilir", () => {
    const broken = structuredClone(validProposeFixture);
    broken.quiz.questions[0]!.options.pop();
    const parsed = aiResponseSchema.safeParse(broken);
    expect(parsed.success).toBe(false);
  });

  it("propose: iki doğru cevap reddedilir", () => {
    const broken = structuredClone(validProposeFixture);
    broken.quiz.questions[0]!.options[0]!.isCorrect = true;
    broken.quiz.questions[0]!.options[1]!.isCorrect = true;
    const parsed = aiResponseSchema.safeParse(broken);
    expect(parsed.success).toBe(false);
  });

  it("propose: hiç doğru cevap olmaması reddedilir", () => {
    const broken = structuredClone(validProposeFixture);
    broken.quiz.questions[0]!.options.forEach((o) => (o.isCorrect = false));
    const parsed = aiResponseSchema.safeParse(broken);
    expect(parsed.success).toBe(false);
  });

  it("propose: çakışan position'lar reddedilir", () => {
    const broken = structuredClone(validProposeFixture);
    broken.quiz.questions[0]!.options[0]!.position = 1;
    broken.quiz.questions[0]!.options[1]!.position = 1;
    broken.quiz.questions[0]!.options[2]!.position = 2;
    broken.quiz.questions[0]!.options[3]!.position = 3;
    const parsed = aiResponseSchema.safeParse(broken);
    expect(parsed.success).toBe(false);
  });

  it("propose: position 0,1,2,3 sırasında olması zorunlu", () => {
    const broken = structuredClone(validProposeFixture);
    broken.quiz.questions[0]!.options[0]!.position = 0;
    broken.quiz.questions[0]!.options[1]!.position = 2;
    broken.quiz.questions[0]!.options[2]!.position = 3;
    broken.quiz.questions[0]!.options[3]!.position = 1;
    // Sıralı değil → ama sort sonrası 0,1,2,3 olduğu için geçer.
    // Bu test ilgisiz position'ların kabul edildiğini onaylıyor (sıra UI'da yapılacak).
    const parsed = aiResponseSchema.safeParse(broken);
    expect(parsed.success).toBe(true);
  });

  it("propose: timeLimitSec aralık dışı reddedilir", () => {
    const broken = structuredClone(validProposeFixture);
    broken.quiz.questions[0]!.timeLimitSec = 3; // min 5
    expect(aiResponseSchema.safeParse(broken).success).toBe(false);
    broken.quiz.questions[0]!.timeLimitSec = 200; // max 120
    expect(aiResponseSchema.safeParse(broken).success).toBe(false);
  });
});

describe("propose çıktısı quizFormSchema ile uyumlu", () => {
  it("LLM'in propose'sı doğrudan createQuizAction'a beslenebilir", () => {
    const parsed = aiResponseSchema.safeParse(validProposeFixture);
    expect(parsed.success).toBe(true);
    if (!parsed.success || parsed.data.kind !== "propose") {
      throw new Error("unexpected");
    }
    // Aynı payload quizFormSchema'dan geçmek zorunda
    const formParsed = quizFormSchema.safeParse(parsed.data.quiz);
    expect(formParsed.success).toBe(true);
  });
});
