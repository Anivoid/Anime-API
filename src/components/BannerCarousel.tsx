"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface BannerAnime {
  id: number;
  title: string;
  slug: string;
  coverImage: string;
  bannerImage: string | null;
  format: string;
  season: string | null;
  seasonYear: number | null;
  episodes: number | null;
  averageScore: number | null;
  genres: string[];
  description: string | null;
}

export function BannerCarousel() {
  const [banners, setBanners] = useState<BannerAnime[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const query = `query {
      Page(page: 1, perPage: 5) {
        media(sort: SCORE_DESC, type: ANIME, isAdult: false) {
          id
          title { romaji english }
          coverImage { large }
          bannerImage
          format
          season
          seasonYear
          episodes
          averageScore
          genres
          description(asHtml: false)
        }
      }
    }`;

    fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query }),
      next: { revalidate: 600 },
    })
      .then((r) => r.json())
      .then((data) => {
        const media = data?.data?.Page?.media || [];
        setBanners(
          media.map((m: Record<string, unknown>) => {
            const title = (m.title as { romaji: string; english: string | null }).english || (m.title as { romaji: string }).romaji;
            return {
              id: m.id as number,
              title,
              slug: `anilist-${m.id}`,
              coverImage: (m.coverImage as { large: string }).large,
              bannerImage: (m.bannerImage as string | null) || null,
              format: m.format as string,
              season: m.season as string | null,
              seasonYear: m.seasonYear as number | null,
              episodes: m.episodes as number | null,
              averageScore: m.averageScore as number | null,
              genres: (m.genres as string[]) || [],
              description: (m.description as string | null)?.replace(/<[^>]*>/g, "")?.slice(0, 200) || null,
            };
          })
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % banners.length);
  }, [banners.length]);

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + banners.length) % banners.length);
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [banners.length, next]);

  if (loading || banners.length === 0) {
    return (
      <section className="relative h-[450px] bg-[#0d0d1a] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-transparent to-purple-900/20 animate-pulse" />
        <div className="container mx-auto px-4 h-full flex items-center relative z-10">
          <div className="max-w-2xl">
            <div className="h-16 bg-white/5 rounded w-3/4 mb-4 animate-pulse" />
            <div className="h-6 bg-white/5 rounded w-1/2 mb-6 animate-pulse" />
            <div className="flex gap-3">
              <div className="h-12 w-36 bg-purple-600/30 rounded-lg animate-pulse" />
              <div className="h-12 w-28 bg-white/5 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  const banner = banners[current];

  return (
    <section className="relative h-[450px] bg-[#0d0d1a] overflow-hidden">
      {/* Background image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={banner.bannerImage || banner.coverImage}
        alt={banner.title}
        className="absolute inset-0 w-full h-full object-cover opacity-30"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0d0d1a] via-[#0d0d1a]/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d1a] via-transparent to-[#0d0d1a]/50" />

      <div className="container mx-auto px-4 h-full flex items-center relative z-10">
        <div className="max-w-2xl animate-fade-in-up">
          <div className="flex items-center gap-2 mb-3">
            {banner.averageScore && (
              <span className="bg-green-600/90 text-white text-xs px-2 py-1 rounded font-bold">
                {banner.averageScore}%
              </span>
            )}
            {banner.format && (
              <span className="bg-white/10 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">{banner.format}</span>
            )}
            {banner.season && banner.seasonYear && (
              <span className="bg-white/10 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">
                {banner.season.charAt(0) + banner.season.slice(1).toLowerCase()} {banner.seasonYear}
              </span>
            )}
          </div>
          <h1 className="text-5xl md:text-6xl font-black mb-3 leading-tight text-white">
            {banner.title}
          </h1>
          {banner.description && (
            <p className="text-sm text-gray-300 mb-4 line-clamp-2">{banner.description}</p>
          )}
          {banner.genres.length > 0 && (
            <div className="flex gap-2 mb-4 flex-wrap">
              {banner.genres.slice(0, 4).map((g) => (
                <span key={g} className="text-xs bg-white/10 text-gray-300 px-2 py-1 rounded">{g}</span>
              ))}
            </div>
          )}
          <div className="flex gap-3">
            <Link
              href={`/anime/${banner.slug}`}
              className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-bold text-white transition-colors flex items-center gap-2"
            >
              <span className="text-lg">▶</span> PLAY NOW
            </Link>
            <Link
              href="/browse"
              className="border border-white/20 hover:border-white/40 px-6 py-3 rounded-lg font-bold text-gray-300 hover:text-white transition-colors"
            >
              BROWSE
            </Link>
          </div>
        </div>
      </div>

      {banners.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors z-20"
          >
            &#8249;
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors z-20"
          >
            &#8250;
          </button>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {banners.map((b, i) => (
              <button
                key={b.id}
                onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all ${
                  i === current ? "bg-purple-500 w-8" : "bg-white/30 hover:bg-white/50 w-2"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
