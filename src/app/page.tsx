import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BannerCarousel } from "@/components/BannerCarousel";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/lib/anilist-metadata";

async function getAniListTrending() {
  try {
    const query = `query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
          id
          title { romaji english }
          coverImage { large }
          bannerImage
          meanScore
          status
          format
          season
          seasonYear
          episodes
          genres
        }
      }
    }`;

    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables: { page: 1, perPage: 18 } }),
      next: { revalidate: 300 },
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.data.Page.media || [];
  } catch {
    return [];
  }
}

async function getAniListPopular() {
  try {
    const query = `query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(sort: POPULARITY_DESC, type: ANIME, isAdult: false) {
          id
          title { romaji english }
          coverImage { large }
          meanScore
          status
          format
          season
          seasonYear
          episodes
          genres
        }
      }
    }`;

    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables: { page: 1, perPage: 18 } }),
      next: { revalidate: 300 },
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.data.Page.media || [];
  } catch {
    return [];
  }
}

async function getAniListTopRated() {
  try {
    const query = `query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(sort: SCORE_DESC, type: ANIME, isAdult: false) {
          id
          title { romaji english }
          coverImage { large }
          meanScore
          status
          format
          season
          seasonYear
          episodes
          genres
        }
      }
    }`;

    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables: { page: 1, perPage: 18 } }),
      next: { revalidate: 300 },
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.data.Page.media || [];
  } catch {
    return [];
  }
}

