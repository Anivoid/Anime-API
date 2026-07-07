import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();

    // Get trending anime for non-logged-in users
    if (!session?.user?.id) {
      const trending = await prisma.anime.findMany({
        where: { trending: true },
        include: { genres: { include: { genre: true } } },
        take: 12,
        orderBy: { updatedAt: "desc" },
      });
      return NextResponse.json({ recommendations: trending, source: "trending" });
    }

    // Get user's watch history, ratings, and likes
    const [history, ratings, likes, watchlist] = await Promise.all([
      prisma.watchHistory.findMany({
        where: { userId: session.user.id },
        include: {
          episode: {
            include: { anime: { include: { genres: { include: { genre: true } } } } },
          },
        },
        orderBy: { watchedAt: "desc" },
        take: 50,
      }),
      prisma.rating.findMany({
        where: { userId: session.user.id },
        include: { anime: { include: { genres: { include: { genre: true } } } } },
        orderBy: { value: "desc" },
        take: 20,
      }),
      prisma.like.findMany({
        where: { userId: session.user.id },
        select: { animeId: true },
      }),
      prisma.watchlist.findMany({
        where: { userId: session.user.id },
        select: { animeId: true },
      }),
    ]);

    // Build genre preference map
    const genreScores: Record<string, number> = {};
    const watchedAnimeIds = new Set<string>();

    // From watch history - weight by recency
    history.forEach((h, index) => {
      const anime = h.episode.anime;
      watchedAnimeIds.add(anime.id);
      const weight = Math.max(1, 10 - Math.floor(index / 5));
      anime.genres.forEach((ag) => {
        genreScores[ag.genreId] = (genreScores[ag.genreId] || 0) + weight;
      });
    });

    // From high ratings
    ratings.forEach((r) => {
      watchedAnimeIds.add(r.animeId);
      const weight = r.value >= 8 ? 5 : r.value >= 6 ? 3 : 1;
      r.anime.genres.forEach((ag) => {
        genreScores[ag.genreId] = (genreScores[ag.genreId] || 0) + weight;
      });
    });

    // From likes
    likes.forEach((l) => {
      const anime = history.find((h) => h.episode.anime.id === l.animeId)?.episode.anime;
      if (anime) {
        anime.genres.forEach((ag) => {
          genreScores[ag.genreId] = (genreScores[ag.genreId] || 0) + 3;
        });
      }
    });

    // Get top genres
    const topGenres = Object.entries(genreScores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([genreId]) => genreId);

    if (topGenres.length === 0) {
      // No history - return trending
      const trending = await prisma.anime.findMany({
        where: { trending: true },
        include: { genres: { include: { genre: true } } },
        take: 12,
        orderBy: { updatedAt: "desc" },
      });
      return NextResponse.json({ recommendations: trending, source: "trending" });
    }

    // Find anime matching top genres that user hasn't watched
    const recommendations = await prisma.anime.findMany({
      where: {
        id: { notIn: [...watchedAnimeIds] },
        genres: { some: { genreId: { in: topGenres } } },
      },
      include: {
        genres: { include: { genre: true } },
        _count: { select: { ratings: true, animeLikes: true } },
      },
      take: 20,
      orderBy: [
        { trending: "desc" },
        { featured: "desc" },
        { updatedAt: "desc" },
      ],
    });

    // Sort by genre match score
    const scored = recommendations
      .map((anime) => {
        const score = anime.genres.reduce((sum, ag) => sum + (genreScores[ag.genreId] || 0), 0);
        return { ...anime, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    return NextResponse.json({
      recommendations: scored,
      source: "personalized",
      topGenres: topGenres.length,
      watchedCount: watchedAnimeIds.size,
    });
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
