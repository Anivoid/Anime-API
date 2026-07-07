import { describe, it, expect } from "vitest";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

describe("RATE_LIMITS", () => {
  it("has auth preset with low limit", () => {
    expect(RATE_LIMITS.auth.max).toBeLessThanOrEqual(10);
  });

  it("has api preset with higher limit", () => {
    expect(RATE_LIMITS.api.max).toBeGreaterThan(RATE_LIMITS.auth.max);
  });

  it("all presets have windowMs", () => {
    for (const preset of Object.values(RATE_LIMITS)) {
      expect(preset.windowMs).toBeGreaterThan(0);
      expect(preset.max).toBeGreaterThan(0);
    }
  });
});

describe("rateLimit", () => {
  it("allows requests under the limit", () => {
    const key = `test-allow-${Date.now()}`;
    const result = rateLimit(key, { windowMs: 60000, max: 5 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("blocks requests over the limit", () => {
    const key = `test-block-${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      rateLimit(key, { windowMs: 60000, max: 3 });
    }
    const result = rateLimit(key, { windowMs: 60000, max: 3 });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("tracks remaining count correctly", () => {
    const key = `test-remaining-${Date.now()}`;
    const r1 = rateLimit(key, { windowMs: 60000, max: 5 });
    expect(r1.remaining).toBe(4);
    const r2 = rateLimit(key, { windowMs: 60000, max: 5 });
    expect(r2.remaining).toBe(3);
  });

  it("returns reset time", () => {
    const key = `test-reset-${Date.now()}`;
    const result = rateLimit(key, { windowMs: 60000, max: 5 });
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });

  it("uses different keys independently", () => {
    const key1 = `test-indep1-${Date.now()}`;
    const key2 = `test-indep2-${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      rateLimit(key1, { windowMs: 60000, max: 3 });
    }
    const result = rateLimit(key2, { windowMs: 60000, max: 3 });
    expect(result.allowed).toBe(true);
  });
});
