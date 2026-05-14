import { describe, it, expect } from "vitest";
import { getMockResponse } from "@/lib/ai/mock-responses";
import type { AIChatMessage } from "@/lib/ai/types";

function msg(content: string): AIChatMessage {
  return { role: "user", content };
}

describe("getMockResponse — rapor keyword'leri", () => {
  it("'kim kazandı' → report_answer", () => {
    const out = getMockResponse([msg("Son oyunu kim kazandı?")]);
    expect(out.kind).toBe("report_answer");
    if (out.kind === "report_answer") {
      expect(out.answer.length).toBeGreaterThan(0);
    }
  });

  it("'en çok kazanan' → report_answer", () => {
    const out = getMockResponse([msg("en çok kazanan oyuncum kim?")]);
    expect(out.kind).toBe("report_answer");
  });

  it("'kaç oyun' → report_answer", () => {
    const out = getMockResponse([msg("bu ay kaç oyun oynandı?")]);
    expect(out.kind).toBe("report_answer");
  });

  it("'en zor soru' → report_answer", () => {
    const out = getMockResponse([msg("en zor sorum hangisi?")]);
    expect(out.kind).toBe("report_answer");
  });

  it("quiz keyword öncelikli — 'matematik quiz yap' propose döner (rapor değil)", () => {
    const out = getMockResponse([msg("matematik quiz yap")]);
    expect(out.kind).toBe("propose");
  });
});
