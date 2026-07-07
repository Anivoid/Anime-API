import { prisma } from "./prisma";

// ═══════════════════════════════════════════════════════════
// AniList Comprehensive Metadata Types
// ═══════════════════════════════════════════════════════════

export interface AniListMedia {
  id: number;
  title: { romaji: string; english: string | null; native: string | null };
  coverImage: { large: string | null; medium: string | null } | null;
  bannerImage: string | null;
  description: string | null;
  meanScore: number | null;
  averageScore: number | null;
  popularity: number | null;
  favourites: number | null;
  trending: number | null;
  status: string;
  format: string;
  season: string | null;
  seasonYear: number | null;
  episodes: number | null;
  duration: number | null;
  chapters: number | null;
  volumes: number | null;
  source: string | null;
  countryOfOrigin: string | null;
  isLicensed: boolean | null;
  hashtags: string[] | null;
  trailer: { id: string; site: string; thumbnail: string | null } | null;
  genres: string[];
  synonyms: string[];
  nextAiringEpisode: { airingAt: number; episode: number; timeUntilAiring: number } | null;
  airingSchedule: { nodes: { airingAt: number; episode: number }[] } | null;
  relations: {
    edges: { node: { id: number; title: { romaji: string } }; relationType: string }[];
  } | null;
  recommendations: {
    nodes: { mediaRecommendation: { id: number; title: { romaji: string } }; rating: number }[];
  } | null;
  characters: {
    nodes: {
      id: number;
      name: { full: string; native: string | null };
      image: { large: string | null } | null;
      role: string;
      voiceActors: { id: number; name: { full: string }; image: { large: string | null } | null; language: string }[];
    }[];
  } | null;
  staff: {
    nodes: {
      id: number;
      name: { full: string };
      image: { large: string | null } | null;
      primaryOccupations: string[];
    }[];
  } | null;
  studios: { edges: { node: { id: number; name: string }; isMain: boolean }[] } | null;
  producers: { edges: { node: { id: number; name: string } }[] } | null;
  tags: { node: { name: string; category: string | null; rank: number | null }[] } | null;
  streamingEpisodes: { title: string; thumbnail: string | null; site: string; url: string | null }[] | null;
}

// ═══════════════════════════════════════════════════════════
// COMPREHENSIVE ANILIST QUERY
// ═══════════════════════════════════════════════════════════

const FULL_MEDIA_QUERY = `query ($search: String, $id: Int) {
  Media(search: $search, id: $id, type: ANIME) {
    id
    title { romaji english native }
    coverImage { large medium }
    bannerImage
    description(asHtml: false)
    meanScore averageScore popularity favourites trending
    status format season seasonYear episodes duration chapters volumes
    source countryOfOrigin isLicensed hashtags
    trailer { id site thumbnail }
    genres synonyms
    nextAiringEpisode { airingAt episode timeUntilAiring }
    airingSchedule(perPage: 50) { nodes { airingAt episode } }
    relations {
      edges { node { id title { romaji } } relationType }
    }
    recommendations(perPage: 10) {
      nodes { mediaRecommendation { id title { romaji } } rating }
    }
    characters(perPage: 25, sort: ROLE) {
      nodes {
        id name { full native } image { large } role
        voiceActors(sort: LANGUAGE, limit: 2) {
          id name { full } image { large } language
        }
      }
    }
    staff(perPage: 15) {
      nodes { id name { full } image { large } primaryOccupations }
    }
    studios { edges { node { id name } isMain } }
    producers { edges { node { id name } } }
    tags { node { name category rank } }
    streamingEpisodes { title thumbnail site url }
  }
}`;

const SEARCH_QUERY = `query ($search: String, $page: Int, $perPage: Int, $season: Season, $seasonYear: Int, $genre: String, $format: MediaFormat, $status: MediaStatus) {
  Page(page: $page, perPage: $perPage) {
    media(search: $search, type: ANIME, season: $season, seasonYear: $seasonYear, genre: $genre, format: $format, status: $status, sort: POPULARITY_DESC) {
      id
      title { romaji english }
      coverImage { large }
      bannerImage
      meanScore status format season seasonYear episodes
      genres
    }
    pageInfo { total hasNextPage currentPage lastPage }
  }
}`;

