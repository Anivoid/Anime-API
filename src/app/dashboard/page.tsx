"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Recommendations } from "@/components/Recommendations";
import Link from "next/link";

interface WatchHistoryItem {
  id: string;
  progress: number;
  position: number;
  duration: number;
  completed: boolean;
  watchedAt: string;
  episode: {
    id: string;
    number: number;
    title: string | null;
    anime: {
      id: string;
      title: string;
      slug: string;
    };
  };
}

interface DashboardStats {
  animeWatched: number;
  episodesWatched: number;
  hoursWatched: number;
  watchlistCount: number;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    animeWatched: 0,
    episodesWatched: 0,
    hoursWatched: 0,
    watchlistCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      Promise.all([
        fetch("/api/watch-history").then((r) => r.json()),
        fetch("/api/watchlist").then((r) => r.json()),
      ])
        .then(([history, watchlist]) => {
          setWatchHistory(history);
          const uniqueAnime = new Set(history.map((h: WatchHistoryItem) => h.episode.anime.id));
          const completed = history.filter((h: WatchHistoryItem) => h.completed);
          setStats({
            animeWatched: uniqueAnime.size,
            episodesWatched: completed.length,
            hoursWatched: Math.round((completed.length * 24) / 60),
            watchlistCount: watchlist.length,
          });
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-void-black text-white">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const continueWatching = watchHistory
    .filter((h) => !h.completed && h.progress > 0)
    .reduce((acc: WatchHistoryItem[], current) => {
      if (!acc.find((h) => h.episode.anime.id === current.episode.anime.id)) {
        acc.push(current);
      }
      return acc;
    }, [])
    .slice(0, 8);

  const formatTime = (seconds: number) => {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-void-black text-white">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Banner */}
        <div className="relative rounded-lg p-8 mb-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-void-crimson/30 via-void-red/20 to-transparent" />
          <div className="absolute inset-0 bg-void-dark/50" />
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, <span className="text-void-red">{session.user?.name || "User"}</span>
            </h1>
            <p className="text-gray-400">Continue watching your favorite anime series.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: "Anime Watched", value: stats.animeWatched },
            { label: "Episodes", value: stats.episodesWatched },
            { label: "Hours", value: stats.hoursWatched },
            { label: "Watchlist", value: stats.watchlistCount },
          ].map((stat) => (
            <div key={stat.label} className="bg-void-dark border border-void-gray/50 rounded-lg p-6">
              <p className="text-gray-500 text-sm mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-void-red">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Continue Watching */}
        {continueWatching.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                CONTINUE <span className="text-void-red">WATCHING</span>
              </h2>
              <Link href="/browse" className="text-void-red text-sm hover:text-void-red-glow transition-colors">
                View All →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {continueWatching.map((item) => {
                const remaining = item.duration && item.position
                  ? Math.ceil((item.duration - item.position) / 60)
                  : null;
                return (
                  <Link
                    key={item.id}
                    href={`/watch/${item.episode.anime.slug}/${item.episode.number}`}
                    className="bg-void-dark border border-void-gray/50 rounded-lg overflow-hidden hover:border-void-red/50 hover:translate-y-[-2px] transition-all group"
                  >
                    <div className="aspect-video bg-void-gray relative">
                      <div className="absolute inset-0 bg-gradient-to-t from-void-black/80 via-transparent to-transparent" />
                      {/* Play icon */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-10 h-10 bg-void-red/80 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                        <div className="h-full bg-void-red transition-all" style={{ width: `${item.progress}%` }} />
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-void-red transition-colors">
                        {item.episode.anime.title}
                      </h3>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-500">
                          Ep {item.episode.number}
                          {item.episode.title ? ` · ${item.episode.title}` : ""}
                        </p>
                        {remaining !== null && (
                          <span className="text-[10px] text-gray-600">
                            ~{remaining}m left
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">
            QUICK <span className="text-void-red">ACTIONS</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { href: "/browse", label: "Browse", icon: "🔍" },
              { href: "/watchlist", label: "Watchlist", icon: "📋" },
              { href: "/profile", label: "Profile", icon: "👤" },
              { href: "/genres", label: "Genres", icon: "🏷️" },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="bg-void-dark border border-void-gray/50 hover:border-void-red/50 rounded-lg p-6 text-center transition-all group"
              >
                <div className="text-3xl mb-2">{action.icon}</div>
                <span className="font-semibold text-gray-300 group-hover:text-void-red transition-colors">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <Recommendations />
      </div>
    </div>
  );
}
