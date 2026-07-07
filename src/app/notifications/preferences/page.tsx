"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

interface Preferences {
  notifEpisodes: boolean;
  notifComments: boolean;
  notifMentions: boolean;
  notifBrowser: boolean;
  notifEmail: boolean;
  email: string | null;
}

export default function NotificationPreferencesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushRegistered, setPushRegistered] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/notifications/preferences")
      .then((r) => r.json())
      .then((data) => {
        setPrefs(data);
        setPushRegistered(!!data.notifBrowser);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    setPushSupported("serviceWorker" in navigator && "PushManager" in window);
  }, [status]);

  const updatePref = async (key: keyof Preferences, value: boolean) => {
    if (!prefs) return;
    setSaving(true);
    try {
      await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      setPrefs((prev) => (prev ? { ...prev, [key]: value } : prev));
    } finally {
      setSaving(false);
    }
  };

  const togglePush = async () => {
    if (!pushSupported) return;

    if (pushRegistered) {
      // Unregister
      try {
        const reg = await navigator.serviceWorker.ready;
        const subscription = await reg.pushManager.getSubscription();
        if (subscription) await subscription.unsubscribe();
        await fetch("/api/notifications/push", { method: "DELETE" });
        setPushRegistered(false);
        setPrefs((prev) => (prev ? { ...prev, notifBrowser: false } : prev));
      } catch (e) {
        console.error("Push unsubscribe error:", e);
      }
    } else {
      // Register
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const reg = await navigator.serviceWorker.ready;
        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_KEY || "",
        });

        await fetch("/api/notifications/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            keys: {
              p256dh: btoa(String.fromCharCode.apply(null, [...new Uint8Array(subscription.getKey("p256dh")!)])),
              auth: btoa(String.fromCharCode.apply(null, [...new Uint8Array(subscription.getKey("auth")!)])),
            },
          }),
        });

        setPushRegistered(true);
        setPrefs((prev) => (prev ? { ...prev, notifBrowser: true } : prev));
      } catch (e) {
        console.error("Push register error:", e);
      }
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

  return (
    <div className="min-h-screen bg-void-black text-white">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-black mb-8">
          NOTIFICATION <span className="text-void-red">PREFERENCES</span>
        </h1>

        {!prefs ? (
          <p className="text-gray-500">Failed to load preferences</p>
        ) : (
          <div className="space-y-6">
            {/* In-app notifications */}
            <div className="bg-void-dark border border-void-gray/50 rounded-lg p-6">
              <h2 className="text-lg font-bold mb-4">In-App Notifications</h2>
              <div className="space-y-4">
                {[
                  { key: "notifEpisodes", label: "New Episode Alerts", desc: "Get notified when new episodes are added to your watchlist anime" },
                  { key: "notifComments", label: "Comment Replies & Likes", desc: "Get notified when someone replies to or likes your comments" },
                  { key: "notifMentions", label: "Mentions (@username)", desc: "Get notified when someone mentions you in a comment" },
                ].map((item) => (
                  <label key={item.key} className="flex items-start justify-between gap-4 cursor-pointer">
                    <div>
                      <p className="text-white font-medium">{item.label}</p>
                      <p className="text-gray-500 text-sm">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => updatePref(item.key as keyof Preferences, !prefs[item.key as keyof Preferences])}
                      disabled={saving}
                      className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                        prefs[item.key as keyof Preferences] ? "bg-void-red" : "bg-void-gray"
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                          prefs[item.key as keyof Preferences] ? "translate-x-6" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </label>
                ))}
              </div>
            </div>

            {/* Browser push notifications */}
            <div className="bg-void-dark border border-void-gray/50 rounded-lg p-6">
              <h2 className="text-lg font-bold mb-4">Browser Push Notifications</h2>
              <p className="text-gray-500 text-sm mb-4">
                Receive push notifications even when you&apos;re not on the site.
                {pushSupported ? " Your browser supports push notifications." : " Your browser doesn&apos;t support push notifications."}
              </p>
              {pushSupported ? (
                <button
                  onClick={togglePush}
                  disabled={saving}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pushRegistered
                      ? "bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/30"
                      : "bg-void-red text-white hover:bg-void-red-dark"
                  }`}
                >
                  {pushRegistered ? "Disable Push Notifications" : "Enable Push Notifications"}
                </button>
              ) : (
                <p className="text-gray-600 text-sm">Push notifications are not available in your browser.</p>
              )}
            </div>

            {/* Email notifications */}
            <div className="bg-void-dark border border-void-gray/50 rounded-lg p-6">
              <h2 className="text-lg font-bold mb-4">Email Notifications</h2>
              <p className="text-gray-500 text-sm mb-4">
                Receive email digests for new episodes and important updates.
              </p>
              {!prefs.email ? (
                <p className="text-yellow-400 text-sm">
                  Add an email address to your profile to enable email notifications.
                </p>
              ) : (
                <label className="flex items-center justify-between gap-4 cursor-pointer">
                  <div>
                    <p className="text-white font-medium">Email Notifications</p>
                    <p className="text-gray-500 text-sm">Send to {prefs.email}</p>
                  </div>
                  <button
                    onClick={() => updatePref("notifEmail", !prefs.notifEmail)}
                    disabled={saving}
                    className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                      prefs.notifEmail ? "bg-void-red" : "bg-void-gray"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        prefs.notifEmail ? "translate-x-6" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </label>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
