"use client";

import { useState, useEffect, useCallback } from "react";

interface Feed {
  id: string;
  name: string;
  url: string;
  type: string;
  category: string;
  enabled: boolean;
  priority: number;
  checkInterval: number;
  lastCheckedAt: string | null;
  itemCount: number;
  errorCount: number;
  totalImported: number;
  lastError: string | null;
  _count: { items: number; importLogs: number };
}

interface Log {
  id: string;
  action: string;
  status: string;
  message: string | null;
  duration: number | null;
  createdAt: string;
  feedSource: { name: string };
}

interface RetryItem {
  id: string;
  title: string;
  error: string | null;
  retryCount: number;
  createdAt: string;
  feedSource: { name: string };
}

interface TopAnime {
  id: string;
  title: string;
  slug: string;
  coverImage: string | null;
  _count: { rssItems: number; episodes: number };
}

interface Stats {
  feeds: Feed[];
  recentLogs: Log[];
  totalItems: number;
  importedItems: number;
  failedItems: number;
  pendingItems: number;
  todayImports: number;
  todayErrors: number;
  analytics: {
    totalAnime: number;
    totalEpisodes: number;
    airingToday: number;
    importsToday: number;
    failedToday: number;
    duplicatePrevented: number;
  };
  queueStats: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    recentJobs: { id: string; type: string; status: string; attempts: number; lastError: string | null; createdAt: string }[];
  };
  retryQueue: RetryItem[];
  topImported: TopAnime[];
}

