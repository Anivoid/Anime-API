"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import Image from "next/image";
import { WatchlistButton } from "@/components/WatchlistButton";
import { LikeButton } from "@/components/LikeButton";
import { AddToCollection } from "@/components/AddToCollection";
import { CommentSection } from "@/components/CommentSection";
import { Rating } from "@/components/Rating";

interface Anime {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  bannerImage: string | null;
  rating: number | null;
  releaseYear: number;
  status: string;
  type: string;
  season: string | null;
  genres: { genre: { name: string; slug: string } }[];
  episodes: {
    id: string;
    number: number;
    title: string | null;
    duration: number | null;
  }[];
  similar?: {
    id: string;
    title: string;
    slug: string;
    coverImage: string | null;
    rating: number | null;
    releaseYear: number;
    genres: { genre: { name: string } }[];
  }[];
  totalEpisodeCount?: number;
  airedEpisodeCount?: number;
  _count: {
    animeLikes: number;
    comments: number;
  };
}

export default function AnimeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [anime, setAnime] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnime = async () => {
      try {
        const res = await fetch(`/api/anime/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setAnime(data);
          return;
        }

        // If not found locally and slug starts with anilist-, fetch from AniList
        if (slug.startsWith("anilist-")) {
          const anilistId = parseInt(slug.replace("anilist-", ""));
          const query = `query ($id: Int) {
            Media(id: $id, type: ANIME) {
              id
              title { romaji english native }
              coverImage { large }
              bannerImage
              description(asHtml: false)
              meanScore
              status format season seasonYear episodes duration
              genres
              nextAiringEpisode { episode airingAt }
              studios { edges { node { name } isMain } }
            }
          }`;
          const anilistRes = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ query, variables: { id: anilistId } }),
          });
          if (anilistRes.ok) {
            const { data } = await anilistRes.json();
            const m = data?.Media;
            if (m) {
              const statusMap: Record<string, string> = { FINISHED: "COMPLETED", RELEASING: "ONGOING", NOT_YET_RELEASED: "UPCOMING", CANCELLED: "COMPLETED" };
              const airedEpisodes = m.status === "RELEASING"
                ? (m.nextAiringEpisode?.episode || 1) - 1
                : (m.episodes || 0);
              const totalEpisodes = m.episodes || airedEpisodes || 0;
              setAnime({
                id: slug,
                title: m.title.english || m.title.romaji,
                slug,
                description: m.description?.replace(/<[^>]*>/g, ""),
                coverImage: m.coverImage?.large,
                bannerImage: m.bannerImage,
                rating: m.meanScore ? m.meanScore / 10 : null,
                releaseYear: m.seasonYear || new Date().getFullYear(),
                status: statusMap[m.status] || "ONGOING",
                type: m.format || "TV",
                season: m.season,
                genres: (m.genres || []).map((g: string) => ({ genre: { name: g, slug: g.toLowerCase().replace(/\s+/g, "-") } })),
                episodes: Array.from({ length: airedEpisodes || totalEpisodes }, (_, i) => ({ id: `${slug}-ep-${i + 1}`, number: i + 1, title: `Episode ${i + 1}`, duration: m.duration || 24 })),
                totalEpisodeCount: totalEpisodes,
                airedEpisodeCount: airedEpisodes,
                similar: [],
                _count: { animeLikes: 0, comments: 0 },
              });
            }
          }
        }
      } catch (error) {
        console.error("Error fetching anime:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnime();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-void-black text-white">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="min-h-screen bg-void-black text-white">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center text-gray-500">Anime not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void-black text-white">
      <Header />

      {/* Banner */}
      <div className="relative h-[400px] bg-void-dark overflow-hidden">
        {anime.bannerImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={anime.bannerImage} alt="" className="w-full h-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-void-black via-void-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-void-black/80 to-transparent" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 -mt-48 relative z-10">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Cover Image */}
          <div className="w-48 flex-shrink-0">
            <div className="aspect-[3/4] bg-void-dark border border-void-gray/50 rounded-lg overflow-hidden shadow-xl">
              {anime.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={anime.coverImage} alt={anime.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-void-crimson to-void-dark flex items-center justify-center text-void-red/30 text-4xl font-black">
                  {anime.title.charAt(0)}
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-4">{anime.title}</h1>

            <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
              <Rating animeId={anime.id} initialAverage={anime.rating} />
              <span className="text-gray-500">{anime.releaseYear}</span>
              <span className="text-gray-500">{anime.type}</span>
              <span
                className={`px-3 py-1 rounded ${
                  anime.status === "ONGOING"
                    ? "bg-green-600"
                    : anime.status === "COMPLETED"
                    ? "bg-blue-600"
                    : "bg-yellow-600"
                }`}
              >
                {anime.status}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {anime.genres.map((ag) => (
                <Link
                  key={ag.genre.slug}
                  href={`/genres/${ag.genre.slug}`}
                  className="bg-void-dark border border-void-gray/50 px-3 py-1 rounded text-sm hover:bg-void-red/20 hover:border-void-red/50 transition-all"
                >
                  {ag.genre.name}
                </Link>
              ))}
            </div>

            <p className="text-gray-400 mb-6 leading-relaxed">
              {anime.description}
            </p>

            <div className="flex items-center gap-4 mb-6">
              {anime.episodes.length > 0 && (
                <Link
                  href={`/watch/${slug}/${anime.episodes[0].number}`}
                  className="bg-void-red px-8 py-3 rounded-lg font-semibold hover:bg-void-red-dark transition-all glow-red"
                >
                  Watch Now
                </Link>
              )}
              <WatchlistButton animeId={anime.id} />
              <LikeButton animeId={anime.id} />
              <AddToCollection animeId={anime.id} />
            </div>

            <div className="text-sm text-gray-500">
              {anime.totalEpisodeCount && anime.airedEpisodeCount !== undefined && anime.totalEpisodeCount !== anime.airedEpisodeCount
                ? `${anime.airedEpisodeCount}/${anime.totalEpisodeCount} episodes aired`
                : `${anime.episodes.length} episodes`
              } • {anime._count.animeLikes} likes • {anime._count.comments} comments
            </div>
          </div>
        </div>

        {/* Episodes */}
        {anime.episodes.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">
              Episodes <span className="text-void-red">
                ({anime.totalEpisodeCount && anime.airedEpisodeCount !== undefined && anime.totalEpisodeCount !== anime.airedEpisodeCount
                  ? `${anime.airedEpisodeCount}/${anime.totalEpisodeCount}`
                  : anime.episodes.length})
              </span>
            </h2>
            <div className="space-y-2">
              {anime.episodes.map((episode) => (
                <Link
                  key={episode.id}
                  href={`/watch/${slug}/${episode.number}`}
                  className="flex items-center gap-4 bg-void-dark border border-void-gray/50 hover:border-void-red/50 hover:bg-void-red/5 p-4 rounded-lg transition-all group"
                >
                  <div className="w-8 text-center text-gray-500 font-mono">
                    {episode.number}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-300 group-hover:text-void-red transition-colors">
                      {episode.title || `Episode ${episode.number}`}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {episode.duration ? `${episode.duration} min` : "N/A"}
                    </p>
                  </div>
                  <div className="text-void-red opacity-0 group-hover:opacity-100 transition-opacity">▶</div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Comments */}
      <div className="container mx-auto px-4 py-12">
        <CommentSection animeId={anime.id} />
      </div>

      {/* Related Anime */}
      {/* Similar Anime */}
      {anime.similar && anime.similar.length > 0 && (
        <div className="container mx-auto px-4 py-8">
          <h2 className="text-2xl font-bold mb-6">
            Similar <span className="text-void-red">Anime</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {anime.similar.map((item) => (
              <Link
                key={item.id}
                href={`/anime/${item.slug}`}
                className="bg-void-dark border border-void-gray/50 rounded-lg overflow-hidden hover:border-void-red/50 hover:translate-y-[-2px] transition-all group"
              >
                <div className="aspect-[3/4] bg-gradient-to-br from-void-crimson/30 to-void-dark relative">
                  {item.coverImage ? (
                    <Image src={item.coverImage} alt={item.title} unoptimized className="w-full h-full object-cover" width={300} height={450} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-void-red/30 text-4xl font-black">
                      {item.title.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm text-gray-300 group-hover:text-void-red transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    ★ {item.rating || "N/A"} • {item.releaseYear}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.genres.slice(0, 2).map((g) => (
                      <span key={g.genre.name} className="text-[10px] bg-void-gray/30 text-gray-500 px-1.5 py-0.5 rounded">
                        {g.genre.name}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
