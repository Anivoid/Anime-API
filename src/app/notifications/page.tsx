"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
  sender: { id: string; name: string | null; username: string | null; image: string | null } | null;
}

const TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  NEW_EPISODE: { icon: "🎬", label: "New Episode", color: "bg-green-600/20 text-green-400" },
  COMMENT_REPLY: { icon: "↩", label: "Reply", color: "bg-blue-600/20 text-blue-400" },
  MENTION: { icon: "@", label: "Mention", color: "bg-void-red/20 text-void-red" },
  COMMENT_LIKE: { icon: "♥", label: "Like", color: "bg-pink-600/20 text-pink-400" },
  RATING: { icon: "★", label: "Rating", color: "bg-yellow-600/20 text-yellow-400" },
};

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => setNotifications(data.notifications || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [status]);

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: id }),
    });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const unread = notifications.filter((n) => !n.read);
  const filtered = filter === "all" ? notifications : notifications.filter((n) => n.type === filter);

  if (loading) {
    return (
      <div className="min-h-screen bg-void-black text-white">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void-black text-white">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black">
            NOTIFICATIONS <span className="text-void-red">({unread.length})</span>
          </h1>
          {unread.length > 0 && (
            <button onClick={markAllRead} className="text-void-red text-sm hover:text-void-red-glow transition-colors">
              Mark all as read
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {["all", "NEW_EPISODE", "COMMENT_REPLY", "MENTION", "COMMENT_LIKE"].map((tab) => {
            const config = tab === "all" ? { label: "All", icon: "•" } : TYPE_CONFIG[tab];
            const count = tab === "all" ? unread.length : notifications.filter((n) => n.type === tab && !n.read).length;
            return (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all ${
                  filter === tab
                    ? "bg-void-red text-white"
                    : "bg-void-dark border border-void-gray text-gray-400 hover:text-white"
                }`}
              >
                {config?.icon} {config?.label}
                {count > 0 && (
                  <span className="ml-1 bg-white/20 px-1 rounded text-xs">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No notifications</p>
            <Link href="/browse" className="text-void-red text-sm mt-2 inline-block hover:text-void-red-glow">
              Browse anime
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((n) => {
              const config = TYPE_CONFIG[n.type] || { icon: "•", color: "bg-gray-600/20 text-gray-400", label: "Unknown" };
              return (
                <div
                  key={n.id}
                  className={`bg-void-dark border rounded-lg p-4 transition-all cursor-pointer hover:border-void-red/30 ${
                    !n.read ? "border-void-red/30 bg-void-red/5" : "border-void-gray/30"
                  }`}
                  onClick={() => {
                    if (!n.read) markRead(n.id);
                    if (n.link) router.push(n.link);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${config.color}`}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${config.color}`}>{config.label}</span>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-void-red" />}
                      </div>
                      <p className="font-medium text-gray-300 mt-1">{n.title}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                        <span>{new Date(n.createdAt).toLocaleString()}</span>
                        {n.sender && <span>from @{n.sender.username || n.sender.name}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
