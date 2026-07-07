"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Comment, CommentLike } from "./CommentSection";

interface EpisodeCommentSectionProps {
  animeId: string;
  episodeId: string;
}

export function EpisodeCommentSection({ animeId, episodeId }: EpisodeCommentSectionProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetch(`/api/comments?animeId=${animeId}&episodeId=${episodeId}`)
      .then((r) => r.json())
      .then((data) => setComments(Array.isArray(data) ? data : []))
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [animeId, episodeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ animeId, episodeId, content: newComment }),
      });
      if (res.ok) {
        const comment = await res.json();
        setComments((prev) => [comment, ...prev]);
        setNewComment("");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (commentId: string) => {
    fetch(`/api/comments?commentId=${commentId}`, { method: "DELETE" })
      .then(() => setComments((prev) => prev.filter((c) => c.id !== commentId)));
  };

  const handleLike = async (commentId: string, value: 1 | -1) => {
    if (!session) return;
    const res = await fetch("/api/comment-likes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId, value }),
    });
    if (res.ok) {
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            const existing = c.commentLikes?.find((l) => l.userId === session.user?.id);
            if (existing) {
              if (existing.value === value) {
                return { ...c, commentLikes: c.commentLikes!.filter((l) => l.userId !== session.user?.id) };
              }
              return {
                ...c,
                commentLikes: c.commentLikes!.map((l) =>
                  l.userId === session.user?.id ? { ...l, value } : l
                ),
              };
            }
            return { ...c, commentLikes: [...(c.commentLikes || []), { userId: session.user!.id, commentId, value }] };
          }
          return c;
        })
      );
    }
  };

  const displayComments = showAll ? comments : comments.slice(0, 3);

  return (
    <div>
      {session && (
        <form onSubmit={handleSubmit} className="mb-6">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Comment on this episode... (use @username to mention)"
            className="w-full bg-void-dark border border-void-gray rounded-lg p-3 text-white placeholder-gray-500 focus:border-void-red focus:outline-none resize-none"
            rows={2}
          />
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={!newComment.trim() || submitting}
              className="bg-void-red px-4 py-2 rounded text-white text-sm hover:bg-void-red-dark disabled:opacity-50 transition-colors"
            >
              {submitting ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-4 text-gray-500">Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-6 text-gray-500">No comments on this episode yet. Be the first!</div>
      ) : (
        <>
          <div className="space-y-1">
            {displayComments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} session={session} onDelete={handleDelete} onLike={handleLike} />
            ))}
          </div>
          {comments.length > 3 && !showAll && (
            <button onClick={() => setShowAll(true)} className="text-void-red text-sm mt-3 hover:underline">
              View all {comments.length} comments
            </button>
          )}
        </>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  session,
  onDelete,
  onLike,
}: {
  comment: Comment;
  session: { user?: { id: string; role?: string } | null } | null;
  onDelete: (id: string) => void;
  onLike: (id: string, value: 1 | -1) => void;
}) {
  const [replying, setReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [replies, setReplies] = useState<Comment[]>(comment.replies || []);
  const [showReplies, setShowReplies] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionResults, setMentionResults] = useState<{ id: string; username: string }[]>([]);

  const userLike = comment.commentLikes?.find((l) => l.userId === session?.user?.id);
  const likeCount = (comment.commentLikes || []).filter((l) => l.value === 1).length;
  const dislikeCount = (comment.commentLikes || []).filter((l) => l.value === -1).length;
  const canDelete = session?.user?.id === comment.userId || ["OWNER", "ADMIN"].includes(session?.user?.role || "");

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ animeId: comment.animeId, episodeId: comment.episodeId, content: replyContent, parentId: comment.id }),
      });
      if (res.ok) {
        const reply = await res.json();
        setReplies((prev) => [...prev, reply]);
        setReplyContent("");
        setShowReplies(true);
        setReplying(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleContentChange = (value: string) => {
    setReplyContent(value);
    const atMatch = value.match(/@(\w*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      fetch(`/api/users/search?q=${atMatch[1]}&limit=5`)
        .then((r) => r.json())
        .then((data) => setMentionResults(Array.isArray(data) ? data : []))
        .catch(() => setMentionResults([]));
    } else {
      setMentionQuery("");
      setMentionResults([]);
    }
  };

  const insertMention = (username: string) => {
    setReplyContent((prev) => prev.replace(/@\w*$/, `@${username} `));
    setMentionQuery("");
    setMentionResults([]);
  };

  return (
    <div className="py-2">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-void-red flex items-center justify-center text-white text-xs font-bold">
          {(comment.user?.name || comment.user?.username || "?").charAt(0).toUpperCase()}
        </div>
        <div>
          <span className="text-white text-sm font-medium">
            {comment.user?.username ? `@${comment.user.username}` : comment.user?.name}
          </span>
          <span className="text-gray-600 text-xs ml-2">
            {new Date(comment.createdAt).toLocaleDateString()}
          </span>
        </div>
        {canDelete && (
          <button onClick={() => onDelete(comment.id)} className="ml-auto text-gray-600 hover:text-void-red text-xs">
            Delete
          </button>
        )}
      </div>
      <p className="text-gray-300 text-sm mt-1 ml-10">{comment.content}</p>
      <div className="flex items-center gap-3 ml-10 mt-1">
        <button onClick={() => onLike(comment.id, 1)} className={`text-xs ${userLike?.value === 1 ? "text-void-red" : "text-gray-500 hover:text-void-red"}`}>
          👍 {likeCount}
        </button>
        <button onClick={() => onLike(comment.id, -1)} className={`text-xs ${userLike?.value === -1 ? "text-void-red" : "text-gray-500 hover:text-void-red"}`}>
          👎 {dislikeCount}
        </button>
        {session && (
          <button onClick={() => setReplying(!replying)} className="text-xs text-gray-500 hover:text-void-red">
            Reply
          </button>
        )}
      </div>
      {replying && (
        <div className="ml-10 mt-2">
          <div className="relative">
            <textarea
              value={replyContent}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Write a reply... (use @ to mention)"
              className="w-full bg-void-dark border border-void-gray rounded p-2 text-white text-sm placeholder-gray-500 focus:border-void-red focus:outline-none resize-none"
              rows={2}
              autoFocus
            />
            {mentionResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-void-dark border border-void-gray rounded mt-1 z-10 shadow-lg">
                {mentionResults.map((u) => (
                  <button key={u.id} onClick={() => insertMention(u.username)} className="block w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-void-red/20 hover:text-white">
                    @{u.username}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={handleReply} disabled={!replyContent.trim() || submitting} className="bg-void-red px-3 py-1 rounded text-white text-xs hover:bg-void-red-dark disabled:opacity-50">
              {submitting ? "Posting..." : "Reply"}
            </button>
            <button onClick={() => setReplying(false)} className="text-gray-500 text-xs hover:text-white">
              Cancel
            </button>
          </div>
        </div>
      )}
      {replies.length > 0 && (
        <div className="ml-10 mt-2">
          {!showReplies && (
            <button onClick={() => setShowReplies(true)} className="text-void-red text-xs hover:underline">
              {replies.length} {replies.length === 1 ? "reply" : "replies"}
            </button>
          )}
          {showReplies && (
            <div className="space-y-2 border-l border-void-gray pl-3">
              {replies.map((reply) => (
                <div key={reply.id} className="py-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-void-red flex items-center justify-center text-white text-[10px] font-bold">
                      {(reply.user?.name || reply.user?.username || "?").charAt(0).toUpperCase()}
                    </div>
                    <span className="text-white text-xs font-medium">
                      {reply.user?.username ? `@${reply.user.username}` : reply.user?.name}
                    </span>
                    <span className="text-gray-600 text-[10px]">{new Date(reply.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-gray-300 text-xs mt-1 ml-8">{reply.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
