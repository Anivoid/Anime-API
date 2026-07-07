import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const animeId = searchParams.get("animeId");

    if (!animeId) {
      return NextResponse.json(
        { error: "Anime ID is required" },
        { status: 400 }
      );
    }

    const session = await auth();
    const userId = session?.user?.id;

    let liked = false;
    if (userId) {
      const like = await prisma.like.findUnique({
        where: {
          userId_animeId: { userId, animeId },
        },
      });
      liked = !!like;
    }

    const count = await prisma.like.count({
      where: { animeId },
    });

    return NextResponse.json({ count, liked });
  } catch (error) {
    console.error("Error fetching likes:", error);
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

    // Check if already liked
    const existing = await prisma.like.findUnique({
      where: {
        userId_animeId: {
          userId: session.user.id,
          animeId,
        },
      },
    });

    if (existing) {
      // Unlike
      await prisma.like.delete({
        where: { id: existing.id },
      });

      const count = await prisma.like.count({
        where: { animeId },
      });

      return NextResponse.json({ liked: false, count });
    }

    // Like
    await prisma.like.create({
      data: {
        userId: session.user.id,
        animeId,
      },
    });

    const count = await prisma.like.count({
      where: { animeId },
    });

    return NextResponse.json({ liked: true, count });
  } catch (error) {
    console.error("Error updating like:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
