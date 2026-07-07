import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const adminRoles = ["OWNER", "ADMIN", "MODERATOR", "UPLOADER"];

// Simple in-memory rate limiter for middleware
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function middlewareRateLimit(ip: string, limit = 100, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  entry.count++;
  return entry.count <= limit;
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 300_000);

export default auth((req) => {
  const pathname = req.nextUrl.pathname;

  // Rate limiting
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";

  // Stricter rate limit for auth endpoints
  const authLimit = pathname.startsWith("/api/auth") ? 10 : 200;
  if (!middlewareRateLimit(ip, authLimit)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  // Auth-protected routes
  if (!req.auth && (pathname.startsWith("/dashboard") || pathname.startsWith("/watch") || pathname.startsWith("/profile"))) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  // Admin routes: require role
  if (pathname.startsWith("/admin")) {
    if (!req.auth) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }
    const role = (req.auth.user as { role?: string })?.role;
    if (!role || !adminRoles.includes(role)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Security headers
  const response = NextResponse.next();

  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");
  // Prevent MIME sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");
  // XSS protection
  response.headers.set("X-XSS-Protection", "1; mode=block");
  // Referrer policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Permissions policy
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");

  // CSP (relaxed for dev, tighten for production)
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; media-src 'self' https:;"
    );
  }

  return response;
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/watch/:path*",
    "/profile/:path*",
    "/admin/:path*",
    "/api/:path*",
  ],
};