const SEASON_QUERY = `query ($season: Season, $year: Int, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(type: ANIME, season: $season, seasonYear: $year, sort: POPULARITY_DESC) {
      id
      title { romaji english }
      coverImage { large }
      bannerImage
      meanScore status format episodes duration
      genres season seasonYear trending
      studios { edges { node { name } isMain } }
    }
    pageInfo { total hasNextPage currentPage lastPage }
  }
}`;

const AIRING_TODAY_QUERY = `query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(type: ANIME, status: RELEASING, sort: TRENDING_DESC) {
      id
      title { romaji english }
      coverImage { large }
      meanScore format episodes
      nextAiringEpisode { airingAt episode timeUntilAiring }
    }
    pageInfo { total hasNextPage }
  }
}`;

// ═══════════════════════════════════════════════════════════
// API CALLER WITH RATE LIMITING
// ═══════════════════════════════════════════════════════════

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 350; // ~3 req/sec (AniList allows 90/minute)

async function anilistQuery<T>(query: string, variables: Record<string, unknown>): Promise<T | null> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL) {
    await new Promise((r) => setTimeout(r, MIN_REQUEST_INTERVAL - elapsed));
  }
  lastRequestTime = Date.now();

  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables }),
    });

    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get("Retry-After") || "60");
      console.warn(`AniList rate limited, retrying after ${retryAfter}s`);
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      return anilistQuery<T>(query, variables);
    }

    if (!res.ok) return null;
    const data = await res.json();
    return data.data as T;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════
// PUBLIC API FUNCTIONS
// ═══════════════════════════════════════════════════════════

export async function fetchFullMedia(search?: string, id?: number): Promise<AniListMedia | null> {
  const data = await anilistQuery<{ Media: AniListMedia }>(FULL_MEDIA_QUERY, { search, id });
  return data?.Media || null;
}

export async function searchAnime(
  search: string,
  page = 1,
  perPage = 20,
  filters?: { season?: string; seasonYear?: number; genre?: string; format?: string; status?: string }
) {
  const variables: Record<string, unknown> = { search, page, perPage };
  if (filters?.season) variables.season = filters.season;
  if (filters?.seasonYear) variables.seasonYear = filters.seasonYear;
  if (filters?.genre) variables.genre = filters.genre;
  if (filters?.format) variables.format = filters.format;
  if (filters?.status) variables.status = filters.status;

  return anilistQuery<{
    Page: {
      media: AniListMedia[];
      pageInfo: { total: number; hasNextPage: boolean; currentPage: number; lastPage: number };
    };
  }>(SEARCH_QUERY, variables);
}

export async function fetchSeasonAnime(season: string, year: number, page = 1, perPage = 50) {
  return anilistQuery<{
    Page: {
      media: AniListMedia[];
      pageInfo: { total: number; hasNextPage: boolean; currentPage: number; lastPage: number };
    };
  }>(SEASON_QUERY, { season, year, page, perPage });
}

export async function fetchAiringToday(page = 1, perPage = 25) {
  return anilistQuery<{
    Page: {
      media: AniListMedia[];
      pageInfo: { total: number; hasNextPage: boolean };
    };
  }>(AIRING_TODAY_QUERY, { page, perPage });
}

// ═══════════════════════════════════════════════════════════
// AUTO-CLASSIFICATION ENGINE
// ═══════════════════════════════════════════════════════════

export function getCurrentSeason(): { season: string; year: number } {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const year = now.getFullYear();

  if (month >= 0 && month <= 1) return { season: "Winter", year };
  if (month >= 2 && month <= 4) return { season: "Spring", year };
  if (month >= 5 && month <= 7) return { season: "Summer", year };
  if (month >= 8 && month <= 9) return { season: "Fall", year };
  return { season: "Winter", year: year + 1 }; // Nov-Dec = next Winter
}

