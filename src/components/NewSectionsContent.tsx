"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface AnimeItem {
  id: number;
  title: string;
  slug: string;
  coverImage: string | null;
  format: string;
  season: string | null;
  seasonYear: number | null;
  episodes: number | null;
  currentEpisode?: number;
  averageScore: number | null;
  genres: string[];
}

function ListItem({ anime, href, showEpisode }: { anime: AnimeItem; href: string; showEpisode?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-3 group">
      <div className="w-12 h-16 rounded overflow-hidden bg-[#1a1a2e] flex-shrink-0 relative">
        {anime.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={anime.coverImage} alt={anime.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/10 text-xs">?</div>
        )}
        {showEpisode && anime.currentEpisode && (
          <div className="absolute top-0 right-0 bg-purple-600/90 text-white text-[8px] px-1 rounded-bl font-bold">
            EP {anime.currentEpisode}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm text-gray-200 group-hover:text-purple-400 transition-colors line-clamp-1">
          {anime.title}
        </h4>
        <div className="flex items-center gap-1.5 mt-0.5 text-[10px]">
          {anime.averageScore && <span className="text-green-400 font-bold">{anime.averageScore}%</span>}
          {anime.format && <span className="text-gray-500">• {anime.format}</span>}
          <span className="text-gray-600">• {anime.seasonYear}</span>
        </div>
        {anime.genres.length > 0 && (
          <div className="flex gap-1 mt-0.5">
            {anime.genres.slice(0, 2).map((g) => (
              <span key={g} className="text-[8px] bg-white/5 text-gray-500 px-1 rounded">{g}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

export function NewSectionsContent() {
  const [recent, setRecent] = useState<AnimeItem[]>([]);
  const [popular, setPopular] = useState<AnimeItem[]>([]);
  const [completed, setCompleted] = useState<AnimeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/anilist-homepage?section=all")
      .then((res) => res.json())
      .then((data) => {
        setRecent(data.recent || []);
        setPopular(data.popular || []);
        setCompleted(data.completed || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
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
        {/* Currently Airing */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Currently Airing</h2>
            <Link href="/browse?status=RELEASING" className="text-purple-400 text-xs hover:text-purple-300 transition-colors">
              →
            </Link>
          </div>
          <div className="space-y-3">
            {recent.map((anime) => (
              <ListItem key={anime.id} anime={anime} href={`/anime/${anime.slug}`} showEpisode />
            ))}
          </div>
        </div>

        {/* Most Popular */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Most Popular</h2>
            <Link href="/browse?sort=popular" className="text-purple-400 text-xs hover:text-purple-300 transition-colors">
              →
            </Link>
          </div>
          <div className="space-y-3">
            {popular.map((anime) => (
              <ListItem key={anime.id} anime={anime} href={`/anime/${anime.slug}`} />
            ))}
          </div>
        </div>

        {/* Recently Completed */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Recently Completed</h2>
            <Link href="/browse?status=FINISHED" className="text-purple-400 text-xs hover:text-purple-300 transition-colors">
              →
            </Link>
          </div>
          <div className="space-y-3">
            {completed.map((anime) => (
              <ListItem key={anime.id} anime={anime} href={`/anime/${anime.slug}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
