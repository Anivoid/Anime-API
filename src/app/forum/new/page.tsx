"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { useSession } from "next-auth/react";

const categories = [
  { id: "discussion", label: "Discussion" },
  { id: "theory", label: "Theory" },
  { id: "recommendation", label: "Recommendation" },
  { id: "meme", label: "Meme" },
  { id: "news", label: "News" },
];

export default function NewPostPage() {
  const router = useRouter();
  const { status } = useSession();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("discussion");
  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-void-black text-white">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (title.length < 3 || title.length > 200) {
      setError("Title must be between 3 and 200 characters");
      return;
    }

    if (content.length < 10 || content.length > 10000) {
      setError("Content must be between 10 and 10000 characters");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/forum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          category,
          tags: tags.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to create post");
        return;
      }

      const post = await response.json();
      router.push(`/forum/${post.id}`);
    } catch (error) {
      console.error("Error creating post:", error);
      setError("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-void-black text-white">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/forum"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-void-red transition-colors mb-6"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Forum
        </Link>

        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">
            CREATE <span className="text-void-red">NEW POST</span>
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-red-400">
                {error}
              </div>
            )}

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
                Title *
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a descriptive title"
                className="w-full bg-void-dark border border-void-gray/50 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-void-red/50"
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">{title.length}/200 characters</p>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-2">
                Category *
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-void-dark border border-void-gray/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-void-red/50"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-300 mb-2">
                Tags (comma-separated)
              </label>
              <input
                id="tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g., one-piece, theory, discussion"
                className="w-full bg-void-dark border border-void-gray/50 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-void-red/50"
              />
              <p className="text-xs text-gray-500 mt-1">Add tags to help others find your post</p>
            </div>

            {/* Content */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-300 mb-2">
                Content *
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your post content here..."
                className="w-full bg-void-dark border border-void-gray/50 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-void-red/50 resize-none"
                rows={12}
              />
              <p className="text-xs text-gray-500 mt-1">{content.length}/10000 characters</p>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-4">
              <Link
                href="/forum"
                className="px-6 py-3 rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting || !title.trim() || !content.trim()}
                className="bg-void-red px-8 py-3 rounded-lg font-semibold hover:bg-void-red-dark transition-all duration-300 glow-red disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Creating..." : "Create Post"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}