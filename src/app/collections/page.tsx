"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Header from "@/components/Header";
import Link from "next/link";
import Image from "next/image";

interface CollectionItem {
  id: string;
  animeId: string;
  anime: {
    id: string;
    title: string;
    slug: string;
    coverImage: string | null;
  };
}

interface Collection {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  user: { name: string | null; username: string | null };
  items: CollectionItem[];
  _count: { items: number };
}

export default function CollectionsPage() {
  const { data: session } = useSession();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", isPublic: true });

  useEffect(() => {
    fetch("/api/collections?public=true")
      .then((r) => r.json())
      .then((data) => setCollections(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const newCollection = await res.json();
      setCollections((prev) => [{ ...newCollection, items: [], _count: { items: 0 }, user: { name: session?.user?.name, username: null } }, ...prev]);
      setForm({ title: "", description: "", isPublic: true });
      setShowForm(false);
    }
  };

  return (
    <div className="min-h-screen bg-void-black text-white">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black">
            COLLECTIONS <span className="text-void-red"> anonymously</span>
          </h1>
          {session && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-void-red px-4 py-2 rounded-lg text-white font-medium hover:bg-void-red-dark transition-colors"
            >
              + New Collection
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-void-dark border border-void-gray/50 rounded-lg p-6 mb-8">
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
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-void-black border border-void-gray rounded-lg px-3 py-2 text-white focus:border-void-red focus:outline-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4">
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isPublic}
                  onChange={(e) => setForm((prev) => ({ ...prev, isPublic: e.target.checked }))}
                  className="w-4 h-4 rounded bg-void-black border-void-gray text-void-red focus:ring-void-red"
                />
                Public collection
              </label>
              <button type="submit" className="bg-void-red px-4 py-2 rounded-lg text-white hover:bg-void-red-dark transition-colors">
                Create
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white text-sm">
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading collections...</div>
        ) : collections.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-2">No public collections yet</p>
            {session && (
              <button onClick={() => setShowForm(true)} className="text-void-red text-sm hover:text-void-red-glow">
                Create the first one
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((collection) => (
              <div key={collection.id} className="bg-void-dark border border-void-gray/50 rounded-lg overflow-hidden hover:border-void-red/30 transition-all">
                {/* Preview grid */}
                <div className="grid grid-cols-3 gap-0.5 h-32">
                  {collection.items.slice(0, 6).map((item, i) => (
                    <div key={item.id} className="bg-void-gray relative">
                      {item.anime.coverImage ? (
                        <Image src={item.anime.coverImage} alt="" unoptimized className="w-full h-full object-cover" width={300} height={200} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-void-red/30 text-xs font-bold">
                          {item.anime.title.charAt(0)}
                        </div>
                      )}
                    </div>
                  ))}
                  {Array.from({ length: Math.max(0, 6 - collection.items.length) }).map((_, i) => (
                    <div key={`empty-${i}`} className="bg-void-gray/30" />
                  ))}
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-lg line-clamp-1">{collection.title}</h3>
                  {collection.description && (
                    <p className="text-gray-500 text-sm mt-1 line-clamp-2">{collection.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-gray-600">
                      {collection._count.items} anime · by @{collection.user.username || collection.user.name}
                    </span>
                    <Link href={`/collections/${collection.id}`} className="text-void-red text-xs hover:text-void-red-glow">
                      View →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
