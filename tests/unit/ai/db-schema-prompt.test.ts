import { describe, it, expect } from "vitest";
import { DB_SCHEMA_PROMPT, FEW_SHOT_EXAMPLES } from "@/lib/ai/db-schema-prompt";

describe("DB_SCHEMA_PROMPT", () => {
  it("6 izinli tabloyu içerir", () => {
    for (const t of [
      "quizzes",
      "questions",
      "question_options",
      "game_sessions",
      "player_results",
      "player_answers",
    ]) {
      expect(DB_SCHEMA_PROMPT).toContain(t);
    }
  });

  it("hassas tabloları içermez (users, *_tokens)", () => {
    expect(DB_SCHEMA_PROMPT).not.toMatch(/password_hash/i);
    expect(DB_SCHEMA_PROMPT).not.toMatch(/email_verification_tokens/);
    expect(DB_SCHEMA_PROMPT).not.toMatch(/password_reset_tokens/);
  });

  it("camelCase kolon isimleri çift tırnak içinde", () => {
    expect(DB_SCHEMA_PROMPT).toContain('"hostId"');
    expect(DB_SCHEMA_PROMPT).toContain('"finalRank"');
  });
});

describe("FEW_SHOT_EXAMPLES", () => {
  it("en az 5 örnek içerir", () => {
    expect(FEW_SHOT_EXAMPLES.split(/--\s+"/).length - 1).toBeGreaterThanOrEqual(5);
  });

  it("her örnekte LIMIT var", () => {
    const examples = FEW_SHOT_EXAMPLES.split(/--\s+"/).slice(1);
    for (const ex of examples) {
      expect(ex).toMatch(/LIMIT\s+\d+/i);
    }
  });

  it("her örnekte hostId geçer", () => {
    const examples = FEW_SHOT_EXAMPLES.split(/--\s+"/).slice(1);
    for (const ex of examples) {
      expect(ex).toMatch(/hostId/i);
    }
  });
});
