"use client";

import { useState, useEffect } from "react";
import { LatestEpisodeCard } from "./LatestEpisodeCard";

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

export function LatestEpisodesSection() {
  const [episodes, setEpisodes] = useState<EpisodeWithAnime[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/episodes?mode=latest&limit=200")
      .then((res) => res.json())
      .then((data: EpisodeWithAnime[]) => {
        setEpisodes(data.slice(0, 18));
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
        {episodes.map((ep) => (
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
    </>
  );
}
