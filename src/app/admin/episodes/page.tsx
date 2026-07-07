"use client";

import { useState, useEffect } from "react";

interface Anime {
  id: string;
  title: string;
  slug: string;
  episodes: {
    id: string;
    number: number;
    title: string | null;
    duration: number | null;
    videoUrl: string | null;
  }[];
}

export default function AdminEpisodesPage() {
  const [anime, setAnime] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnime, setSelectedAnime] = useState<string>("");
  const [episodeForm, setEpisodeForm] = useState({
    number: "",
    title: "",
    duration: "",
    videoUrl: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/anime?limit=100")
      .then((r) => r.json())
      .then((data) => setAnime(data.anime || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const selected = anime.find((a) => a.id === selectedAnime);

  const handleAddEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnime || !episodeForm.number) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/episodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          animeId: selectedAnime,
          number: parseInt(episodeForm.number),
          title: episodeForm.title || null,
          duration: episodeForm.duration ? parseInt(episodeForm.duration) : null,
          videoUrl: episodeForm.videoUrl || null,
        }),
      });

      if (res.ok) {
        setEpisodeForm({ number: "", title: "", duration: "", videoUrl: "" });
        // Refresh anime data
        const data = await fetch("/api/anime?limit=100").then((r) => r.json());
        setAnime(data.anime || []);
      }
    } catch (error) {
      console.error("Error adding episode:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEpisode = async (episodeId: string) => {
    if (!confirm("Delete this episode?")) return;
    try {
      await fetch(`/api/episodes/${episodeId}`, { method: "DELETE" });
      setAnime((prev) =>
        prev.map((a) => ({
          ...a,
          episodes: a.episodes.filter((e) => e.id !== episodeId),
        }))
      );
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">
        Manage <span className="text-void-red">Episodes</span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Add Episode Form */}
        <div className="bg-void-dark border border-void-gray/30 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">
            Add <span className="text-void-red">Episode</span>
          </h2>
          <form onSubmit={handleAddEpisode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Anime</label>
              <select
                value={selectedAnime}
                onChange={(e) => setSelectedAnime(e.target.value)}
                className="w-full bg-void-black border border-void-gray rounded-lg px-4 py-3 text-white focus:outline-none focus:border-void-red transition-colors"
              >
                <option value="">Select anime...</option>
                {anime.map((a) => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Episode # *</label>
                <input
                  type="number"
                  required
                  value={episodeForm.number}
                  onChange={(e) => setEpisodeForm((p) => ({ ...p, number: e.target.value }))}
                  className="w-full bg-void-black border border-void-gray rounded-lg px-4 py-3 text-white focus:outline-none focus:border-void-red transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Duration (min)</label>
                <input
                  type="number"
                  value={episodeForm.duration}
                  onChange={(e) => setEpisodeForm((p) => ({ ...p, duration: e.target.value }))}
                  className="w-full bg-void-black border border-void-gray rounded-lg px-4 py-3 text-white focus:outline-none focus:border-void-red transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Title</label>
              <input
                type="text"
                value={episodeForm.title}
                onChange={(e) => setEpisodeForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Optional episode title"
                className="w-full bg-void-black border border-void-gray rounded-lg px-4 py-3 text-white focus:outline-none focus:border-void-red transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Video URL</label>
              <input
                type="url"
                value={episodeForm.videoUrl}
                onChange={(e) => setEpisodeForm((p) => ({ ...p, videoUrl: e.target.value }))}
                placeholder="https://..."
                className="w-full bg-void-black border border-void-gray rounded-lg px-4 py-3 text-white focus:outline-none focus:border-void-red transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !selectedAnime}
              className="w-full bg-void-red py-3 rounded-lg font-semibold hover:bg-void-red-dark transition-all disabled:opacity-50 glow-red"
            >
              {submitting ? "Adding..." : "Add Episode"}
            </button>
          </form>
        </div>

        {/* Episode List */}
        <div className="bg-void-dark border border-void-gray/30 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">
            Episodes <span className="text-gray-500 text-base font-normal">({selected?.episodes.length || 0})</span>
          </h2>

          {!selectedAnime ? (
            <div className="text-center py-12 text-gray-500">Select an anime to view episodes</div>
          ) : loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {selected?.episodes.map((ep) => (
                <div key={ep.id} className="flex items-center justify-between bg-void-black/50 border border-void-gray/20 rounded-lg p-3">
                  <div>
                    <span className="font-mono text-void-red mr-2">#{ep.number}</span>
                    <span className="text-gray-300">{ep.title || `Episode ${ep.number}`}</span>
                    {ep.duration && <span className="text-xs text-gray-500 ml-2">({ep.duration}m)</span>}
                  </div>
                  <button
                    onClick={() => handleDeleteEpisode(ep.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Delete
                  </button>
                </div>
              ))}
              {selected?.episodes.length === 0 && (
                <div className="text-center py-8 text-gray-500">No episodes yet</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
