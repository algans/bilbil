import { describe, it, expect } from "vitest";
import { systemPrompt, MAX_USER_MESSAGES } from "@/lib/ai/system-prompt";

const HOST = "clx-test-host";

describe("systemPrompt (regression — quiz oluşturma çekirdek bilgileri)", () => {
  it("Türkçe sistem promptu döner", () => {
    const p = systemPrompt({ userMessageCount: 0, hostId: HOST });
    expect(p).toContain("Bilbil");
    expect(p).toContain("Türkçe");
    expect(p).toContain("4-şıklı");
  });

  it("ask/propose/refuse çıktı tiplerini içeriyor", () => {
    const p = systemPrompt({ userMessageCount: 1, hostId: HOST });
    expect(p).toContain("`ask`");
    expect(p).toContain("`propose`");
    expect(p).toContain("`refuse`");
  });

  it("position 0-3 kuralını içeriyor", () => {
    const p = systemPrompt({ userMessageCount: 0, hostId: HOST });
    expect(p).toContain("position");
    expect(p).toMatch(/0[,\s]+1[,\s]+2[,\s]+3/);
  });

  it("0 mesajda 'verimli ol' uyarısı yok", () => {
    const p = systemPrompt({ userMessageCount: 0, hostId: HOST });
    expect(p).toMatch(new RegExp(`${MAX_USER_MESSAGES}\\s*mesaj hakkı`));
  });

  it("son 1 mesaj kaldığında özel uyarı verir", () => {
    const p = systemPrompt({ userMessageCount: MAX_USER_MESSAGES - 1, hostId: HOST });
    expect(p).toContain("SADECE 1 mesaj");
  });

  it("limit aşıldığında 'BU SON CEVAP' uyarısı verir", () => {
    const p = systemPrompt({ userMessageCount: MAX_USER_MESSAGES, hostId: HOST });
    expect(p).toContain("BU SON CEVAP");
  });

  it("off-topic kapsam kilidi mesajları içeriyor", () => {
    const p = systemPrompt({ userMessageCount: 0, hostId: HOST });
    expect(p).toContain("Kapsam kilidi");
    expect(p).toContain("Şiir");
    expect(p).toContain("Kod yazma");
  });

  it("MAX_USER_MESSAGES = 50", () => {
    expect(MAX_USER_MESSAGES).toBe(50);
  });
});
