"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface WatchlistButtonProps {
  animeId: string;
}

export function WatchlistButton({ animeId }: WatchlistButtonProps) {
  const { data: session } = useSession();
  const [inWatchlist, setInWatchlist] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session) return;

    const checkWatchlist = async () => {
      try {
        const res = await fetch(`/api/watchlist`);
        const data = await res.json();
        const isInList = data.some(
          (item: { animeId: string }) => item.animeId === animeId
        );
        setInWatchlist(isInList);
      } catch (error) {
        console.error("Error checking watchlist:", error);
      }
    };

    checkWatchlist();
  }, [session, animeId]);

  const toggleWatchlist = async () => {
    if (!session) {
      window.location.href = "/auth/login";
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ animeId }),
      });
      const data = await res.json();
      setInWatchlist(data.inWatchlist);
    } catch (error) {
      console.error("Error updating watchlist:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggleWatchlist}
      disabled={loading}
      className={`px-6 py-3 rounded-lg font-semibold transition disabled:opacity-50 ${
        inWatchlist
          ? "bg-green-600 hover:bg-green-700"
          : "border border-void-gray hover:bg-void-red/10 hover:border-void-red/50 transition-all"
      }`}
    >
      {loading ? "..." : inWatchlist ? "✓ In Watchlist" : "+ Add to Watchlist"}
    </button>
  );
}