export default function AdminRSSPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncAll, setSyncAll] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "feeds" | "logs" | "queue" | "analytics">("overview");
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [newFeed, setNewFeed] = useState({ name: "", url: "", type: "nyaa", category: "sub", checkInterval: 10 });

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/rss-stats");
      setStats(await res.json());
    } catch (e) {
      console.error("Failed to fetch stats:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  async function syncFeed(id: string) {
    setSyncing(id);
    try {
      const res = await fetch("/api/admin/feeds/" + id, { method: "POST" });
      const data = await res.json();
      alert(data.success ? `Synced: ${data.result.imported} imported` : `Failed: ${data.error}`);
      fetchStats();
    } catch {
      alert("Sync failed");
    } finally {
      setSyncing(null);
    }
  }

  async function syncAllFeeds() {
    setSyncAll(true);
    try {
      const res = await fetch("/api/cron/rss-check", { method: "POST" });
      const data = await res.json();
      alert(`Checked: ${data.totalImported} imported, ${data.totalFailed} failed`);
      fetchStats();
    } catch {
      alert("Failed");
    } finally {
      setSyncAll(false);
    }
  }

  async function toggleFeed(id: string, enabled: boolean) {
    await fetch("/api/admin/feeds/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    fetchStats();
  }

  async function deleteFeed(id: string) {
    if (!confirm("Delete this feed?")) return;
    await fetch("/api/admin/feeds/" + id, { method: "DELETE" });
    fetchStats();
  }

  async function addFeed() {
    await fetch("/api/admin/feeds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newFeed),
    });
    setShowAddFeed(false);
    fetchStats();
  }

  async function retryFailed() {
    await fetch("/api/admin/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "retry_failed" }),
    });
    alert("Retry jobs queued");
    fetchStats();
  }

  async function processQueue() {
    const res = await fetch("/api/admin/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "process", batchSize: 20 }),
    });
    const data = await res.json();
    alert(`Processed: ${data.processed}, Succeeded: ${data.succeeded}`);
    fetchStats();
  }

  if (loading) return <div className="text-center py-20 text-gray-500">Loading...</div>;
  if (!stats) return <div className="text-center py-20 text-red-400">Failed to load stats</div>;

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: "📊" },
    { id: "feeds" as const, label: "Feeds", icon: "📡" },
    { id: "logs" as const, label: "Logs", icon: "📋" },
    { id: "queue" as const, label: "Queue", icon: "⚙" },
    { id: "analytics" as const, label: "Analytics", icon: "📈" },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">
          <span className="text-void-red">RSS</span> Automation
        </h1>
        <div className="flex gap-3">
          <button onClick={retryFailed} className="px-4 py-2 rounded-lg bg-yellow-600/20 border border-yellow-600/50 text-yellow-400 hover:bg-yellow-600/30 text-sm">
            Retry Failed ({stats.failedItems})
          </button>
          <button onClick={processQueue} className="px-4 py-2 rounded-lg bg-blue-600/20 border border-blue-600/50 text-blue-400 hover:bg-blue-600/30 text-sm">
            Process Queue ({stats.queueStats.pending})
          </button>
          <button onClick={syncAllFeeds} disabled={syncAll} className="px-4 py-2 rounded-lg bg-green-600/20 border border-green-600/50 text-green-400 hover:bg-green-600/30 text-sm disabled:opacity-50">
            {syncAll ? "Syncing..." : "Sync All"}
          </button>
          <button onClick={() => setShowAddFeed(true)} className="px-4 py-2 rounded-lg bg-void-red text-white hover:bg-void-red-dark text-sm font-semibold glow-red">
            + Add Feed
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-void-dark rounded-xl p-1 border border-void-gray/30">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm transition-all ${
              activeTab === tab.id ? "bg-void-red text-white" : "text-gray-400 hover:bg-void-gray/30"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-6 gap-4">
            {[
              { label: "Total Anime", value: stats.analytics.totalAnime, color: "text-white" },
              { label: "Total Episodes", value: stats.analytics.totalEpisodes, color: "text-blue-400" },
              { label: "Airing", value: stats.analytics.airingToday, color: "text-green-400" },
              { label: "Imported Today", value: stats.todayImports, color: "text-purple-400" },
              { label: "Failed Today", value: stats.todayErrors, color: "text-red-400" },
              { label: "Duplicates Blocked", value: stats.analytics.duplicatePrevented, color: "text-yellow-400" },
            ].map((s) => (
              <div key={s.label} className="bg-void-dark border border-void-gray/30 rounded-xl p-4">
                <div className="text-xs text-gray-500">{s.label}</div>
                <div className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-void-dark border border-void-gray/30 rounded-xl p-6">
              <h3 className="font-semibold text-gray-200 mb-4">Queue Status</h3>
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-400">{stats.queueStats.pending}</div>
                  <div className="text-xs text-gray-500">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-400">{stats.queueStats.processing}</div>
                  <div className="text-xs text-gray-500">Processing</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-400">{stats.queueStats.completed}</div>
                  <div className="text-xs text-gray-500">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-400">{stats.queueStats.failed}</div>
                  <div className="text-xs text-gray-500">Failed</div>
                </div>
              </div>
            </div>

            <div className="bg-void-dark border border-void-gray/30 rounded-xl p-6">
              <h3 className="font-semibold text-gray-200 mb-4">Feed Health</h3>
              <div className="space-y-2">
                {stats.feeds.slice(0, 5).map((feed) => (
                  <div key={feed.id} className="flex items-center gap-3 text-sm">
                    <span className={`w-2 h-2 rounded-full ${feed.enabled ? "bg-green-500" : "bg-gray-600"}`} />
                    <span className="flex-1 truncate text-gray-300">{feed.name}</span>
                    <span className="text-gray-500">{feed.totalImported} items</span>
                    {feed.errorCount > 0 && <span className="text-red-400">{feed.errorCount} err</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-void-dark border border-void-gray/30 rounded-xl p-6">
            <h3 className="font-semibold text-gray-200 mb-4">Top Imported Anime</h3>
            <div className="grid grid-cols-5 gap-4">
              {stats.topImported.slice(0, 5).map((anime) => (
                <div key={anime.id} className="flex items-center gap-3">
                  {anime.coverImage && <img src={anime.coverImage} alt="" className="w-10 h-14 object-cover rounded" />}
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{anime.title}</div>
                    <div className="text-xs text-gray-500">{anime._count.rssItems} imports, {anime._count.episodes} eps</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Feeds Tab */}
      {activeTab === "feeds" && (
        <div className="space-y-3">
          {stats.feeds.map((feed) => (
            <div key={feed.id} className="bg-void-dark border border-void-gray/30 rounded-xl p-4">
              <div className="flex items-center gap-4">
                <button onClick={() => toggleFeed(feed.id, !feed.enabled)} className={`w-10 h-6 rounded-full transition-all relative ${feed.enabled ? "bg-green-600" : "bg-void-gray/50"}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${feed.enabled ? "left-5" : "left-1"}`} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{feed.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-void-gray/50 text-gray-400">{feed.type.toUpperCase()}</span>
                    {feed.priority > 0 && <span className="text-xs px-2 py-0.5 rounded bg-yellow-900/30 text-yellow-400">P{feed.priority}</span>}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 truncate">{feed.url}</div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-gray-400">{feed.totalImported} imported</div>
                  <div className="text-xs text-gray-600">Every {feed.checkInterval}m</div>
                  {feed.lastCheckedAt && <div className="text-xs text-gray-600">Last: {new Date(feed.lastCheckedAt).toLocaleTimeString()}</div>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => syncFeed(feed.id)} disabled={syncing === feed.id} className="px-3 py-1.5 rounded-lg bg-void-gray/30 text-gray-300 hover:bg-void-gray/50 text-sm disabled:opacity-50">
                    {syncing === feed.id ? "..." : "Sync"}
                  </button>
                  <button onClick={() => deleteFeed(feed.id)} className="px-3 py-1.5 rounded-lg bg-red-900/20 text-red-400 hover:bg-red-900/30 text-sm">
                    Del
                  </button>
                </div>
              </div>
              {feed.lastError && <div className="text-xs text-red-400 mt-2 truncate">Last error: {feed.lastError}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === "logs" && (
        <div className="bg-void-dark border border-void-gray/30 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-void-gray/30">
            <h3 className="font-semibold text-gray-200">Import History</h3>
          </div>
          <div className="divide-y divide-void-gray/20 max-h-[600px] overflow-y-auto">
            {stats.recentLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${log.status === "success" ? "bg-green-500" : log.status === "failure" ? "bg-red-500" : "bg-yellow-500"}`} />
                <span className="text-gray-500 w-20 flex-shrink-0">{new Date(log.createdAt).toLocaleTimeString()}</span>
                <span className="text-gray-400 w-24 flex-shrink-0 truncate">{log.feedSource.name}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-void-gray/30 w-14 text-center flex-shrink-0">{log.action}</span>
                <span className="flex-1 truncate text-gray-300">{log.message}</span>
                {log.duration && <span className="text-gray-600 w-16 text-right">{log.duration}ms</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Queue Tab */}
      {activeTab === "queue" && (
        <div className="space-y-6">
          <div className="bg-void-dark border border-void-gray/30 rounded-xl p-6">
            <h3 className="font-semibold text-gray-200 mb-4">Import Queue</h3>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 rounded-lg bg-yellow-900/10 border border-yellow-900/30">
                <div className="text-xl font-bold text-yellow-400">{stats.queueStats.pending}</div>
                <div className="text-xs text-gray-500">Pending</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-blue-900/10 border border-blue-900/30">
                <div className="text-xl font-bold text-blue-400">{stats.queueStats.processing}</div>
                <div className="text-xs text-gray-500">Processing</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-900/10 border border-green-900/30">
                <div className="text-xl font-bold text-green-400">{stats.queueStats.completed}</div>
                <div className="text-xs text-gray-500">Completed</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-900/10 border border-red-900/30">
                <div className="text-xl font-bold text-red-400">{stats.queueStats.failed}</div>
                <div className="text-xs text-gray-500">Failed</div>
              </div>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {stats.queueStats.recentJobs.map((job) => (
                <div key={job.id} className="flex items-center gap-3 py-2 text-sm border-b border-void-gray/20">
                  <span className={`w-2 h-2 rounded-full ${
                    job.status === "completed" ? "bg-green-500" : job.status === "failed" ? "bg-red-500" : job.status === "processing" ? "bg-blue-500" : "bg-yellow-500"
                  }`} />
                  <span className="text-gray-400 w-20">{job.type}</span>
                  <span className="flex-1 text-gray-300">{job.status}</span>
                  <span className="text-gray-600 text-xs">Attempt {job.attempts}</span>
                  {job.lastError && <span className="text-red-400 text-xs truncate w-40">{job.lastError}</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-void-dark border border-void-gray/30 rounded-xl p-6">
            <h3 className="font-semibold text-gray-200 mb-4">Retry Queue ({stats.retryQueue.length})</h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {stats.retryQueue.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-2 text-sm border-b border-void-gray/20">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="flex-1 truncate text-gray-300">{item.title}</span>
                  <span className="text-gray-500 text-xs">{item.feedSource.name}</span>
                  <span className="text-red-400 text-xs truncate w-40">{item.error}</span>
                  <span className="text-gray-600 text-xs">Retry {item.retryCount}/3</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-void-dark border border-void-gray/30 rounded-xl p-6">
            <h3 className="font-semibold text-gray-200 mb-4">Content Stats</h3>
            <div className="space-y-3">
              {[
                { label: "Total Anime", value: stats.analytics.totalAnime },
                { label: "Total Episodes", value: stats.analytics.totalEpisodes },
                { label: "Currently Airing", value: stats.analytics.airingToday },
                { label: "Total RSS Items", value: stats.totalItems },
                { label: "Successfully Imported", value: stats.importedItems },
                { label: "Failed Imports", value: stats.failedItems },
                { label: "Pending Review", value: stats.pendingItems },
              ].map((s) => (
                <div key={s.label} className="flex justify-between py-2 border-b border-void-gray/20">
                  <span className="text-gray-400">{s.label}</span>
                  <span className="font-medium">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-void-dark border border-void-gray/30 rounded-xl p-6">
            <h3 className="font-semibold text-gray-200 mb-4">Today&apos;s Activity</h3>
            <div className="space-y-3">
              {[
                { label: "Imports Today", value: stats.analytics.importsToday, color: "text-green-400" },
                { label: "Errors Today", value: stats.analytics.failedToday, color: "text-red-400" },
                { label: "Duplicates Blocked", value: stats.analytics.duplicatePrevented, color: "text-yellow-400" },
              ].map((s) => (
                <div key={s.label} className="flex justify-between py-2 border-b border-void-gray/20">
                  <span className="text-gray-400">{s.label}</span>
                  <span className={`font-medium ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Feed Modal */}
      {showAddFeed && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setShowAddFeed(false)}>
          <div className="bg-void-dark border border-void-gray/30 rounded-2xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Add RSS Feed</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input type="text" value={newFeed.name} onChange={(e) => setNewFeed({ ...newFeed, name: e.target.value })} className="w-full bg-void-black border border-void-gray/50 rounded-lg px-4 py-2.5 text-white focus:border-void-red focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">RSS URL</label>
                <input type="url" value={newFeed.url} onChange={(e) => setNewFeed({ ...newFeed, url: e.target.value })} className="w-full bg-void-black border border-void-gray/50 rounded-lg px-4 py-2.5 text-white focus:border-void-red focus:outline-none" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Type</label>
                  <select value={newFeed.type} onChange={(e) => setNewFeed({ ...newFeed, type: e.target.value })} className="w-full bg-void-black border border-void-gray/50 rounded-lg px-4 py-2.5 text-white focus:border-void-red focus:outline-none">
                    <option value="nyaa">Nyaa</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Category</label>
                  <select value={newFeed.category} onChange={(e) => setNewFeed({ ...newFeed, category: e.target.value })} className="w-full bg-void-black border border-void-gray/50 rounded-lg px-4 py-2.5 text-white focus:border-void-red focus:outline-none">
                    <option value="sub">Sub</option>
                    <option value="dub">Dub</option>
                    <option value="raw">RAW</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Interval (min)</label>
                  <input type="number" value={newFeed.checkInterval} onChange={(e) => setNewFeed({ ...newFeed, checkInterval: parseInt(e.target.value) || 10 })} className="w-full bg-void-black border border-void-gray/50 rounded-lg px-4 py-2.5 text-white focus:border-void-red focus:outline-none" min={5} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddFeed(false)} className="flex-1 bg-void-gray/30 text-gray-300 py-2.5 rounded-lg hover:bg-void-gray/50">Cancel</button>
              <button onClick={addFeed} disabled={!newFeed.name || !newFeed.url} className="flex-1 bg-void-red text-white py-2.5 rounded-lg font-semibold hover:bg-void-red-dark disabled:opacity-50">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
