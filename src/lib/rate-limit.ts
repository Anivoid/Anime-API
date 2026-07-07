// In-memory rate limiter (production: use Redis)

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 300_000);

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  keyPrefix?: string;
}

export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const { windowMs, max, keyPrefix = "rl" } = config;
  const key = `${keyPrefix}:${identifier}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, resetAt: now + windowMs };
  }

  entry.count++;

  if (entry.count > max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: max - entry.count, resetAt: entry.resetAt };
}

// Predefined rate limits
export const RATE_LIMITS = {
  api: { windowMs: 60_000, max: 60, keyPrefix: "api" },
  auth: { windowMs: 900_000, max: 5, keyPrefix: "auth" },
  comment: { windowMs: 60_000, max: 10, keyPrefix: "comment" },
  upload: { windowMs: 60_000, max: 5, keyPrefix: "upload" },
  search: { windowMs: 60_000, max: 30, keyPrefix: "search" },
} as const;

export function applyRateLimit(
  request: Request,
  config: RateLimitConfig
): { allowed: boolean; headers: Record<string, string> } {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";

  const result = rateLimit(ip, config);

  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(config.max),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };

  if (!result.allowed) {
    headers["Retry-After"] = String(Math.ceil((result.resetAt - Date.now()) / 1000));
  }

  return { allowed: result.allowed, headers };
}
