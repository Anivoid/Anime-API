"use client";

import { useState, useEffect } from "react";

interface Collection {
  id: string;
  title: string;
  items: { animeId: string }[];
}

interface AddToCollectionProps {
  animeId: string;
}

export function AddToCollection({ animeId }: AddToCollectionProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!showDropdown) return;
    fetch("/api/collections")
      .then((r) => r.json())
      .then((data) => setCollections(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, [showDropdown]);

  const toggleAnime = async (collectionId: string) => {
    const collection = collections.find((c) => c.id === collectionId);
    if (!collection) return;

    const isInCollection = collection.items.some((item) => item.animeId === animeId);

    setLoading(true);
    try {
      await fetch("/api/collections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: collectionId,
          ...(isInCollection ? { removeAnimeId: animeId } : { animeId }),
        }),
      });

      setCollections((prev) =>
        prev.map((c) => {
          if (c.id !== collectionId) return c;
          if (isInCollection) {
            return { ...c, items: c.items.filter((item) => item.animeId !== animeId) };
          } else {
            return { ...c, items: [...c.items, { animeId, id: "temp" }] };
          }
        })
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 bg-void-dark border border-void-gray/50 px-4 py-2 rounded-lg text-gray-300 hover:border-void-red/50 hover:text-white transition-all text-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        Add to Collection
      </button>

      {showDropdown && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-void-dark border border-void-gray/50 rounded-lg shadow-xl z-20">
          <div className="p-2">
            {collections.length === 0 ? (
              <p className="text-gray-500 text-sm p-2">No collections yet</p>
            ) : (
              collections.map((collection) => {
                const isInCollection = collection.items.some((item) => item.animeId === animeId);
                return (
                  <button
                    key={collection.id}
                    onClick={() => toggleAnime(collection.id)}
                    disabled={loading}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                      isInCollection
                        ? "bg-void-red/20 text-void-red"
                        : "text-gray-300 hover:bg-void-gray/30 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {isInCollection && <span className="text-xs">✓</span>}
                      {collection.title}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
