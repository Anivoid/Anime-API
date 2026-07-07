"use client";

import { useState, useEffect } from "react";

interface Analytics {
  overview: {
    totalAnime: number;
    totalEpisodes: number;
    totalUsers: number;
    totalComments: number;
    totalWatchlists: number;
    totalRatings: number;
  };
  growth: {
    newUsers24h: number;
    newUsers7d: number;
    newAnime24h: number;
    newComments24h: number;
    newEpisodes24h: number;
    activeUsers7d: number;
  };
  topAnime: {
    byWatch: { title: string; slug: string; watches: number }[];
    byRating: { title: string; slug: string; count: number; avg: number }[];
  };
  usersByRole: { role: string; _count: number }[];
  statusDistribution: { status: string; _count: number }[];
  recentActivity: { id: string; action: string; entity: string; details: string | null; createdAt: string; user: { name: string | null; username: string | null } | null }[];
}

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then(setAnalytics)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-black mb-8">Analytics</h1>
        <div className="text-center py-12 text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div>
        <h1 className="text-3xl font-black mb-8">Analytics</h1>
        <div className="text-center py-12 text-gray-500">Failed to load analytics</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-black mb-8">
        ANALYTICS <span className="text-void-red">DASHBOARD</span>
      </h1>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[
          { label: "Anime", value: analytics.overview.totalAnime, color: "text-void-red" },
          { label: "Episodes", value: analytics.overview.totalEpisodes, color: "text-blue-400" },
          { label: "Users", value: analytics.overview.totalUsers, color: "text-green-400" },
          { label: "Comments", value: analytics.overview.totalComments, color: "text-yellow-400" },
          { label: "Watchlists", value: analytics.overview.totalWatchlists, color: "text-purple-400" },
          { label: "Ratings", value: analytics.overview.totalRatings, color: "text-pink-400" },
        ].map((stat) => (
          <div key={stat.label} className="bg-void-dark border border-void-gray/50 rounded-lg p-4">
            <p className="text-gray-500 text-xs">{stat.label}</p>
            <p className={`text-2xl font-black ${stat.color}`}>{stat.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Growth */}
      <div className="bg-void-dark border border-void-gray/50 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-bold mb-4">Growth</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "New Users (24h)", value: analytics.growth.newUsers24h },
            { label: "New Users (7d)", value: analytics.growth.newUsers7d },
            { label: "Active Users (7d)", value: analytics.growth.activeUsers7d },
            { label: "New Anime (24h)", value: analytics.growth.newAnime24h },
            { label: "New Episodes (24h)", value: analytics.growth.newEpisodes24h },
            { label: "New Comments (24h)", value: analytics.growth.newComments24h },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-gray-500 text-xs">{stat.label}</p>
              <p className="text-xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Top Anime by Watch */}
        <div className="bg-void-dark border border-void-gray/50 rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4">Most Watched</h2>
          {analytics.topAnime.byWatch.length === 0 ? (
            <p className="text-gray-500 text-sm">No data yet</p>
          ) : (
            <div className="space-y-3">
              {analytics.topAnime.byWatch.map((a, i) => (
                <div key={a.slug} className="flex items-center gap-3">
                  <span className="text-void-red font-bold w-6">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm text-gray-300">{a.title}</p>
                    <div className="h-1 bg-void-gray rounded-full mt-1">
                      <div
                        className="h-full bg-void-red rounded-full"
                        style={{ width: `${(a.watches / (analytics.topAnime.byWatch[0]?.watches || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">{a.watches}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Anime by Rating */}
        <div className="bg-void-dark border border-void-gray/50 rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4">Highest Rated</h2>
          {analytics.topAnime.byRating.length === 0 ? (
            <p className="text-gray-500 text-sm">No data yet</p>
          ) : (
            <div className="space-y-3">
              {analytics.topAnime.byRating.map((a, i) => (
                <div key={a.slug} className="flex items-center gap-3">
                  <span className="text-yellow-400 font-bold w-6">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm text-gray-300">{a.title}</p>
                    <p className="text-xs text-gray-500">{a.count} ratings</p>
                  </div>
                  <span className="text-sm text-yellow-400 font-bold">★ {a.avg.toFixed(1)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Users by Role */}
        <div className="bg-void-dark border border-void-gray/50 rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4">Users by Role</h2>
          <div className="space-y-2">
            {analytics.usersByRole.map((r) => (
              <div key={r.role} className="flex items-center justify-between">
                <span className="text-sm text-gray-400">{r.role}</span>
                <span className="text-sm font-bold text-white">{r._count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-void-dark border border-void-gray/50 rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4">Anime by Status</h2>
          <div className="space-y-2">
            {analytics.statusDistribution.map((s) => (
              <div key={s.status} className="flex items-center justify-between">
                <span className="text-sm text-gray-400">{s.status}</span>
                <span className="text-sm font-bold text-white">{s._count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-void-dark border border-void-gray/50 rounded-lg p-6">
        <h2 className="text-lg font-bold mb-4">Recent Activity</h2>
        {analytics.recentActivity.length === 0 ? (
          <p className="text-gray-500 text-sm">No activity yet</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {analytics.recentActivity.map((a) => (
              <div key={a.id} className="flex items-center gap-3 text-sm py-2 border-b border-void-gray/20 last:border-0">
                <span className="text-gray-600 text-xs w-20 flex-shrink-0">
                  {new Date(a.createdAt).toLocaleDateString()}
                </span>
                <span className="text-void-red font-medium w-32 truncate">{a.action}</span>
                <span className="text-gray-500 truncate flex-1">{a.details || a.entity}</span>
                <span className="text-gray-600 text-xs">
                  {a.user ? `@${a.user.username || a.user.name}` : "System"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
