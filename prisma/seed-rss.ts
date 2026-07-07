import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_FEEDS = [
  { name: "Nyaa - Anime (English Subbed)", url: "https://nyaa.si/?page=rss&q=&c=1_2&f=0", type: "nyaa", category: "sub" },
  { name: "Nyaa - Anime (English Dubbed)", url: "https://nyaa.si/?page=rss&q=&c=1_3&f=0", type: "nyaa", category: "dub" },
  { name: "Nyaa - Anime (RAW)", url: "https://nyaa.si/?page=rss&q=&c=1_4&f=0", type: "nyaa", category: "raw" },
  { name: "SubsPlease - 1080p Weekly", url: "https://nyaa.si/?page=rss&q=SubsPlease+1080p&f=0", type: "nyaa", category: "sub" },
];

async function seedFeeds() {
  for (const feed of DEFAULT_FEEDS) {
    const existing = await prisma.feedSource.findUnique({ where: { url: feed.url } });
    if (!existing) {
      await prisma.feedSource.create({
        data: { ...feed, checkInterval: 10, enabled: true },
      });
      console.log(`Created feed: ${feed.name}`);
    } else {
      console.log(`Feed already exists: ${feed.name}`);
    }
  }
  console.log("RSS feed seeding complete.");
}

seedFeeds()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
