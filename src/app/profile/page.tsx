"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Header from "@/components/Header";
import Link from "next/link";

interface ProfileData {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  image: string | null;
  bio: string | null;
  role: string;
  createdAt: string;
  _count: {
    comments: number;
    animeLikes: number;
    ratings: number;
    watchlist: number;
    watchHistory: number;
  };
}

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    username: "",
    bio: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        setProfile(data);
        setForm({
          name: data.name || "",
          username: data.username || "",
          bio: data.bio || "",
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setMessage("Passwords don't match");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          username: form.username,
          bio: form.bio,
          currentPassword: form.currentPassword || undefined,
          newPassword: form.newPassword || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setMessage("Profile updated!");
        setForm((p) => ({ ...p, currentPassword: "", newPassword: "", confirmPassword: "" }));
        update();
      } else {
        const err = await res.json();
        setMessage(err.error || "Failed to update");
      }
    } catch {
      setMessage("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This cannot be undone.")) return;
    try {
      const res = await fetch("/api/profile", { method: "DELETE" });
      if (res.ok) {
        window.location.href = "/";
      }
    } catch {
      // silent
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-void-black text-white">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-void-black text-white">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center text-gray-500">Profile not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void-black text-white">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold mb-8">
          Your <span className="text-void-red">Profile</span>
        </h1>

        {/* Profile Stats */}
        <div className="bg-void-dark border border-void-gray/50 rounded-lg p-6 mb-8">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-20 h-20 rounded-full bg-void-red flex items-center justify-center text-3xl font-bold">
              {(profile.username || profile.name || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{profile.name || "Anonymous"}</h2>
              {profile.username && <p className="text-gray-500">@{profile.username}</p>}
              {profile.bio && <p className="text-gray-400 text-sm mt-1">{profile.bio}</p>}
              <span className={`text-xs font-medium mt-1 inline-block ${
                profile.role === "OWNER" ? "text-red-400" :
                profile.role === "ADMIN" ? "text-purple-400" :
                profile.role === "MODERATOR" ? "text-blue-400" :
                profile.role === "UPLOADER" ? "text-green-400" :
                "text-gray-400"
              }`}>
                {profile.role}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-4 text-center">
            {[
              { label: "Comments", value: profile._count.comments },
              { label: "Likes", value: profile._count.animeLikes },
              { label: "Ratings", value: profile._count.ratings },
              { label: "Watchlist", value: profile._count.watchlist },
              { label: "Watched", value: profile._count.watchHistory },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-xl font-bold text-void-red">{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>

          {profile.username && (
            <div className="mt-4 pt-4 border-t border-void-gray/30">
              <Link href={`/profile/${profile.username}`} className="text-void-red hover:text-void-red-glow text-sm transition-colors">
                View public profile →
              </Link>
            </div>
          )}
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSave} className="bg-void-dark border border-void-gray/50 rounded-lg p-6 space-y-6">
          <h3 className="text-xl font-bold">
            Edit <span className="text-void-red">Profile</span>
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Display Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full bg-void-black border border-void-gray rounded-lg px-4 py-3 text-white focus:outline-none focus:border-void-red transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                className="w-full bg-void-black border border-void-gray rounded-lg px-4 py-3 text-white focus:outline-none focus:border-void-red transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
              rows={3}
              maxLength={200}
              className="w-full bg-void-black border border-void-gray rounded-lg px-4 py-3 text-white focus:outline-none focus:border-void-red transition-colors resize-none"
            />
            <p className="text-xs text-gray-600 mt-1">{form.bio.length}/200</p>
          </div>

          <div className="border-t border-void-gray/30 pt-6">
            <h4 className="text-sm font-medium text-gray-300 mb-4">Change Password (optional)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Current Password</label>
                <input
                  type="password"
                  value={form.currentPassword}
                  onChange={(e) => setForm((p) => ({ ...p, currentPassword: e.target.value }))}
                  className="w-full bg-void-black border border-void-gray rounded-lg px-4 py-3 text-white focus:outline-none focus:border-void-red transition-colors text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">New Password</label>
                <input
                  type="password"
                  value={form.newPassword}
                  onChange={(e) => setForm((p) => ({ ...p, newPassword: e.target.value }))}
                  className="w-full bg-void-black border border-void-gray rounded-lg px-4 py-3 text-white focus:outline-none focus:border-void-red transition-colors text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Confirm New</label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  className="w-full bg-void-black border border-void-gray rounded-lg px-4 py-3 text-white focus:outline-none focus:border-void-red transition-colors text-sm"
                />
              </div>
            </div>
          </div>

          {message && (
            <p className={`text-sm ${message.includes("Updated") ? "text-green-400" : "text-red-400"}`}>
              {message}
            </p>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="bg-void-red px-8 py-3 rounded-lg font-semibold hover:bg-void-red-dark transition-all disabled:opacity-50 glow-red btn-ripple"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={handleDeleteAccount}
              className="border border-red-600/50 text-red-400 px-6 py-3 rounded-lg font-semibold hover:bg-red-600/10 transition-all"
            >
              Delete Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
