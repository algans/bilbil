import { describe, it, expect } from "vitest";
import { summarizerSystemPrompt, buildSummarizerInput } from "@/lib/ai/summarizer-prompt";

describe("summarizerSystemPrompt", () => {
  it("report_answer ve refuse iki çıktı şeklini açıklar", () => {
    const p = summarizerSystemPrompt();
    expect(p).toContain("report_answer");
    expect(p).toContain("refuse");
  });

  it("SQL hatasında refuse yönergesi içerir", () => {
    const p = summarizerSystemPrompt();
    expect(p).toMatch(/hata|error/i);
  });
});

describe("buildSummarizerInput", () => {
  it("orijinal soru + SQL + sonuç JSON'ı birleştirir", () => {
    const input = buildSummarizerInput({
      originalQuestion: "Son oyunu kim kazandı?",
      sql: "SELECT nickname FROM player_results LIMIT 1",
      rows: [{ nickname: "Mehmet", finalScore: 4200 }],
      executionError: null,
    });
    expect(input).toContain("Son oyunu kim kazandı?");
    expect(input).toContain("SELECT nickname");
    expect(input).toContain("Mehmet");
    expect(input).toContain("4200");
  });

  it("executionError varsa hata mesajı ekler", () => {
    const input = buildSummarizerInput({
      originalQuestion: "x",
      sql: "SELECT 1",
      rows: [],
      executionError: "syntax error at line 1",
    });
    expect(input).toContain("syntax error");
  });

  it("0 satır sonucu açıkça belirtir", () => {
    const input = buildSummarizerInput({
      originalQuestion: "x",
      sql: "SELECT 1",
      rows: [],
      executionError: null,
    });
    expect(input).toMatch(/0 sat/);
  });
});
