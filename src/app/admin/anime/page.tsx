"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Anime {
  id: string;
  title: string;
  slug: string;
  status: string;
  type: string;
  releaseYear: number;
  rating: number | null;
  _count: { episodes: number; likes: number };
}

export default function AdminAnimePage() {
  const [anime, setAnime] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/anime?limit=100")
      .then((r) => r.json())
      .then((data) => setAnime(data.anime || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeleteLoading(id);
    try {
      await fetch(`/api/anime/${id}`, { method: "DELETE" });
      setAnime((prev) => prev.filter((a) => a.id !== id));
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setDeleteLoading(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">
          Manage <span className="text-void-red">Anime</span>
        </h1>
        <Link
          href="/admin/anime/new"
          className="bg-void-red px-6 py-2 rounded-lg font-semibold hover:bg-void-red-dark transition-all glow-red"
        >
          + Add Anime
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <div className="bg-void-dark border border-void-gray/30 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-void-gray/30">
                <th className="text-left p-4 text-sm text-gray-500 font-medium">Title</th>
                <th className="text-left p-4 text-sm text-gray-500 font-medium">Status</th>
                <th className="text-left p-4 text-sm text-gray-500 font-medium">Type</th>
                <th className="text-left p-4 text-sm text-gray-500 font-medium">Year</th>
                <th className="text-left p-4 text-sm text-gray-500 font-medium">Rating</th>
                <th className="text-left p-4 text-sm text-gray-500 font-medium">Episodes</th>
                <th className="text-right p-4 text-sm text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {anime.map((item) => (
                <tr key={item.id} className="border-b border-void-gray/20 hover:bg-void-black/50">
                  <td className="p-4">
                    <Link href={`/anime/${item.slug}`} className="font-semibold hover:text-void-red transition-colors">
                      {item.title}
                    </Link>
                  </td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded ${
                      item.status === "ONGOING" ? "bg-green-600/20 text-green-400" :
                      item.status === "COMPLETED" ? "bg-blue-600/20 text-blue-400" :
                      "bg-yellow-600/20 text-yellow-400"
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-400">{item.type}</td>
                  <td className="p-4 text-sm text-gray-400">{item.releaseYear}</td>
                  <td className="p-4 text-sm text-gray-400">{item.rating || "N/A"}</td>
                  <td className="p-4 text-sm text-gray-400">{item._count.episodes}</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleDelete(item.id, item.title)}
                      disabled={deleteLoading === item.id}
                      className="text-red-400 hover:text-red-300 text-sm disabled:opacity-50"
                    >
                      {deleteLoading === item.id ? "..." : "Delete"}
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
