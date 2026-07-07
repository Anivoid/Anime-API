"use client";

import { useState, useEffect } from "react";

interface User {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  role: string;
  createdAt: string;
}

interface UserReport {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  reportedUser: { id: string; name: string | null; username: string | null; email: string | null; role: string };
  reporter: { name: string | null; username: string | null };
}

export default function AdminModerationPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<UserReport[]>([]);
  const [reportCounts, setReportCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"users" | "reports">("users");
  const [search, setSearch] = useState("");
  const [reportFilter, setReportFilter] = useState("pending");
  const [moderating, setModerating] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/users").then((r) => r.json()),
      fetch(`/api/admin/user-reports?status=${reportFilter}`).then((r) => r.json()),
    ])
      .then(([userData, reportData]) => {
        setUsers(Array.isArray(userData) ? userData : []);
        setReports(reportData.reports || []);
        setReportCounts(reportData.counts || {});
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [reportFilter]);

  const handleModerate = async (userId: string, action: string, reason?: string) => {
    setModerating(userId);
    try {
      const res = await fetch("/api/admin/moderate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, reason }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, role: action === "ban" ? "BANNED" : action === "unban" ? "USER" : u.role }
              : u
          )
        );
      }
    } finally {
      setModerating(null);
    }
  };

  const handleReportStatus = async (reportId: string, status: string) => {
    const res = await fetch("/api/admin/user-reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, status }),
    });
    if (res.ok) {
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return !q || u.name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  const roleColors: Record<string, string> = {
    OWNER: "text-red-400",
    ADMIN: "text-purple-400",
    MODERATOR: "text-blue-400",
    UPLOADER: "text-green-400",
    USER: "text-gray-400",
    BANNED: "text-red-600",
  };

  return (
    <div>
      <h1 className="text-3xl font-black mb-8">
        MODERATION <span className="text-void-red">CENTER</span>
      </h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setTab("users")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "users" ? "bg-void-red text-white" : "bg-void-dark border border-void-gray text-gray-400 hover:text-white"
          }`}
        >
          Users ({users.length})
        </button>
        <button
          onClick={() => setTab("reports")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "reports" ? "bg-void-red text-white" : "bg-void-dark border border-void-gray text-gray-400 hover:text-white"
          }`}
        >
          Reports ({reportCounts.pending || 0})
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : tab === "users" ? (
        <>
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-void-dark border border-void-gray rounded-lg px-4 py-2 text-white mb-6 focus:border-void-red focus:outline-none"
          />
          <div className="bg-void-dark border border-void-gray/50 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-void-gray/30">
                  <th className="text-left px-4 py-3 text-xs text-gray-500">User</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500">Role</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500">Joined</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-void-gray/10 hover:bg-void-black/30">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm text-white">{user.name || "No name"}</p>
                        <p className="text-xs text-gray-500">@{user.username || "—"} · {user.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${roleColors[user.role] || "text-gray-400"}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {user.role !== "OWNER" && user.id !== users[0]?.id && (
                        <div className="flex gap-2 justify-end">
                          {user.role === "BANNED" ? (
                            <button
                              onClick={() => handleModerate(user.id, "unban")}
                              disabled={moderating === user.id}
                              className="text-xs text-green-400 hover:text-green-300"
                            >
                              Unban
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                const reason = prompt("Ban reason:");
                                if (reason) handleModerate(user.id, "ban", reason);
                              }}
                              disabled={moderating === user.id}
                              className="text-xs text-red-400 hover:text-red-300"
                            >
                              Ban
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="flex gap-2 mb-6">
            {["pending", "reviewed", "dismissed"].map((status) => (
              <button
                key={status}
                onClick={() => setReportFilter(status)}
                className={`px-3 py-1.5 rounded text-sm transition-all ${
                  reportFilter === status ? "bg-void-red text-white" : "bg-void-dark border border-void-gray text-gray-400"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                {reportCounts[status] ? ` (${reportCounts[status]})` : ""}
              </button>
            ))}
          </div>
          {reports.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No {reportFilter} reports</div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div key={report.id} className="bg-void-dark border border-void-gray/50 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-yellow-400 text-xs bg-yellow-400/20 px-2 py-0.5 rounded">{report.reason}</span>
                        <span className="text-gray-600 text-xs">by @{report.reporter.username || report.reporter.name}</span>
                      </div>
                      <p className="text-white text-sm">
                          Reported: <span className="text-void-red">@{report.reportedUser.username || report.reportedUser.name}</span>
                        <span className="text-gray-600 ml-2">({report.reportedUser.role})</span>
                      </p>
                      {report.details && <p className="text-gray-500 text-xs mt-1">{report.details}</p>}
                      <p className="text-gray-600 text-xs mt-1">{new Date(report.createdAt).toLocaleString()}</p>
                    </div>
                    {reportFilter === "pending" && (
                      <div className="flex gap-2">
                        <button onClick={() => handleReportStatus(report.id, "reviewed")} className="text-xs text-green-400 hover:text-green-300">
                          Reviewed
                        </button>
                        <button onClick={() => handleReportStatus(report.id, "dismissed")} className="text-xs text-gray-500 hover:text-white">
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
