"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface TopAnime {
  id: string;
  title: string;
  slug: string;
  coverImage: string | null;
  rating: number | null;
  type: string | null;
  subCount: number | null;
  dubCount: number | null;
}

type Tab = "day" | "week" | "month";

export function TopAnimeSidebar() {
  const [tab, setTab] = useState<Tab>("day");
  const [anime, setAnime] = useState<TopAnime[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const sort = tab === "day" ? "rating" : tab === "week" ? "popular" : "trending";
    fetch(`/api/anime?limit=10&sort=${sort === "rating" ? "" : "popular"}`)
      .then((r) => r.json())
      .then((data) => {
        setAnime(data.anime || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tab]);

  return (
    <div className="bg-[#1a1a2e] rounded-lg border border-white/5 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="text-lg font-bold text-white">Top anime</h3>
        <div className="flex gap-1">
          {(["day", "week", "month"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-[11px] px-2.5 py-1 rounded font-medium transition-colors ${
                tab === t
                  ? "bg-purple-600 text-white"
                  : "bg-white/5 text-gray-400 hover:text-white"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="px-2 pb-2">
        {loading ? (
          <div className="space-y-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded animate-pulse">
                <div className="w-6 h-6 bg-white/5 rounded" />
                <div className="w-10 h-14 bg-white/5 rounded" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-white/5 rounded w-3/4" />
                  <div className="h-2 bg-white/5 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          anime.map((item, i) => (
            <Link
              key={item.id}
              href={`/anime/${item.slug}`}
              className="flex items-center gap-3 p-2 rounded hover:bg-white/5 transition-colors group"
            >
              <span className={`text-lg font-black w-6 text-center ${
                i < 3 ? "text-purple-400" : "text-gray-600"
              }`}>
                {i + 1}
              </span>
              <div className="w-10 h-14 rounded overflow-hidden bg-white/5 flex-shrink-0">
                {item.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/10 text-xs">?</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-200 group-hover:text-purple-400 transition-colors line-clamp-1">
                  {item.title}
                </h4>
                <div className="flex items-center gap-1.5 mt-0.5 text-[10px]">
                  {item.subCount !== null && (
                    <span className="bg-green-600/80 text-white px-1 rounded font-bold">SUB {item.subCount}</span>
                  )}
                  {item.dubCount !== null && item.dubCount > 0 && (
                    <span className="bg-yellow-500/80 text-black px-1 rounded font-bold">DUB {item.dubCount}</span>
                  )}
                  {item.type && <span className="text-gray-500">• {item.type}</span>}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
