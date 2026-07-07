"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import Header from "@/components/Header";
import { AnimeCard } from "@/components/AnimeCard";

interface Anime {
  id: string;
  title: string;
  slug: string;
  coverImage: string | null;
  rating: number | null;
  releaseYear: number;
  status: string;
  genres: { genre: { name: string } }[];
}

export default function GenreDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [anime, setAnime] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/anime?genre=${slug}`)
      .then((r) => r.json())
      .then((data) => setAnime(data.anime || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  const genreName = slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  return (
    <div className="min-h-screen bg-void-black text-white">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">
          {genreName.toUpperCase()} <span className="text-void-red">ANIME</span>
        </h1>
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {anime.map((item) => (
              <AnimeCard key={item.id} id={item.id} title={item.title} slug={item.slug} rating={item.rating} releaseYear={item.releaseYear} status={item.status} genres={item.genres.map((ag) => ag.genre.name)} />
            ))}
          </div>
        )}
        {!loading && anime.length === 0 && (
          <div className="text-center py-12 text-gray-500">No anime found for this genre.</div>
        )}
      </div>
    </div>
  );
}
