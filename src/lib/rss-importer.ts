import { prisma } from "./prisma";
import { fetchAndParseFeed, type RSSFeedItem } from "./rss-parser";
import {
  fetchFullMedia,
  smartImportAnime,
  notifyNewEpisode,
  trackEvent,
  getCurrentSeason,
  mapAniListFormat,
} from "./anilist-metadata";
import { enqueueJob } from "./queue";

export interface ImportResult {
  feedSourceId: string;
  feedName: string;
  itemsFound: number;
  newItems: number;
  imported: number;
  skipped: number;
  failed: number;
  errors: string[];
  duration: number;
}

async function fetchFeed(feedUrl: string): Promise<RSSFeedItem[]> {
  const feed = await fetchAndParseFeed(feedUrl);
  return feed.items;
}

async function deduplicateItems(feedSourceId: string, items: RSSFeedItem[]): Promise<RSSFeedItem[]> {
  const existingGuids = new Set(
    (
      await prisma.rSSItem.findMany({
        where: { feedSourceId },
        select: { guid: true },
      })
    ).map((item) => item.guid)
  );
  return items.filter((item) => item.guid && !existingGuids.has(item.guid));
}

function parseAnimeTitle(rawTitle: string) {
  let title = rawTitle;
  title = title.replace(/\[(?:Sub|Dub|RAW|CR|Funi|Funimation|SubsPlease|EMBER|ASW|Kaleido|Erai-raws)\]/gi, "");

  const resMatch = title.match(/\b(2160p|1080p|720p|480p|360p)\b/i);
  const resolution = resMatch ? resMatch[1] : null;

  let episodeNumber: number | null = null;
  const epPatterns = [
    /(?:[-\s]E)?(\d{1,4})(?:\s*[-/\s]|$)/i,
    /Episode\s*(\d{1,4})/i,
    /Ep\.?\s*(\d{1,4})/i,
    /\b(\d{1,4})\s*of\s*\d{1,4}/i,
    /[\[\(](\d{1,4})[\]\)]/i,
  ];
  for (const pattern of epPatterns) {
    const match = title.match(pattern);
    if (match) {
      const num = parseInt(match[1]);
      if (num > 0 && num < 10000) {
        episodeNumber = num;
        break;
      }
    }
  }

  let quality: string | null = null;
  if (/\bSub\b/i.test(title)) quality = "SUB";
  else if (/\bDub\b/i.test(title)) quality = "DUB";
  else if (/\bRAW\b/i.test(title)) quality = "RAW";

  let animeTitle = title
    .replace(/\b(2160p|1080p|720p|480p|360p)\b/gi, "")
    .replace(/Episode\s*\d{1,4}/gi, "")
    .replace(/Ep\.?\s*\d{1,4}/gi, "")
    .replace(/\[\d{1,4}\]/g, "")
    .replace(/\(\d{1,4}\)/g, "")
    .replace(/\bSub\b|\bDub\b|\bRAW\b/gi, "")
    .replace(/\[.*?\]/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  animeTitle = animeTitle
    .replace(/\s*(BD|Blu.?ray|BDRip|WEB.?Rip|WEB.?DL|HDRip|DVDRip)\b/gi, "")
    .replace(/\s*(MP4|MKV|AVI|FLAC|AAC|HEVC|x264|x265|10bit)\b/gi, "")
    .trim();

  return { animeTitle, episodeNumber, resolution, quality };
}

async function logImport(
  feedSourceId: string,
  action: string,
  status: string,
  message: string,
  rssItemId?: string,
  duration?: number
) {
  await prisma.importLog.create({
    data: { feedSourceId, rssItemId, action, status, message, duration },
  }).catch(() => {});
}

export async function importFromFeed(feedSourceId: string): Promise<ImportResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  const feedSource = await prisma.feedSource.findUnique({ where: { id: feedSourceId } });
  if (!feedSource) throw new Error("Feed source not found");

  await prisma.feedSource.update({
    where: { id: feedSourceId },
    data: { lastCheckedAt: new Date() },
  });

  let items: RSSFeedItem[] = [];
  try {
    items = await fetchFeed(feedSource.url);
  } catch (error) {
    const msg = `Failed to fetch feed: ${error instanceof Error ? error.message : String(error)}`;
    errors.push(msg);
    await logImport(feedSourceId, "check", "failure", msg);
    await prisma.feedSource.update({
      where: { id: feedSourceId },
      data: { errorCount: { increment: 1 }, lastError: msg },
    });
    return { feedSourceId, feedName: feedSource.name, itemsFound: 0, newItems: 0, imported: 0, skipped: 0, failed: 0, errors, duration: Date.now() - startTime };
  }

  const newItems = await deduplicateItems(feedSourceId, items);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  const toProcess = newItems.slice(0, 50);

  for (const item of toProcess) {
    try {
      const rssItem = await prisma.rSSItem.create({
        data: {
          feedSourceId,
          guid: item.guid,
          title: item.title,
          link: item.link,
          description: item.description,
          publishedAt: item.publishedAt,
          seeders: item.seeders,
          leechers: item.leechers,
          size: item.size,
          status: "pending",
        },
      });

      const parsed = parseAnimeTitle(item.title);

      if (!parsed.animeTitle || parsed.animeTitle.length < 2) {
        await prisma.rSSItem.update({
          where: { id: rssItem.id },
          data: { status: "skipped", error: "Could not parse anime title" },
        });
        skipped++;
        await logImport(feedSourceId, "skip", "warning", `Skipped: ${item.title} - unparseable title`, rssItem.id);
        continue;
      }

      // Search AniList for full metadata
      const media = await fetchFullMedia(parsed.animeTitle);

      if (media) {
        // Full smart import with all metadata
        const importResult = await smartImportAnime(media);

        await prisma.rSSItem.update({
          where: { id: rssItem.id },
          data: {
            status: "imported",
            animeTitle: parsed.animeTitle,
            episodeNumber: parsed.episodeNumber,
            resolution: parsed.resolution,
            quality: parsed.quality,
            animeId: importResult.animeId,
            importedAt: new Date(),
          },
        });

        // Notify users following this anime
        if (parsed.episodeNumber && importResult.animeId) {
          await notifyNewEpisode(importResult.animeId, parsed.episodeNumber);
        }

        await trackEvent("import", "anime", importResult.animeId, {
          title: parsed.animeTitle,
          episode: parsed.episodeNumber,
          created: importResult.created,
          source: "rss",
        });

        imported++;
      } else {
        // Fallback: create minimal entry
        const { season, year } = getCurrentSeason();
        const slug = `rss-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        const anime = await prisma.anime.create({
          data: {
            title: parsed.animeTitle,
            slug,
            description: `Imported from RSS feed: ${feedSource.name}`,
            status: "ONGOING",
            type: "TV",
            season,
            releaseYear: year,
          },
        });

        await prisma.rSSItem.update({
          where: { id: rssItem.id },
          data: {
            status: "imported",
            animeTitle: parsed.animeTitle,
            episodeNumber: parsed.episodeNumber,
            resolution: parsed.resolution,
            quality: parsed.quality,
            animeId: anime.id,
            importedAt: new Date(),
          },
        });

        if (parsed.episodeNumber) {
          await notifyNewEpisode(anime.id, parsed.episodeNumber);
        }

        imported++;
      }

      await logImport(feedSourceId, "import", "success", `Imported: ${parsed.animeTitle} Ep ${parsed.episodeNumber || "?"}`, rssItem.id);
      await new Promise((r) => setTimeout(r, 350)); // Rate limit
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await prisma.rSSItem.upsert({
        where: { guid: item.guid },
        update: { status: "failed", error: msg },
        create: {
          feedSourceId,
          guid: item.guid,
          title: item.title,
          link: item.link,
          description: item.description,
          publishedAt: item.publishedAt,
          status: "failed",
          error: msg,
        },
      });
      await logImport(feedSourceId, "error", "failure", `Failed: ${item.title} - ${msg}`);
      failed++;
      errors.push(msg);
    }
  }

  await prisma.feedSource.update({
    where: { id: feedSourceId },
    data: {
      itemCount: { increment: imported },
      totalImported: { increment: imported },
      lastItemGuid: toProcess.length > 0 ? toProcess[0].guid : undefined,
    },
  });

  const duration = Date.now() - startTime;
  await logImport(feedSourceId, "check", "success", `Check: ${items.length} found, ${newItems.length} new, ${imported} imported, ${skipped} skipped, ${failed} failed`, undefined, duration);

  return { feedSourceId, feedName: feedSource.name, itemsFound: items.length, newItems: newItems.length, imported, skipped, failed, errors, duration };
}

export async function checkAllFeeds(): Promise<ImportResult[]> {
  const feeds = await prisma.feedSource.findMany({
    where: { enabled: true },
    orderBy: [{ priority: "desc" }, { lastCheckedAt: "asc" }],
  });

  const results: ImportResult[] = [];

  for (const feed of feeds) {
    if (feed.lastCheckedAt) {
      const elapsed = Date.now() - feed.lastCheckedAt.getTime();
      const interval = feed.checkInterval * 60 * 1000;
      if (elapsed < interval) continue;
    }

    try {
      const result = await importFromFeed(feed.id);
      results.push(result);
    } catch (error) {
      results.push({
        feedSourceId: feed.id,
        feedName: feed.name,
        itemsFound: 0,
        newItems: 0,
        imported: 0,
        skipped: 0,
        failed: 1,
        errors: [error instanceof Error ? error.message : String(error)],
        duration: 0,
      });
    }
  }

  return results;
}

export async function forceFullRescan(): Promise<{ scanned: number; updated: number; errors: number }> {
  const animes = await prisma.anime.findMany({
    where: { slug: { startsWith: "anilist-" } },
    select: { id: true, slug: true },
  });

  let scanned = 0;
  let updated = 0;
  let errors = 0;

  for (const anime of animes) {
    const match = anime.slug.match(/anilist-(\d+)/);
    if (!match) continue;

    try {
      const media = await fetchFullMedia(undefined, parseInt(match[1]));
      if (media) {
        const result = await smartImportAnime(media);
        if (result.updated) updated++;
        scanned++;
      }
      await new Promise((r) => setTimeout(r, 350));
    } catch {
      errors++;
    }
  }

  return { scanned, updated, errors };
}
