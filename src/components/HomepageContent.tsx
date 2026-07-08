"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface EpisodeItem {
  id: number;
  title: string;
  slug: string;
  coverImage: string | null;
  format: string;
  season: string | null;
  seasonYear: number | null;
  totalEpisodes: number | null;
  episodeNumber: number;
  nextAiringAt: number | null;
  timeUntilAiring: number | null;
  averageScore: number | null;
  genres: string[];
  type: string;
}

function formatTimeUntil(seconds: number): string {
  if (seconds < 60) return "Airing now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function EpisodeCard({ item }: { item: EpisodeItem }) {
  const title = item.title;
  return (
    <Link href={`/anime/${item.slug}`} className="group block">
      <div className="relative aspect-[3/4] bg-[#1a1a2e] rounded overflow-hidden mb-2 border border-white/5 group-hover:border-purple-500/50 transition-all duration-200">
        {item.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.coverImage} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute top-2 left-2 z-10">
          <span className="bg-black/70 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded font-medium">{item.format}</span>
        </div>
        <div className="absolute top-2 right-2 z-10">
          <span className="bg-purple-600/90 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
            EP {item.episodeNumber}
          </span>
        </div>
        {item.timeUntilAiring !== null && item.timeUntilAiring > 0 && (
          <div className="absolute bottom-2 left-2 z-10">
            <span className="bg-orange-500/90 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
              {formatTimeUntil(item.timeUntilAiring)}
            </span>
          </div>
        )}
        {item.nextAiringAt !== null && (
          <div className="absolute bottom-2 right-2 z-10">
            <span className="bg-green-600/90 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">LIVE</span>
          </div>
        )}
      </div>
      <h3 className="font-semibold text-gray-200 group-hover:text-purple-400 transition-colors duration-200 line-clamp-2 text-sm leading-tight">
        {title}
      </h3>
      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-500">
        {item.seasonYear && <span>{item.seasonYear}</span>}
        {item.totalEpisodes && <span>• {item.totalEpisodes} ep</span>}
        {item.averageScore && <span className="text-green-400">• {item.averageScore}%</span>}
      </div>
      {item.genres.length > 0 && (
        <div className="flex gap-1 mt-1 flex-wrap">
          {item.genres.slice(0, 2).map((g) => (
            <span key={g} className="text-[9px] bg-white/5 text-gray-400 px-1 py-0.5 rounded">{g}</span>
          ))}
        </div>
      )}
    </Link>
  );
}

export function LatestEpisodesSection() {
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/anilist-homepage?section=episodes")
      .then((res) => res.json())
      .then((data) => {
        setEpisodes(data.episodes || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Latest Episode</h2>
          <div className="flex gap-2">
            {["All", "Sub", "Dub", "Trending"].map((tab) => (
              <div key={tab} className="text-xs px-3 py-1.5 rounded bg-white/5 h-6 w-12 animate-pulse" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[3/4] bg-[#1a1a2e] rounded mb-2" />
              <div className="h-3 bg-[#1a1a2e] rounded w-2/3" />
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
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
        {episodes.map((item) => (
          <EpisodeCard key={item.id} item={item} />
        ))}
      </div>
    </>
  );
}
