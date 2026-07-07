"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface Anime {
  id: string;
  title: string;
  slug: string;
  featured: boolean;
  trending: boolean;
  pinned: boolean;
  rating: number | null;
  status: string;
}

export default function AdminFeaturedPage() {
  const { data: session } = useSession();
  const [anime, setAnime] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const myRole = (session?.user as { role?: string })?.role;
  const canFeature = ["OWNER", "ADMIN"].includes(myRole || "");

  useEffect(() => {
    fetch("/api/admin/featured")
      .then((r) => r.json())
      .then(setAnime)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggleFlag = async (animeId: string, field: "featured" | "trending" | "pinned", currentValue: boolean) => {
    if (!canFeature) return;
    
    setUpdating(animeId);
    try {
      const res = await fetch("/api/admin/featured", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ animeId, [field]: !currentValue }),
      });

      if (res.ok) {
        const updated = await res.json();
        setAnime((prev) =>
          prev.map((a) =>
            a.id === animeId
              ? { ...a, [field]: updated[field] }
              : a
          )
        );
      }
    } catch (error) {
      console.error("Error updating:", error);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">
        Featured <span className="text-void-red">Content</span>
      </h1>

      {!canFeature && (
        <div className="bg-yellow-600/10 border border-yellow-600/30 rounded-lg p-4 mb-6 text-yellow-400 text-sm">
          You need Admin or Owner role to manage featured content.
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <div className="bg-void-dark border border-void-gray/30 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-void-gray/30">
                <th className="text-left p-4 text-sm text-gray-500 font-medium">Title</th>
                <th className="text-center p-4 text-sm text-gray-500 font-medium">Status</th>
                <th className="text-center p-4 text-sm text-gray-500 font-medium">Rating</th>
                <th className="text-center p-4 text-sm text-gray-500 font-medium">Featured</th>
                <th className="text-center p-4 text-sm text-gray-500 font-medium">Trending</th>
                <th className="text-center p-4 text-sm text-gray-500 font-medium">Pinned</th>
              </tr>
            </thead>
            <tbody>
              {anime.map((item) => (
                <tr key={item.id} className="border-b border-void-gray/20 hover:bg-void-black/50">
                  <td className="p-4">
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-xs text-gray-500">/{item.slug}</p>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`text-xs px-2 py-1 rounded ${
                      item.status === "ONGOING" ? "bg-green-600/20 text-green-400" :
                      item.status === "COMPLETED" ? "bg-blue-600/20 text-blue-400" :
                      "bg-yellow-600/20 text-yellow-400"
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-4 text-center text-sm text-gray-400">
                    {item.rating || "N/A"}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => toggleFlag(item.id, "featured", item.featured)}
                      disabled={!canFeature || updating === item.id}
                      className={`w-10 h-6 rounded-full transition-all relative ${
                        item.featured ? "bg-void-red" : "bg-void-gray"
                      } ${!canFeature ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                        item.featured ? "left-5" : "left-1"
                      }`} />
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => toggleFlag(item.id, "trending", item.trending)}
                      disabled={!canFeature || updating === item.id}
                      className={`w-10 h-6 rounded-full transition-all relative ${
                        item.trending ? "bg-void-red" : "bg-void-gray"
                      } ${!canFeature ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                        item.trending ? "left-5" : "left-1"
                      }`} />
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => toggleFlag(item.id, "pinned", item.pinned)}
                      disabled={!canFeature || updating === item.id}
                      className={`w-10 h-6 rounded-full transition-all relative ${
                        item.pinned ? "bg-void-red" : "bg-void-gray"
                      } ${!canFeature ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                        item.pinned ? "left-5" : "left-1"
                      }`} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
