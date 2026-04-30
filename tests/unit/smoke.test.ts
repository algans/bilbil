import { describe, it, expect } from "vitest";

// Faz 0 smoke test: test runner çalışıyor mu?
describe("smoke", () => {
  it("vitest çalışıyor", () => {
    expect(1 + 1).toBe(2);
  });

  it("typescript types çalışıyor", () => {
    const greeting: string = "Bilbil";
    expect(greeting).toBe("Bilbil");
  });
});
