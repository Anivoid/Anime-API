"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  link: string | null;
  active: boolean;
  order: number;
  createdAt: string;
}

export default function AdminBannersPage() {
  const { data: session } = useSession();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", subtitle: "", imageUrl: "", link: "", order: "0" });

  const userRole = (session?.user as { role?: string })?.role;
  const canManage = ["OWNER", "ADMIN"].includes(userRole || "");

  useEffect(() => {
    fetch("/api/admin/banners")
      .then((r) => r.json())
      .then(setBanners)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);

    try {
      if (editing) {
        const res = await fetch("/api/admin/banners", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editing,
            title: form.title,
            subtitle: form.subtitle || null,
            imageUrl: form.imageUrl || null,
            link: form.link || null,
            order: parseInt(form.order) || 0,
          }),
        });
        if (res.ok) {
          const updated = await res.json();
          setBanners((prev) => prev.map((b) => (b.id === editing ? updated : b)));
        }
      } else {
        const res = await fetch("/api/admin/banners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title,
            subtitle: form.subtitle || null,
            imageUrl: form.imageUrl || null,
            link: form.link || null,
            order: parseInt(form.order) || 0,
          }),
        });
        if (res.ok) {
          const created = await res.json();
          setBanners((prev) => [...prev, created]);
        }
      }
      setForm({ title: "", subtitle: "", imageUrl: "", link: "", order: "0" });
      setEditing(null);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (banner: Banner) => {
    setEditing(banner.id);
    setForm({
      title: banner.title,
      subtitle: banner.subtitle || "",
      imageUrl: banner.imageUrl || "",
      link: banner.link || "",
      order: banner.order.toString(),
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    try {
      const res = await fetch(`/api/admin/banners?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setBanners((prev) => prev.filter((b) => b.id !== id));
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    try {
      const res = await fetch("/api/admin/banners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active: !current }),
      });
      if (res.ok) {
        setBanners((prev) => prev.map((b) => (b.id === id ? { ...b, active: !current } : b)));
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">
        Banner <span className="text-void-red">Carousel</span>
      </h1>

      {canManage && (
        <div className="bg-void-dark border border-void-gray/30 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">
            {editing ? "Edit" : "Add"} <span className="text-void-red">Banner</span>
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full bg-void-black border border-void-gray rounded-lg px-4 py-3 text-white focus:outline-none focus:border-void-red transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Subtitle</label>
                <input
                  type="text"
                  value={form.subtitle}
                  onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
                  className="w-full bg-void-black border border-void-gray rounded-lg px-4 py-3 text-white focus:outline-none focus:border-void-red transition-colors"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Image URL</label>
                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full bg-void-black border border-void-gray rounded-lg px-4 py-3 text-white focus:outline-none focus:border-void-red transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Link URL</label>
                <input
                  type="url"
                  value={form.link}
                  onChange={(e) => setForm((p) => ({ ...p, link: e.target.value }))}
                  placeholder="https://..."
                  className="w-full bg-void-black border border-void-gray rounded-lg px-4 py-3 text-white focus:outline-none focus:border-void-red transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Order</label>
                <input
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm((p) => ({ ...p, order: e.target.value }))}
                  className="w-full bg-void-black border border-void-gray rounded-lg px-4 py-3 text-white focus:outline-none focus:border-void-red transition-colors"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="bg-void-red px-6 py-3 rounded-lg font-semibold hover:bg-void-red-dark transition-all disabled:opacity-50 glow-red"
              >
                {submitting ? "Saving..." : editing ? "Update Banner" : "Add Banner"}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={() => { setEditing(null); setForm({ title: "", subtitle: "", imageUrl: "", link: "", order: "0" }); }}
                  className="border border-void-gray px-6 py-3 rounded-lg font-semibold text-gray-300 hover:bg-void-dark transition-all"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : banners.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No banners yet. Create one above.</div>
      ) : (
        <div className="space-y-3">
          {banners.map((banner) => (
            <div key={banner.id} className="bg-void-dark border border-void-gray/30 rounded-lg p-4 flex items-center gap-4">
              <div className="w-32 h-16 bg-void-black rounded overflow-hidden flex-shrink-0">
                {banner.imageUrl ? (
                  <Image src={banner.imageUrl} alt={banner.title} unoptimized className="w-full h-full object-cover" width={128} height={64} />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-void-crimson/30 to-void-dark" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">{banner.title}</h3>
                  {banner.subtitle && <span className="text-sm text-gray-500 truncate">— {banner.subtitle}</span>}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Order: {banner.order} • {banner.link || "No link"}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={() => toggleActive(banner.id, banner.active)}
                  className={`w-10 h-6 rounded-full transition-all relative ${
                    banner.active ? "bg-void-red" : "bg-void-gray"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                    banner.active ? "left-5" : "left-1"
                  }`} />
                </button>
                {canManage && (
                  <>
                    <button onClick={() => handleEdit(banner)} className="text-gray-400 hover:text-void-red text-sm">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(banner.id)} className="text-gray-400 hover:text-red-400 text-sm">
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
