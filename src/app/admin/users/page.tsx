"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  createdAt: string;
  _count: { comments: number; animeLikes: number; watchlist: number };
}

const ROLES = ["OWNER", "ADMIN", "MODERATOR", "UPLOADER", "USER"];

const roleColors: Record<string, string> = {
  OWNER: "bg-red-600/20 text-red-400 border-red-600/50",
  ADMIN: "bg-purple-600/20 text-purple-400 border-purple-600/50",
  MODERATOR: "bg-blue-600/20 text-blue-400 border-blue-600/50",
  UPLOADER: "bg-green-600/20 text-green-400 border-green-600/50",
  USER: "bg-gray-600/20 text-gray-400 border-gray-600/50",
};

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const myRole = (session?.user as { role?: string })?.role;
  const isOwner = myRole === "OWNER";

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdating(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (res.ok) {
        const updated = await res.json();
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: updated.role } : u))
        );
      }
    } catch (error) {
      console.error("Error updating role:", error);
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (userId: string, name: string) => {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    
    setUpdating(userId);
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      }
    } catch (error) {
      console.error("Error deleting user:", error);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">
        Manage <span className="text-void-red">Users</span>
      </h1>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <div className="bg-void-dark border border-void-gray/30 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-void-gray/30">
                <th className="text-left p-4 text-sm text-gray-500 font-medium">User</th>
                <th className="text-left p-4 text-sm text-gray-500 font-medium">Role</th>
                <th className="text-left p-4 text-sm text-gray-500 font-medium">Joined</th>
                <th className="text-left p-4 text-sm text-gray-500 font-medium">Activity</th>
                <th className="text-right p-4 text-sm text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-void-gray/20 hover:bg-void-black/50">
                  <td className="p-4">
                    <div>
                      <p className="font-semibold">{user.name || "Anonymous"}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    {isOwner ? (
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        disabled={updating === user.id}
                        className={`text-xs px-2 py-1 rounded border bg-transparent focus:outline-none ${roleColors[user.role]}`}
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`text-xs px-2 py-1 rounded border ${roleColors[user.role]}`}>
                        {user.role}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-sm text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-sm text-gray-400">
                    {user._count.comments} comments • {user._count.animeLikes} likes
                  </td>
                  <td className="p-4 text-right">
                    {isOwner && user.role !== "OWNER" && (
                      <button
                        onClick={() => handleDelete(user.id, user.name || "Anonymous")}
                        disabled={updating === user.id}
                        className="text-red-400 hover:text-red-300 text-sm disabled:opacity-50"
                      >
                        {updating === user.id ? "..." : "Delete"}
                      </button>
                    )}
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
