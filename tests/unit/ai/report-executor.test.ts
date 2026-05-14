import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    $queryRawUnsafe: vi.fn(),
  },
}));

import { db } from "@/lib/db";
import { executeReportSql, MAX_REPORT_ROWS } from "@/lib/ai/report-executor";

describe("executeReportSql", () => {
  it("Prisma sonucunu döner", async () => {
    (db.$queryRawUnsafe as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { nickname: "Ayşe", finalScore: 4200 },
    ]);
    const rows = await executeReportSql("SELECT 1");
    expect(rows).toEqual([{ nickname: "Ayşe", finalScore: 4200 }]);
  });

  it("50 satırdan fazlasını keser", async () => {
    const fakeRows = Array.from({ length: 100 }, (_, i) => ({ id: i }));
    (db.$queryRawUnsafe as ReturnType<typeof vi.fn>).mockResolvedValueOnce(fakeRows);
    const rows = await executeReportSql("SELECT 1");
    expect(rows.length).toBe(MAX_REPORT_ROWS);
  });

  it("BigInt değerleri serialize-safe string'e çevirir", async () => {
    (db.$queryRawUnsafe as ReturnType<typeof vi.fn>).mockResolvedValueOnce([{ games: 5n }]);
    const rows = await executeReportSql("SELECT COUNT(*) AS games");
    expect(rows[0]).toEqual({ games: "5" });
  });

  it("Prisma hatasını fırlatır (caller yakalar)", async () => {
    (db.$queryRawUnsafe as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("syntax error")
    );
    await expect(executeReportSql("BROKEN")).rejects.toThrow("syntax error");
  });
});
