"use client";

import { useState, useEffect } from "react";

interface ScheduledItem {
  id: string;
  title: string;
  description: string | null;
  slug: string | null;
  scheduledAt: string;
  status: string;
  retryCount: number;
  maxRetries: number;
  lastError: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export default function AdminSchedulerPage() {
  const [items, setItems] = useState<ScheduledItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", slug: "", scheduledAt: "" });
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/scheduler");
      if (res.ok) setItems(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/scheduler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const newItem = await res.json();
      setItems((prev) => [...prev, newItem]);
      setForm({ title: "", description: "", slug: "", scheduledAt: "" });
      setShowForm(false);
    }
  };

  const handleCancel = async (id: string) => {
    const res = await fetch("/api/admin/scheduler", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "cancelled" }),
    });
    if (res.ok) {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: "cancelled" } : i)));
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/scheduler?id=${id}`, { method: "DELETE" });
    if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await fetch("/api/admin/scheduler/publish", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        alert(`Processed ${data.processed} items. Check activity log for details.`);
        fetchItems();
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleGenerate = async () => {
    if (!form.title) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title, type: "description" }),
      });
      if (res.ok) {
        const data = await res.json();
        setForm((prev) => ({ ...prev, description: data.result }));
      }
    } finally {
      setGenerating(false);
    }
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400",
    published: "bg-green-500/20 text-green-400",
    failed: "bg-red-500/20 text-red-400",
    cancelled: "bg-gray-500/20 text-gray-400",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black">Publish Scheduler</h1>
          <p className="text-gray-500 text-sm mt-1">Schedule anime for auto-publishing with AI descriptions</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="bg-green-600 px-4 py-2 rounded-lg text-white font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {publishing ? "Publishing..." : "Publish Due Now"}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-void-red px-4 py-2 rounded-lg text-white font-medium hover:bg-void-red-dark transition-colors"
          >
            + New Schedule
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-void-dark border border-void-gray/50 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full bg-void-black border border-void-gray rounded-lg px-3 py-2 text-white focus:border-void-red focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Slug (auto-generated if empty)</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                className="w-full bg-void-black border border-void-gray rounded-lg px-3 py-2 text-white focus:border-void-red focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm text-gray-400">Description</label>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating || !form.title}
                  className="text-xs text-void-red hover:text-void-red-glow disabled:opacity-50"
                >
                  {generating ? "Generating..." : "Generate with AI"}
                </button>
              </div>
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full bg-void-black border border-void-gray rounded-lg px-3 py-2 text-white focus:border-void-red focus:outline-none resize-none"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Scheduled At *</label>
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm((prev) => ({ ...prev, scheduledAt: e.target.value }))}
                className="w-full bg-void-black border border-void-gray rounded-lg px-3 py-2 text-white focus:border-void-red focus:outline-none"
                required
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" className="bg-void-red px-4 py-2 rounded-lg text-white hover:bg-void-red-dark transition-colors">
              Create Schedule
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-void-gray rounded-lg text-gray-400 hover:text-white transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading schedules...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No scheduled items</p>
          <p className="text-gray-600 text-sm mt-1">Create a schedule to auto-publish anime later</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="bg-void-dark border border-void-gray/50 rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-white">{item.title}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[item.status] || "bg-gray-500/20 text-gray-400"}`}>
                      {item.status}
                    </span>
                    {item.retryCount > 0 && (
                      <span className="text-yellow-400 text-xs">
                        Retry {item.retryCount}/{item.maxRetries}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-gray-400 text-sm mb-2 line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex gap-4 text-xs text-gray-600">
                    <span>Scheduled: {new Date(item.scheduledAt).toLocaleString()}</span>
                    {item.publishedAt && <span>Published: {new Date(item.publishedAt).toLocaleString()}</span>}
                    {item.lastError && <span className="text-red-400">Error: {item.lastError}</span>}
                  </div>
                </div>
                {item.status === "pending" && (
                  <div className="flex gap-2 ml-4">
                    <button onClick={() => handleCancel(item.id)} className="text-gray-500 hover:text-yellow-400 text-sm">
                      Cancel
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="text-gray-500 hover:text-red-400 text-sm">
                      Delete
                    </button>
                  </div>
                )}
                {item.status === "failed" && (
                  <button onClick={() => handleDelete(item.id)} className="text-gray-500 hover:text-red-400 text-sm ml-4">
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
