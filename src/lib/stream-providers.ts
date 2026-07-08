import {
  loadProviderConfig,
  updateProviderHealth,
  type ProviderConfig,
  type ProviderStoreData,
} from "./provider-config";

// ═══════════════════════════════════════════════════════════
// Stream Provider System
// Production-only: real anime streams, no demo fallbacks
// ═══════════════════════════════════════════════════════════

export interface StreamSource {
  url: string;
  quality?: string;
  isM3U8: boolean;
  isEmbed?: boolean;
  referer?: string;
  headers?: Record<string, string>;
}

export interface StreamResult {
  success: boolean;
  provider: string;
  sources: StreamSource[];
  subtitles?: { lang: string; url: string }[];
  skipTimes?: { intro?: [number, number]; outro?: [number, number] };
  error?: string;
  duration?: number;
  cached?: boolean;
}

export interface StreamParams {
  animeTitle: string;
  anilistId?: number;
  episodeId?: string;
  episodeNumber: number;
  provider?: string;
  category?: "sub" | "dub";
}

// ═══════════════════════════════════════════════════════════
// In-Memory Stream Cache
// Key: "provider:anilistId:episode:category"
// ═══════════════════════════════════════════════════════════
interface CacheEntry {
  result: StreamResult;
  timestamp: number;
}

const streamCache = new Map<string, CacheEntry>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCacheKey(params: StreamParams, providerId: string): string {
  return `${providerId}:${params.anilistId || params.animeTitle}:${params.episodeNumber}:${params.category || "sub"}`;
}

function getCachedResult(params: StreamParams, providerId: string): StreamResult | null {
  const key = getCacheKey(params, providerId);
  const entry = streamCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return { ...entry.result, cached: true };
  }
  streamCache.delete(key);
  return null;
}

function setCachedResult(params: StreamParams, providerId: string, result: StreamResult): void {
  if (!result.success || result.sources.length === 0) return;
  const key = getCacheKey(params, providerId);
  streamCache.set(key, { result, timestamp: Date.now() });
}

// ═══════════════════════════════════════════════════════════
// HTTP fetch with timeout
// ═══════════════════════════════════════════════════════════
async function fetchWithTimeout(
  url: string,
  timeout: number,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ═══════════════════════════════════════════════════════════
// Provider: Local Database
// ═══════════════════════════════════════════════════════════
async function fetchLocalDb(params: StreamParams): Promise<StreamResult> {
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();

    let anime = null;
    if (params.anilistId) {
      anime = await prisma.anime.findFirst({
        where: { slug: `anilist-${params.anilistId}` },
        include: { episodes: { where: { number: params.episodeNumber } } },
      });
    }
    if (!anime) {
      anime = await prisma.anime.findFirst({
        where: { title: { contains: params.animeTitle } },
        include: { episodes: { where: { number: params.episodeNumber } } },
      });
    }

    const ep = anime?.episodes[0];
    if (ep?.videoUrl) {
      const videoUrl = ep.videoUrl as string;
      if (videoUrl && !videoUrl.includes("test-streams.mux.dev") && !videoUrl.includes("demo.")) {
        return {
          success: true,
          provider: "local-db",
          sources: [{ url: videoUrl, isM3U8: videoUrl.endsWith(".m3u8"), quality: "auto" }],
        };
      }
    }

    return { success: false, provider: "local-db", sources: [], error: "No stream URL in DB" };
  } catch {
    return { success: false, provider: "local-db", sources: [], error: "DB error" };
  }
}

// ═══════════════════════════════════════════════════════════
// Provider: Sankanime (SankaVollerei API)
// 12+ anime sources: Samehadaku, Otakudesu, Animasu, etc.
// No scraper needed — returns embed/stream URLs directly
// ═══════════════════════════════════════════════════════════
const SANKANIME_BASE = "https://www.sankavollerei.web.id/anime";

interface SankaSearchResult {
  title: string;
  animeId: string;
  poster?: string;
  status?: string;
  genreList?: { title: string; genreId: string }[];
}

interface SankaEpisode {
  title: number | string;
  eps?: number;
  episodeId: string;
}

interface SankaStream {
  name: string;
  url: string;
}

