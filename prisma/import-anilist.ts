import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const ANILIST_API = "https://graphql.anilist.co";

const SAMPLE_STREAMS = [
  "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
  "https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8",
  "https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8",
  "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8",
];

// ═══════════════════════════════════════════════════════════
// AniList GraphQL Query — comprehensive media data
// ═══════════════════════════════════════════════════════════
const MEDIA_QUERY = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      lastPage
      hasNextPage
      currentPage
    }
    media(sort: POPULARITY_DESC, type: ANIME) {
      id
      idMal
      title {
        romaji
        english
        native
      }
      description(asHtml: false)
      coverImage {
        large
        medium
      }
      bannerImage
      startDate { year month day }
      endDate { year month day }
      season
      seasonYear
      format
      status
      episodes
      duration
      genres
      averageScore
      popularity
      trending
      nextAiringEpisode {
        airingAt
        timeUntilAiring
        episode
      }
      studios(isMain: true) {
        nodes { id name isAnimationStudio }
      }
      rankings {
        rank
        type
        context
      }
    }
  }
}`;

interface AniListMedia {
  id: number;
  idMal: number | null;
  title: { romaji: string; english: string | null; native: string | null };
  description: string | null;
  coverImage: { large: string; medium: string } | null;
  bannerImage: string | null;
  startDate: { year: number | null; month: number | null; day: number | null };
  endDate: { year: number | null; month: number | null; day: number | null };
  season: string | null;
  seasonYear: number | null;
  format: string | null;
  status: string | null;
  episodes: number | null;
  duration: number | null;
  genres: string[] | null;
  averageScore: number | null;
  popularity: number | null;
  trending: number | null;
  nextAiringEpisode: { episode: number } | null;
  studios: { nodes: { id: number; name: string; isAnimationStudio: boolean }[] } | null;
  rankings: { rank: number; type: string; context: string }[] | null;
}

// ═══════════════════════════════════════════════════════════
// Fetch a single page from AniList
// ═══════════════════════════════════════════════════════════
async function fetchPage(page: number, perPage: number = 50): Promise<{
  media: AniListMedia[];
  total: number;
  lastPage: number;
  hasNextPage: boolean;
}> {
  const variables = {
    page,
    perPage,
  };

  const res = await fetch(ANILIST_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: MEDIA_QUERY, variables }),
  });

  if (!res.ok) {
    if (res.status === 429) {
      // Rate limited — wait and retry
      const retryAfter = parseInt(res.headers.get("Retry-After") || "60");
      console.log(`  Rate limited. Waiting ${retryAfter}s...`);
      await sleep(retryAfter * 1000);
      return fetchPage(page, perPage);
    }
    throw new Error(`AniList API error: ${res.status}`);
  }

  const data = await res.json();
  const pageData = data.data.Page;

  return {
    media: pageData.media,
    total: pageData.pageInfo.total,
    lastPage: pageData.pageInfo.lastPage,
    hasNextPage: pageData.pageInfo.hasNextPage,
  };
}

// ═══════════════════════════════════════════════════════════
// Map AniList format/season/status to our schema
// ═══════════════════════════════════════════════════════════
function mapFormat(format: string | null): "TV" | "MOVIE" | "OVA" | "ONA" | "SPECIAL" {
  switch (format) {
    case "TV": return "TV";
    case "MOVIE": return "MOVIE";
    case "OVA": return "OVA";
    case "ONA": return "ONA";
    case "SPECIAL": return "SPECIAL";
    case "TV_SHORT": return "TV";
    default: return "TV";
  }
}

function mapStatus(status: string | null): "ONGOING" | "COMPLETED" | "UPCOMING" {
  switch (status) {
    case "RELEASING": return "ONGOING";
    case "FINISHED": return "COMPLETED";
    case "NOT_YET_RELEASED": return "UPCOMING";
    case "CANCELLED": return "COMPLETED";
    case "HIATUS": return "ONGOING";
    default: return "COMPLETED";
  }
}

function mapSeason(season: string | null): "Winter" | "Spring" | "Summer" | "Fall" {
  switch (season) {
    case "WINTER": return "Winter";
    case "SPRING": return "Spring";
    case "SUMMER": return "Summer";
    case "FALL": return "Fall";
    default: return "Fall";
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 80);
}

function cleanDescription(desc: string | null): string {
  if (!desc) return "";
  // Remove HTML tags and AniList formatting
  return desc
    .replace(/<[^>]*>/g, "")
    .replace(/~!.*!~/g, "[spoiler]")
    .replace(/\n{3,}/g, "\n\n")
    .substring(0, 2000);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ═══════════════════════════════════════════════════════════
// Import a single anime from AniList data
// ═══════════════════════════════════════════════════════════
async function importAnime(media: AniListMedia, genreMap: Record<string, string>): Promise<boolean> {
  const title = media.title.english || media.title.romaji;
  const slug = `anilist-${media.id}`;

  // Skip if already exists
  const existing = await prisma.anime.findUnique({ where: { slug } });
  if (existing) return false;

  const releaseYear = media.startDate.year || 2020;
  const episodeCount = media.episodes || 12;

  try {
    await prisma.anime.create({
      data: {
        title,
        slug,
        description: cleanDescription(media.description),
        releaseYear,
        status: mapStatus(media.status),
        type: mapFormat(media.format),
        season: mapSeason(media.season),
        rating: media.averageScore ? media.averageScore / 10 : 7.0,
        featured: (media.popularity || 0) > 500000,
        trending: (media.trending || 0) > 50,
        coverImage: media.coverImage?.large || media.coverImage?.medium || "",
        bannerImage: media.bannerImage || media.coverImage?.large || "",
        // Create episodes
        episodes: {
          create: Array.from({ length: Math.min(episodeCount, 24) }, (_, i) => ({
            number: i + 1,
            title: `Episode ${i + 1}`,
            videoUrl: SAMPLE_STREAMS[(media.id + i) % SAMPLE_STREAMS.length],
          })),
        },
        // Connect genres
        genres: {
          create: (media.genres || []).map((g) => {
            const slug = g.toLowerCase().replace(/\s+/g, "-");
            return {
              genre: {
                connectOrCreate: {
                  where: { slug },
                  create: { name: g, slug },
                },
              },
            };
          }),
        },
      },
    });
    return true;
  } catch (e) {
    // Duplicate or constraint error — skip silently
    if ((e as Prisma.PrismaClientKnownRequestError).code === "P2002") return false;
    console.error(`  Failed to import "${title}": ${(e as Error).message}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// Main — fetch and import in batches
