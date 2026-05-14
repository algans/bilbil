// AI raporlama için SQL çalıştırıcı.
// MVP: AI'ın ürettiği SELECT'i aynen Prisma $queryRawUnsafe ile çalıştırır.
//
// ⚠ DEPLOY ÖNCESİ EKLENECEK (spec madde 7):
//   - Read-only Postgres rolü (ayrı DATABASE_URL_AI_READONLY)
//   - SQL parser ile SELECT-only doğrulama
//   - Tablo allowlist (parser AST üzerinden)
//   - HostId enforcement (parser AST)
//   - Statement timeout (3s)
//   - LIMIT enforcement
//   - Audit log
//
// MVP koruma: JS-side satır kırpma (max 50). Bu, AI yanılarak milyon satır
// seçse de response payload'u patlamasın diye.

import { db } from "@/lib/db";

export const MAX_REPORT_ROWS = 50;

/**
 * AI'ın ürettiği SELECT sorgusunu çalıştırır, sonucu serialize-safe hale getirir.
 * Hata fırlatabilir (caller yakalayıp summarizer'a "executionError" olarak göndermeli).
 *
 * BigInt değerleri (COUNT(*) gibi sorgulardan gelir) JSON.stringify uyumlu olsun
 * diye string'e çevrilir. Prisma BigInt'i native döner ama JSON serialize edemez.
 */
export async function executeReportSql(sql: string): Promise<Record<string, unknown>[]> {
  const raw = (await db.$queryRawUnsafe(sql)) as unknown[];
  const capped = raw.slice(0, MAX_REPORT_ROWS);
  return capped.map(serializeRow);
}

function serializeRow(row: unknown): Record<string, unknown> {
  if (!row || typeof row !== "object") return { value: String(row) };
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
    out[k] = serializeValue(v);
  }
  return out;
}

function serializeValue(v: unknown): unknown {
  if (typeof v === "bigint") return v.toString();
  if (v instanceof Date) return v.toISOString();
  return v;
}
