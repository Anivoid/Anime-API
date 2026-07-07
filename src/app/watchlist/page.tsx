"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Link from "next/link";

interface WatchlistItem {
  id: string;
  animeId: string;
  createdAt: string;
  anime: {
    id: string;
    title: string;
    slug: string;
    coverImage: string | null;
    status: string;
    _count: { episodes: number };
  };
}

export default function WatchlistPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/watchlist")
        .then((r) => r.json())
        .then(setWatchlist)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [status]);

  const removeFromWatchlist = async (animeId: string) => {
    try {
      await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ animeId }),
      });
      setWatchlist(watchlist.filter((item) => item.animeId !== animeId));
    } catch (error) {
      console.error("Error removing from watchlist:", error);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-void-black text-white">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-void-black text-white">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">
            MY <span className="text-void-red">WATCHLIST</span>
          </h1>
          <span className="text-gray-500">{watchlist.length} anime</span>
        </div>

        <div className="space-y-4">
          {watchlist.map((item) => (
            <div key={item.id} className="bg-void-dark border border-void-gray/50 rounded-lg p-4 flex items-center gap-4 hover:border-void-red/30 transition-all">
              <Link href={`/anime/${item.anime.slug}`} className="w-16 h-24 bg-void-gray rounded overflow-hidden flex-shrink-0">
                <div className="w-full h-full bg-gradient-to-br from-void-crimson/30 to-void-dark" />
              </Link>
              <div className="flex-1">
                <Link href={`/anime/${item.anime.slug}`} className="font-semibold hover:text-void-red transition-colors">
                  {item.anime.title}
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded ${item.anime.status === "ONGOING" ? "bg-void-red/20 text-void-red" : "bg-void-gray text-gray-400"}`}>
                    {item.anime.status}
                  </span>
                  <span className="text-sm text-gray-500">{item.anime._count.episodes} episodes</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/anime/${item.anime.slug}`} className="bg-void-gray px-4 py-2 rounded hover:bg-void-red/20 transition-colors text-sm text-gray-300">
                  View
                </Link>
                <button onClick={() => removeFromWatchlist(item.animeId)} className="bg-void-red/10 text-void-red px-4 py-2 rounded hover:bg-void-red/20 transition-colors text-sm">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {watchlist.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-4">Your watchlist is empty</p>
            <Link href="/browse" className="inline-block bg-void-red px-6 py-3 rounded-lg font-semibold hover:bg-void-red-dark transition-all glow-red">
              Browse Anime
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