async function getAniListUpcoming() {
  try {
    const query = `query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(status: NOT_YET_RELEASED, sort: POPULARITY_DESC, type: ANIME, isAdult: false) {
          id
          title { romaji english }
          coverImage { large }
          meanScore
          status
          format
          season
          seasonYear
          episodes
          genres
          nextAiringEpisode { episode airingAt }
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
    return data.data.Page.media || [];
  } catch {
    return [];
  }
}

interface AniListMedia {
  id: number;
  title: { romaji: string; english: string | null };
  coverImage: { large: string };
  meanScore: number | null;
  status: string;
  format: string;
  season: string | null;
  seasonYear: number | null;
  episodes: number | null;
  genres: string[];
  nextAiringEpisode?: { episode: number; airingAt: number } | null;
}

function AnimeGrid({ anime, section }: { anime: AniListMedia[]; section: string }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {anime.map((item) => {
        const title = item.title.english || item.title.romaji;
        const slug = `anilist-${item.id}`;
        return (
          <Link
            key={item.id}
            href={`/anime/${slug}`}
            className="bg-void-dark border border-void-gray/50 rounded-lg overflow-hidden hover:border-void-red/50 hover:translate-y-[-2px] transition-all group"
          >
            <div className="aspect-[3/4] bg-gradient-to-br from-void-crimson/20 to-void-dark relative overflow-hidden">
              {item.coverImage?.large && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.coverImage.large}
                  alt={title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              )}
              {item.meanScore && (
                <div className="absolute top-2 left-2 bg-black/70 text-yellow-400 text-[10px] px-1.5 py-0.5 rounded font-bold">
                  ★ {(item.meanScore / 10).toFixed(1)}
                </div>
              )}
              <div className="absolute top-2 right-2 bg-void-red/90 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">
                {section}
              </div>
            </div>
            <div className="p-2">
              <h3 className="font-semibold text-xs text-gray-300 group-hover:text-void-red transition-colors line-clamp-2 min-h-[2rem]">
                {title}
              </h3>
              <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-500">
                {item.seasonYear && <span>{item.seasonYear}</span>}
                {item.episodes && <span>• {item.episodes} ep</span>}
              </div>
              <div className="flex flex-wrap gap-0.5 mt-1">
                {item.genres.slice(0, 2).map((g) => (
                  <span key={g} className="text-[9px] bg-void-gray/30 text-gray-500 px-1 py-0.5 rounded">
                    {g}
                  </span>
                ))}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default async function Home() {
  const [trending, popular, topRated, upcoming, latestEpisodes, airingAnime, seasonAnime] = await Promise.all([
    getAniListTrending(),
    getAniListPopular(),
    getAniListTopRated(),
    getAniListUpcoming(),
    // Latest episodes from local DB
    prisma.episode.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { anime: { select: { id: true, title: true, slug: true, coverImage: true, status: true } } },
    }),
    // Currently airing from SeasonSchedule
    prisma.seasonSchedule.findMany({
      where: { status: "airing" },
      orderBy: { nextAirDate: "asc" },
      take: 12,
    }),
    // New this season from local DB
    prisma.anime.findMany({
      where: { season: getCurrentSeason().season, releaseYear: getCurrentSeason().year },
      orderBy: { rating: "desc" },
      take: 12,
      include: { genres: { include: { genre: true } } },
    }),
  ]);

  return (
    <div className="min-h-screen bg-void-black text-white">
      <Header />
      <BannerCarousel />

      {/* Trending Now */}
      {trending.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold brush-text">TRENDING <span className="text-void-red">NOW</span></h2>
              <p className="text-gray-500 text-xs mt-1">人気のアニメ</p>
            </div>
            <Link href="/browse" className="text-void-red text-sm hover:text-void-red-glow transition-colors">View All →</Link>
          </div>
          <AnimeGrid anime={trending} section="Trending" />
        </section>
      )}

      {/* Most Popular */}
      {popular.length > 0 && (
        <section className="container mx-auto px-4 py-12 border-t border-void-gray/20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold brush-text">MOST <span className="text-void-red">POPULAR</span></h2>
              <p className="text-gray-500 text-xs mt-1">一番人気</p>
            </div>
            <Link href="/browse?sort=popular" className="text-void-red text-sm hover:text-void-red-glow transition-colors">View All →</Link>
          </div>
          <AnimeGrid anime={popular} section="Popular" />
        </section>
      )}

      {/* Top Rated */}
      {topRated.length > 0 && (
        <section className="container mx-auto px-4 py-12 border-t border-void-gray/20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold brush-text">TOP <span className="text-void-red">RATED</span></h2>
              <p className="text-gray-500 text-xs mt-1">高評価アニメ</p>
            </div>
            <Link href="/browse?sort=rating" className="text-void-red text-sm hover:text-void-red-glow transition-colors">View All →</Link>
          </div>
          <AnimeGrid anime={topRated} section="Top" />
        </section>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section className="container mx-auto px-4 py-12 border-t border-void-gray/20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold brush-text">UPCOMING <span className="text-void-red">ANIME</span></h2>
              <p className="text-gray-500 text-xs mt-1">今後のアニメ</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {upcoming.map((item: AniListMedia) => {
              const title = item.title.english || item.title.romaji;
              return (
                <Link
                  key={item.id}
                  href={`/anime/anilist-${item.id}`}
                  className="bg-void-dark border border-void-gray/50 rounded-lg overflow-hidden hover:border-void-red/50 hover:translate-y-[-2px] transition-all group"
                >
                  <div className="aspect-[3/4] bg-gradient-to-br from-void-crimson/20 to-void-dark relative overflow-hidden">
                    {item.coverImage?.large && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.coverImage.large} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    )}
                    <div className="absolute top-2 right-2 bg-yellow-600/90 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">
                      Upcoming
                    </div>
                    {item.nextAiringEpisode && (
                      <div className="absolute bottom-2 left-2 bg-black/70 text-green-400 text-[10px] px-1.5 py-0.5 rounded">
                        Ep {item.nextAiringEpisode.episode} airing soon
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <h3 className="font-semibold text-xs text-gray-300 group-hover:text-void-red transition-colors line-clamp-2 min-h-[2rem]">
                      {title}
                    </h3>
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-500">
                      {item.season && <span>{item.season}</span>}
                      {item.seasonYear && <span>{item.seasonYear}</span>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Latest Episodes from Local DB */}
      {latestEpisodes.length > 0 && (
        <section className="container mx-auto px-4 py-12 border-t border-void-gray/20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold brush-text">LATEST <span className="text-void-red">EPISODES</span></h2>
              <p className="text-gray-500 text-xs mt-1">最新のエピソード</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {latestEpisodes.map((ep) => (
              <Link
                key={ep.id}
                href={`/watch/${ep.anime.slug}/${ep.number}`}
                className="bg-void-dark border border-void-gray/50 rounded-lg overflow-hidden hover:border-void-red/50 hover:translate-y-[-2px] transition-all group"
              >
                <div className="aspect-[3/4] bg-gradient-to-br from-void-crimson/20 to-void-dark relative overflow-hidden">
                  {ep.anime.coverImage && (
                    <img src={ep.anime.coverImage} alt={ep.anime.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  )}
                  <div className="absolute top-2 right-2 bg-void-red/90 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">
                    Ep {ep.number}
                  </div>
                </div>
                <div className="p-2">
                  <h3 className="font-semibold text-xs text-gray-300 group-hover:text-void-red transition-colors line-clamp-2">
                    {ep.anime.title}
                  </h3>
                  <div className="text-[10px] text-gray-500 mt-1">
                    {ep.createdAt ? new Date(ep.createdAt).toLocaleDateString() : ""}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Currently Airing */}
      {airingAnime.length > 0 && (
        <section className="container mx-auto px-4 py-12 border-t border-void-gray/20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold brush-text">CURRENTLY <span className="text-void-red">AIRING</span></h2>
              <p className="text-gray-500 text-xs mt-1">放送中</p>
            </div>
            <Link href="/season" className="text-void-red text-sm hover:text-void-red-glow transition-colors">View All →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {airingAnime.map((item) => (
              <div key={item.id} className="bg-void-dark border border-void-gray/50 rounded-lg p-4 hover:border-void-red/50 transition-all">
                <h3 className="font-semibold text-sm text-gray-200 line-clamp-2">{item.animeTitle}</h3>
                <div className="text-xs text-gray-500 mt-1">{item.season} {item.year}</div>
                {item.airDay && <div className="text-xs text-green-400 mt-1">Airs {item.airDay}</div>}
                {item.nextAirDate && (
                  <div className="text-xs text-blue-400 mt-1">
                    Ep {item.nextEpisode} in {Math.ceil((item.nextAirDate.getTime() - Date.now()) / 86400000)}d
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* New This Season */}
      {seasonAnime.length > 0 && (
        <section className="container mx-auto px-4 py-12 border-t border-void-gray/20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold brush-text">NEW THIS <span className="text-void-red">SEASON</span></h2>
              <p className="text-gray-500 text-xs mt-1">{getCurrentSeason().season} {getCurrentSeason().year}</p>
            </div>
            <Link href={`/season/${getCurrentSeason().season.toLowerCase()}?year=${getCurrentSeason().year}`} className="text-void-red text-sm hover:text-void-red-glow transition-colors">View All →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {seasonAnime.map((anime) => (
              <Link
                key={anime.id}
                href={`/anime/${anime.slug}`}
                className="bg-void-dark border border-void-gray/50 rounded-lg overflow-hidden hover:border-void-red/50 hover:translate-y-[-2px] transition-all group"
              >
                <div className="aspect-[3/4] bg-gradient-to-br from-void-crimson/20 to-void-dark relative overflow-hidden">
                  {anime.coverImage && (
                    <img src={anime.coverImage} alt={anime.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  )}
                  {anime.rating && (
                    <div className="absolute top-2 right-2 bg-black/70 px-1.5 py-0.5 rounded text-[10px] font-bold text-yellow-400">
                      {anime.rating.toFixed(1)}
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <h3 className="font-semibold text-xs text-gray-300 group-hover:text-void-red transition-colors line-clamp-2">
                    {anime.title}
                  </h3>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {anime.genres.slice(0, 2).map((g) => (
                      <span key={g.genreId} className="text-[10px] px-1 py-0.5 rounded bg-void-gray/30 text-gray-400">
                        {g.genre.name}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="relative py-16">
        <div className="absolute inset-0 bg-gradient-to-r from-void-crimson/20 via-void-red/10 to-transparent" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h2 className="text-3xl font-bold mb-3 brush-text">ENTER THE <span className="text-void-red">VOID</span></h2>
          <p className="text-gray-400 mb-6 max-w-lg mx-auto text-sm">Join thousands of anime fans. Search 5000+ anime, create watchlists, and start watching today.</p>
          <Link href="/browse" className="inline-block bg-void-red px-8 py-3 rounded font-bold text-white hover:bg-void-red-dark transition-colors">START BROWSING</Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
