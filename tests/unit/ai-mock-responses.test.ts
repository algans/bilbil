import { describe, it, expect } from "vitest";
import { getMockResponse } from "@/lib/ai/mock-responses";
import { aiResponseSchema } from "@/lib/ai/quiz-schema";

describe("getMockResponse — deterministik AI mock", () => {
  it("topic keyword içeren mesaj propose döner", () => {
    const r = getMockResponse([{ role: "user", content: "5 soru matematik" }]);
    expect(r.kind).toBe("propose");
    // Schema-valid
    expect(aiResponseSchema.safeParse(r).success).toBe(true);
  });

  it("off-topic keyword refuse döner", () => {
    const r = getMockResponse([{ role: "user", content: "bana bir şiir yaz" }]);
    expect(r.kind).toBe("refuse");
  });

  it("topic yoksa ask döner (eksik bilgi)", () => {
    const r = getMockResponse([{ role: "user", content: "selam" }]);
    expect(r.kind).toBe("ask");
  });

  it("tarih keyword'ünde history quiz döner", () => {
    const r = getMockResponse([{ role: "user", content: "10 soru türk tarihi" }]);
    expect(r.kind).toBe("propose");
    if (r.kind === "propose") {
      expect(r.quiz.title.toLowerCase()).toContain("tarih");
    }
  });

  it("önceki proposal + edit intent güncellenmiş propose döner", () => {
    const r = getMockResponse([
      { role: "user", content: "5 soru matematik" },
      { role: "assistant", content: "[PROPOSAL] Quiz hazır" },
      { role: "user", content: "ilk soruyu kolaylaştır" },
    ]);
    expect(r.kind).toBe("propose");
    if (r.kind === "propose") {
      expect(r.quiz.questions[0]?.prompt).toContain("güncellenmiş");
    }
  });
});
