"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AnimeCard } from "@/components/AnimeCard";

interface Recommendation {
  id: string;
  title: string;
  slug: string;
  coverImage: string | null;
  rating: number | null;
  releaseYear: number;
  status: string;
  genres: { genre: { name: string } }[];
  score?: number;
}

export function Recommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/recommendations")
      .then((r) => r.json())
      .then((data) => {
        setRecommendations(data.recommendations || []);
        setSource(data.source || "");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || recommendations.length === 0) return null;

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">
            {source === "personalized" ? (
              <>RECOMMENDED <span className="text-void-red">FOR YOU</span></>
            ) : (
              <>POPULAR <span className="text-void-red">ANIME</span></>
            )}
          </h2>
          <Link href="/browse" className="text-void-red text-sm hover:text-void-red-glow transition-colors">
            View All →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {recommendations.slice(0, 6).map((item, i) => (
            <div key={item.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
              <AnimeCard
                id={item.id}
                title={item.title}
                slug={item.slug}
                coverImage={item.coverImage}
                rating={item.rating}
                releaseYear={item.releaseYear}
                status={item.status}
                genres={item.genres.map((g) => g.genre.name)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
