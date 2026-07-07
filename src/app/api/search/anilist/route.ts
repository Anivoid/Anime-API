import { NextResponse } from "next/server";

interface AniListMedia {
  id: number;
  title: { romaji: string; english: string; native: string };
  coverImage: { large: string; medium: string };
  bannerImage: string | null;
  description: string;
  meanScore: number | null;
  status: string;
  format: string;
  season: string;
  seasonYear: number;
  episodes: number | null;
  genres: string[];
  nextAiringEpisode: { episode: number; airingAt: number } | null;
}

interface AniListResponse {
  data: {
    Page: {
      media: AniListMedia[];
      pageInfo: { total: number; currentPage: number; lastPage: number; hasNextPage: boolean };
    };
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const page = parseInt(searchParams.get("page") || "1");
  const perPage = parseInt(searchParams.get("perPage") || "20");
  const season = searchParams.get("season") || "";
  const format = searchParams.get("format") || "";
  const status = searchParams.get("status") || "";
  const sort = searchParams.get("sort") || "POPULARITY_DESC";

  if (!query && !season && !format) {
    return NextResponse.json({ error: "Query or filters required" }, { status: 400 });
  }

  try {
    const mediaFilter = [];
    if (season) mediaFilter.push(`season: ${season}`);
    if (format) mediaFilter.push(`format: ${format}`);
    if (status) mediaFilter.push(`status: ${status}`);
    if (query) mediaFilter.push(`search: "${query}"`);

    const queryStr = `query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(${mediaFilter.join(", ")}, sort: ${sort}, type: ANIME) {
          id
          title { romaji english native }
          coverImage { large medium }
          bannerImage
          description(asHtml: false)
          meanScore
          status
          format
          season
          seasonYear
          episodes
          genres
          nextAiringEpisode { episode airingAt }
        }
        pageInfo { total currentPage lastPage hasNextPage }
      }
    }`;

    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: queryStr, variables: { page, perPage } }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "AniList API error" }, { status: res.status });
    }

    const data: AniListResponse = await res.json();
    const media = data.data.Page.media;

    const results = media.map((m) => ({
      id: `anilist-${m.id}`,
      malId: m.id,
      title: m.title.english || m.title.romaji,
      titleRomaji: m.title.romaji,
      titleNative: m.title.native,
      slug: `anilist-${m.id}`,
      coverImage: m.coverImage.large || m.coverImage.medium,
      bannerImage: m.bannerImage,
      description: m.description?.replace(/<[^>]*>/g, "").substring(0, 500),
      rating: m.meanScore ? m.meanScore / 10 : null,
      status: m.status,
      type: m.format,
      season: m.season,
      releaseYear: m.seasonYear,
      episodeCount: m.episodes,
      genres: m.genres,
      nextAiring: m.nextAiringEpisode
        ? { episode: m.nextAiringEpisode.episode, airDate: new Date(m.nextAiringEpisode.airingAt * 1000).toISOString() }
        : null,
      source: "anilist",
    }));

    return NextResponse.json({
      data: results,
      pagination: {
        total: data.data.Page.pageInfo.total,
        page: data.data.Page.pageInfo.currentPage,
        totalPages: data.data.Page.pageInfo.lastPage,
        hasNextPage: data.data.Page.pageInfo.hasNextPage,
      },
    });
  } catch (error) {
    console.error("AniList search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