export function getSeasonFromMonth(month: number, year: number): { season: string; year: number } {
  if (month >= 0 && month <= 1) return { season: "Winter", year };
  if (month >= 2 && month <= 4) return { season: "Spring", year };
  if (month >= 5 && month <= 7) return { season: "Summer", year };
  if (month >= 8 && month <= 9) return { season: "Fall", year };
  if (month >= 10 && month <= 11) return { season: "Winter", year: year + 1 };
  return { season: "Winter", year };
}

export function getCour(season: string): number {
  const courMap: Record<string, number> = { Winter: 1, Spring: 2, Summer: 3, Fall: 4 };
  return courMap[season] || 1;
}

export function mapAniListStatus(status: string): string {
  const map: Record<string, string> = {
    FINISHED: "COMPLETED",
    RELEASING: "ONGOING",
    NOT_YET_RELEASED: "UPCOMING",
    CANCELLED: "COMPLETED",
    HIATUS: "HIATUS",
  };
  return map[status] || "ONGOING";
}

export function mapAniListFormat(format: string): string {
  const map: Record<string, string> = {
    TV: "TV",
    TV_SHORT: "TV_SHORT",
    MOVIE: "MOVIE",
    OVA: "OVA",
    ONA: "ONA",
    SPECIAL: "SPECIAL",
    MUSIC: "MUSIC",
  };
  return map[format] || "TV";
}

export function detectSubDubAvailability(
  streamingEpisodes: AniListMedia["streamingEpisodes"]
): { hasSub: boolean; hasDub: boolean } {
  if (!streamingEpisodes || streamingEpisodes.length === 0) return { hasSub: false, hasDub: false };
  const titles = streamingEpisodes.map((e) => e.title.toLowerCase());
  const hasDub = titles.some((t) => t.includes("dub") || t.includes("english"));
  const hasSub = titles.some((t) => t.includes("sub") || t.includes("japanese")) || !hasDub;
  return { hasSub, hasDub };
}

// ═══════════════════════════════════════════════════════════
// SMART IMPORT PIPELINE
// ═══════════════════════════════════════════════════════════

export interface ImportResult {
  animeId: string;
  created: boolean;
  updated: boolean;
  episodesCreated: number;
  charactersCreated: number;
  staffCreated: number;
  studiosLinked: number;
  tagsLinked: number;
  relationsLinked: number;
  recommendationsLinked: number;
  errors: string[];
}

