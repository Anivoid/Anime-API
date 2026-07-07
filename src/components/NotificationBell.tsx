"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
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
  NEW_EPISODE: { icon: "🎬", label: "Episodes", color: "bg-green-600/20 text-green-400" },
  COMMENT_REPLY: { icon: "↩", label: "Replies", color: "bg-blue-600/20 text-blue-400" },
  MENTION: { icon: "@", label: "Mentions", color: "bg-void-red/20 text-void-red" },
  COMMENT_LIKE: { icon: "♥", label: "Likes", color: "bg-pink-600/20 text-pink-400" },
  RATING: { icon: "★", label: "Ratings", color: "bg-yellow-600/20 text-yellow-400" },
};

export function NotificationBell() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
        setTypeCounts(data.typeCounts || {});
      }
    } catch {}
  };

  useEffect(() => {
    if (!session) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      setTypeCounts({});
    } catch {}
  };

  const markTypeRead = async (type: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      setNotifications((prev) => prev.map((n) => (n.type === type ? { ...n, read: true } : n)));
      setTypeCounts((prev) => ({ ...prev, [type]: 0 }));
      setUnreadCount((prev) => Math.max(0, prev - (typeCounts[type] || 0)));
    } catch {}
  };

  const markRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      const notif = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (notif && !notif.read) {
        setTypeCounts((prev) => ({
          ...prev,
          [notif.type]: Math.max(0, (prev[notif.type] || 0) - 1),
        }));
      }
    } catch {}
  };

  if (!session) return null;

  const filtered = activeTab === "all"
    ? notifications
    : notifications.filter((n) => n.type === activeTab);

  const tabs = ["all", "NEW_EPISODE", "COMMENT_REPLY", "MENTION", "COMMENT_LIKE"];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-400 hover:text-void-red transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-void-red text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-void-dark border border-void-gray/50 rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-void-gray/30">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-void-red hover:text-void-red-glow transition-colors">
                Mark all read
              </button>
            )}
          </div>

          {/* Type tabs */}
          <div className="flex gap-1 p-2 border-b border-void-gray/20 overflow-x-auto">
            {tabs.map((tab) => {
              const config = tab === "all" ? { label: "All", icon: "•" } : TYPE_CONFIG[tab];
              const count = tab === "all" ? unreadCount : (typeCounts[tab] || 0);
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2 py-1 rounded text-xs whitespace-nowrap transition-colors ${
                    activeTab === tab
                      ? "bg-void-red/20 text-void-red"
                      : "text-gray-500 hover:text-white hover:bg-void-gray/30"
                  }`}
                >
                  {config?.icon} {config?.label}
                  {count > 0 && (
                    <span className="ml-1 bg-void-red/30 text-void-red px-1 rounded text-[10px]">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">No notifications</div>
            ) : (
              filtered.map((n) => {
                const config = TYPE_CONFIG[n.type] || { icon: "•", color: "bg-gray-600/20 text-gray-400" };
                return (
                  <div
                    key={n.id}
                    className={`p-3 border-b border-void-gray/20 hover:bg-void-black/50 transition-colors cursor-pointer ${
                      !n.read ? "bg-void-red/5" : ""
                    }`}
                    onClick={() => {
                      if (!n.read) markRead(n.id);
                      if (n.link) window.location.href = n.link;
                      setOpen(false);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${config.color}`}>
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-300">{n.title}</p>
                        <p className="text-xs text-gray-500 truncate">{n.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-gray-600">
                            {new Date(n.createdAt).toLocaleString()}
                          </p>
                          {n.sender && (
                            <span className="text-xs text-gray-600">
                              from @{n.sender.username || n.sender.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!n.read && <div className="w-2 h-2 rounded-full bg-void-red flex-shrink-0" />}
                        {activeTab === "all" && (typeCounts[n.type] || 0) > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markTypeRead(n.type); }}
                            className="text-[10px] text-gray-600 hover:text-void-red"
                          >
                            Mark type read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-void-gray/30 text-center">
            <Link
              href="/notifications"
              className="text-xs text-void-red hover:text-void-red-glow transition-colors"
              onClick={() => setOpen(false)}
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