async function sankaFetch<T>(path: string, timeout = 12000): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(`${SANKANIME_BASE}${path}`, {
      signal: controller.signal,
      headers: { "User-Agent": "AnimeVoid/1.0" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function isEmbedUrl(url: string): boolean {
  return /blogger\.com|vidhide|yourupload|mega\.nz|filedon|krakenfiles|pixeldrain|embed[2]?\./i.test(url);
}

function isDirectStream(url: string): boolean {
  return /\.(m3u8|mp4|mkv|webm)(\?|$)/i.test(url) || /googlevideo\.com|cdn\./i.test(url);
}

async function searchSankaAnime(query: string): Promise<SankaSearchResult | null> {
  // Try Samehadaku first (most reliable), then Otakudesu
  const sources = [
    `/samehadaku/search?q=${encodeURIComponent(query)}`,
    `/search/${encodeURIComponent(query)}`,
  ];

  for (const path of sources) {
    const data = await sankaFetch<{ status: string; data?: { animeList?: SankaSearchResult[] } }>(path);
    if (data?.status === "success" && data.data?.animeList?.length) {
      return data.data.animeList[0];
    }
  }
  return null;
}

async function getSankaEpisodes(animeId: string, source: "samehadaku" | "otakudesu"): Promise<SankaEpisode[]> {
  const path = source === "samehadaku"
    ? `/samehadaku/anime/${animeId}`
    : `/anime/${animeId}`;

  const data = await sankaFetch<{ status: string; data?: { episodeList?: SankaEpisode[] } }>(path);
  return data?.data?.episodeList || [];
}

async function getSankaStream(episodeId: string, source: "samehadaku" | "otakudesu"): Promise<{
  embedUrl: string;
  servers: { name: string; serverId: string; quality?: string }[];
} | null> {
  const path = source === "samehadaku"
    ? `/samehadaku/episode/${episodeId}`
    : `/episode/${episodeId}`;

  const data = await sankaFetch<{
    status: string;
    data?: {
      defaultStreamingUrl?: string;
      server?: { qualities?: { title: string; serverList: { title: string; serverId: string }[] }[] };
    };
  }>(path, 15000);

  if (!data?.data) return null;

  const servers: { name: string; serverId: string; quality?: string }[] = [];
  if (data.data.server?.qualities) {
    for (const q of data.data.server.qualities) {
      for (const s of q.serverList) {
        servers.push({ name: s.title, serverId: s.serverId, quality: q.title });
      }
    }
  }

  return {
    embedUrl: data.data.defaultStreamingUrl || "",
    servers,
  };
}

async function resolveSankaServer(serverId: string, source: "samehadaku" | "otakudesu"): Promise<string | null> {
  const path = source === "samehadaku"
    ? `/samehadaku/server/${serverId}`
    : `/server/${serverId}`;

  const data = await sankaFetch<{ status: string; data?: { url?: string } }>(path);
  return data?.data?.url || null;
}

async function fetchSankanime(params: StreamParams): Promise<StreamResult> {
  const title = params.animeTitle;
  if (!title) return { success: false, provider: "sankanime", sources: [], error: "No title" };

  try {
    // Step 1: Search
    const anime = await searchSankaAnime(title);
    if (!anime) return { success: false, provider: "sankanime", sources: [], error: "Anime not found" };

    // Step 2: Get episodes
    const source: "samehadaku" | "otakudesu" = anime.animeId.includes("sub-indo") ? "otakudesu" : "samehadaku";
    const episodes = await getSankaEpisodes(anime.animeId, source);
    if (!episodes.length) return { success: false, provider: "sankanime", sources: [], error: "No episodes" };

    // Find episode by number (episode list is newest-first)
    // API returns title as number (e.g. 1, 2, 220) or eps field
    const targetEp = episodes.find((e) => {
      const epNum = typeof e.title === "number" ? e.title : e.eps;
      return epNum === params.episodeNumber;
    });
    if (!targetEp) return { success: false, provider: "sankanime", sources: [], error: `Episode ${params.episodeNumber} not found` };

    // Step 3: Get stream info
    const streamInfo = await getSankaStream(targetEp.episodeId, source);
    if (!streamInfo) return { success: false, provider: "sankanime", sources: [], error: "No stream info" };

    const sources: StreamSource[] = [];

    // Primary: defaultStreamingUrl
    if (streamInfo.embedUrl) {
      sources.push({
        url: streamInfo.embedUrl,
        isM3U8: isDirectStream(streamInfo.embedUrl) && streamInfo.embedUrl.endsWith(".m3u8"),
        quality: "auto",
        isEmbed: isEmbedUrl(streamInfo.embedUrl),
      });
    }

    // Try each server for alternative streams
    for (const server of streamInfo.servers.slice(0, 3)) {
      const serverUrl = await resolveSankaServer(server.serverId, source);
      if (serverUrl && serverUrl !== streamInfo.embedUrl) {
        sources.push({
          url: serverUrl,
          isM3U8: isDirectStream(serverUrl) && serverUrl.endsWith(".m3u8"),
          quality: server.quality || "auto",
          isEmbed: isEmbedUrl(serverUrl),
        });
      }
    }

    if (sources.length === 0) {
      return { success: false, provider: "sankanime", sources: [], error: "No playable URLs" };
    }

    return {
      success: true,
      provider: "sankanime",
      sources,
    };
  } catch (e) {
    return { success: false, provider: "sankanime", sources: [], error: (e as Error).message };
  }
}

// ═══════════════════════════════════════════════════════════
// Provider: AniWatch (Anime-API)
// ═══════════════════════════════════════════════════════════
async function fetchAniwatch(params: StreamParams, config: ProviderConfig, _settings: ProviderStoreData["globalSettings"]): Promise<StreamResult> {
  if (!config.baseUrl) return { success: false, provider: "aniwatch", sources: [], error: "No base URL" };

  const category = params.category || "sub";

  try {
    const searchUrl = `${config.baseUrl}/aniwatch/search?keyword=${encodeURIComponent(params.animeTitle)}&page=1`;
    const searchRes = await fetchWithTimeout(searchUrl, config.timeout);
    if (!searchRes.ok) return { success: false, provider: "aniwatch", sources: [], error: `Search HTTP ${searchRes.status}` };

    const searchData = await searchRes.json();
    const anime = searchData.animes?.[0];
    if (!anime) return { success: false, provider: "aniwatch", sources: [], error: "Anime not found" };

    const epUrl = `${config.baseUrl}/aniwatch/episodes/${anime.id}`;
    const epRes = await fetchWithTimeout(epUrl, config.timeout);
    if (!epRes.ok) return { success: false, provider: "aniwatch", sources: [], error: `Episodes HTTP ${epRes.status}` };

    const epData = await epRes.json();
    const episode = epData.episodes?.[params.episodeNumber - 1];
    if (!episode) return { success: false, provider: "aniwatch", sources: [], error: "Episode not found" };

    const srcUrl = `${config.baseUrl}/aniwatch/episode-srcs?id=${episode.episodeId}&server=vidstreaming&category=${category}`;
    const srcRes = await fetchWithTimeout(srcUrl, config.timeout);
    if (!srcRes.ok) return { success: false, provider: "aniwatch", sources: [], error: `Sources HTTP ${srcRes.status}` };

    const srcData = await srcRes.json();
    if (!srcData.sources?.length) return { success: false, provider: "aniwatch", sources: [], error: "No sources" };

    return {
      success: true,
      provider: "aniwatch",
      sources: srcData.sources.map((s: { url: string; isM3U8: boolean; quality?: string; headers?: Record<string, string> }) => ({
        url: s.url,
        isM3U8: s.isM3U8,
        quality: s.quality || "auto",
        headers: s.headers || srcData.headers,
      })),
      subtitles: srcData.subtitles,
    };
  } catch (e) {
    return { success: false, provider: "aniwatch", sources: [], error: (e as Error).message };
  }
}

// ═══════════════════════════════════════════════════════════
// Provider: Consumet
// ═══════════════════════════════════════════════════════════
async function fetchConsumet(params: StreamParams, config: ProviderConfig, _settings: ProviderStoreData["globalSettings"]): Promise<StreamResult> {
  if (!config.baseUrl) return { success: false, provider: "consumet", sources: [], error: "No base URL" };

  try {
    const searchUrl = `${config.baseUrl}/anime/zoro/${encodeURIComponent(params.animeTitle)}`;
    const searchRes = await fetchWithTimeout(searchUrl, config.timeout);
    if (!searchRes.ok) return { success: false, provider: "consumet", sources: [], error: `Search HTTP ${searchRes.status}` };

    const searchData = await searchRes.json();
    const anime = searchData.results?.[0];
    if (!anime) return { success: false, provider: "consumet", sources: [], error: "Anime not found" };

    const epUrl = `${config.baseUrl}/anime/zoro/info/${anime.id}`;
    const epRes = await fetchWithTimeout(epUrl, config.timeout);
    if (!epRes.ok) return { success: false, provider: "consumet", sources: [], error: `Info HTTP ${epRes.status}` };

    const epData = await epRes.json();
    const episode = epData.episodes?.[params.episodeNumber - 1];
    if (!episode) return { success: false, provider: "consumet", sources: [], error: "Episode not found" };

    const streamUrl = `${config.baseUrl}/anime/zoro/watch/${episode.id}`;
    const streamRes = await fetchWithTimeout(streamUrl, config.timeout);
    if (!streamRes.ok) return { success: false, provider: "consumet", sources: [], error: `Stream HTTP ${streamRes.status}` };

    const streamData = await streamRes.json();
    if (!streamData.sources?.length) return { success: false, provider: "consumet", sources: [], error: "No sources" };

    return {
      success: true,
      provider: "consumet",
      sources: streamData.sources.map((s: { url: string; isM3U8: boolean; quality?: string; headers?: Record<string, string> }) => ({
        url: s.url,
        isM3U8: s.isM3U8,
        quality: s.quality || "auto",
        headers: s.headers,
      })),
      subtitles: streamData.subtitles,
    };
  } catch (e) {
    return { success: false, provider: "consumet", sources: [], error: (e as Error).message };
  }
}

// ═══════════════════════════════════════════════════════════
// Provider Dispatcher — real providers only
// ═══════════════════════════════════════════════════════════
const PROVIDER_MAP: Record<
  string,
  (params: StreamParams, config: ProviderConfig, settings: ProviderStoreData["globalSettings"]) => Promise<StreamResult>
> = {
  "local-db": (params) => fetchLocalDb(params),
  sankanime: (params) => fetchSankanime(params),
  aniwatch: (params, config, settings) => fetchAniwatch(params, config, settings),
  consumet: (params, config, settings) => fetchConsumet(params, config, settings),
};

// ═══════════════════════════════════════════════════════════
// Main Entry Point — tries providers in priority order
// ═══════════════════════════════════════════════════════════
export async function getStreams(params: StreamParams): Promise<StreamResult> {
  const store = loadProviderConfig();
  const { globalSettings: settings } = store;

  const providers = store.providers
    .filter((p) => p.enabled)
    .sort((a, b) => a.priority - b.priority);

  const targetProviders = params.provider
    ? providers.filter((p) => p.id === params.provider || p.name === params.provider)
    : providers;

  if (targetProviders.length === 0) {
    return { success: false, provider: "none", sources: [], error: "No enabled providers" };
  }

  const errors: string[] = [];
  const maxRetries = settings.maxRetries || 1;

  for (const provider of targetProviders) {
    const cached = getCachedResult(params, provider.id);
    if (cached) {
      console.log(`[StreamProvider] ✓ ${provider.id} (cached) — "${params.animeTitle}" ep ${params.episodeNumber}`);
      return cached;
    }

    const handler = PROVIDER_MAP[provider.id];
    if (!handler) {
      errors.push(`${provider.id}: no handler`);
      continue;
    }

    let lastError = "";
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const start = Date.now();
      try {
        const result = await handler(params, provider, settings);
        const duration = Date.now() - start;

        if (result.success && result.sources.length > 0) {
          updateProviderHealth(provider.id, "healthy", duration);
          const finalResult = { ...result, duration };
          setCachedResult(params, provider.id, finalResult);
          console.log(`[StreamProvider] ✓ ${provider.id} (${duration}ms) — "${params.animeTitle}" ep ${params.episodeNumber}`);
          return finalResult;
        }

        lastError = result.error || "No streams";
      } catch (e) {
        lastError = (e as Error).message;
      }

      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }

    updateProviderHealth(provider.id, "degraded", 0, lastError);
    errors.push(`${provider.id}: ${lastError}`);
  }

  return {
    success: false,
    provider: "none",
    sources: [],
    error: `All providers failed: ${errors.join("; ")}`,
  };
}

export { getFullProviderStatus } from "./health-monitor";
