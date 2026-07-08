"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface EpisodeWithAnime {
  id: string;
  number: number;
  animeId: string;
  anime: {
    id: string;
    title: string;
    slug: string;
    coverImage: string | null;
    type: string | null;
    subCount: number | null;
    dubCount: number | null;
    releaseYear: number | null;
    status: string | null;
  };
}

interface AnimeItem {
  id: string;
  title: string;
  slug: string;
  coverImage: string | null;
  subCount: number | null;
  dubCount: number | null;
  type: string | null;
  releaseYear: number | null;
}

function AnimeListItem({ anime, href }: { anime: AnimeItem; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 group">
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
          {anime.dubCount !== null && anime.dubCount > 0 && (
            <span className="bg-yellow-500/80 text-black px-1 rounded font-bold">DUB {anime.dubCount}</span>
          )}
          {anime.type && <span className="text-gray-500">• {anime.type}</span>}
          <span className="text-gray-600">• {anime.releaseYear}</span>
        </div>
      </div>
    </Link>
  );
}

export function NewSectionsContent() {
  const [newReleases, setNewReleases] = useState<EpisodeWithAnime[]>([]);
  const [newAdded, setNewAdded] = useState<AnimeItem[]>([]);
  const [justCompleted, setJustCompleted] = useState<AnimeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [episodesRes, animeRes, completedRes] = await Promise.all([
          fetch("/api/episodes?mode=latest&limit=50"),
          fetch("/api/anime?limit=6&sort=new"),
          fetch("/api/anime?status=COMPLETED&limit=6&sort=new"),
        ]);

        if (episodesRes.ok) {
          const episodes: EpisodeWithAnime[] = await episodesRes.json();
          const seen = new Set<string>();
          const deduped = episodes.filter((ep) => {
            if (seen.has(ep.animeId)) return false;
            seen.add(ep.animeId);
            return true;
          }).slice(0, 6);
          setNewReleases(deduped);
        }

        if (animeRes.ok) {
          const data = await animeRes.json();
          setNewAdded((data.anime || []).slice(0, 6));
        }

        if (completedRes.ok) {
          const data = await completedRes.json();
          setJustCompleted((data.anime || []).slice(0, 6));
        }
      } catch (error) {
        console.error("Failed to fetch new sections:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <section className="container mx-auto px-4 py-8 border-t border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-5 bg-[#1a1a2e] rounded w-1/3 animate-pulse" />
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3 animate-pulse">
                  <div className="w-12 h-16 bg-[#1a1a2e] rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-[#1a1a2e] rounded w-2/3" />
                    <div className="h-2 bg-[#1a1a2e] rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
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
              <AnimeListItem key={anime.id} anime={anime} href={`/anime/${anime.slug}`} />
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
              <AnimeListItem key={anime.id} anime={anime} href={`/anime/${anime.slug}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
