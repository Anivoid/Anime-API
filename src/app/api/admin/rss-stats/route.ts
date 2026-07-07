import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getAnalytics } from "@/lib/anilist-metadata";
import { getQueueStats } from "@/lib/queue";

// GET /api/admin/rss-stats - Get comprehensive RSS stats
export async function GET() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "OWNER"].includes((session.user as { role: string }).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    feeds,
    recentLogs,
    totalItems,
    importedItems,
    failedItems,
    pendingItems,
    todayImports,
    todayErrors,
    analytics,
    queueStats,
  ] = await Promise.all([
    prisma.feedSource.findMany({
      orderBy: { lastCheckedAt: "desc" },
      select: {
        id: true,
        name: true,
        url: true,
        type: true,
        category: true,
        enabled: true,
        priority: true,
        checkInterval: true,
        lastCheckedAt: true,
        itemCount: true,
        errorCount: true,
        totalImported: true,
        lastError: true,
        _count: { select: { items: true, importLogs: true } },
      },
    }),
    prisma.importLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { feedSource: { select: { name: true } } },
    }),
    prisma.rSSItem.count(),
    prisma.rSSItem.count({ where: { status: "imported" } }),
    prisma.rSSItem.count({ where: { status: "failed" } }),
    prisma.rSSItem.count({ where: { status: "pending" } }),
    prisma.rSSItem.count({
      where: {
        status: "imported",
        importedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.rSSItem.count({
      where: {
        status: "failed",
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    getAnalytics(),
    getQueueStats(),
  ]);

  // Get retry queue (failed items that can be retried)
  const retryQueue = await prisma.rSSItem.findMany({
    where: { status: "failed", retryCount: { lt: 3 } },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      error: true,
      retryCount: true,
      createdAt: true,
      feedSource: { select: { name: true } },
    },
  });

  // Get top imported anime
  const topImported = await prisma.anime.findMany({
    where: { rssItems: { some: { status: "imported" } } },
    include: {
      _count: { select: { rssItems: true, episodes: true } },
      genres: { include: { genre: { select: { name: true } } } },
    },
    orderBy: { rssItems: { _count: "desc" } },
    take: 10,
  });

  return NextResponse.json({
    feeds,
    recentLogs,
    totalItems,
    importedItems,
    failedItems,
    pendingItems,
    todayImports,
    todayErrors,
    analytics,
    queueStats,
    retryQueue,
    topImported,
  });
}
