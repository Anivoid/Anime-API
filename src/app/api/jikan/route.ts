import { NextResponse } from "next/server";

interface JikanAnime {
  mal_id: number;
  title: string;
  title_english: string | null;
  images: { jpg: { image_url: string; large_image_url: string } };
  score: number | null;
  year: number | null;
  status: string;
  type: string | null;
  season: string | null;
  synopsis: string | null;
  genres: { mal_id: number; name: string }[];
  episodes: number | null;
  url: string;
}

interface JikanResponse {
  data: JikanAnime[];
  pagination: { last_visible_page: number; has_next_page: boolean };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const page = searchParams.get("page") || "1";
  const genre = searchParams.get("genre") || "";
  const type = searchParams.get("type") || "";
  const status = searchParams.get("status") || "";
  const order_by = searchParams.get("order_by") || "score";
  const sort = searchParams.get("sort") || "desc";

  if (!q && !genre) {
    return NextResponse.json({ data: [], pagination: { last_visible_page: 1, has_next_page: false } });
  }

  try {
    const params = new URLSearchParams();
    params.set("page", page);
    params.set("limit", "25");
    params.set("sfw", "true");

    if (q) params.set("q", q);
    if (genre) params.set("genres", genre);
    if (type) params.set("type", type);
    if (status) {
      const statusMap: Record<string, string> = {
        "airing": "1",
        "complete": "2",
        "upcoming": "3",
      };
      params.set("status", statusMap[status] || status);
    }
    params.set("order_by", order_by);
    params.set("sort", sort);

    const url = `https://api.jikan.moe/v4/anime?${params.toString()}`;

    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 1000));
        const retry = await fetch(url, {
          headers: { "Accept": "application/json" },
          next: { revalidate: 300 },
        });
        if (!retry.ok) {
          return NextResponse.json({ error: "Rate limited" }, { status: 429 });
        }
        const retryData: JikanResponse = await retry.json();
        return NextResponse.json(formatResponse(retryData));
      }
      return NextResponse.json({ error: "Failed to fetch" }, { status: res.status });
    }

    const data: JikanResponse = await res.json();
    return NextResponse.json(formatResponse(data));
  } catch (error) {
    console.error("Jikan API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function formatResponse(data: JikanResponse) {
  return {
    data: data.data.map((anime) => ({
      id: `jikan-${anime.mal_id}`,
      title: anime.title_english || anime.title,
      slug: `jikan-${anime.mal_id}`,
      coverImage: anime.images.jpg.large_image_url || anime.images.jpg.image_url,
      rating: anime.score,
      releaseYear: anime.year,
      status: mapStatus(anime.status),
      type: anime.type,
      season: anime.season,
      genres: anime.genres.map((g) => ({ genre: { name: g.name, slug: String(g.mal_id) } })),
      episodeCount: anime.episodes,
      synopsis: anime.synopsis,
      source: "myanimelist",
      malId: anime.mal_id,
      url: anime.url,
    })),
    pagination: data.pagination,
  };
}

function mapStatus(status: string): string {
  if (status?.includes("Finished")) return "COMPLETED";
  if (status?.includes("Airing")) return "ONGOING";
  if (status?.includes("Not yet")) return "UPCOMING";
  return "ONGOING";
}
