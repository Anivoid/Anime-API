import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BannerCarousel } from "@/components/BannerCarousel";
import Link from "next/link";
import { TopAnimeSidebar } from "@/components/TopAnimeSidebar";
import { ScheduleWidget } from "@/components/ScheduleWidget";
import { LatestEpisodesSection } from "@/components/HomepageContent";
import { NewSectionsContent } from "@/components/NewSectionsContent";

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
  const trending = await getAniListTrending();

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-white">
      <Header />
      <BannerCarousel />

      {/* Latest Episode + Top Anime Sidebar */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <LatestEpisodesSection />
          </div>
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
      <NewSectionsContent />

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
