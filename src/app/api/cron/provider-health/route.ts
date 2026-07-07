import { NextRequest, NextResponse } from "next/server";
import { runFullHealthCheck } from "@/lib/health-monitor";
import { loadProviderConfig } from "@/lib/provider-config";

// GET /api/cron/provider-health — trigger health check (called by Vercel cron or manual)
// POST /api/cron/provider-health — same
export async function GET(req: NextRequest) {
  return handleHealthCheck(req);
}

export async function POST(req: NextRequest) {
  return handleHealthCheck(req);
}

async function handleHealthCheck(req: NextRequest) {
  // Verify cron secret (Vercel cron sends CRON_SECRET header)
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Also allow from admin (no secret in dev)
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const config = loadProviderConfig();
  const interval = config.globalSettings.healthCheckInterval || 5;

  // Rate limit: don't run more than once per minute
  const lastRunKey = "lastHealthCheck";
  // Simple in-memory rate limit (works for single instance)
  const g = globalThis as unknown as Record<string, number>;
  const lastRun = g[lastRunKey] || 0;
  const now = Date.now();
  if (now - lastRun < 60_000) {
    return NextResponse.json({
      skipped: true,
      reason: "Rate limited (min 1 minute between checks)",
      nextRunIn: Math.ceil((60_000 - (now - lastRun)) / 1000),
    });
  }
  g[lastRunKey] = now;

  try {
    const result = await runFullHealthCheck();

    return NextResponse.json({
      success: true,
      timestamp: result.timestamp,
      summary: result.summary,
      interval: `${interval} minutes`,
      results: result.results.map((r) => ({
        id: r.id,
        name: r.name,
        status: r.status,
        latency: r.latency,
        error: r.error,
        autoDisabled: r.autoDisabled,
        autoReEnabled: r.autoReEnabled,
      })),
    });
  } catch (e) {
    console.error("[HealthMonitor] Cron check failed:", e);
    return NextResponse.json(
      { error: "Health check failed", details: (e as Error).message },
      { status: 500 }
    );
  }
}
