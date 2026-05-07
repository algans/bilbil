// In-memory rate limiter — sliding window.
// MVP scope: process-local (instance başına ayrı sayar). Faz 5+'da Redis adapter'a taşınabilir.
//
// Kullanım:
//   const ok = await rateLimit({ key: `register:${ip}`, limit: 10, windowMs: 60_000 });
//   if (!ok) return { error: "too_many_requests" };

interface RateLimitInput {
  key: string;
  limit: number;
  windowMs: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periyodik garbage collection — eski bucket'ları sil.
const CLEANUP_INTERVAL_MS = 60_000;
declare global {
  var __bilbil_rate_limit_gc: NodeJS.Timeout | undefined;
}
if (!globalThis.__bilbil_rate_limit_gc) {
  globalThis.__bilbil_rate_limit_gc = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt < now) buckets.delete(key);
    }
  }, CLEANUP_INTERVAL_MS);
}

/** True döner = istek kabul edilebilir; false = limit aşıldı.
 * Production dışında bypass eder (e2e suite'inde paralel worker'lar aynı localhost
 * IP'sinden geliyor — limit gerçekçi değil). Production'da gerçek limit uygulanır.
 * BILBIL_FORCE_RATE_LIMIT=1 ile dev'de de zorlanabilir. */
export function rateLimit({ key, limit, windowMs }: RateLimitInput): boolean {
  if (process.env.NODE_ENV !== "production" && process.env.BILBIL_FORCE_RATE_LIMIT !== "1") {
    return true;
  }
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

/** Test/dev için sayaçları sıfırla. */
export function clearRateLimits(): void {
  buckets.clear();
}
