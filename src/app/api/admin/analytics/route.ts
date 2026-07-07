import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { reportError } from "@/lib/error-monitor";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["OWNER", "ADMIN"].includes(session.user.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const last24h = new Date(now.getTime() - 86400000);
    const last7d = new Date(now.getTime() - 604800000);
    const last30d = new Date(now.getTime() - 2592000000);

    const [
      totalAnime,
      totalEpisodes,
      totalUsers,
      totalComments,
      totalWatchlists,
      totalRatings,
      newUsers24h,
      newUsers7d,
      newAnime24h,
      newComments24h,
      newEpisodes24h,
      activeUsers7d,
      topAnimeByWatch,
      topAnimeByRating,
      recentActivity,
      usersByRole,
      statusDistribution,
    ] = await Promise.all([
      prisma.anime.count(),
      prisma.episode.count(),
      prisma.user.count(),
      prisma.comment.count(),
      prisma.watchlist.count(),
      prisma.rating.count(),
      prisma.user.count({ where: { createdAt: { gte: last24h } } }),
      prisma.user.count({ where: { createdAt: { gte: last7d } } }),
      prisma.anime.count({ where: { createdAt: { gte: last24h } } }),
      prisma.comment.count({ where: { createdAt: { gte: last24h } } }),
      prisma.episode.count({ where: { createdAt: { gte: last24h } } }),
      prisma.watchHistory.findMany({
        where: { watchedAt: { gte: last7d } },
        select: { userId: true },
        distinct: ["userId"],
      }),
      prisma.watchHistory.groupBy({
        by: ["episodeId"],
        _count: true,
        orderBy: { _count: { episodeId: "desc" } },
      }),
      prisma.anime.findMany({
        where: { ratings: { some: {} } },
        include: { _count: { select: { ratings: true } }, ratings: { select: { value: true } } },
        take: 5,
      }),
      prisma.activityLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { name: true, username: true } } },
      }),
      prisma.user.groupBy({ by: ["role"], _count: true }),
      prisma.anime.groupBy({ by: ["status"], _count: true }),
    ]);

    // Resolve episode watch counts to anime titles
    const episodeIds = topAnimeByWatch.map((w) => w.episodeId);
    const episodes = await prisma.episode.findMany({
      where: { id: { in: episodeIds } },
      select: { id: true, animeId: true },
    });
    const episodeToAnime = new Map(episodes.map((e) => [e.id, e.animeId]));
    const animeWatchMap = new Map<string, number>();
    for (const w of topAnimeByWatch) {
      const animeId = episodeToAnime.get(w.episodeId);
      if (animeId) {
        animeWatchMap.set(animeId, (animeWatchMap.get(animeId) || 0) + w._count);
      }
    }
    const topAnimeIds = [...animeWatchMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);
    const topAnimeDetails = await prisma.anime.findMany({
      where: { id: { in: topAnimeIds } },
      select: { id: true, title: true, slug: true },
    });
    const animeDetailMap = new Map(topAnimeDetails.map((a) => [a.id, a]));

    const avgRatings = topAnimeByRating.map((a) => ({
      title: a.title,
      slug: a.slug,
      count: a._count.ratings,
      avg: a.ratings.reduce((sum, r) => sum + r.value, 0) / a.ratings.length,
    }));

    return NextResponse.json({
      overview: {
        totalAnime,
        totalEpisodes,
        totalUsers,
        totalComments,
        totalWatchlists,
        totalRatings,
      },
      growth: {
        newUsers24h,
        newUsers7d,
        newAnime24h,
        newComments24h,
        newEpisodes24h,
        activeUsers7d: activeUsers7d.length,
      },
      topAnime: {
        byWatch: topAnimeIds.map((id) => ({
          title: animeDetailMap.get(id)?.title || "Unknown",
          slug: animeDetailMap.get(id)?.slug || "",
          watches: animeWatchMap.get(id) || 0,
        })),
        byRating: avgRatings,
      },
      usersByRole,
      statusDistribution,
      recentActivity: recentActivity.map((a) => ({
        ...a,
        user: a.user,
      })),
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    reportError(error instanceof Error ? error : "Unknown error", { api: "Analytics API" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
