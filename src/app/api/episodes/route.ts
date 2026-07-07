import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { animeId, number, title, duration, videoUrl } = body;

    if (!animeId || !number) {
      return NextResponse.json(
        { error: "Anime ID and episode number are required" },
        { status: 400 }
      );
    }

    const episode = await prisma.episode.create({
      data: {
        animeId,
        number: parseInt(number),
        title: title || null,
        duration: duration ? parseInt(duration) : null,
        videoUrl: videoUrl || null,
      },
    });

    // Get anime info for notification
    const anime = await prisma.anime.findUnique({
      where: { id: animeId },
      select: { title: true, slug: true },
    });

    // Notify users who have this anime on their watchlist
    if (anime) {
      const watchlistEntries = await prisma.watchlist.findMany({
        where: { animeId },
        select: { userId: true },
      });

      const usersWithNotifs = await prisma.user.findMany({
        where: {
          id: { in: watchlistEntries.map((w) => w.userId) },
          notifEpisodes: true,
        },
        select: { id: true },
      });

      const notifications = usersWithNotifs.map((user) => ({
        userId: user.id,
        type: "NEW_EPISODE",
        title: `New Episode: ${anime.title}`,
        message: `Episode ${number}${title ? ` - ${title}` : ""} is now available!`,
        link: `/watch/${anime.slug}/${number}`,
      }));

      if (notifications.length > 0) {
        await prisma.notification.createMany({ data: notifications });
      }
    }

    return NextResponse.json(episode, { status: 201 });
  } catch (error) {
    console.error("Error creating episode:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
