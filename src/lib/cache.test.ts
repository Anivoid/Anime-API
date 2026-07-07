import { describe, it, expect } from "vitest";
import {
  CACHE_PRESETS,
  setCacheHeaders,
  withCache,
  generateETag,
  checkConditionalRequest,
  CacheConfig,
} from "@/lib/cache";
import { NextResponse } from "next/server";

function makeResponse(): NextResponse {
  return NextResponse.json({ ok: true });
}

describe("CACHE_PRESETS", () => {
  it("static preset has long maxAge", () => {
    expect(CACHE_PRESETS.static.maxAge).toBe(86400);
    expect(CACHE_PRESETS.static.staleWhileRevalidate).toBe(604800);
  });

  it("noCache preset has zero maxAge", () => {
    expect(CACHE_PRESETS.noCache.maxAge).toBe(0);
  });

  it("private preset has isPrivate flag", () => {
    expect(CACHE_PRESETS.private.isPrivate).toBe(true);
  });

  it("animeDetail has tags", () => {
    expect(CACHE_PRESETS.animeDetail.tags).toContain("anime");
  });
});

describe("setCacheHeaders", () => {
  it("sets no-cache headers for zero maxAge", () => {
    const res = makeResponse();
    setCacheHeaders(res, { maxAge: 0 });
    expect(res.headers.get("Cache-Control")).toContain("no-cache");
    expect(res.headers.get("Cache-Control")).toContain("must-revalidate");
  });

  it("sets public max-age headers", () => {
    const res = makeResponse();
    setCacheHeaders(res, { maxAge: 300 });
    const cc = res.headers.get("Cache-Control");
    expect(cc).toContain("public");
    expect(cc).toContain("max-age=300");
  });

  it("sets private headers when isPrivate with maxAge > 0", () => {
    const res = makeResponse();
    setCacheHeaders(res, { maxAge: 300, isPrivate: true });
    expect(res.headers.get("Cache-Control")).toContain("private");
    expect(res.headers.get("Cache-Control")).toContain("max-age=300");
  });

  it("includes stale-while-revalidate", () => {
    const res = makeResponse();
    setCacheHeaders(res, { maxAge: 600, staleWhileRevalidate: 1800 });
    expect(res.headers.get("Cache-Control")).toContain("stale-while-revalidate=1800");
  });

  it("sets Surrogate-Key for tags", () => {
    const res = makeResponse();
    setCacheHeaders(res, { maxAge: 60, tags: ["anime", "detail"] });
    expect(res.headers.get("Surrogate-Key")).toBe("anime detail");
  });
});

describe("withCache", () => {
  it("applies preset cache headers", () => {
    const res = makeResponse();
    const result = withCache(res, "static");
    expect(result.headers.get("Cache-Control")).toContain("max-age=86400");
  });
});

describe("generateETag", () => {
  it("returns a quoted string", () => {
    const etag = generateETag("hello world");
    expect(etag).toMatch(/^".*"$/);
  });

  it("produces consistent results", () => {
    const a = generateETag("test content");
    const b = generateETag("test content");
    expect(a).toBe(b);
  });

  it("produces different ETags for different content", () => {
    const a = generateETag("content A");
    const b = generateETag("content B");
    expect(a).not.toBe(b);
  });
});

describe("checkConditionalRequest", () => {
  it("returns true when If-None-Match matches", () => {
    const request = new Request("http://localhost", {
      headers: { "If-None-Match": '"abc123"' },
    });
    expect(checkConditionalRequest(request, '"abc123"')).toBe(true);
  });

  it("returns false when If-None-Match does not match", () => {
    const request = new Request("http://localhost", {
      headers: { "If-None-Match": '"wrong"' },
    });
    expect(checkConditionalRequest(request, '"abc123"')).toBe(false);
  });

  it("returns false when no If-None-Match header", () => {
    const request = new Request("http://localhost");
    expect(checkConditionalRequest(request, '"abc123"')).toBe(false);
  });
});
