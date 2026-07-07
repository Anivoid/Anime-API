import { NextRequest, NextResponse } from "next/server";

// GET /api/stream?type=watch&id=16498&episode=1&title=Attack+on+Titan&audio=sub&provider=kiwi
// GET /api/stream?type=status — provider status + health
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "status";

  try {
    if (type === "status") {
      const { getFullProviderStatus } = await import("@/lib/health-monitor");
      return NextResponse.json(getFullProviderStatus());
    }

    if (type === "watch") {
      const { getStreams } = await import("@/lib/stream-providers");
      const { loadProviderConfig } = await import("@/lib/provider-config");
      const title = searchParams.get("title") || "";
      const anilistId = searchParams.get("id") ? parseInt(searchParams.get("id")!) : undefined;
      const episodeNumber = parseInt(searchParams.get("episode") || "1");
      const provider = searchParams.get("provider") || undefined;
      const category = (searchParams.get("audio") || "sub") as "sub" | "dub";

      if (!title && !anilistId) {
        return NextResponse.json({ error: "title or id required" }, { status: 400 });
      }

      const result = await getStreams({
        animeTitle: title,
        anilistId,
        episodeNumber,
        provider,
        category,
      });

      // Build provider status for error reporting
      const config = loadProviderConfig();
      const providerStatus: Record<string, { enabled: boolean; healthy: boolean; error?: string }> = {};
      for (const p of config.providers) {
        providerStatus[p.id] = {
          enabled: p.enabled && !p.autoDisabled,
          healthy: p.healthStatus === "healthy" || p.healthStatus === "unknown",
          error: p.lastError || undefined,
        };
      }

      return NextResponse.json({
        success: result.success,
        results: {
          streams: result.sources.map((s) => ({
            url: s.url,
            type: s.isM3U8 ? "hls" : "mp4",
            quality: s.quality,
            referer: s.referer,
            headers: s.headers,
          })),
          subtitles: result.subtitles || [],
          skipTimes: result.skipTimes,
          provider: result.provider,
          cached: result.cached || false,
          providerStatus,
        },
        provider: result.provider,
        duration: result.duration,
        error: result.error,
      });
    }

    return NextResponse.json({ error: "Invalid type. Use ?type=watch or ?type=status" }, { status: 400 });
  } catch (e) {
    console.error("[Stream API]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST /api/stream — health check (admin)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body.action === "health") {
      const { runFullHealthCheck } = await import("@/lib/health-monitor");
      const result = await runFullHealthCheck();
      return NextResponse.json({ success: true, ...result });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
