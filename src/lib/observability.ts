// Observability iskeleti — Sentry DSN varsa entegre et, yoksa no-op.
// Faz 4: yalnızca skeleton + logger. Faz 5'te `@sentry/nextjs` paketini ekleyip
// initialize edeceğiz. Şu an minimal capture: env'de DSN yoksa console.error.

interface CaptureContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

const SENTRY_DSN = process.env.SENTRY_DSN ?? "";

/**
 * Hata kaydet. Sentry DSN tanımlı değilse console.error fallback.
 * Faz 5'te `@sentry/nextjs`'i import edip Sentry.captureException(...) çağıracağız.
 */
export function captureError(err: unknown, context?: CaptureContext): void {
  if (!SENTRY_DSN) {
    console.error("[error]", err, context ?? "");
    return;
  }
  // Faz 5: gerçek Sentry SDK init/capture buraya gelecek.
  console.error("[error:sentry-pending]", err, context ?? "");
}

/**
 * Yapısal log — `[scope] action` formatı.
 * Faz 5'te Pino veya benzeri bir JSON logger ile değiştirilir.
 */
export function logEvent(scope: string, action: string, details?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === "test") return;
  const payload = details ? ` ${JSON.stringify(details)}` : "";
  console.log(`[${scope}] ${action}${payload}`);
}
