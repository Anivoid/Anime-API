import { NextResponse } from "next/server";

const ANILIST_URL = "https://graphql.anilist.co";

async function anilistFetch<T>(query: string, variables: Record<string, unknown> = {}): Promise<T | null> {
  try {
    const res = await fetch(ANILIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables }),
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data as T;
  } catch {
    return null;
  }
}

interface AniListMedia {
  id: number;
  title: { romaji: string; english: string | null; native: string | null };
  coverImage: { large: string; medium: string } | null;
  format: string;
  season: string | null;
  seasonYear: number | null;
  episodes: number | null;
  nextAiringEpisode: { episode: number; airingAt: number; timeUntilAiring: number } | null;
  status: string;
  airingSchedule: { nodes: { episode: number; airingAt: number }[] } | null;
  popular: number;
  trending: number;
  averageScore: number | null;
  meanScore: number | null;
  genres: string[] | null;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const section = searchParams.get("section") || "all";

  const result: Record<string, unknown> = {};

  if (section === "all" || section === "episodes") {
    const query = `query {
      Page(page: 1, perPage: 20) {
        media(status: RELEASING, type: ANIME, sort: TRENDING_DESC, isAdult: false) {
          id
          title { romaji english native }
          coverImage { large medium }
          format
          season
          seasonYear
          episodes
          status
          nextAiringEpisode { episode airingAt timeUntilAiring }
          airingSchedule(notYetAired: true, page: 1, perPage: 1) { nodes { episode airingAt } }
          averageScore
          genres
        }
      }
    }`;
    const data = await anilistFetch<{ Page: { media: AniListMedia[] } }>(query);
    if (data?.Page?.media) {
      result.episodes = data.Page.media.map((m) => ({
        id: m.id,
        title: m.title.english || m.title.romaji,
        slug: `anilist-${m.id}`,
        coverImage: m.coverImage?.large || m.coverImage?.medium || null,
        format: m.format,
        season: m.season,
        seasonYear: m.seasonYear,
        totalEpisodes: m.episodes,
        status: m.status,
        episodeNumber: m.nextAiringEpisode?.episode || m.episodes || 1,
        nextAiringAt: m.nextAiringEpisode?.airingAt || null,
        timeUntilAiring: m.nextAiringEpisode?.timeUntilAiring || null,
        averageScore: m.averageScore,
        genres: m.genres?.slice(0, 3) || [],
        subCount: m.episodes || null,
        dubCount: null,
        type: m.format,
      }));
    }
  }

  if (section === "all" || section === "schedule") {
    const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const now = Math.floor(Date.now() / 1000);
    const weekLater = now + 7 * 24 * 60 * 60;

    const schedQuery = `query {
      Page(page: 1, perPage: 50) {
        media(status: RELEASING, type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
          id
          title { romaji english }
          coverImage { large }
          format
          nextAiringEpisode { episode airingAt timeUntilAiring }
          airingSchedule(notYetAired: true, page: 1, perPage: 7) {
            nodes { episode airingAt }
          }
        }
      }
    }`;
    const schedData = await anilistFetch<{ Page: { media: AniListMedia[] } }>(schedQuery);
    if (schedData?.Page?.media) {
      const schedule: { animeTitle: string; slug: string; episodeNumber: number; airTime: string; airDay: string; coverImage: string | null }[] = [];
      for (const m of schedData.Page.media) {
        const nodes = m.airingSchedule?.nodes || [];
        for (const node of nodes) {
          if (node.airingAt >= now && node.airingAt <= weekLater) {
            const date = new Date(node.airingAt * 1000);
            const dayName = daysOfWeek[date.getDay() === 0 ? 6 : date.getDay() - 1];
            const time = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
            schedule.push({
              animeTitle: m.title.english || m.title.romaji,
              slug: `anilist-${m.id}`,
              episodeNumber: node.episode,
              airTime: time,
              airDay: dayName.substring(0, 3),
              coverImage: m.coverImage?.large || null,
            });
          }
        }
      }
      schedule.sort((a, b) => a.airTime.localeCompare(b.airTime));
      result.schedule = schedule;
    }
  }

  if (section === "all" || section === "trending") {
    const query = `query {
      Page(page: 1, perPage: 12) {
        media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
          id
          title { romaji english }
          coverImage { large }
          format
          season
          seasonYear
          episodes
        }
      }
    }`;
    const data = await anilistFetch<{ Page: { media: AniListMedia[] } }>(query);
    result.trending = data?.Page?.media || [];
  }

  if (section === "all" || section === "popular") {
    const query = `query {
      Page(page: 1, perPage: 10) {
        media(sort: POPULARITY_DESC, type: ANIME, isAdult: false) {
          id
          title { romaji english }
          coverImage { large }
          format
          season
          seasonYear
          episodes
          averageScore
          genres
          status
        }
      }
    }`;
    const data = await anilistFetch<{ Page: { media: AniListMedia[] } }>(query);
    if (data?.Page?.media) {
      result.popular = data.Page.media.map((m) => ({
        id: m.id,
        title: m.title.english || m.title.romaji,
        slug: `anilist-${m.id}`,
        coverImage: m.coverImage?.large || null,
        format: m.format,
        season: m.season,
        seasonYear: m.seasonYear,
        episodes: m.episodes,
        averageScore: m.averageScore,
        genres: m.genres?.slice(0, 2) || [],
        status: m.status,
      }));
    }
  }

  if (section === "all" || section === "recent") {
    const query = `query {
      Page(page: 1, perPage: 10) {
        media(sort: START_DATE_DESC, type: ANIME, status: RELEASING, isAdult: false) {
          id
          title { romaji english }
          coverImage { large }
          format
          season
          seasonYear
          episodes
          nextAiringEpisode { episode }
          averageScore
          genres
        }
      }
    }`;
    const data = await anilistFetch<{ Page: { media: AniListMedia[] } }>(query);
    if (data?.Page?.media) {
      result.recent = data.Page.media.map((m) => ({
        id: m.id,
        title: m.title.english || m.title.romaji,
        slug: `anilist-${m.id}`,
        coverImage: m.coverImage?.large || null,
        format: m.format,
        season: m.season,
        seasonYear: m.seasonYear,
        episodes: m.episodes,
        currentEpisode: m.nextAiringEpisode?.episode || 1,
        averageScore: m.averageScore,
        genres: m.genres?.slice(0, 2) || [],
      }));
    }
  }

  if (section === "all" || section === "completed") {
    const query = `query {
      Page(page: 1, perPage: 10) {
        media(sort: END_DATE_DESC, type: ANIME, status: FINISHED, isAdult: false) {
          id
          title { romaji english }
          coverImage { large }
          format
          season
          seasonYear
          episodes
          averageScore
          genres
        }
      }
    }`;
    const data = await anilistFetch<{ Page: { media: AniListMedia[] } }>(query);
    if (data?.Page?.media) {
      result.completed = data.Page.media.map((m) => ({
        id: m.id,
        title: m.title.english || m.title.romaji,
        slug: `anilist-${m.id}`,
        coverImage: m.coverImage?.large || null,
        format: m.format,
        season: m.season,
        seasonYear: m.seasonYear,
        episodes: m.episodes,
        averageScore: m.averageScore,
        genres: m.genres?.slice(0, 2) || [],
      }));
    }
  }

  return NextResponse.json(result);
}