// ═══════════════════════════════════════════════════════════
async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  AnimeVoid Bulk Import — AniList GraphQL");
  console.log("═══════════════════════════════════════════\n");

  // Ensure genres exist
  const genreSlugs = [
    "action", "adventure", "comedy", "drama", "fantasy", "horror",
    "mystery", "romance", "sci-fi", "slice-of-life", "sports",
    "supernatural", "thriller", "mecha", "psychological", "sci-fi",
    "music", "school", "military", "historical", "vampire", "shounen",
    "seinen", "josei", "shoujo", "ecchi", "harem", "isekai",
    "martial-arts", "parody", "super-power", "demons", "magic",
    "space", "police", "dementia", "game", "cooking",
  ];

  for (const slug of genreSlugs) {
    const name = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    await prisma.genre.upsert({
      where: { slug },
      create: { name, slug },
      update: { name },
    });
  }

  const genres = await prisma.genre.findMany();
  const genreMap = Object.fromEntries(genres.map((g) => [g.slug, g.id]));

  console.log(`Genres ready: ${Object.keys(genreMap).length}\n`);

  const TARGET = 5000;
  const BATCH_SIZE = 50;
  let imported = 0;
  let skipped = 0;
  let page = 1;
  let totalPages = 1;

  console.log(`Target: ${TARGET} anime\n`);

  while (imported + skipped < TARGET && page <= totalPages) {
    console.log(`Fetching page ${page}/${totalPages}...`);

    const { media, total, lastPage, hasNextPage } = await fetchPage(page, BATCH_SIZE);
    totalPages = Math.min(lastPage, Math.ceil(TARGET / BATCH_SIZE));

    console.log(`  Got ${media.length} anime (total available: ${total})`);

    for (const m of media) {
      const success = await importAnime(m, genreMap);
      if (success) {
        imported++;
        if (imported % 100 === 0) console.log(`  ✓ Imported ${imported} anime...`);
      } else {
        skipped++;
      }
    }

    page++;

    // Rate limit: ~1 request per second
    if (page <= totalPages) {
      await sleep(1100);
    }
  }

  console.log("\n═══════════════════════════════════════════");
  console.log(`  Import complete!`);
  console.log(`  Imported: ${imported}`);
  console.log(`  Skipped:  ${skipped} (duplicates)`);
  console.log(`  Total:    ${imported + skipped}`);
  console.log("═══════════════════════════════════════════");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Import failed:", e);
  prisma.$disconnect();
  process.exit(1);
});
