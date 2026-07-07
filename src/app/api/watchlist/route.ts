import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const watchlist = await prisma.watchlist.findMany({
      where: { userId: session.user.id },
      include: {
        anime: {
          include: {
            _count: {
              select: { episodes: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(watchlist);
  } catch (error) {
    console.error("Error fetching watchlist:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { animeId } = await request.json();

    if (!animeId) {
      return NextResponse.json(
        { error: "Anime ID is required" },
        { status: 400 }
      );
    }

    // Check if already in watchlist
    const existing = await prisma.watchlist.findUnique({
      where: {
        userId_animeId: {
          userId: session.user.id,
          animeId,
        },
      },
    });

    if (existing) {
      // Remove from watchlist
      await prisma.watchlist.delete({
        where: { id: existing.id },
      });
      return NextResponse.json({ inWatchlist: false });
    }

    // Add to watchlist
    await prisma.watchlist.create({
      data: {
        userId: session.user.id,
        animeId,
      },
    });

    return NextResponse.json({ inWatchlist: true });
  } catch (error) {
    console.error("Error updating watchlist:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
