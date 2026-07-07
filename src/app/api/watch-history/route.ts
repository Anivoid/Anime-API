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

    const history = await prisma.watchHistory.findMany({
      where: { userId: session.user.id },
      include: {
        episode: {
          include: {
            anime: true,
          },
        },
      },
      orderBy: { watchedAt: "desc" },
      take: 20,
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error("Error fetching watch history:", error);
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

    const { episodeId, progress, position, duration, completed } = await request.json();

    if (!episodeId) {
      return NextResponse.json(
        { error: "Episode ID is required" },
        { status: 400 }
      );
    }

    const history = await prisma.watchHistory.upsert({
      where: {
        userId_episodeId: {
          userId: session.user.id,
          episodeId,
        },
      },
      update: {
        progress: progress || 0,
        position: position || 0,
        duration: duration || 0,
        completed: completed || false,
        watchedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        episodeId,
        progress: progress || 0,
        position: position || 0,
        duration: duration || 0,
        completed: completed || false,
      },
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error("Error updating watch history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
