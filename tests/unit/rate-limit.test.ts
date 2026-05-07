import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import { rateLimit, clearRateLimits } from "@/lib/rate-limit";

describe("rateLimit — sliding window in-memory", () => {
  // Production dışında bypass aktif — testte gerçek limit'i ölçmek için zorla
  beforeAll(() => {
    process.env.BILBIL_FORCE_RATE_LIMIT = "1";
  });
  afterAll(() => {
    delete process.env.BILBIL_FORCE_RATE_LIMIT;
  });
  beforeEach(() => clearRateLimits());

  it("limit altında istekleri kabul eder", () => {
    expect(rateLimit({ key: "test:a", limit: 3, windowMs: 1000 })).toBe(true);
    expect(rateLimit({ key: "test:a", limit: 3, windowMs: 1000 })).toBe(true);
    expect(rateLimit({ key: "test:a", limit: 3, windowMs: 1000 })).toBe(true);
  });

  it("limit aşıldığında reddeder", () => {
    for (let i = 0; i < 3; i++) {
      expect(rateLimit({ key: "test:b", limit: 3, windowMs: 1000 })).toBe(true);
    }
    expect(rateLimit({ key: "test:b", limit: 3, windowMs: 1000 })).toBe(false);
  });

  it("farklı key'ler ayrı sayar", () => {
    expect(rateLimit({ key: "test:c1", limit: 1, windowMs: 1000 })).toBe(true);
    expect(rateLimit({ key: "test:c2", limit: 1, windowMs: 1000 })).toBe(true);
    expect(rateLimit({ key: "test:c1", limit: 1, windowMs: 1000 })).toBe(false);
  });

  it("window süresi dolunca yeniden kabul eder", async () => {
    expect(rateLimit({ key: "test:d", limit: 1, windowMs: 50 })).toBe(true);
    expect(rateLimit({ key: "test:d", limit: 1, windowMs: 50 })).toBe(false);
    await new Promise((r) => setTimeout(r, 60));
    expect(rateLimit({ key: "test:d", limit: 1, windowMs: 50 })).toBe(true);
  });
});
