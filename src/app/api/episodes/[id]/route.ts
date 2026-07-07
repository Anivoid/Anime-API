import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/episodes/[id] - Get episode by CUID with videoUrl
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const episode = await prisma.episode.findUnique({
    where: { id },
    include: {
      anime: {
        select: {
          id: true,
          title: true,
          slug: true,
          coverImage: true,
          bannerImage: true,
          description: true,
          status: true,
          type: true,
          season: true,
          releaseYear: true,
          rating: true,
          genres: { include: { genre: true } },
        },
      },
    },
  });

  if (!episode) {
    return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  }

  // Get all episodes for this anime
  const allEpisodes = await prisma.episode.findMany({
    where: { animeId: episode.animeId },
    orderBy: { number: "asc" },
    select: { id: true, number: true, title: true, duration: true },
  });

  return NextResponse.json({
    episode: {
      id: episode.id,
      number: episode.number,
      title: episode.title,
      description: episode.description,
      thumbnail: episode.thumbnail,
      videoUrl: episode.videoUrl,
      duration: episode.duration,
    },
    anime: episode.anime,
    episodes: allEpisodes,
  });
}
