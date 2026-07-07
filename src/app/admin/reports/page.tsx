"use client";

import { useState, useEffect } from "react";

interface Report {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  comment: {
    id: string;
    content: string;
    anime: { title: string; slug: string };
    user: { name: string | null; username: string | null };
  };
  user: { name: string | null; username: string | null };
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);

  const fetchReports = async (status: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?status=${status}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports);
        setCounts(data.counts);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(filter);
  }, [filter]);

  const handleStatus = async (reportId: string, status: string) => {
    const res = await fetch("/api/admin/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, status }),
    });
    if (res.ok) {
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      setCounts((prev) => ({
        ...prev,
        [filter]: Math.max(0, (prev[filter] || 0) - 1),
        [status]: (prev[status] || 0) + 1,
      }));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black">Comment Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Review and manage reported comments</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        {["pending", "reviewed", "dismissed"].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === status
                ? "bg-void-red text-white"
                : "bg-void-dark border border-void-gray text-gray-400 hover:text-white"
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {counts[status] ? ` (${counts[status]})` : ""}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading reports...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No {filter} reports</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="bg-void-dark border border-void-gray/50 rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded text-xs font-medium">
                      {report.reason}
                    </span>
                    <span className="text-gray-600 text-xs">
                      by @{report.user.username || report.user.name}
                    </span>
                    <span className="text-gray-600 text-xs">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="bg-void-black/50 border border-void-gray/30 rounded p-3 mb-3">
                    <p className="text-gray-400 text-xs mb-1">
                      Comment by @{report.comment.user.username || report.comment.user.name} on{" "}
                      <span className="text-void-red">{report.comment.anime.title}</span>
                    </p>
                    <p className="text-gray-300 text-sm">{report.comment.content}</p>
                  </div>

                  {report.details && (
                    <p className="text-gray-500 text-sm mb-3">
                      <span className="text-gray-400">Details:</span> {report.details}
                    </p>
                  )}
                </div>

                {filter === "pending" && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleStatus(report.id, "reviewed")}
                      className="bg-green-600/20 text-green-400 px-3 py-1 rounded text-sm hover:bg-green-600/30 transition-colors"
                    >
                      Mark Reviewed
                    </button>
                    <button
                      onClick={() => handleStatus(report.id, "dismissed")}
                      className="bg-void-gray/20 text-gray-400 px-3 py-1 rounded text-sm hover:bg-void-gray/30 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
