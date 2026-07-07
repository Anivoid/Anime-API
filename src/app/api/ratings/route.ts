import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withCache } from "@/lib/cache";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const animeId = searchParams.get("animeId");

    if (!animeId) {
      return NextResponse.json({ error: "animeId is required" }, { status: 400 });
    }

    const session = await auth();
    const userId = session?.user?.id;

    let userRating = null;
    if (userId) {
      const rating = await prisma.rating.findUnique({
        where: { userId_animeId: { userId, animeId } },
      });
      userRating = rating?.value || null;
    }

    const aggregate = await prisma.rating.aggregate({
      where: { animeId },
      _avg: { value: true },
      _count: { value: true },
    });

    const response = NextResponse.json({
      average: aggregate._avg.value,
      count: aggregate._count.value,
      userRating,
    });
    return withCache(response, "medium");
  } catch (error) {
    console.error("Error fetching rating:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { animeId, value } = await request.json();

    if (!animeId || value === undefined) {
      return NextResponse.json({ error: "animeId and value are required" }, { status: 400 });
    }

    const numValue = Math.round(Math.max(1, Math.min(10, Number(value))));

    const existing = await prisma.rating.findUnique({
      where: { userId_animeId: { userId: session.user.id, animeId } },
    });

    if (existing) {
      await prisma.rating.update({
        where: { id: existing.id },
        data: { value: numValue },
      });
    } else {
      await prisma.rating.create({
        data: { userId: session.user.id, animeId, value: numValue },
      });
    }

    // Recalculate average
    const aggregate = await prisma.rating.aggregate({
      where: { animeId },
      _avg: { value: true },
      _count: { value: true },
    });

    const avgRating = aggregate._avg.value;

    // Update anime's cached rating
    await prisma.anime.update({
      where: { id: animeId },
      data: { rating: avgRating ? Math.round(avgRating * 10) / 10 : null },
    });

    return NextResponse.json({
      userRating: numValue,
      average: avgRating,
      count: aggregate._count.value,
    });
  } catch (error) {
    console.error("Error setting rating:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
