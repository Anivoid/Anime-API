import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { processQueue, getQueueStats, enqueueJob } from "@/lib/queue";
import { forceFullRescan } from "@/lib/rss-importer";

// GET /api/admin/queue - Get queue stats
export async function GET() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "OWNER"].includes((session.user as { role: string }).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = await getQueueStats();
  return NextResponse.json(stats);
}

// POST /api/admin/queue - Process queue or trigger actions
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "OWNER"].includes((session.user as { role: string }).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action, feedSourceId, animeId } = body;

  switch (action) {
    case "process": {
      const result = await processQueue(body.batchSize || 10);
      return NextResponse.json({ success: true, ...result });
    }

    case "sync_feed": {
      if (!feedSourceId) return NextResponse.json({ error: "feedSourceId required" }, { status: 400 });
      const jobId = await enqueueJob("feed_sync", { feedSourceId }, 1);
      return NextResponse.json({ success: true, jobId });
    }

    case "sync_anime": {
      if (!animeId) return NextResponse.json({ error: "animeId required" }, { status: 400 });
      const jobId = await enqueueJob("full_rescan", { animeId }, 1);
      return NextResponse.json({ success: true, jobId });
    }

    case "full_rescan": {
      const result = await forceFullRescan();
      return NextResponse.json({ success: true, ...result });
    }

    case "retry_failed": {
      const failed = await prisma.rSSItem.findMany({
        where: { status: "failed", retryCount: { lt: 3 } },
        take: 20,
      });
      let queued = 0;
      for (const item of failed) {
        await enqueueJob("feed_sync", { feedSourceId: item.feedSourceId }, 0);
        queued++;
      }
      return NextResponse.json({ success: true, queued });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
