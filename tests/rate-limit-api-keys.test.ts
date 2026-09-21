import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit } from "@/lib/rate-limit";
import { generateApiKey, hashApiKey, getKeyPrefix, isValidKeyFormat } from "@/lib/api-keys";

describe("rateLimit", () => {
  beforeEach(() => {
    // Unique keys per test avoid cross-test window leakage
  });

  it("allows up to the limit, then blocks within the window", () => {
    const key = `test-a-${Math.random()}`;
    for (let i = 1; i <= 5; i++) {
      expect(rateLimit(key, 5, 60_000).allowed).toBe(true);
    }
    const sixth = rateLimit(key, 5, 60_000);
    expect(sixth.allowed).toBe(false);
    expect(sixth.retryAfter).toBeGreaterThan(0);
  });

  it("resets after the window elapses", () => {
    const key = `test-b-${Math.random()}`;
    for (let i = 0; i < 5; i++) rateLimit(key, 5, 50);
    expect(rateLimit(key, 5, 50).allowed).toBe(false);
    // advance past the 50ms window
    const start = Date.now();
    while (Date.now() - start < 60) { /* busy-wait 60ms */ }
    expect(rateLimit(key, 5, 50).allowed).toBe(true);
  });

  it("tracks keys independently", () => {
    const a = `test-c-${Math.random()}`;
    const b = `test-c-${Math.random()}`;
    for (let i = 0; i < 5; i++) rateLimit(a, 5, 60_000);
    expect(rateLimit(a, 5, 60_000).allowed).toBe(false);
    expect(rateLimit(b, 5, 60_000).allowed).toBe(true);
  });
});

describe("api keys", () => {
  it("generates the documented format", () => {
    const key = generateApiKey();
    expect(isValidKeyFormat(key)).toBe(true);
    expect(key.startsWith("pactum_")).toBe(true);
    expect(key).toHaveLength("pactum_".length + 40);
  });

  it("generates unique keys", () => {
    const set = new Set(Array.from({ length: 100 }, () => generateApiKey()));
    expect(set.size).toBe(100);
  });

  it("hashes stably", () => {
    const key = generateApiKey();
    const hash = hashApiKey(key);
    expect(hash).toBe(hashApiKey(key));
  });

  it("extracts the display prefix", () => {
    const key = generateApiKey();
    expect(getKeyPrefix(key)).toBe(key.slice(0, "pactum_".length + 8));
  });

  it("rejects malformed keys", () => {
    expect(isValidKeyFormat("pk_live_abc")).toBe(false);
    expect(isValidKeyFormat("pactum_short")).toBe(false);
    expect(isValidKeyFormat("")).toBe(false);
  });
});
