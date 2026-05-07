import { describe, it, expect } from "vitest";
import {
  validateNickname,
  suggestUniqueNickname,
  NICKNAME_MIN_LENGTH,
  NICKNAME_MAX_LENGTH,
} from "@/lib/game/validators";

describe("validateNickname", () => {
  it("Türkçe karakterli ismi kabul eder", () => {
    const r = validateNickname("Ayşe");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.nickname).toBe("Ayşe");
  });

  it("baş ve sondaki boşlukları temizler", () => {
    const r = validateNickname("  Mehmet  ");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.nickname).toBe("Mehmet");
  });

  it("rakam, alt çizgi ve nokta içeren ismi kabul eder", () => {
    const r = validateNickname("user_42.0");
    expect(r.ok).toBe(true);
  });

  it(`${NICKNAME_MIN_LENGTH} karakterden kısa ismi reddeder`, () => {
    const r = validateNickname("A");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("too_short");
  });

  it(`${NICKNAME_MAX_LENGTH} karakterden uzun ismi reddeder`, () => {
    const r = validateNickname("a".repeat(NICKNAME_MAX_LENGTH + 1));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("too_long");
  });

  it("emoji içeren ismi reddeder", () => {
    const r = validateNickname("Ayşe🎉");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("invalid_chars");
  });

  it("rezerve ismi reddeder (host, admin)", () => {
    expect(validateNickname("host").ok).toBe(false);
    expect(validateNickname("HOST").ok).toBe(false);
    expect(validateNickname("Admin").ok).toBe(false);
    expect(validateNickname("Bilbil").ok).toBe(false);
  });

  it("küfür/uygunsuz kelime içeren ismi reddeder", () => {
    expect(validateNickname("eşek").ok).toBe(false);
    expect(validateNickname("Eşek").ok).toBe(false);
    expect(validateNickname("yaramaz çocuk").ok).toBe(false);
    const r = validateNickname("eşek");
    if (!r.ok) expect(r.reason).toBe("profanity");
  });

  it("sırf boşluk ismi reddeder", () => {
    const r = validateNickname("   ");
    expect(r.ok).toBe(false);
  });
});

describe("suggestUniqueNickname", () => {
  it("isim alınmamışsa olduğu gibi döner", () => {
    expect(suggestUniqueNickname("Ayşe", new Set())).toBe("Ayşe");
  });

  it("isim alınmışsa _2 önerir", () => {
    const taken = new Set(["Ayşe"]);
    expect(suggestUniqueNickname("Ayşe", taken)).toBe("Ayşe_2");
  });

  it("ardışık alınmışlarda _3, _4... önerir", () => {
    const taken = new Set(["Ayşe", "Ayşe_2", "Ayşe_3"]);
    expect(suggestUniqueNickname("Ayşe", taken)).toBe("Ayşe_4");
  });

  it("aynı kişi tekrar gelirse _2'yi atlamaz (kararlı)", () => {
    expect(suggestUniqueNickname("Mehmet", new Set(["Ayşe"]))).toBe("Mehmet");
  });
});
