"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface LikeButtonProps {
  animeId: string;
}

export function LikeButton({ animeId }: LikeButtonProps) {
  const { data: session } = useSession();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLikes = async () => {
      try {
        const res = await fetch(`/api/likes?animeId=${animeId}`);
        const data = await res.json();
        setCount(data.count);
        setLiked(data.liked);
      } catch (error) {
        console.error("Error fetching likes:", error);
      }
    };

    fetchLikes();
  }, [animeId]);

  const toggleLike = async () => {
    if (!session) {
      window.location.href = "/auth/login";
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ animeId }),
      });
      const data = await res.json();
      setLiked(data.liked);
      setCount(data.count);
    } catch (error) {
      console.error("Error updating like:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggleLike}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition disabled:opacity-50 ${
        liked
          ? "bg-red-600 hover:bg-red-700"
          : "bg-void-dark border border-void-gray/50 hover:bg-void-red/10 hover:border-void-red/50 transition-all"
      }`}
    >
      <span>{liked ? "♥" : "♡"}</span>
      <span>{count}</span>
    </button>
  );
}
