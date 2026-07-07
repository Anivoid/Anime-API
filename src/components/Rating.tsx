"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface RatingProps {
  animeId: string;
  initialAverage?: number | null;
  initialCount?: number;
}

export function Rating({ animeId, initialAverage, initialCount }: RatingProps) {
  const { data: session } = useSession();
  const [average, setAverage] = useState(initialAverage || 0);
  const [count, setCount] = useState(initialCount || 0);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/ratings?animeId=${animeId}`)
      .then((r) => r.json())
      .then((data) => {
        setAverage(data.average || 0);
        setCount(data.count || 0);
        setUserRating(data.userRating);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [animeId]);

  const handleRate = async (value: number) => {
    if (!session) {
      window.location.href = "/auth/login";
      return;
    }

    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ animeId, value }),
      });

      if (res.ok) {
        const data = await res.json();
        setUserRating(data.userRating);
        setAverage(data.average || 0);
        setCount(data.count || 0);
      }
    } catch (error) {
      console.error("Error rating:", error);
    }
  };

  const displayRating = hoverRating || userRating || 0;

  return (
    <div className="flex items-center gap-4">
      {/* Star rating */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
          <button
            key={star}
            onClick={() => handleRate(star)}
            onMouseEnter={() => session && setHoverRating(star)}
            onMouseLeave={() => setHoverRating(null)}
            className={`text-lg transition-colors ${
              star <= displayRating
                ? "text-void-red"
                : "text-void-gray hover:text-void-red/50"
            } ${!session ? "cursor-not-allowed" : "cursor-pointer"}`}
            disabled={!session}
          >
            ★
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="text-sm">
        <span className="text-void-red font-bold">{average ? average.toFixed(1) : "—"}</span>
        <span className="text-gray-500 ml-1">
          ({count} {count === 1 ? "rating" : "ratings"})
        </span>
      </div>

      {userRating && (
        <span className="text-xs text-gray-500">
          Your rating: <span className="text-void-red">{userRating}</span>
        </span>
      )}
    </div>
  );
}
