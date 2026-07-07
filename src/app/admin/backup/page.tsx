"use client";

import { useState, useEffect } from "react";

interface Backup {
  name: string;
  path: string;
}

export default function AdminBackupPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/backup");
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBackups(); }, []);

  const handleBackup = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "backup" }),
      });
      if (res.ok) {
        fetchBackups();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (name: string) => {
    if (!confirm(`Are you sure you want to restore from "${name}"? This will overwrite the current database.`)) return;
    setRestoring(name);
    try {
      const res = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", backupName: name }),
      });
      if (res.ok) {
        alert("Database restored. Please restart the server.");
      }
    } finally {
      setRestoring(null);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete backup "${name}"?`)) return;
    const res = await fetch(`/api/admin/backup?name=${encodeURIComponent(name)}`, { method: "DELETE" });
    if (res.ok) fetchBackups();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black">BACKUP & RESTORE</h1>
          <p className="text-gray-500 text-sm mt-1">Manage database backups (Owner only)</p>
        </div>
        <button
          onClick={handleBackup}
          disabled={creating}
          className="bg-void-red px-4 py-2 rounded-lg text-white font-medium hover:bg-void-red-dark disabled:opacity-50 transition-colors"
        >
          {creating ? "Creating..." : "+ Create Backup"}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading backups...</div>
      ) : backups.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-2">No backups yet</p>
          <p className="text-gray-600 text-sm">Create your first backup to protect your data</p>
        </div>
      ) : (
        <div className="bg-void-dark border border-void-gray/50 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-void-gray/30">
                <th className="text-left px-4 py-3 text-xs text-gray-500">Backup Name</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500">Created</th>
                <th className="text-right px-4 py-3 text-xs text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr key={backup.name} className="border-b border-void-gray/10 hover:bg-void-black/30">
                  <td className="px-4 py-3">
                    <span className="text-sm text-white font-mono">{backup.name}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {backup.name.includes("backup-")
                      ? new Date(backup.name.replace("backup-", "").replace(/-/g, (m) => m === "-" ? "T" : m)).toLocaleString()
                      : "Unknown"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => handleRestore(backup.name)}
                        disabled={restoring === backup.name}
                        className="text-xs text-yellow-400 hover:text-yellow-300"
                      >
                        {restoring === backup.name ? "Restoring..." : "Restore"}
                      </button>
                      <button
                        onClick={() => handleDelete(backup.name)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
