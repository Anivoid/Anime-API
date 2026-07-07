import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCache } from "@/lib/cache";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const anime = await prisma.anime.findUnique({
      where: { slug },
      include: {
        genres: {
          include: { genre: true },
        },
        episodes: {
          orderBy: { number: "asc" },
        },
        studios: {
          include: { studio: true },
        },
        _count: {
          select: {
            animeLikes: true,
            comments: true,
          },
        },
      },
    });

    if (!anime) {
      return NextResponse.json(
        { error: "Anime not found" },
        { status: 404 }
      );
    }

    // Get similar anime based on shared genres
    const genreIds = anime.genres.map((g) => g.genreId);
    let similar: {
      id: string;
      title: string;
      slug: string;
      coverImage: string | null;
      rating: number | null;
      releaseYear: number;
      status: string;
      genres: { genre: { name: string } }[];
      _count: { ratings: number; animeLikes: number };
    }[] = [];
    if (genreIds.length > 0) {
      similar = await prisma.anime.findMany({
        where: {
          id: { not: anime.id },
          genres: { some: { genreId: { in: genreIds } } },
        },
        include: {
          genres: { include: { genre: true } },
          _count: { select: { ratings: true, animeLikes: true } },
        },
        take: 8,
        orderBy: [
          { trending: "desc" },
          { featured: "desc" },
          { updatedAt: "desc" },
        ],
      });

      // Sort by genre overlap count
      similar.sort((a, b) => {
        const aNames = a.genres.map((g) => g.genre.name);
        const bNames = b.genres.map((g) => g.genre.name);
        const aOverlap = anime.genres.filter((ag) => aNames.includes(ag.genre.name)).length;
        const bOverlap = anime.genres.filter((ag) => bNames.includes(ag.genre.name)).length;
        return bOverlap - aOverlap;
      });
    }

    const response = NextResponse.json({ ...anime, similar: similar.slice(0, 6) });
    return withCache(response, "animeDetail");
  } catch (error) {
    console.error("Error fetching anime:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const anime = await prisma.anime.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!anime) {
      return NextResponse.json({ error: "Anime not found" }, { status: 404 });
    }

    // Delete related data first
    await prisma.animeGenre.deleteMany({ where: { animeId: anime.id } });
    await prisma.episode.deleteMany({ where: { animeId: anime.id } });
    await prisma.comment.deleteMany({ where: { animeId: anime.id } });
    await prisma.like.deleteMany({ where: { animeId: anime.id } });
    await prisma.watchlist.deleteMany({ where: { animeId: anime.id } });
    await prisma.watchHistory.deleteMany({ where: { episode: { animeId: anime.id } } });
    await prisma.anime.delete({ where: { id: anime.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting anime:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
