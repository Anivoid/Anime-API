"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
  locked: boolean;
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
  comments: ForumComment[];
  votes: Array<{ userId: string; value: number }>;
}

interface ForumComment {
  id: string;
  content: string;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
  };
  replies: ForumComment[];
  votes?: Array<{ userId: string; value: number }>;
}

export default function ForumPostPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [post, setPost] = useState<ForumPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentContent, setCommentContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchPost = async () => {
    try {
      const response = await fetch(`/api/forum/${id}`);
      if (!response.ok) {
        router.push("/forum");
        return;
      }
      const data = await response.json();
      setPost(data);
    } catch (error) {
      console.error("Error fetching post:", error);
      router.push("/forum");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPost();
  }, [id]);

  const handleVote = async (value: 1 | -1) => {
    if (!session) {
      alert("Please login to vote");
      return;
    }

    try {
      const response = await fetch(`/api/forum/${id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });

      if (response.ok) {
        const data = await response.json();
        setPost((prev) =>
          prev
            ? {
                ...prev,
                upvotes: data.upvotes,
                downvotes: data.downvotes,
              }
            : null
        );
      }
    } catch (error) {
      console.error("Error voting:", error);
    }
  };

  const handleCommentVote = async (commentId: string, value: 1 | -1) => {
    if (!session) {
      alert("Please login to vote");
      return;
    }

    try {
      const response = await fetch(`/api/forum/comments/${commentId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });

      if (response.ok) {
        fetchPost(); // Refresh to get updated counts
      }
    } catch (error) {
      console.error("Error voting on comment:", error);
    }
  };

  const handleSubmitComment = async (parentId?: string) => {
    if (!session) {
      alert("Please login to comment");
      return;
    }

    if (!commentContent.trim() || commentContent.length < 2) {
      alert("Comment must be at least 2 characters");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/forum/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: commentContent.trim(),
          parentId: parentId || null,
        }),
      });

      if (response.ok) {
        setCommentContent("");
        setReplyingTo(null);
        fetchPost();
      }
    } catch (error) {
      console.error("Error posting comment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      const response = await fetch(`/api/forum/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/forum");
      }
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  const renderComment = (comment: ForumComment, isReply = false) => {
    const userVote = comment.votes?.find((v) => v.userId === session?.user?.id)?.value;

    return (
      <div
        key={comment.id}
        className={`${isReply ? "ml-8 border-l-2 border-void-gray/30 pl-4" : ""} mb-4`}
      >
        <div className="bg-void-dark border border-void-gray/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-void-red flex items-center justify-center text-sm font-bold flex-shrink-0">
              {comment.user.name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{comment.user.username || comment.user.name}</span>
                <span className="text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
              </div>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{comment.content}</p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCommentVote(comment.id, 1)}
                    className={`p-1 rounded hover:bg-void-red/20 transition-colors ${
                      userVote === 1 ? "text-void-red" : "text-gray-500"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 4l-8 8h5v8h6v-8h5z" />
                    </svg>
                  </button>
                  <span className="text-sm font-medium">{comment.upvotes - comment.downvotes}</span>
                  <button
                    onClick={() => handleCommentVote(comment.id, -1)}
                    className={`p-1 rounded hover:bg-void-red/20 transition-colors ${
                      userVote === -1 ? "text-void-red" : "text-gray-500"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 20l8-8h-5V4H9v8H4z" />
                    </svg>
                  </button>
                </div>
                {session && !isReply && (
                  <button
                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                    className="text-xs text-gray-500 hover:text-void-red transition-colors"
                  >
                    Reply
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Reply form */}
        {replyingTo === comment.id && (
          <div className="ml-8 mt-2">
            <textarea
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder="Write a reply..."
              className="w-full bg-void-black border border-void-gray/50 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-void-red/50 resize-none"
              rows={3}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleSubmitComment(comment.id)}
                disabled={submitting || !commentContent.trim()}
                className="bg-void-red px-4 py-2 rounded-lg text-sm font-semibold hover:bg-void-red-dark transition-all disabled:opacity-50"
              >
                {submitting ? "Posting..." : "Reply"}
              </button>
              <button
                onClick={() => {
                  setReplyingTo(null);
                  setCommentContent("");
                }}
                className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2">
            {comment.replies.map((reply) => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-void-black text-white">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-void-black text-white">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center text-gray-400">Post not found</div>
        </div>
      </div>
    );
  }

  const userVote = post.votes?.find((v) => v.userId === session?.user?.id)?.value;

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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main content */}
          <div className="lg:col-span-3">
            {/* Post */}
            <div className="bg-void-dark border border-void-gray/50 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                {post.pinned && (
                  <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded text-xs font-medium">
                    Pinned
                  </span>
                )}
                {post.locked && (
                  <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded text-xs font-medium">
                    Locked
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getCategoryColor(post.category)}`}>
                  {post.category.charAt(0).toUpperCase() + post.category.slice(1)}
                </span>
              </div>

              <h1 className="text-2xl font-bold mb-4">{post.title}</h1>

              <div className="flex items-center gap-4 mb-6 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-void-red flex items-center justify-center text-sm font-bold">
                    {post.user.name?.charAt(0) || "U"}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{post.user.username || post.user.name}</p>
                    <p className="text-xs text-gray-500">{formatDate(post.createdAt)}</p>
                  </div>
                </div>
              </div>

              <div className="text-gray-300 whitespace-pre-wrap mb-6">{post.content}</div>

              {post.tags && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {post.tags.split(",").map((tag, i) => (
                    <span key={i} className="bg-void-black/50 text-gray-400 px-3 py-1 rounded-full text-sm">
                      #{tag.trim()}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-void-gray/30">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleVote(1)}
                      className={`p-2 rounded-lg hover:bg-void-red/20 transition-colors ${
                        userVote === 1 ? "text-void-red bg-void-red/20" : "text-gray-400"
                      }`}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 4l-8 8h5v8h6v-8h5z" />
                      </svg>
                    </button>
                    <span className="text-lg font-bold">{post.upvotes - post.downvotes}</span>
                    <button
                      onClick={() => handleVote(-1)}
                      className={`p-2 rounded-lg hover:bg-void-red/20 transition-colors ${
                        userVote === -1 ? "text-void-red bg-void-red/20" : "text-gray-400"
                      }`}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 20l8-8h-5V4H9v8H4z" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>{post.viewCount} views</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span>{post.commentCount} comments</span>
                  </div>
                </div>

                {session?.user?.id === post.user.id && (
                  <button
                    onClick={handleDelete}
                    className="text-red-400 hover:text-red-300 text-sm transition-colors"
                  >
                    Delete Post
                  </button>
                )}
              </div>
            </div>

            {/* Comments */}
            <div className="bg-void-dark border border-void-gray/50 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-6">
                Comments ({post.commentCount})
              </h2>

              {/* Comment form */}
              {session && !post.locked ? (
                <div className="mb-6">
                  <textarea
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder="Write a comment..."
                    className="w-full bg-void-black border border-void-gray/50 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-void-red/50 resize-none"
                    rows={4}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => handleSubmitComment()}
                      disabled={submitting || !commentContent.trim()}
                      className="bg-void-red px-6 py-2 rounded-lg font-semibold hover:bg-void-red-dark transition-all disabled:opacity-50"
                    >
                      {submitting ? "Posting..." : "Post Comment"}
                    </button>
                  </div>
                </div>
              ) : !session ? (
                <div className="bg-void-black/50 rounded-lg p-4 mb-6 text-center">
                  <p className="text-gray-400">
                    <Link href="/auth/login" className="text-void-red hover:underline">Login</Link> to comment
                  </p>
                </div>
              ) : post.locked ? (
                <div className="bg-void-black/50 rounded-lg p-4 mb-6 text-center">
                  <p className="text-gray-400">This post is locked</p>
                </div>
              ) : null}

              {/* Comments list */}
              <div className="space-y-4">
                {post.comments && post.comments.length > 0 ? (
                  post.comments.map((comment) => renderComment(comment))
                ) : (
                  <p className="text-gray-500 text-center py-8">No comments yet. Be the first to comment!</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-void-dark border border-void-gray/50 rounded-lg p-6 sticky top-24">
              <h3 className="font-bold mb-4">Post Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Category</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getCategoryColor(post.category)}`}>
                    {post.category.charAt(0).toUpperCase() + post.category.slice(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Views</span>
                  <span>{post.viewCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Comments</span>
                  <span>{post.commentCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Score</span>
                  <span className="text-void-red font-bold">{post.upvotes - post.downvotes}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}