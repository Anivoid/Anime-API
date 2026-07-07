"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { useSession } from "next-auth/react";

interface ForumPost {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string | null;
  pinned: boolean;
  viewCount: number;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const categories = [
  { id: "all", label: "All" },
  { id: "discussion", label: "Discussion" },
  { id: "theory", label: "Theory" },
  { id: "recommendation", label: "Recommendation" },
  { id: "meme", label: "Meme" },
  { id: "news", label: "News" },
];

const sorts = [
  { id: "hot", label: "Hot" },
  { id: "new", label: "New" },
  { id: "top", label: "Top" },
];

export default function ForumPage() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSort, setSelectedSort] = useState("hot");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPosts = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        sort: selectedSort,
      });
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      if (searchQuery) params.set("search", searchQuery);

      const response = await fetch(`/api/forum?${params}`);
      const data = await response.json();
      setPosts(data.posts);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts(1);
  }, [selectedCategory, selectedSort, searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPosts(1);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "theory": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "recommendation": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "meme": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "news": return "bg-green-500/20 text-green-400 border-green-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <div className="min-h-screen bg-void-black text-white">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              FORUMS <span className="text-void-red">&</span> DISCUSSIONS
            </h1>
            <p className="text-gray-400 mt-2">Join the conversation about your favorite anime</p>
          </div>
          {session && (
            <Link
              href="/forum/new"
              className="bg-void-red px-6 py-3 rounded-lg font-semibold hover:bg-void-red-dark transition-all duration-300 glow-red"
            >
              New Post
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="bg-void-dark border border-void-gray/50 rounded-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search posts..."
                  className="w-full bg-void-black border border-void-gray/50 rounded-lg px-4 py-2 pl-10 text-white placeholder-gray-500 focus:outline-none focus:border-void-red/50"
                />
                <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </form>

            {/* Categories */}
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedCategory === cat.id
                      ? "bg-void-red text-white"
                      : "bg-void-black border border-void-gray/50 text-gray-400 hover:border-void-red/50"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="flex gap-2">
              {sorts.map((sort) => (
                <button
                  key={sort.id}
                  onClick={() => setSelectedSort(sort.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedSort === sort.id
                      ? "bg-void-red text-white"
                      : "bg-void-black border border-void-gray/50 text-gray-400 hover:border-void-red/50"
                  }`}
                >
                  {sort.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Posts */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading posts...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No posts found</p>
            <p className="text-gray-500 mt-2">Be the first to start a discussion!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/forum/${post.id}`}
                className="block bg-void-dark border border-void-gray/50 rounded-lg p-6 hover:border-void-red/50 transition-all group"
              >
                <div className="flex items-start gap-4">
                  {/* Vote count */}
                  <div className="flex flex-col items-center min-w-[60px]">
                    <span className="text-xl font-bold text-void-red">{post.upvotes - post.downvotes}</span>
                    <span className="text-xs text-gray-500">votes</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {post.pinned && (
                        <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded text-xs font-medium">
                          Pinned
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getCategoryColor(post.category)}`}>
                        {post.category.charAt(0).toUpperCase() + post.category.slice(1)}
                      </span>
                    </div>

                    <h2 className="text-lg font-semibold group-hover:text-void-red transition-colors mb-2">
                      {post.title}
                    </h2>

                    <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                      {post.content}
                    </p>

                    {post.tags && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {post.tags.split(",").map((tag, i) => (
                          <span key={i} className="bg-void-black/50 text-gray-500 px-2 py-0.5 rounded text-xs">
                            #{tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-void-red flex items-center justify-center text-xs font-bold">
                          {post.user.name?.charAt(0) || "U"}
                        </div>
                        <span>{post.user.username || post.user.name}</span>
                      </div>
                      <span>{formatDate(post.createdAt)}</span>
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span>{post.commentCount}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>{post.viewCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => fetchPosts(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-4 py-2 rounded-lg bg-void-dark border border-void-gray/50 text-gray-400 hover:border-void-red/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Previous
            </button>
            <span className="text-gray-400 px-4">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => fetchPosts(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="px-4 py-2 rounded-lg bg-void-dark border border-void-gray/50 text-gray-400 hover:border-void-red/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}