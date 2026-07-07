"use client";

import { useState, useEffect, useCallback } from "react";

interface ActivityLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  createdAt: string;
  user: { name: string | null; username: string | null; role: string | null } | null;
}

interface ActivityStats {
  total: number;
  today: number;
  thisWeek: number;
  actionBreakdown: { action: string; count: number }[];
}

const ACTION_COLORS: Record<string, string> = {
  REPORT_REVIEW: "bg-yellow-500/20 text-yellow-400",
  USER_REPORT_REVIEW: "bg-orange-500/20 text-orange-400",
  SCHEDULE_CREATE: "bg-blue-500/20 text-blue-400",
  SCHEDULE_PUBLISHED: "bg-green-500/20 text-green-400",
  SCHEDULE_CANCELLED: "bg-gray-500/20 text-gray-400",
  SCHEDULE_DELETE: "bg-red-500/20 text-red-400",
  SCHEDULE_FAILED: "bg-red-500/20 text-red-400",
  AUTO_PUBLISH: "bg-green-500/20 text-green-400",
  AUTO_PUBLISH_RETRY: "bg-yellow-500/20 text-yellow-400",
  AI_GENERATE: "bg-purple-500/20 text-purple-400",
  FEATURED_TOGGLE: "bg-void-red/20 text-void-red",
  BANNER_CREATE: "bg-blue-500/20 text-blue-400",
  BANNER_DELETE: "bg-red-500/20 text-red-400",
  BANNER_UPDATE: "bg-blue-500/20 text-blue-400",
  USER_BAN: "bg-red-500/20 text-red-400",
  USER_UNBAN: "bg-green-500/20 text-green-400",
  USER_ROLE_CHANGE: "bg-purple-500/20 text-purple-400",
  USER_DELETE: "bg-red-600/20 text-red-400",
  ANIME_CREATE: "bg-blue-500/20 text-blue-400",
  ANIME_UPDATE: "bg-blue-500/20 text-blue-400",
  ANIME_DELETE: "bg-red-500/20 text-red-400",
  EPISODE_CREATE: "bg-green-500/20 text-green-400",
  EPISODE_DELETE: "bg-red-500/20 text-red-400",
  BACKUP_CREATE: "bg-cyan-500/20 text-cyan-400",
  BACKUP_RESTORE: "bg-yellow-500/20 text-yellow-400",
  BACKUP_DELETE: "bg-red-500/20 text-red-400",
};

const ROLE_COLORS: Record<string, string> = {
  OWNER: "text-red-400",
  ADMIN: "text-purple-400",
  MODERATOR: "text-blue-400",
  UPLOADER: "text-green-400",
  USER: "text-gray-400",
};

