"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { ReportModal } from "./ReportModal";

interface CommentUser {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
}

export interface CommentLike {
  userId: string;
  commentId: string;
  value: number;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  animeId: string;
  episodeId: string | null;
  parentId: string | null;
  user: CommentUser;
  replies?: Comment[];
  commentLikes?: CommentLike[];
}

interface CommentSectionProps {
  animeId: string;
}

export function CommentSection({ animeId }: CommentSectionProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionResults, setMentionResults] = useState<CommentUser[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/comments?animeId=${animeId}`);
      const data = await res.json();
      setComments(data);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [animeId]);

  const searchUsers = async (query: string) => {
    if (query.length < 1) {
      setMentionResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        setMentionResults(data);
      }
    } catch {
      setMentionResults([]);
    }
  };

  const handleContentChange = (value: string) => {
    setContent(value);

    // Detect @mentions
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setShowMentions(true);
      setMentionQuery(mentionMatch[1]);
      searchUsers(mentionMatch[1]);
    } else {
      setShowMentions(false);
      setMentionResults([]);
    }
  };

  const insertMention = (username: string) => {
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = content.substring(0, cursorPos);
    const textAfterCursor = content.substring(cursorPos);
    const beforeMention = textBeforeCursor.replace(/@\w*$/, `@${username} `);
    setContent(beforeMention + textAfterCursor);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          animeId,
          content,
          parentId: replyTo?.id || null,
        }),
      });

      if (res.ok) {
        const newComment = await res.json();
        if (replyTo) {
          setComments((prev) =>
            prev.map((c) =>
              c.id === replyTo.id
                ? { ...c, replies: [...(c.replies || []), newComment] }
                : c
            )
          );
        } else {
          setComments((prev) => [newComment, ...prev]);
        }
        setContent("");
        setReplyTo(null);
      }
    } catch (error) {
      console.error("Error posting comment:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const res = await fetch(`/api/comments?commentId=${commentId}`, { method: "DELETE" });
      if (res.ok) {
        setComments((prev) => {
          const filtered = prev.filter((c) => c.id !== commentId);
          return filtered.map((c) => ({
            ...c,
            replies: (c.replies || []).filter((r) => r.id !== commentId),
          }));
        });
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">
        Comments <span className="text-void-red">({comments.length})</span>
      </h2>

      {session ? (
        <form onSubmit={handleSubmit} className="bg-void-dark border border-void-gray/50 rounded-lg p-6 mb-6 relative">
          {replyTo && (
            <div className="flex items-center gap-2 mb-3 text-sm">
              <span className="text-gray-500">Replying to</span>
              <Link href={`/profile/${replyTo.username}`} className="text-void-red hover:text-void-red-glow">
                @{replyTo.username}
              </Link>
              <button type="button" onClick={() => setReplyTo(null)} className="text-gray-500 hover:text-white ml-auto">
                ✕
              </button>
            </div>
          )}

          <div className="relative">
            <textarea
              ref={textareaRef}
              placeholder="Write a comment... Use @ to mention someone"
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              className="w-full bg-void-black border border-void-gray rounded-lg px-4 py-3 focus:outline-none focus:border-void-red transition-colors resize-none"
              rows={3}
            />

            {showMentions && mentionResults.length > 0 && (
              <div className="absolute bottom-full left-0 w-full mb-1 bg-void-dark border border-void-gray/50 rounded-lg overflow-hidden shadow-lg z-10">
                {mentionResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => insertMention(user.username || user.name || "")}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-void-red/10 transition-colors text-left"
                  >
                    <div className="w-6 h-6 rounded-full bg-void-red flex items-center justify-center text-xs font-bold">
                      {(user.username || user.name || "U").charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-300">{user.username || user.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="mt-4 bg-void-red px-6 py-2 rounded-lg font-semibold hover:bg-void-red-dark transition-all disabled:opacity-50 glow-red btn-ripple"
          >
            {loading ? "Posting..." : "Post Comment"}
          </button>
        </form>
      ) : (
        <div className="bg-void-dark border border-void-gray/50 rounded-lg p-6 mb-6 text-center text-gray-500">
          <Link href="/auth/login" className="text-void-red hover:text-void-red-glow transition-colors">
            Login
          </Link>{" "}
          to post a comment
        </div>
      )}

      {fetching ? (
        <div className="text-center py-8 text-gray-500">Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No comments yet. Be the first to comment!</div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={session?.user?.id}
              userRole={(session?.user as { role?: string })?.role}
              onReply={(id, username) => setReplyTo({ id, username })}
              onDelete={handleDelete}
              formatDate={formatDate}
              animeId={animeId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  currentUserId,
  userRole,
  onReply,
  onDelete,
  formatDate,
  animeId,
}: {
  comment: Comment;
  currentUserId?: string;
  userRole?: string;
  onReply: (id: string, username: string) => void;
  onDelete: (id: string) => void;
  formatDate: (date: string) => string;
  animeId: string;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [likes, setLikes] = useState(
    comment.commentLikes?.filter((l) => l.value === 1).length || 0
  );
  const [dislikes, setDislikes] = useState(
    comment.commentLikes?.filter((l) => l.value === -1).length || 0
  );
  const [userLike, setUserLike] = useState<number | null>(
    comment.commentLikes?.find((l) => l.userId === currentUserId)?.value || null
  );
  const [showReportModal, setShowReportModal] = useState(false);

  const handleLike = async (value: 1 | -1) => {
    if (!currentUserId) return;
    try {
      const res = await fetch("/api/comment-likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId: comment.id, value }),
      });
      if (res.ok) {
        const data = await res.json();
        setLikes(data.likes);
        setDislikes(data.dislikes);
        setUserLike(data.userLike);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const canDelete = currentUserId === comment.userId || ["OWNER", "ADMIN", "MODERATOR"].includes(userRole || "");

  const renderContent = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (/^@\w+$/.test(part)) {
        const username = part.slice(1);
        return (
          <Link key={i} href={`/profile/${username}`} className="text-void-red hover:text-void-red-glow font-medium">
            {part}
          </Link>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div id={`comment-${comment.id}`} className="bg-void-dark border border-void-gray/50 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Link href={`/profile/${comment.user.username || ""}`}>
          <div className="w-8 h-8 rounded-full bg-void-red flex items-center justify-center text-sm font-bold flex-shrink-0">
            {comment.user.image ? (
              <Image src={comment.user.image} alt="" unoptimized className="w-full h-full rounded-full object-cover" width={32} height={32} />
            ) : (
              (comment.user.username || comment.user.name || "U").charAt(0).toUpperCase()
            )}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/profile/${comment.user.username || ""}`} className="font-semibold text-sm text-gray-300 hover:text-void-red transition-colors">
              {comment.user.username || comment.user.name || "Anonymous"}
            </Link>
            <span className="text-xs text-gray-600">{formatDate(comment.createdAt)}</span>
          </div>

          <p className="text-gray-400 text-sm leading-relaxed">
            {renderContent(comment.content)}
          </p>

          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleLike(1)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  userLike === 1 ? "text-void-red bg-void-red/10" : "text-gray-500 hover:text-void-red"
                }`}
              >
                ▲ {likes}
              </button>
              <button
                onClick={() => handleLike(-1)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  userLike === -1 ? "text-red-400 bg-red-400/10" : "text-gray-500 hover:text-red-400"
                }`}
              >
                ▼ {dislikes}
              </button>
            </div>

            {currentUserId && (
              <button
                onClick={() => onReply(comment.id, comment.user.username || comment.user.name || "")}
                className="text-xs text-gray-500 hover:text-void-red transition-colors"
              >
                Reply
              </button>
            )}

            {canDelete && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-xs text-gray-600 hover:text-red-400 transition-colors"
              >
                Delete
              </button>
            )}

            {currentUserId && currentUserId !== comment.userId && (
              <button
                onClick={() => setShowReportModal(true)}
                className="text-xs text-gray-600 hover:text-yellow-400 transition-colors"
              >
                Report
              </button>
            )}
          </div>
        </div>
      </div>

      {showReportModal && (
        <ReportModal
          commentId={comment.id}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 ml-11">
          {!showReplies ? (
            <button
              onClick={() => setShowReplies(true)}
              className="text-xs text-void-red hover:text-void-red-glow transition-colors"
            >
              Show {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}
            </button>
          ) : (
            <div className="space-y-3 border-l-2 border-void-gray/30 pl-4">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={{ ...reply, replies: [] }}
                  currentUserId={currentUserId}
                  userRole={userRole}
                  onReply={onReply}
                  onDelete={onDelete}
                  formatDate={formatDate}
                  animeId={animeId}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
