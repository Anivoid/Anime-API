import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAllFeeds } from "@/lib/rss-importer";
import { auth } from "@/lib/auth";
import { processQueue } from "@/lib/queue";

// POST /api/cron/rss-check - Trigger RSS feed check
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    const session = await auth();
    if (!session?.user || !["ADMIN", "OWNER"].includes((session.user as { role: string }).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const [feedResults, queueResults] = await Promise.all([
      checkAllFeeds(),
      processQueue(10),
    ]);

    const summary = feedResults.reduce(
      (acc, r) => ({
        feedsChecked: acc.feedsChecked + 1,
        totalFound: acc.totalFound + r.itemsFound,
        totalNew: acc.totalNew + r.newItems,
        totalImported: acc.totalImported + r.imported,
        totalFailed: acc.totalFailed + r.failed,
        totalDuration: acc.totalDuration + r.duration,
      }),
      { feedsChecked: 0, totalFound: 0, totalNew: 0, totalImported: 0, totalFailed: 0, totalDuration: 0 }
    );

    return NextResponse.json({
      success: true,
      ...summary,
      queue: queueResults,
      details: feedResults,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// GET /api/cron/rss-check - Get status
export async function GET() {
  const [lastLogs, feeds, queueStats] = await Promise.all([
    prisma.importLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { feedSource: { select: { name: true } } },
    }),
    prisma.feedSource.findMany({
      orderBy: { lastCheckedAt: "desc" },
      select: {
        id: true, name: true, url: true, enabled: true,
        lastCheckedAt: true, itemCount: true, errorCount: true,
        totalImported: true, lastError: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.importQueue.groupBy({
      by: ["status"],
      _count: true,
    }),
  ]);

  return NextResponse.json({ feeds, recentLogs: lastLogs, queueStats });
}
