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
// Bypass: scrape.do wraps any URL through their proxy
// ═══════════════════════════════════════════════════════════
function scrapeDoUrl(url: string, token: string): string {
  return `https://api.scrape.do?token=${token}&url=${encodeURIComponent(url)}&render=true&super=true&sessionTtl=120`;
}

function getBypassUrl(url: string, config: ProviderConfig, settings: ProviderStoreData["globalSettings"]): string {
  if (config.bypassService === "scrape.do" && config.bypassKeyEnv) {
    const token = process.env[config.bypassKeyEnv] || settings.scrapeDoToken;
    if (token) return scrapeDoUrl(url, token);
  }
  return url;
}

async function fetchWithBypass(
  url: string,
  config: ProviderConfig,
  settings: ProviderStoreData["globalSettings"],
  init?: RequestInit
): Promise<Response> {
  const timeout = config.timeout || 10000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    if (config.bypassService === "flaresolverr" && settings.flaresolverrUrl) {
      const res = await fetch(settings.flaresolverrUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmd: "request.get", url, maxTimeout: timeout }),
        signal: controller.signal,
      });
      const data = await res.json();
      return new Response(data.solution?.response || "", {
        status: data.status === "ok" ? 200 : 500,
        headers: { "Content-Type": "text/html" },
      });
    }

    const targetUrl = getBypassUrl(url, config, settings);
    return await fetch(targetUrl, { ...init, signal: controller.signal });
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
// Provider: MiruroAPI
// ═══════════════════════════════════════════════════════════
async function fetchMiruro(params: StreamParams, config: ProviderConfig, settings: ProviderStoreData["globalSettings"]): Promise<StreamResult> {
  if (!config.baseUrl) return { success: false, provider: "miruro", sources: [], error: "No base URL" };

  const slug = params.animeTitle
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 60);

  const provider = params.provider || "kiwi";
  const category = params.category || "sub";

  const url = `${config.baseUrl}/api/watch/${provider}/${params.anilistId || 0}/${category}/${slug}`;

  try {
    const res = await fetchWithBypass(url, config, settings);
    if (!res.ok) return { success: false, provider: "miruro", sources: [], error: `HTTP ${res.status}` };

    const data = await res.json();
    if (data.success === false || !data.streams?.length) {
      return { success: false, provider: "miruro", sources: [], error: data.message || "No streams" };
    }

    return {
      success: true,
      provider: "miruro",
      sources: data.streams.map((s: { url: string; type: string; headers?: Record<string, string> }) => ({
        url: s.url,
        isM3U8: s.type === "hls" || s.url.endsWith(".m3u8"),
        quality: s.type,
        headers: s.headers,
      })),
      subtitles: data.subtitles,
      skipTimes: data.skipTimes,
    };
  } catch (e) {
    return { success: false, provider: "miruro", sources: [], error: (e as Error).message };
  }
}

// ═══════════════════════════════════════════════════════════
// Provider: AniWatch (Anime-API)
// ═══════════════════════════════════════════════════════════
async function fetchAniwatch(params: StreamParams, config: ProviderConfig, settings: ProviderStoreData["globalSettings"]): Promise<StreamResult> {
  if (!config.baseUrl) return { success: false, provider: "aniwatch", sources: [], error: "No base URL" };

  const category = params.category || "sub";

  try {
    const searchUrl = `${config.baseUrl}/aniwatch/search?keyword=${encodeURIComponent(params.animeTitle)}&page=1`;
    const searchRes = await fetchWithBypass(searchUrl, config, settings);
    if (!searchRes.ok) return { success: false, provider: "aniwatch", sources: [], error: `Search HTTP ${searchRes.status}` };

    const searchData = await searchRes.json();
    const anime = searchData.animes?.[0];
    if (!anime) return { success: false, provider: "aniwatch", sources: [], error: "Anime not found" };

    const epUrl = `${config.baseUrl}/aniwatch/episodes/${anime.id}`;
    const epRes = await fetchWithBypass(epUrl, config, settings);
    if (!epRes.ok) return { success: false, provider: "aniwatch", sources: [], error: `Episodes HTTP ${epRes.status}` };

    const epData = await epRes.json();
    const episode = epData.episodes?.[params.episodeNumber - 1];
    if (!episode) return { success: false, provider: "aniwatch", sources: [], error: "Episode not found" };

    const srcUrl = `${config.baseUrl}/aniwatch/episode-srcs?id=${episode.episodeId}&server=vidstreaming&category=${category}`;
    const srcRes = await fetchWithBypass(srcUrl, config, settings);
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
async function fetchConsumet(params: StreamParams, config: ProviderConfig, settings: ProviderStoreData["globalSettings"]): Promise<StreamResult> {
  if (!config.baseUrl) return { success: false, provider: "consumet", sources: [], error: "No base URL" };

  try {
    const searchUrl = `${config.baseUrl}/anime/zoro/${encodeURIComponent(params.animeTitle)}`;
    const searchRes = await fetchWithBypass(searchUrl, config, settings);
    if (!searchRes.ok) return { success: false, provider: "consumet", sources: [], error: `Search HTTP ${searchRes.status}` };

    const searchData = await searchRes.json();
    const anime = searchData.results?.[0];
    if (!anime) return { success: false, provider: "consumet", sources: [], error: "Anime not found" };

    const epUrl = `${config.baseUrl}/anime/zoro/info/${anime.id}`;
    const epRes = await fetchWithBypass(epUrl, config, settings);
    if (!epRes.ok) return { success: false, provider: "consumet", sources: [], error: `Info HTTP ${epRes.status}` };

    const epData = await epRes.json();
    const episode = epData.episodes?.[params.episodeNumber - 1];
    if (!episode) return { success: false, provider: "consumet", sources: [], error: "Episode not found" };

    const streamUrl = `${config.baseUrl}/anime/zoro/watch/${episode.id}`;
    const streamRes = await fetchWithBypass(streamUrl, config, settings);
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
  miruro: (params, config, settings) => fetchMiruro(params, config, settings),
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