export async function smartImportAnime(media: AniListMedia): Promise<ImportResult> {
  const result: ImportResult = {
    animeId: "",
    created: false,
    updated: false,
    episodesCreated: 0,
    charactersCreated: 0,
    staffCreated: 0,
    studiosLinked: 0,
    tagsLinked: 0,
    relationsLinked: 0,
    recommendationsLinked: 0,
    errors: [],
  };

  const title = media.title.english || media.title.romaji;
  const slug = `anilist-${media.id}`;

  // Classify
  const season = media.season || getCurrentSeason().season;
  const seasonYear = media.seasonYear || getCurrentSeason().year;
  const status = mapAniListStatus(media.status);
  const format = mapAniListFormat(media.format);
  const { hasSub, hasDub } = detectSubDubAvailability(media.streamingEpisodes);

  // Check duplicate by AniList ID slug or title
  let anime = await prisma.anime.findFirst({
    where: { OR: [{ slug }, { title }] },
  });

  if (anime) {
    // Update existing - never lose local data
    anime = await prisma.anime.update({
      where: { id: anime.id },
      data: {
        title,
        description: media.description?.replace(/<[^>]*>/g, "").substring(0, 5000) || anime.description,
        coverImage: media.coverImage?.large || media.coverImage?.medium || anime.coverImage,
        bannerImage: media.bannerImage || anime.bannerImage,
        rating: media.meanScore ? media.meanScore / 10 : anime.rating,
        status,
        type: format,
        season,
        releaseYear: seasonYear,
      },
    });
    result.updated = true;
  } else {
    // Create new
    anime = await prisma.anime.create({
      data: {
        title,
        slug,
        description: media.description?.replace(/<[^>]*>/g, "").substring(0, 5000),
        coverImage: media.coverImage?.large || media.coverImage?.medium,
        bannerImage: media.bannerImage,
        status,
        type: format,
        season,
        releaseYear: seasonYear,
        rating: media.meanScore ? media.meanScore / 10 : null,
      },
    });
    result.created = true;
  }
  result.animeId = anime.id;

  // Genres
  for (const genreName of (media.genres || [])) {
    try {
      const genre = await prisma.genre.upsert({
        where: { name: genreName },
        update: {},
        create: { name: genreName, slug: genreName.toLowerCase().replace(/\s+/g, "-") },
      });
      await prisma.animeGenre.upsert({
        where: { animeId_genreId: { animeId: anime.id, genreId: genre.id } },
        update: {},
        create: { animeId: anime.id, genreId: genre.id },
      });
    } catch (e) {
      result.errors.push(`Genre ${genreName}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Episodes
  if (media.episodes && media.episodes > 0) {
    for (let ep = 1; ep <= Math.min(media.episodes, 100); ep++) {
      try {
        const existing = await prisma.episode.findFirst({
          where: { animeId: anime.id, number: ep },
        });
        if (!existing) {
          await prisma.episode.create({
            data: {
              animeId: anime.id,
              number: ep,
              title: `Episode ${ep}`,
              duration: media.duration || 24,
            },
          });
          result.episodesCreated++;
        }
      } catch {
        // Skip duplicate
      }
    }
  }

  // Studios
  for (const edge of (media.studios?.edges || [])) {
    try {
      const studio = await prisma.studio.upsert({
        where: { name: edge.node.name },
        update: {},
        create: {
          name: edge.node.name,
          slug: edge.node.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        },
      });
      await prisma.animeStudio.upsert({
        where: { animeId_studioId: { animeId: anime.id, studioId: studio.id } },
        update: {},
        create: { animeId: anime.id, studioId: studio.id, isMain: edge.isMain },
      });
      result.studiosLinked++;
    } catch (e) {
      result.errors.push(`Studio: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Producers
  for (const edge of (media.producers?.edges || [])) {
    try {
      const producer = await prisma.producer.upsert({
        where: { name: edge.node.name },
        update: {},
        create: {
          name: edge.node.name,
          slug: edge.node.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        },
      });
      await prisma.animeProducer.upsert({
        where: { animeId_producerId: { animeId: anime.id, producerId: producer.id } },
        update: {},
        create: { animeId: anime.id, producerId: producer.id },
      });
    } catch {
      // Skip
    }
  }

  // Characters (top 15)
  for (const char of (media.characters?.nodes || []).slice(0, 15)) {
    try {
      const character = await prisma.character.upsert({
        where: { slug: `anilist-char-${char.id}` },
        update: {},
        create: {
          name: char.name.full,
          nameJpn: char.name.native,
          slug: `anilist-char-${char.id}`,
          imageUrl: char.image?.large,
        },
      });
      const voiceActor = char.voiceActors?.[0]?.name?.full || null;
      await prisma.animeCharacter.upsert({
        where: { animeId_characterId: { animeId: anime.id, characterId: character.id } },
        update: { voiceActor },
        create: { animeId: anime.id, characterId: character.id, role: char.role, voiceActor },
      });
      result.charactersCreated++;
    } catch {
      // Skip
    }
  }

  // Staff (top 10)
  for (const s of (media.staff?.nodes || []).slice(0, 10)) {
    try {
      const staff = await prisma.staff.upsert({
        where: { slug: `anilist-staff-${s.id}` },
        update: {},
        create: {
          name: s.name.full,
          slug: `anilist-staff-${s.id}`,
          imageUrl: s.image?.large,
          role: s.primaryOccupations?.[0],
        },
      });
      await prisma.animeStaff.upsert({
        where: { animeId_staffId: { animeId: anime.id, staffId: staff.id } },
        update: {},
        create: { animeId: anime.id, staffId: staff.id, role: s.primaryOccupations?.[0] },
      });
      result.staffCreated++;
    } catch {
      // Skip
    }
  }

  // Tags
  for (const tag of (media.tags?.node || [])) {
    try {
      const tagRecord = await prisma.tag.upsert({
        where: { name: tag.name },
        update: {},
        create: {
          name: tag.name,
          slug: tag.name.toLowerCase().replace(/\s+/g, "-"),
          category: tag.category,
        },
      });
      await prisma.animeTag.upsert({
        where: { animeId_tagId: { animeId: anime.id, tagId: tagRecord.id } },
        update: {},
        create: { animeId: anime.id, tagId: tagRecord.id },
      });
      result.tagsLinked++;
    } catch {
      // Skip
    }
  }

  // Relations
  for (const edge of (media.relations?.edges || []).slice(0, 10)) {
    try {
      // Create placeholder for related anime if it doesn't exist
      const relatedSlug = `anilist-${edge.node.id}`;
      let relatedAnime = await prisma.anime.findFirst({
        where: { OR: [{ slug: relatedSlug }, { title: edge.node.title.romaji }] },
      });
      if (!relatedAnime) {
        relatedAnime = await prisma.anime.create({
          data: {
            title: edge.node.title.romaji,
            slug: relatedSlug,
            status: "ONGOING",
            type: "TV",
            releaseYear: new Date().getFullYear(),
          },
        });
      }
      await prisma.animeRelation.upsert({
        where: { fromAnimeId_toAnimeId: { fromAnimeId: anime.id, toAnimeId: relatedAnime.id } },
        update: {},
        create: { fromAnimeId: anime.id, toAnimeId: relatedAnime.id, relationType: edge.relationType },
      });
      result.relationsLinked++;
    } catch {
      // Skip
    }
  }

  // Recommendations
  for (const rec of (media.recommendations?.nodes || []).slice(0, 10)) {
    try {
      const recSlug = `anilist-${rec.mediaRecommendation.id}`;
      let recAnime = await prisma.anime.findFirst({
        where: { OR: [{ slug: recSlug }, { title: rec.mediaRecommendation.title.romaji }] },
      });
      if (!recAnime) {
        recAnime = await prisma.anime.create({
          data: {
            title: rec.mediaRecommendation.title.romaji,
            slug: recSlug,
            status: "ONGOING",
            type: "TV",
            releaseYear: new Date().getFullYear(),
          },
        });
      }
      await prisma.fromRecommendation.upsert({
        where: { fromAnimeId_toAnimeId: { fromAnimeId: anime.id, toAnimeId: recAnime.id } },
        update: {},
        create: { fromAnimeId: anime.id, toAnimeId: recAnime.id, rating: rec.rating / 100 },
      });
      result.recommendationsLinked++;
    } catch {
      // Skip
    }
  }

  // Create SeasonSchedule entry
  try {
    const cour = getCour(season);
    await prisma.seasonSchedule.upsert({
      where: { animeTitle_season_year: { animeTitle: title, season, year: seasonYear } },
      update: {
        anilistId: media.id,
        episodeCount: media.episodes,
        airDay: media.nextAiringEpisode ? getAirDay(media.nextAiringEpisode.airingAt) : null,
        nextEpisode: media.nextAiringEpisode?.episode,
        nextAirDate: media.nextAiringEpisode ? new Date(media.nextAiringEpisode.airingAt * 1000) : null,
        status: status.toLowerCase(),
        lastSyncedAt: new Date(),
      },
      create: {
        animeTitle: title,
        anilistId: media.id,
        season,
        year: seasonYear,
        episodeCount: media.episodes,
        airDay: media.nextAiringEpisode ? getAirDay(media.nextAiringEpisode.airingAt) : null,
        nextEpisode: media.nextAiringEpisode?.episode,
        nextAirDate: media.nextAiringEpisode ? new Date(media.nextAiringEpisode.airingAt * 1000) : null,
        status: status.toLowerCase(),
        lastSyncedAt: new Date(),
      },
    });
  } catch {
    // Skip
  }

  return result;
}

function getAirDay(airingAt: number): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[new Date(airingAt * 1000).getDay()];
}

// ═══════════════════════════════════════════════════════════
// METADATA SYNC (refresh without losing local data)
// ═══════════════════════════════════════════════════════════

export async function syncAnimeMetadata(animeId: string): Promise<boolean> {
  const anime = await prisma.anime.findUnique({ where: { id: animeId } });
  if (!anime) return false;

  // Extract AniList ID from slug
  const match = anime.slug.match(/anilist-(\d+)/);
  if (!match) return false;

  const anilistId = parseInt(match[1]);
  const media = await fetchFullMedia(undefined, anilistId);
  if (!media) return false;

  await smartImportAnime(media);
  return true;
}

// ═══════════════════════════════════════════════════════════
// NOTIFICATION SYSTEM
// ═══════════════════════════════════════════════════════════

export async function notifyNewEpisode(animeId: string, episodeNumber: number) {
  // Get all users who have this anime in their watchlist
  const watchlistEntries = await prisma.watchlist.findMany({
    where: { animeId },
    select: { userId: true },
  });

  const anime = await prisma.anime.findUnique({ where: { id: animeId } });
  if (!anime || watchlistEntries.length === 0) return;

  const notifications = watchlistEntries.map((entry) => ({
    userId: entry.userId,
    animeId,
    type: "new_episode" as const,
    title: `New Episode Available`,
    message: `${anime.title} Episode ${episodeNumber} is now available`,
    link: `/watch/${anime.slug}/${episodeNumber}`,
  }));

  for (const notif of notifications) {
    await prisma.userNotification.create({ data: notif }).catch(() => {});
  }
}

export async function notifyAnimeUpdate(animeId: string, message: string) {
  const watchlistEntries = await prisma.watchlist.findMany({
    where: { animeId },
    select: { userId: true },
  });

  const anime = await prisma.anime.findUnique({ where: { id: animeId } });
  if (!anime || watchlistEntries.length === 0) return;

  const notifications = watchlistEntries.map((entry) => ({
    userId: entry.userId,
    animeId,
    type: "anime_update" as const,
    title: `Anime Updated`,
    message: `${anime.title}: ${message}`,
    link: `/anime/${anime.slug}`,
  }));

  for (const notif of notifications) {
    await prisma.userNotification.create({ data: notif }).catch(() => {});
  }
}

// ═══════════════════════════════════════════════════════════
// ANALYTICS TRACKING
// ═══════════════════════════════════════════════════════════

export async function trackEvent(
  eventType: string,
  entity?: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
  userId?: string
) {
  await prisma.analyticsEvent.create({
    data: {
      eventType,
      entity,
      entityId,
      metadata: metadata ? JSON.stringify(metadata) : null,
      userId,
    },
  }).catch(() => {}); // Non-critical
}

export async function getAnalytics() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [totalAnime, totalEpisodes, airingToday, importsToday, failedToday] = await Promise.all([
    prisma.anime.count(),
    prisma.episode.count(),
    prisma.seasonSchedule.count({ where: { status: "airing" } }),
    prisma.analyticsEvent.count({
      where: { eventType: "import", createdAt: { gte: todayStart } },
    }),
    prisma.rSSItem.count({ where: { status: "failed" } }),
  ]);

  const duplicatePrevented = await prisma.rSSItem.count({
    where: { status: "skipped", error: { contains: "duplicate" } },
  });

  return {
    totalAnime,
    totalEpisodes,
    airingToday,
    importsToday,
    failedToday,
    duplicatePrevented,
  };
}
