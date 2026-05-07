import { describe, it, expect } from "vitest";
import { rankPlayers, topN } from "@/lib/game/leaderboard";

describe("rankPlayers — tie-break: ortalama yanıt süresi", () => {
  it("farklı skorda → skora göre sıralanır", () => {
    const r = rankPlayers([
      { playerToken: "a", nickname: "Ali", totalScore: 100, answerTimesMs: [5_000] },
      { playerToken: "b", nickname: "Veli", totalScore: 300, answerTimesMs: [10_000] },
      { playerToken: "c", nickname: "Can", totalScore: 200, answerTimesMs: [1_000] },
    ]);
    expect(r.map((e) => e.nickname)).toEqual(["Veli", "Can", "Ali"]);
    expect(r.map((e) => e.rank)).toEqual([1, 2, 3]);
  });

  it("aynı skorda → düşük ortalama yanıt süresi üstte", () => {
    const r = rankPlayers([
      { playerToken: "a", nickname: "Ali", totalScore: 1000, answerTimesMs: [10_000, 10_000] },
      { playerToken: "b", nickname: "Veli", totalScore: 1000, answerTimesMs: [3_000, 5_000] },
      { playerToken: "c", nickname: "Can", totalScore: 1000, answerTimesMs: [1_000, 1_000] },
    ]);
    // Can ortalama 1000ms, Veli 4000ms, Ali 10000ms
    expect(r.map((e) => e.nickname)).toEqual(["Can", "Veli", "Ali"]);
  });

  it("aynı skor + aynı ortalama → nickname alfabetik (Türkçe locale)", () => {
    const r = rankPlayers([
      { playerToken: "a", nickname: "Çiğdem", totalScore: 500, answerTimesMs: [5_000] },
      { playerToken: "b", nickname: "Ayşe", totalScore: 500, answerTimesMs: [5_000] },
      { playerToken: "c", nickname: "Berna", totalScore: 500, answerTimesMs: [5_000] },
    ]);
    expect(r.map((e) => e.nickname)).toEqual(["Ayşe", "Berna", "Çiğdem"]);
  });

  it("boş answerTimesMs → en aşağı çekilir (Infinity)", () => {
    const r = rankPlayers([
      { playerToken: "a", nickname: "Ali", totalScore: 0, answerTimesMs: [] },
      { playerToken: "b", nickname: "Veli", totalScore: 0, answerTimesMs: [5_000] },
    ]);
    expect(r[0].nickname).toBe("Veli");
    expect(r[1].nickname).toBe("Ali");
    expect(r[1].averageAnswerTimeMs).toBe(Number.POSITIVE_INFINITY);
  });

  it("rank field'ı 1-based ve ardışık", () => {
    const r = rankPlayers(
      Array.from({ length: 5 }, (_, i) => ({
        playerToken: String(i),
        nickname: `P${i}`,
        totalScore: 100 - i * 10,
        answerTimesMs: [1000],
      }))
    );
    expect(r.map((e) => e.rank)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("topN", () => {
  it("default n=10", () => {
    const players = Array.from({ length: 15 }, (_, i) => ({
      playerToken: String(i),
      nickname: `P${i}`,
      totalScore: 100 - i,
      answerTimesMs: [1000],
    }));
    const r = topN(rankPlayers(players));
    expect(r).toHaveLength(10);
    expect(r[0].nickname).toBe("P0");
    expect(r[9].nickname).toBe("P9");
  });

  it("n > entries → tümünü döner", () => {
    const r = topN(
      rankPlayers([{ playerToken: "a", nickname: "Ali", totalScore: 100, answerTimesMs: [1000] }]),
      10
    );
    expect(r).toHaveLength(1);
  });
});
