"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { useSession } from "next-auth/react";
import Header from "@/components/Header";
import Link from "next/link";
import { AnimeCard } from "@/components/AnimeCard";

interface CollectionDetail {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  userId: string;
  user: { name: string | null; username: string | null };
  items: {
    id: string;
    addedAt: string;
    anime: {
      id: string;
      title: string;
      slug: string;
      coverImage: string | null;
      rating: number | null;
      releaseYear: number;
      status: string;
      genres: { genre: { name: string } }[];
    };
  }[];
}

export default function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/collections?userId=${session?.user?.id || ""}`)
      .then((r) => r.json())
      .then((data) => {
        const found = Array.isArray(data) ? data.find((c: CollectionDetail) => c.id === id) : null;
        if (found) setCollection(found);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, session]);

  const handleRemove = async (animeId: string) => {
    setRemoving(animeId);
    try {
      await fetch("/api/collections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, removeAnimeId: animeId }),
      });
      setCollection((prev) =>
        prev ? { ...prev, items: prev.items.filter((item) => item.anime.id !== animeId) } : prev
      );
    } finally {
      setRemoving(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-void-black text-white">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen bg-void-black text-white">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-4xl font-black text-void-red mb-4">COLLECTION NOT FOUND</h1>
          <Link href="/collections" className="text-void-red hover:text-void-red-glow">
            ← Back to Collections
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = session?.user?.id === collection.userId;

  return (
    <div className="min-h-screen bg-void-black text-white">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <Link href="/collections" className="text-void-red text-sm hover:text-void-red-glow mb-6 inline-block">
          ← Back to Collections
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-black">{collection.title}</h1>
          {collection.description && <p className="text-gray-400 mt-2">{collection.description}</p>}
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
            <span>{collection.items.length} anime</span>
            <span>by @{collection.user.username || collection.user.name}</span>
            <span>{new Date(collection.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {collection.items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">This collection is empty</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {collection.items.map((item, i) => (
              <div key={item.id} className="relative group animate-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
                <AnimeCard
                  id={item.anime.id}
                  title={item.anime.title}
                  slug={item.anime.slug}
                  rating={item.anime.rating}
                  releaseYear={item.anime.releaseYear}
                  status={item.anime.status}
                  genres={item.anime.genres.map((g) => g.genre.name)}
                />
                {isOwner && (
                  <button
                    onClick={() => handleRemove(item.anime.id)}
                    disabled={removing === item.anime.id}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-600/80 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
