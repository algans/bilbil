import { describe, it, expect } from "vitest";
import { systemPrompt, MAX_USER_MESSAGES } from "@/lib/ai/system-prompt";

describe("router systemPrompt", () => {
  const SAMPLE_HOST_ID = "clx0123abcdef";

  it("hostId'yi prompt'a inject eder", () => {
    const p = systemPrompt({ userMessageCount: 0, hostId: SAMPLE_HOST_ID });
    expect(p).toContain(SAMPLE_HOST_ID);
  });

  it("şema bölümünü içerir", () => {
    const p = systemPrompt({ userMessageCount: 0, hostId: SAMPLE_HOST_ID });
    expect(p).toContain("quizzes");
    expect(p).toContain("player_results");
    expect(p).toContain("LIMIT 50");
  });

  it("few-shot örnekleri içerir", () => {
    const p = systemPrompt({ userMessageCount: 0, hostId: SAMPLE_HOST_ID });
    expect(p).toContain("Son oyunu kim kazandı");
    expect(p).toContain("En çok kazanan oyuncum");
  });

  it("quiz oluşturma + sql modları çıktı şekillerini içerir", () => {
    const p = systemPrompt({ userMessageCount: 0, hostId: SAMPLE_HOST_ID });
    expect(p).toContain('kind: "ask"');
    expect(p).toContain('kind: "propose"');
    expect(p).toContain('kind: "refuse"');
    expect(p).toContain('kind: "sql"');
  });

  it("MAX_USER_MESSAGES export edilir", () => {
    expect(MAX_USER_MESSAGES).toBeGreaterThan(0);
  });

  it("mesaj sayısı yüksekse 'son cevap' uyarısı ekler", () => {
    const p = systemPrompt({ userMessageCount: MAX_USER_MESSAGES, hostId: SAMPLE_HOST_ID });
    expect(p).toMatch(/SON CEVAP/i);
  });
});
