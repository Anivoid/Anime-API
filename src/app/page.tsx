import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BannerCarousel } from "@/components/BannerCarousel";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/lib/anilist-metadata";
import { LatestEpisodeCard } from "@/components/LatestEpisodeCard";
import { TopAnimeSidebar } from "@/components/TopAnimeSidebar";
import { ScheduleWidget } from "@/components/ScheduleWidget";

export const dynamic = "force-dynamic";

async function getAniListTrending() {
  try {
    const query = `query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
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
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables: { page: 1, perPage: 12 } }),
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data.Page.media || []) as AniListMedia[];
  } catch {
    return [] as AniListMedia[];
  }
}

interface AniListMedia {
  id: number;
  title: { romaji: string; english: string | null };
  coverImage: { large: string };
  format: string;
  season: string | null;
  seasonYear: number | null;
  episodes: number | null;
}

function AniListAnimeCard({ item }: { item: AniListMedia }) {
  const title = item.title.english || item.title.romaji;
  const slug = `anilist-${item.id}`;
  const format = item.format || "TV";
  return (
    <Link href={`/anime/${slug}`} className="group block">
      <div className="relative aspect-[3/4] bg-[#1a1a2e] rounded overflow-hidden mb-2 border border-white/5 group-hover:border-white/15 transition-all duration-200">
        {item.coverImage?.large && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.coverImage.large} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        {item.episodes && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 z-10">
            <span className="bg-green-600/90 text-white text-[10px] px-1.5 py-0.5 rounded font-bold leading-none">
              SUB {item.episodes}
            </span>
            <span className="bg-blue-600/90 text-white text-[10px] px-1.5 py-0.5 rounded font-bold leading-none">
              {item.episodes}
            </span>
          </div>
        )}
        <div className="absolute top-2 left-2 z-10">
          <span className="bg-black/70 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded font-medium">{format}</span>
        </div>
      </div>
      <h3 className="font-semibold text-gray-200 group-hover:text-purple-400 transition-colors duration-200 line-clamp-2 text-sm leading-tight">
        {title}
      </h3>
      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-500">
        {item.seasonYear && <span>{item.seasonYear}</span>}
        {item.episodes && <span>• {item.episodes} ep</span>}
      </div>
    </Link>
  );
}

const LETTERS = ["All", "#", "0-9", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];

export default async function Home() {
  const [trending, rawLatestEpisodes, rawNewReleases, newAdded, justCompleted] = await Promise.all([
    getAniListTrending(),
    prisma.episode.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        anime: {
          select: {
            id: true, title: true, slug: true, coverImage: true,
            type: true, subCount: true, dubCount: true,
          },
        },
      },
    }),
    // New Release: recently added episodes
    prisma.episode.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        anime: {
          select: {
            id: true, title: true, slug: true, coverImage: true,
            type: true, subCount: true, dubCount: true, releaseYear: true, status: true,
          },
        },
      },
    }),
    // New Added: recently added anime
    prisma.anime.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        genres: { include: { genre: true } },
      },
    }),
    // Just Completed
    prisma.anime.findMany({
      where: { status: "COMPLETED" },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: {
        genres: { include: { genre: true } },
      },
    }),
  ]);

  const latestEpisodes = (() => {
    const seen = new Set<string>();
    return rawLatestEpisodes.filter((ep) => {
      if (seen.has(ep.animeId)) return false;
      seen.add(ep.animeId);
      return true;
    }).slice(0, 18);
  })();

  const newReleases = (() => {
    const seen = new Set<string>();
    return rawNewReleases.filter((ep) => {
      if (seen.has(ep.animeId)) return false;
      seen.add(ep.animeId);
      return true;
    }).slice(0, 6);
  })();

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-white">
      <Header />
      <BannerCarousel />

      {/* Latest Episode + Top Anime Sidebar */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main content */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Latest Episode</h2>
              <div className="flex gap-2">
                {["All", "Sub", "Dub", "Trending"].map((tab) => (
                  <button
                    key={tab}
                    className="text-xs px-3 py-1.5 rounded bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {latestEpisodes.map((ep) => (
                <LatestEpisodeCard
                  key={ep.id}
                  animeTitle={ep.anime.title}
                  slug={ep.anime.slug}
                  coverImage={ep.anime.coverImage}
                  episodeNumber={ep.number}
                  subCount={ep.anime.subCount}
                  dubCount={ep.anime.dubCount}
                  type={ep.anime.type}
                />
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 flex-shrink-0 space-y-6">
            <TopAnimeSidebar />
            <ScheduleWidget />
          </div>
        </div>
      </section>

      {/* Trending Now */}
      {trending.length > 0 && (
        <section className="container mx-auto px-4 py-8 border-t border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Trending Now</h2>
            <Link href="/browse" className="text-purple-400 text-sm hover:text-purple-300 transition-colors">
              View All →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {trending.map((item) => (
              <AniListAnimeCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* New Release / New Added / Just Completed - 3 columns */}
      <section className="container mx-auto px-4 py-8 border-t border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* New Release */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">New Release</h2>
              <Link href="/browse?sort=new" className="text-purple-400 text-xs hover:text-purple-300 transition-colors">
                →
              </Link>
            </div>
            <div className="space-y-3">
              {newReleases.map((ep) => (
                <Link
                  key={ep.id}
                  href={`/watch/${ep.anime.slug}/${ep.number}`}
                  className="flex items-center gap-3 group"
                >
                  <div className="w-12 h-16 rounded overflow-hidden bg-[#1a1a2e] flex-shrink-0">
                    {ep.anime.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ep.anime.coverImage} alt={ep.anime.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/10 text-xs">?</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm text-gray-200 group-hover:text-purple-400 transition-colors line-clamp-1">
                      {ep.anime.title}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px]">
                      {ep.anime.subCount !== null && (
                        <span className="bg-green-600/80 text-white px-1 rounded font-bold">SUB {ep.anime.subCount}</span>
                      )}
                      {ep.anime.dubCount !== null && ep.anime.dubCount > 0 && (
                        <span className="bg-yellow-500/80 text-black px-1 rounded font-bold">DUB {ep.anime.dubCount}</span>
                      )}
                      {ep.anime.type && <span className="text-gray-500">• {ep.anime.type}</span>}
                      <span className="text-gray-600">• {ep.anime.releaseYear}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* New Added */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">New Added</h2>
              <Link href="/browse" className="text-purple-400 text-xs hover:text-purple-300 transition-colors">
                →
              </Link>
            </div>
            <div className="space-y-3">
              {newAdded.map((anime) => (
                <Link
                  key={anime.id}
                  href={`/anime/${anime.slug}`}
                  className="flex items-center gap-3 group"
                >
                  <div className="w-12 h-16 rounded overflow-hidden bg-[#1a1a2e] flex-shrink-0">
                    {anime.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={anime.coverImage} alt={anime.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/10 text-xs">?</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm text-gray-200 group-hover:text-purple-400 transition-colors line-clamp-1">
                      {anime.title}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px]">
                      {anime.subCount !== null && (
                        <span className="bg-green-600/80 text-white px-1 rounded font-bold">SUB {anime.subCount}</span>
                      )}
                      {anime.type && <span className="text-gray-500">• {anime.type}</span>}
                      <span className="text-gray-600">• {anime.releaseYear}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Just Completed */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Just Completed</h2>
              <Link href="/browse?status=COMPLETED" className="text-purple-400 text-xs hover:text-purple-300 transition-colors">
                →
              </Link>
            </div>
            <div className="space-y-3">
              {justCompleted.map((anime) => (
                <Link
                  key={anime.id}
                  href={`/anime/${anime.slug}`}
                  className="flex items-center gap-3 group"
                >
                  <div className="w-12 h-16 rounded overflow-hidden bg-[#1a1a2e] flex-shrink-0">
                    {anime.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={anime.coverImage} alt={anime.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/10 text-xs">?</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm text-gray-200 group-hover:text-purple-400 transition-colors line-clamp-1">
                      {anime.title}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px]">
                      {anime.subCount !== null && (
                        <span className="bg-green-600/80 text-white px-1 rounded font-bold">SUB {anime.subCount}</span>
                      )}
                      {anime.type && <span className="text-gray-500">• {anime.type}</span>}
                      <span className="text-gray-600">• {anime.releaseYear}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* A-Z List */}
      <section className="container mx-auto px-4 py-8 border-t border-white/5">
        <h2 className="text-xl font-bold text-white mb-4">A-Z List</h2>
        <p className="text-gray-500 text-sm mb-4">Searching anime order by alphabet name A to Z.</p>
        <div className="flex flex-wrap gap-2">
          {LETTERS.map((letter) => (
            <Link
              key={letter}
              href={`/browse?letter=${letter}`}
              className="w-10 h-10 flex items-center justify-center rounded bg-white/5 text-gray-300 hover:bg-purple-600 hover:text-white transition-colors text-sm font-medium"
            >
              {letter}
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
