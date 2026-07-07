import { XMLParser } from "fast-xml-parser";

export interface RSSFeedItem {
  guid: string;
  title: string;
  link: string;
  description: string;
  publishedAt: Date | null;
  // Nyaa-specific fields
  seeders?: number;
  leechers?: number;
  size?: string;
  category?: string;
  infoHash?: string;
}

export interface ParsedFeed {
  title: string;
  items: RSSFeedItem[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  isArray: (name) => name === "item",
});

export async function fetchAndParseFeed(url: string): Promise<ParsedFeed> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "AnimeVoid RSS Reader/1.0",
      Accept: "application/rss+xml, application/xml, text/xml",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`Feed fetch failed: ${res.status} ${res.statusText}`);
  }

  const xml = await res.text();
  const parsed = parser.parse(xml);

  // Handle RSS 2.0
  if (parsed.rss?.channel) {
    const channel = parsed.rss.channel;
    const items = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : [];
    return {
      title: channel.title || "Unknown Feed",
      items: items.map((item: Record<string, unknown>) => parseRSSItem(item)),
    };
  }

  // Handle Atom
  if (parsed.feed?.entry) {
    const entries = Array.isArray(parsed.feed.entry) ? parsed.feed.entry : [parsed.feed.entry];
    return {
      title: parsed.feed.title || "Unknown Feed",
      items: entries.map((entry: Record<string, unknown>) => parseAtomEntry(entry)),
    };
  }

  throw new Error("Unknown feed format");
}

function parseRSSItem(item: Record<string, unknown>): RSSFeedItem {
  const guidField = item.guid as Record<string, string> | string | undefined;
  const titleField = item.title as Record<string, string> | string | undefined;
  const linkField = item.link as Record<string, string> | string | undefined;
  const descField = item.description as Record<string, string> | string | undefined;
  const pubDateField = item.pubDate as Record<string, string> | string | undefined;

  const guid = (typeof guidField === "object" ? guidField?.["#text"] : guidField) || "";
  const title = (typeof titleField === "object" ? titleField?.["#text"] : titleField) || "";
  const link = (typeof linkField === "object" ? linkField?.["#text"] : linkField) || "";
  const description = (typeof descField === "object" ? descField?.["#text"] : descField) || "";
  const pubDate = (typeof pubDateField === "object" ? pubDateField?.["#text"] : pubDateField) || "";

  // Nyaa-specific fields from torrent namespace
  const nyaaAttrs = item["nyaa:seeders"] || item["nyaa:seed"];
  const seeders = typeof nyaaAttrs === "number" ? nyaaAttrs : parseInt(String(nyaaAttrs || "0")) || undefined;
  const nyaaLeechers = item["nyaa:leechers"] || item["nyaa:leech"];
  const leechers = typeof nyaaLeechers === "number" ? nyaaLeechers : parseInt(String(nyaaLeechers || "0")) || undefined;
  const nyaaSize = item["nyaa:size"];
  const size = typeof nyaaSize === "string" ? nyaaSize : undefined;
  const nyaaInfoHash = item["nyaa:infoHash"];
  const infoHash = typeof nyaaInfoHash === "string" ? nyaaInfoHash : undefined;

  return {
    guid: guid.trim(),
    title: title.trim(),
    link: link.trim(),
    description: description.trim(),
    publishedAt: pubDate ? new Date(pubDate) : null,
    seeders: seeders && seeders > 0 ? seeders : undefined,
    leechers: leechers && leechers > 0 ? leechers : undefined,
    size,
    infoHash,
  };
}

function parseAtomEntry(entry: Record<string, unknown>): RSSFeedItem {
  const idField = entry.id as Record<string, string> | string | undefined;
  const titleField = entry.title as Record<string, string> | string | undefined;
  const contentField = entry.content as Record<string, string> | string | undefined;
  const updatedField = entry.updated as Record<string, string> | string | undefined;

  const id = (typeof idField === "object" ? idField?.["#text"] : idField) || "";
  const title = (typeof titleField === "object" ? titleField?.["#text"] : titleField) || "";
  const linkObj = entry.link;
  const link = typeof linkObj === "object" && linkObj !== null
    ? (linkObj as Record<string, string>)["@_href"] || ""
    : String(linkObj || "");
  const content = (typeof contentField === "object" ? contentField?.["#text"] : contentField) || "";
  const updated = (typeof updatedField === "object" ? updatedField?.["#text"] : updatedField) || "";

  return {
    guid: id.trim(),
    title: title.trim(),
    link: link.trim(),
    description: content.trim(),
    publishedAt: updated ? new Date(updated) : null,
  };
}
