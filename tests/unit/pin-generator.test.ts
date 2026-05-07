import { describe, it, expect } from "vitest";
import { generatePin, generateUniquePin, PinGenerationError } from "@/lib/game/pin-generator";

describe("generatePin", () => {
  it("6 hane sayısal string üretir", () => {
    for (let i = 0; i < 50; i++) {
      const pin = generatePin();
      expect(pin).toMatch(/^[0-9]{6}$/);
    }
  });

  it("ilk hane 0 olmaz (100000-999999 aralığı)", () => {
    for (let i = 0; i < 50; i++) {
      const pin = generatePin();
      expect(pin[0]).not.toBe("0");
    }
  });

  it("farklı çağrılar farklı pin'ler üretir (yüksek olasılıkla)", () => {
    const pins = new Set();
    for (let i = 0; i < 50; i++) pins.add(generatePin());
    // 1M olası, 50 örnekte çakışma olmamalı
    expect(pins.size).toBe(50);
  });
});

describe("generateUniquePin", () => {
  it("hiç çakışma yoksa ilk denenen pin'i döner", async () => {
    const isPinTaken = async () => false;
    const pin = await generateUniquePin(isPinTaken);
    expect(pin).toMatch(/^[0-9]{6}$/);
  });

  it("ilk üretilen alınmışsa yenisini dener", async () => {
    const taken = new Set<string>();
    let attempts = 0;
    const isPinTaken = async (pin: string) => {
      attempts++;
      // İlk 2 denemeyi alınmış olarak döndür
      if (attempts <= 2) {
        taken.add(pin);
        return true;
      }
      return false;
    };
    const pin = await generateUniquePin(isPinTaken);
    expect(pin).toMatch(/^[0-9]{6}$/);
    expect(taken.has(pin)).toBe(false);
    expect(attempts).toBe(3);
  });

  it("maxAttempts aşılırsa PinGenerationError fırlatır", async () => {
    const isPinTaken = async () => true; // her zaman alınmış
    await expect(generateUniquePin(isPinTaken, 5)).rejects.toBeInstanceOf(PinGenerationError);
  });

  it("default maxAttempts ile çalışır", async () => {
    const isPinTaken = async () => false;
    await expect(generateUniquePin(isPinTaken)).resolves.toMatch(/^[0-9]{6}$/);
  });
});
