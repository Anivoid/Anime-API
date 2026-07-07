// API response caching helpers

import { NextResponse } from "next/server";

export interface CacheConfig {
  maxAge: number;
  staleWhileRevalidate?: number;
  isPrivate?: boolean;
  tags?: readonly string[];
}

export const CACHE_PRESETS = {
  // Static content - long cache
  static: { maxAge: 86400, staleWhileRevalidate: 604800 },
  // Genre list, etc.
  long: { maxAge: 3600, staleWhileRevalidate: 7200 },
  // Anime list, search results
  medium: { maxAge: 300, staleWhileRevalidate: 600 },
  // User-specific data
  private: { maxAge: 0, isPrivate: true },
  // Real-time data
  noCache: { maxAge: 0, staleWhileRevalidate: 0 },
  // Anime detail (changes rarely)
  animeDetail: { maxAge: 600, staleWhileRevalidate: 1800, tags: ["anime"] },
  // Comments (moderate frequency)
  comments: { maxAge: 60, staleWhileRevalidate: 120 },
} as const;

export function setCacheHeaders(
  response: NextResponse,
  config: CacheConfig
): NextResponse {
  const directives: string[] = [];

  if (config.maxAge === 0 && !config.staleWhileRevalidate) {
    directives.push("no-cache", "no-store", "must-revalidate");
  } else {
    if (config.isPrivate) {
      directives.push("private");
    } else {
      directives.push("public");
    }
    directives.push(`max-age=${config.maxAge}`);
    if (config.staleWhileRevalidate) {
      directives.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
    }
  }

  response.headers.set("Cache-Control", directives.join(", "));

  if (config.tags?.length) {
    response.headers.set("Surrogate-Key", config.tags.join(" "));
  }

  // ETag support
  response.headers.set("Vary", "Accept-Encoding, Authorization");

  return response;
}

export function withCache(
  response: NextResponse,
  preset: keyof typeof CACHE_PRESETS
): NextResponse {
  return setCacheHeaders(response, CACHE_PRESETS[preset]);
}

// Generate a simple ETag from content
export function generateETag(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `"${Math.abs(hash).toString(36)}"`;
}

// Conditional request handling (304 Not Modified)
export function checkConditionalRequest(
  request: Request,
  etag: string
): boolean {
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch === etag) return true;
  return false;
}
