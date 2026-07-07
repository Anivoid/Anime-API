"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Genre {
  id: string;
  name: string;
}

export default function NewAnimePage() {
  const router = useRouter();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    coverImage: "",
    bannerImage: "",
    type: "TV",
    status: "ONGOING",
    releaseYear: new Date().getFullYear(),
    rating: "",
    episodeCount: "",
    genreIds: [] as string[],
  });

  useEffect(() => {
    fetch("/api/genres")
      .then((r) => r.json())
      .then(setGenres)
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/anime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          rating: form.rating ? parseFloat(form.rating) : null,
          episodeCount: form.episodeCount ? parseInt(form.episodeCount) : 0,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/admin/anime`);
      }
    } catch (error) {
      console.error("Error creating anime:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (field: string, value: string | number | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">
        Add New <span className="text-void-red">Anime</span>
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">Title *</label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => updateForm("title", e.target.value)}
            className="w-full bg-void-black border border-void-gray rounded-lg px-4 py-3 text-white focus:outline-none focus:border-void-red transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => updateForm("description", e.target.value)}
            rows={4}
            className="w-full bg-void-black border border-void-gray rounded-lg px-4 py-3 text-white focus:outline-none focus:border-void-red transition-colors resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Type</label>
            <select
              value={form.type}
              onChange={(e) => updateForm("type", e.target.value)}
              className="w-full bg-void-black border border-void-gray rounded-lg px-4 py-3 text-white focus:outline-none focus:border-void-red transition-colors"
            >
              {["TV", "MOVIE", "OVA", "ONA", "SPECIAL"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Status</label>
            <select
              value={form.status}
              onChange={(e) => updateForm("status", e.target.value)}
              className="w-full bg-void-black border border-void-gray rounded-lg px-4 py-3 text-white focus:outline-none focus:border-void-red transition-colors"
            >
              {["ONGOING", "COMPLETED", "UPCOMING"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Release Year</label>
            <input
              type="number"
              value={form.releaseYear}
              onChange={(e) => updateForm("releaseYear", parseInt(e.target.value))}
              className="w-full bg-void-black border border-void-gray rounded-lg px-4 py-3 text-white focus:outline-none focus:border-void-red transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Rating (0-10)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={form.rating}
              onChange={(e) => updateForm("rating", e.target.value)}
              className="w-full bg-void-black border border-void-gray rounded-lg px-4 py-3 text-white focus:outline-none focus:border-void-red transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">Cover Image URL</label>
          <input
            type="url"
            value={form.coverImage}
            onChange={(e) => updateForm("coverImage", e.target.value)}
            placeholder="https://..."
            className="w-full bg-void-black border border-void-gray rounded-lg px-4 py-3 text-white focus:outline-none focus:border-void-red transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">Banner Image URL</label>
          <input
            type="url"
            value={form.bannerImage}
            onChange={(e) => updateForm("bannerImage", e.target.value)}
            placeholder="https://..."
            className="w-full bg-void-black border border-void-gray rounded-lg px-4 py-3 text-white focus:outline-none focus:border-void-red transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">Genres</label>
          <div className="grid grid-cols-2 gap-2">
            {genres.map((genre) => (
              <label key={genre.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.genreIds.includes(genre.id)}
                  onChange={(e) => {
                    const newIds = e.target.checked
                      ? [...form.genreIds, genre.id]
                      : form.genreIds.filter((id) => id !== genre.id);
                    updateForm("genreIds", newIds);
                  }}
                  className="rounded border-void-gray accent-void-red"
                />
                <span className="text-sm text-gray-400">{genre.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-void-red px-8 py-3 rounded-lg font-semibold hover:bg-void-red-dark transition-all disabled:opacity-50 glow-red"
          >
            {loading ? "Creating..." : "Create Anime"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="border border-void-gray px-8 py-3 rounded-lg font-semibold text-gray-300 hover:bg-void-dark transition-all"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
