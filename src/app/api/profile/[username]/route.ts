import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        bio: true,
        createdAt: true,
        _count: {
          select: {
            comments: true,
            animeLikes: true,
            ratings: true,
            watchlist: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const recentComments = await prisma.comment.findMany({
      where: { userId: user.id },
      include: {
        anime: { select: { title: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const favoriteRatings = await prisma.rating.findMany({
      where: { userId: user.id, value: { gte: 8 } },
      orderBy: { value: "desc" },
      take: 10,
      select: { animeId: true },
    });

    const genreIds = await prisma.animeGenre.findMany({
      where: { animeId: { in: [...new Set(favoriteRatings.map((r) => r.animeId))] } },
      select: { genreId: true },
    });

    const genres = await prisma.genre.findMany({
      where: { id: { in: [...new Set(genreIds.map((g) => g.genreId))] } },
      select: { name: true, slug: true },
    });

    return NextResponse.json({
      ...user,
      recentComments,
      favoriteGenres: genres,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