export default function AdminActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ entity: "", action: "", search: "" });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 30;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.entity) params.set("entity", filter.entity);
      if (filter.action) params.set("action", filter.action);
      if (filter.search) params.set("search", filter.search);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const [logsRes, statsRes] = await Promise.all([
        fetch(`/api/admin/activity?${params}`),
        fetch("/api/admin/activity?stats=true"),
      ]);

      if (logsRes.ok) {
        const data = await logsRes.json();
        setLogs(Array.isArray(data) ? data : data.logs || []);
        setTotalPages(data.totalPages || 1);
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleExport = () => {
    const csv = [
      ["Action", "Entity", "Entity ID", "User", "Details", "Time"].join(","),
      ...logs.map((l) =>
        [
          l.action,
          l.entity,
          l.entityId || "",
          l.user?.username || l.user?.name || "System",
          `"${(l.details || "").replace(/"/g, '""')}"`,
          new Date(l.createdAt).toISOString(),
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatAction = (action: string) =>
    action.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());

  const uniqueEntities = [...new Set(logs.map((l) => l.entity))].sort();
  const uniqueActions = [...new Set(logs.map((l) => l.action))].sort();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black">
            ACTIVITY <span className="text-void-red">LOGS</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Track all admin and system actions</p>
        </div>
        <button onClick={handleExport} className="px-4 py-2 border border-void-gray rounded-lg text-sm text-gray-400 hover:text-white hover:border-void-red transition-all">
          Export CSV
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-void-dark border border-void-gray/50 rounded-lg p-4">
            <p className="text-gray-500 text-xs">Total Logs</p>
            <p className="text-2xl font-black text-white">{stats.total.toLocaleString()}</p>
          </div>
          <div className="bg-void-dark border border-void-gray/50 rounded-lg p-4">
            <p className="text-gray-500 text-xs">Today</p>
            <p className="text-2xl font-black text-void-red">{stats.today}</p>
          </div>
          <div className="bg-void-dark border border-void-gray/50 rounded-lg p-4">
            <p className="text-gray-500 text-xs">This Week</p>
            <p className="text-2xl font-black text-blue-400">{stats.thisWeek}</p>
          </div>
          <div className="bg-void-dark border border-void-gray/50 rounded-lg p-4">
            <p className="text-gray-500 text-xs">Top Action</p>
            <p className="text-sm font-bold text-white truncate">
              {stats.actionBreakdown[0] ? formatAction(stats.actionBreakdown[0].action) : "N/A"}
            </p>
          </div>
        </div>
      )}

      {/* Action Breakdown Bar */}
      {stats && stats.actionBreakdown.length > 0 && (
        <div className="bg-void-dark border border-void-gray/50 rounded-lg p-4 mb-6">
          <p className="text-xs text-gray-500 mb-2">Action Distribution</p>
          <div className="flex gap-1 h-4 rounded-full overflow-hidden">
            {stats.actionBreakdown.slice(0, 10).map((a) => {
              const pct = (a.count / stats.total) * 100;
              return (
                <div
                  key={a.action}
                  className={`${ACTION_COLORS[a.action]?.split(" ")[0] || "bg-gray-500/20"} min-w-[4px]`}
                  style={{ width: `${pct}%` }}
                  title={`${formatAction(a.action)}: ${a.count}`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {stats.actionBreakdown.slice(0, 8).map((a) => (
              <span key={a.action} className="text-xs text-gray-500">
                <span className={`inline-block w-2 h-2 rounded-full mr-1 ${ACTION_COLORS[a.action]?.split(" ")[0] || "bg-gray-500"}`} />
                {formatAction(a.action)} ({a.count})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search details..."
          value={filter.search}
          onChange={(e) => { setFilter((p) => ({ ...p, search: e.target.value })); setPage(1); }}
          className="bg-void-dark border border-void-gray rounded-lg px-3 py-2 text-white text-sm focus:border-void-red focus:outline-none min-w-[200px]"
        />
        <select
          value={filter.entity}
          onChange={(e) => { setFilter((p) => ({ ...p, entity: e.target.value })); setPage(1); }}
          className="bg-void-dark border border-void-gray rounded-lg px-3 py-2 text-white text-sm focus:border-void-red focus:outline-none"
        >
          <option value="">All Entities</option>
          {uniqueEntities.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <select
          value={filter.action}
          onChange={(e) => { setFilter((p) => ({ ...p, action: e.target.value })); setPage(1); }}
          className="bg-void-dark border border-void-gray rounded-lg px-3 py-2 text-white text-sm focus:border-void-red focus:outline-none"
        >
          <option value="">All Actions</option>
          {uniqueActions.map((a) => (
            <option key={a} value={a}>{formatAction(a)}</option>
          ))}
        </select>
        {(filter.entity || filter.action || filter.search) && (
          <button
            onClick={() => { setFilter({ entity: "", action: "", search: "" }); setPage(1); }}
            className="text-xs text-void-red hover:text-white transition-colors px-3 py-2"
          >
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading logs...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No activity logs</p>
        </div>
      ) : (
        <>
          <div className="bg-void-dark border border-void-gray/50 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-void-gray/30">
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Action</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Entity</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">User</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Details</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-void-gray/10 hover:bg-void-black/30">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${ACTION_COLORS[log.action] || "bg-gray-500/20 text-gray-400"}`}>
                        {formatAction(log.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {log.entity}
                      {log.entityId && (
                        <span className="text-gray-600 text-xs ml-1">#{log.entityId.slice(0, 8)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {log.user ? (
                        <span className={ROLE_COLORS[log.user.role || ""] || "text-gray-400"}>
                          @{log.user.username || log.user.name}
                        </span>
                      ) : (
                        <span className="text-gray-600">System</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate" title={log.details || ""}>
                      {log.details || "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-xs text-gray-600">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded border border-void-gray text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded border border-void-gray text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
