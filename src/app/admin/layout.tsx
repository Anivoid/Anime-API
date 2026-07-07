"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navByRole: Record<string, { label: string; href: string; icon: string }[]> = {
  OWNER: [
    { label: "Dashboard", href: "/admin", icon: "◆" },
    { label: "Analytics", href: "/admin/analytics", icon: "📊" },
    { label: "Anime", href: "/admin/anime", icon: "▸" },
    { label: "Episodes", href: "/admin/episodes", icon: "▸" },
    { label: "Users", href: "/admin/users", icon: "▸" },
    { label: "Featured", href: "/admin/featured", icon: "▸" },
    { label: "Banners", href: "/admin/banners", icon: "▸" },
    { label: "Reports", href: "/admin/reports", icon: "▸" },
    { label: "Moderation", href: "/admin/moderation", icon: "🛡" },
    { label: "RSS Feeds", href: "/admin/rss", icon: "📡" },
    { label: "Providers", href: "/admin/providers", icon: "⚡" },
    { label: "Scheduler", href: "/admin/scheduler", icon: "▸" },
    { label: "Activity", href: "/admin/activity", icon: "▸" },
    { label: "Backup", href: "/admin/backup", icon: "💾" },
  ],
  ADMIN: [
    { label: "Dashboard", href: "/admin", icon: "◆" },
    { label: "Analytics", href: "/admin/analytics", icon: "📊" },
    { label: "Anime", href: "/admin/anime", icon: "▸" },
    { label: "Episodes", href: "/admin/episodes", icon: "▸" },
    { label: "Featured", href: "/admin/featured", icon: "▸" },
    { label: "Banners", href: "/admin/banners", icon: "▸" },
    { label: "Reports", href: "/admin/reports", icon: "▸" },
    { label: "Moderation", href: "/admin/moderation", icon: "🛡" },
    { label: "RSS Feeds", href: "/admin/rss", icon: "📡" },
    { label: "Providers", href: "/admin/providers", icon: "⚡" },
    { label: "Scheduler", href: "/admin/scheduler", icon: "▸" },
    { label: "Activity", href: "/admin/activity", icon: "▸" },
  ],
  MODERATOR: [
    { label: "Dashboard", href: "/admin", icon: "◆" },
    { label: "Anime", href: "/admin/anime", icon: "▸" },
    { label: "Featured", href: "/admin/featured", icon: "▸" },
    { label: "Reports", href: "/admin/reports", icon: "▸" },
    { label: "Moderation", href: "/admin/moderation", icon: "🛡" },
  ],
  UPLOADER: [
    { label: "Dashboard", href: "/admin", icon: "◆" },
    { label: "Anime", href: "/admin/anime", icon: "▸" },
    { label: "Episodes", href: "/admin/episodes", icon: "▸" },
  ],
};

const roleColors: Record<string, string> = {
  OWNER: "text-red-400",
  ADMIN: "text-purple-400",
  MODERATOR: "text-blue-400",
  UPLOADER: "text-green-400",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const userRole = (session?.user as { role?: string })?.role || "";
  const allowedRoles = ["OWNER", "ADMIN", "MODERATOR", "UPLOADER"];

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-void-black flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!session || !allowedRoles.includes(userRole)) {
    return (
      <div className="min-h-screen bg-void-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full border-2 border-void-red/50 flex items-center justify-center animate-red-glow">
            <svg className="w-10 h-10 text-void-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-500 mb-6">Admin privileges required.</p>
          <Link href="/" className="bg-void-red px-6 py-3 rounded-lg font-semibold text-white hover:bg-void-red-dark transition-all glow-red">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const nav = navByRole[userRole] || navByRole.UPLOADER;

  return (
    <div className="min-h-screen bg-void-black text-white flex">
      <aside className="w-64 bg-void-dark border-r border-void-gray/30 flex-shrink-0 flex flex-col">
        <div className="p-6 border-b border-void-gray/30">
          <Link href="/admin" className="text-xl font-bold">
            <span className="text-void-red">ANIME</span>VOID
          </Link>
          <p className="text-xs text-gray-500 mt-1">Admin Panel</p>
          <span className={`text-xs font-medium mt-2 inline-block ${roleColors[userRole] || "text-gray-400"}`}>
            {userRole}
          </span>
        </div>
        <nav className="p-4 flex-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all ${
                pathname === item.href
                  ? "bg-void-red/10 text-void-red border border-void-red/30"
                  : "text-gray-400 hover:bg-void-gray/30 hover:text-white border border-transparent"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-void-gray/30">
          <div className="text-sm text-gray-500 truncate">{session.user?.name || session.user?.email}</div>
          <Link href="/" className="text-xs text-void-red hover:text-void-red-glow mt-1 inline-block">
            ← Back to site
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  );
}
