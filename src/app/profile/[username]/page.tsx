"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import Image from "next/image";

interface PublicProfile {
  id: string;
  name: string | null;
  username: string;
  image: string | null;
  bio: string | null;
  createdAt: string;
  _count: {
    comments: number;
    animeLikes: number;
    ratings: number;
    watchlist: number;
  };
  recentComments: {
    id: string;
    content: string;
    createdAt: string;
    anime: { title: string; slug: string };
  }[];
  favoriteGenres: { name: string; slug: string }[];
}

export default function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/profile/${username}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setProfile)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-void-black text-white">
        <Header />
        <div className="container mx-auto px-4 pt-24 text-center">
          <p className="text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-void-black text-white">
        <Header />
        <div className="container mx-auto px-4 pt-24 text-center">
          <h1 className="text-4xl font-black text-void-red mb-4">USER NOT FOUND</h1>
          <p className="text-gray-400 mb-8">The user @{username} does not exist.</p>
          <Link href="/" className="bg-void-red px-6 py-3 rounded-lg text-white hover:bg-void-red-dark transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void-black text-white">
      <Header />

      <main className="container mx-auto px-4 pt-24 pb-12 max-w-4xl">
        {/* Profile Header */}
        <div className="bg-void-dark border border-void-gray/50 rounded-lg p-8 mb-8">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-full bg-void-red flex items-center justify-center text-3xl font-black text-white flex-shrink-0">
              {profile.image ? (
                <Image src={profile.image} alt={profile.name || ""} unoptimized className="w-full h-full rounded-full object-cover" width={80} height={80} />
              ) : (
                (profile.name || profile.username).charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-black">{profile.name || profile.username}</h1>
              <p className="text-void-red text-sm">@{profile.username}</p>
              {profile.bio && <p className="text-gray-400 mt-2">{profile.bio}</p>}
              <p className="text-gray-600 text-xs mt-2">
                Joined {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-void-gray/30">
            <div className="text-center">
              <div className="text-2xl font-black text-void-red">{profile._count.comments}</div>
              <div className="text-gray-500 text-xs">Comments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-void-red">{profile._count.animeLikes}</div>
              <div className="text-gray-500 text-xs">Likes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-void-red">{profile._count.ratings}</div>
              <div className="text-gray-500 text-xs">Ratings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-void-red">{profile._count.watchlist}</div>
              <div className="text-gray-500 text-xs">Watchlist</div>
            </div>
          </div>
        </div>

        {/* Favorite Genres */}
        {profile.favoriteGenres.length > 0 && (
          <div className="bg-void-dark border border-void-gray/50 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-bold mb-4">Favorite Genres</h2>
            <div className="flex flex-wrap gap-2">
              {profile.favoriteGenres.map((genre) => (
                <Link
                  key={genre.slug}
                  href={`/genres/${genre.slug}`}
                  className="bg-void-red/20 border border-void-red/30 px-3 py-1 rounded-full text-void-red text-sm hover:bg-void-red/30 transition-colors"
                >
                  {genre.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent Comments */}
        {profile.recentComments.length > 0 && (
          <div className="bg-void-dark border border-void-gray/50 rounded-lg p-6">
            <h2 className="text-lg font-bold mb-4">Recent Comments</h2>
            <div className="space-y-4">
              {profile.recentComments.map((comment) => (
                <Link
                  key={comment.id}
                  href={`/anime/${comment.anime.slug}`}
                  className="block p-4 bg-void-black/50 border border-void-gray/30 rounded-lg hover:border-void-red/30 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-void-red text-sm font-medium">{comment.anime.title}</span>
                    <span className="text-gray-600 text-xs">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm">{comment.content}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
