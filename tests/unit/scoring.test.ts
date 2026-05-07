import { describe, it, expect } from "vitest";
import {
  calculateScore,
  BASE_SCORE_FOR_CORRECT,
  SPEED_BONUS,
  MAX_SCORE_PER_QUESTION,
} from "@/lib/game/scoring";

describe("calculateScore (formül B — hız bonuslu)", () => {
  it("yanlış cevap → 0", () => {
    expect(calculateScore({ isCorrect: false, answeredAtMs: 100, totalTimeMs: 20_000 })).toBe(0);
  });

  it("anlık doğru cevap (0ms) → maksimum puan", () => {
    expect(calculateScore({ isCorrect: true, answeredAtMs: 0, totalTimeMs: 20_000 })).toBe(
      MAX_SCORE_PER_QUESTION
    );
  });

  it("son anda doğru cevap (deadline'a 1ms kala) → ~taban puan", () => {
    const r = calculateScore({ isCorrect: true, answeredAtMs: 19_999, totalTimeMs: 20_000 });
    expect(r).toBe(BASE_SCORE_FOR_CORRECT); // 500 + round(500 * 1/20000) = 500
  });

  it("orta noktada doğru cevap → taban + yarı bonus", () => {
    const r = calculateScore({ isCorrect: true, answeredAtMs: 10_000, totalTimeMs: 20_000 });
    expect(r).toBe(BASE_SCORE_FOR_CORRECT + Math.round(SPEED_BONUS * 0.5));
  });

  it("deadline sonrası (geç) → 0", () => {
    expect(calculateScore({ isCorrect: true, answeredAtMs: 20_000, totalTimeMs: 20_000 })).toBe(0);
    expect(calculateScore({ isCorrect: true, answeredAtMs: 25_000, totalTimeMs: 20_000 })).toBe(0);
  });

  it("negatif zaman (saçma input) → 0", () => {
    expect(calculateScore({ isCorrect: true, answeredAtMs: -100, totalTimeMs: 20_000 })).toBe(0);
  });

  it("puan her zaman 0 ile MAX_SCORE_PER_QUESTION arasında", () => {
    for (const t of [0, 1, 1_000, 5_000, 10_000, 15_000, 19_999]) {
      const r = calculateScore({ isCorrect: true, answeredAtMs: t, totalTimeMs: 20_000 });
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(MAX_SCORE_PER_QUESTION);
    }
  });
});
