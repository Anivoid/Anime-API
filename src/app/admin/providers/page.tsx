"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

interface LatencyRecord {
  timestamp: string;
  latency: number;
  success: boolean;
}

interface ProviderStats {
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  successRate: number;
  uptime24h: number;
  checks24h: number;
  last24hErrors: string[];
}

interface Provider {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  type: string;
  healthStatus: string;
  lastChecked: string | null;
  lastError: string | null;
  lastLatency: number | null;
  successCount: number;
  failCount: number;
  consecutiveFails: number;
  autoDisabled: boolean;
  bypassService: string;
  description: string;
  baseUrl: string;
  timeout: number;
  stats: ProviderStats;
  latencyHistory: LatencyRecord[];
}

interface GlobalSettings {
  maxRetries: number;
  fallbackChain: boolean;
  scrapeDoToken: string;
  flaresolverrUrl: string;
  logLevel: string;
  healthCheckInterval: number;
  autoDisableThreshold: number;
  recoveryThreshold: number;
  latencyHistorySize: number;
}

export default function ProvidersAdminPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role || "";
  const isOwner = role === "OWNER";

  const [providers, setProviders] = useState<Provider[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    maxRetries: 2,
    fallbackChain: true,
    scrapeDoToken: "",
    flaresolverrUrl: "",
    logLevel: "info",
    healthCheckInterval: 5,
    autoDisableThreshold: 5,
    recoveryThreshold: 3,
    latencyHistorySize: 50,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [healthChecking, setHealthChecking] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "settings" | "add">("overview");
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  const [newProvider, setNewProvider] = useState({
    id: "",
    name: "",
    baseUrl: "",
    type: "api",
    bypassService: "none",
    timeout: 10000,
    description: "",
  });

  const loadProviders = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/providers/stats");
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
        setGlobalSettings(data.globalSettings || globalSettings);
      }
    } catch {
      setMessage("Failed to load providers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProviders(); }, [loadProviders]);

  const saveProviders = async (updates: {
    providers?: { id: string; enabled?: boolean; priority?: number; bypassService?: string; timeout?: number; baseUrl?: string }[];
    globalSettings?: Partial<GlobalSettings>;
    reorder?: { id: string; priority: number }[];
  }) => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/providers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        // Reload full stats
        await loadProviders();
        setMessage("Saved");
      } else {
        const err = await res.json();
        setMessage(err.error || "Save failed");
      }
    } catch {
      setMessage("Network error");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const toggleProvider = (id: string, enabled: boolean) => {
    saveProviders({ providers: [{ id, enabled }] });
  };

  const updateBypass = (id: string, bypassService: string) => {
    saveProviders({ providers: [{ id, bypassService: bypassService as Provider["bypassService"] }] });
  };

  const updateTimeout = (id: string, timeout: number) => {
    saveProviders({ providers: [{ id, timeout }] });
  };

  const updateBaseUrl = (id: string, baseUrl: string) => {
    saveProviders({ providers: [{ id, baseUrl }] });
  };

  const moveProvider = (id: string, direction: "up" | "down") => {
    const sorted = [...providers].sort((a, b) => a.priority - b.priority);
    const idx = sorted.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[swapIdx];
    const tmpP = a.priority;
    a.priority = b.priority;
    b.priority = tmpP;
    saveProviders({
      reorder: sorted.map((p) => ({ id: p.id, priority: p.priority })),
    });
  };

  const runHealthCheck = async () => {
    setHealthChecking(true);
    try {
      const res = await fetch("/api/cron/provider-health", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.results) {
          setMessage(`Health check: ${data.summary.healthy} ok, ${data.summary.degraded} degraded, ${data.summary.down} down`);
        } else {
          setMessage(data.reason || "Health check triggered");
        }
        await loadProviders();
      }
    } catch {
      setMessage("Health check failed");
    } finally {
      setHealthChecking(false);
      setTimeout(() => setMessage(""), 5000);
    }
  };

  const testSingleProvider = async (id: string) => {
    setTesting(id);
    try {
      const res = await fetch("/api/admin/providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        const data = await res.json();
        const r = data.result;
        if (r.status === "healthy") {
          setMessage(`${r.name}: OK (${r.latency}ms)`);
        } else {
          setMessage(`${r.name}: ${r.status} — ${r.error || "failed"}`);
        }
        await loadProviders();
      }
    } catch {
      setMessage("Test failed");
    } finally {
      setTesting(null);
      setTimeout(() => setMessage(""), 4000);
    }
  };

  const addProvider = async () => {
    if (!newProvider.id || !newProvider.name) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProvider),
      });
      if (res.ok) {
        setActiveTab("overview");
        setNewProvider({ id: "", name: "", baseUrl: "", type: "api", bypassService: "none", timeout: 10000, description: "" });
        await loadProviders();
        setMessage("Provider added");
      } else {
        const err = await res.json();
        setMessage(err.error || "Add failed");
      }
    } catch {
      setMessage("Network error");
    } finally {
      setSaving(false);
    }
  };

  const removeProvider = async (id: string) => {
    if (!confirm(`Delete provider "${id}"?`)) return;
    try {
      const res = await fetch(`/api/admin/providers?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        await loadProviders();
        setMessage("Provider removed");
      } else {
        const err = await res.json();
        setMessage(err.error || "Delete failed");
      }
    } catch {
      setMessage("Network error");
    }
  };

  // ─── Helpers ───
  const statusColor: Record<string, string> = {
    healthy: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    degraded: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    down: "bg-red-500/20 text-red-400 border-red-500/30",
    "auto-disabled": "bg-red-500/10 text-red-400/70 border-red-500/20",
    unknown: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    skipped: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  };

  const statusDot: Record<string, string> = {
    healthy: "bg-emerald-400",
    degraded: "bg-amber-400",
    down: "bg-red-400",
    "auto-disabled": "bg-red-400/50",
    unknown: "bg-gray-400",
    skipped: "bg-gray-600",
  };

  const sorted = [...providers].sort((a, b) => a.priority - b.priority);
  const healthyCount = sorted.filter((p) => p.healthStatus === "healthy").length;
  const degradedCount = sorted.filter((p) => p.healthStatus === "degraded").length;
  const downCount = sorted.filter((p) => p.healthStatus === "down" || p.healthStatus === "auto-disabled").length;
  const totalChecks = sorted.reduce((sum, p) => sum + p.successCount + p.failCount, 0);
  const overallSuccessRate = totalChecks > 0 ? Math.round((sorted.reduce((sum, p) => sum + p.successCount, 0) / totalChecks) * 100) : 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading providers...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">
            <span className="text-void-red">Streaming</span> Providers
          </h1>
          <p className="text-gray-500 mt-1">Health monitoring, auto-fallback, and provider management</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={runHealthCheck}
            disabled={healthChecking}
            className="px-4 py-2 bg-void-dark border border-void-gray/50 rounded-lg text-sm hover:bg-void-gray/50 disabled:opacity-50 transition-all"
          >
            {healthChecking ? "Checking..." : "Run Health Check"}
          </button>
          {isOwner && (
            <button
              onClick={() => setActiveTab(activeTab === "add" ? "overview" : "add")}
              className="px-4 py-2 bg-void-red rounded-lg text-sm font-semibold hover:bg-void-red-dark transition-all glow-red"
            >
              {activeTab === "add" ? "Cancel" : "+ Add Provider"}
            </button>
          )}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 px-4 py-3 rounded-lg border text-sm ${
          message.includes("Failed") || message.includes("error") || message.includes("Error") || message.includes("down")
            ? "bg-red-500/10 border-red-500/30 text-red-400"
            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
        }`}>
          {message}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { label: "Healthy", value: healthyCount, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Degraded", value: degradedCount, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Down", value: downCount, color: "text-red-400", bg: "bg-red-500/10" },
          { label: "Total Checks", value: totalChecks, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Success Rate", value: `${overallSuccessRate}%`, color: overallSuccessRate >= 90 ? "text-emerald-400" : overallSuccessRate >= 70 ? "text-amber-400" : "text-red-400", bg: overallSuccessRate >= 90 ? "bg-emerald-500/10" : overallSuccessRate >= 70 ? "bg-amber-500/10" : "bg-red-500/10" },
        ].map((card) => (
          <div key={card.label} className={`${card.bg} border border-void-gray/30 rounded-xl p-4 text-center`}>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <div className="text-xs text-gray-500 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-void-dark rounded-lg p-1 border border-void-gray/30 w-fit">
        {(["overview", "settings", "add"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm transition-all ${
              activeTab === tab
                ? "bg-void-red/20 text-void-red border border-void-red/30"
                : "text-gray-500 hover:text-white"
            }`}
          >
            {tab === "overview" ? "Providers" : tab === "settings" ? "Health Settings" : "Add Provider"}
          </button>
        ))}
      </div>

      {/* ═══ ADD PROVIDER TAB ═══ */}
      {activeTab === "add" && (
        <div className="bg-void-dark border border-void-gray/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Add Custom Provider</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">ID (slug)</label>
              <input
                value={newProvider.id}
                onChange={(e) => setNewProvider({ ...newProvider, id: e.target.value })}
                className="w-full bg-void-black border border-void-gray/50 rounded-lg px-4 py-2 text-white text-sm focus:border-void-red/50 focus:outline-none"
                placeholder="my-provider"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name</label>
              <input
                value={newProvider.name}
                onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                className="w-full bg-void-black border border-void-gray/50 rounded-lg px-4 py-2 text-white text-sm focus:border-void-red/50 focus:outline-none"
                placeholder="My Provider"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type</label>
              <select
                value={newProvider.type}
                onChange={(e) => setNewProvider({ ...newProvider, type: e.target.value })}
                className="w-full bg-void-black border border-void-gray/50 rounded-lg px-4 py-2 text-white text-sm focus:border-void-red/50 focus:outline-none"
              >
                <option value="api">API</option>
                <option value="scrape">Scrape</option>
                <option value="local">Local</option>
                <option value="embed">Embed</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Base URL</label>
              <input
                value={newProvider.baseUrl}
                onChange={(e) => setNewProvider({ ...newProvider, baseUrl: e.target.value })}
                className="w-full bg-void-black border border-void-gray/50 rounded-lg px-4 py-2 text-white text-sm focus:border-void-red/50 focus:outline-none"
                placeholder="https://api.example.com"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Bypass</label>
              <select
                value={newProvider.bypassService}
                onChange={(e) => setNewProvider({ ...newProvider, bypassService: e.target.value })}
                className="w-full bg-void-black border border-void-gray/50 rounded-lg px-4 py-2 text-white text-sm focus:border-void-red/50 focus:outline-none"
              >
                <option value="none">Direct</option>
                <option value="scrape.do">scrape.do</option>
                <option value="flaresolverr">FlareSolverr</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Timeout (ms)</label>
              <input
                type="number"
                value={newProvider.timeout}
                onChange={(e) => setNewProvider({ ...newProvider, timeout: Number(e.target.value) })}
                className="w-full bg-void-black border border-void-gray/50 rounded-lg px-4 py-2 text-white text-sm focus:border-void-red/50 focus:outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Description</label>
              <input
                value={newProvider.description}
                onChange={(e) => setNewProvider({ ...newProvider, description: e.target.value })}
                className="w-full bg-void-black border border-void-gray/50 rounded-lg px-4 py-2 text-white text-sm focus:border-void-red/50 focus:outline-none"
              />
            </div>
          </div>
          <button
            onClick={addProvider}
            disabled={!newProvider.id || !newProvider.name || saving}
            className="mt-4 px-6 py-2 bg-void-red rounded-lg text-sm font-semibold hover:bg-void-red-dark disabled:opacity-50 transition-all"
          >
            {saving ? "Adding..." : "Add Provider"}
          </button>
        </div>
      )}

      {/* ═══ SETTINGS TAB ═══ */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          {/* API Keys */}
          <div className="bg-void-dark border border-void-gray/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">API Keys & Bypass Services</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs text-gray-500 mb-1">scrape.do Token</label>
                <input
                  type="password"
                  value={globalSettings.scrapeDoToken}
                  onChange={(e) => setGlobalSettings({ ...globalSettings, scrapeDoToken: e.target.value })}
                  className="w-full bg-void-black border border-void-gray/50 rounded-lg px-4 py-2 text-white text-sm focus:border-void-red/50 focus:outline-none"
                  placeholder="your-scrape-do-token"
                />
                <p className="text-xs text-gray-600 mt-1">Get free 1000 credits/month at scrape.do — no credit card</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">FlareSolverr URL</label>
                <input
                  type="text"
                  value={globalSettings.flaresolverrUrl}
                  onChange={(e) => setGlobalSettings({ ...globalSettings, flaresolverrUrl: e.target.value })}
                  className="w-full bg-void-black border border-void-gray/50 rounded-lg px-4 py-2 text-white text-sm focus:border-void-red/50 focus:outline-none"
                  placeholder="http://localhost:8191/v1"
                />
                <p className="text-xs text-gray-600 mt-1">Self-hosted browser proxy for Cloudflare bypass</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => saveProviders({ globalSettings })}
                disabled={saving}
                className="px-4 py-2 bg-void-red rounded-lg text-sm font-semibold hover:bg-void-red-dark disabled:opacity-50 transition-all glow-red"
              >
                {saving ? "Saving..." : "Save API Keys"}
              </button>
            </div>
          </div>

          {/* Health Monitoring Settings */}
          <div className="bg-void-dark border border-void-gray/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Health Monitoring</h3>
            <div className="grid grid-cols-4 gap-6">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Check Interval (min)</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={globalSettings.healthCheckInterval}
                  onChange={(e) => setGlobalSettings({ ...globalSettings, healthCheckInterval: Number(e.target.value) })}
                  className="w-full bg-void-black border border-void-gray/50 rounded-lg px-4 py-2 text-white text-sm focus:border-void-red/50 focus:outline-none"
                />
                <p className="text-xs text-gray-600 mt-1">Cron runs every N minutes</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Auto-Disable After (fails)</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={globalSettings.autoDisableThreshold}
                  onChange={(e) => setGlobalSettings({ ...globalSettings, autoDisableThreshold: Number(e.target.value) })}
                  className="w-full bg-void-black border border-void-gray/50 rounded-lg px-4 py-2 text-white text-sm focus:border-void-red/50 focus:outline-none"
                />
                <p className="text-xs text-gray-600 mt-1">Consecutive failures before disable</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Recovery After (successes)</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={globalSettings.recoveryThreshold}
                  onChange={(e) => setGlobalSettings({ ...globalSettings, recoveryThreshold: Number(e.target.value) })}
                  className="w-full bg-void-black border border-void-gray/50 rounded-lg px-4 py-2 text-white text-sm focus:border-void-red/50 focus:outline-none"
                />
                <p className="text-xs text-gray-600 mt-1">Consecutive successes to re-enable</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">History Size</label>
                <input
                  type="number"
                  min={10}
                  max={500}
                  value={globalSettings.latencyHistorySize}
                  onChange={(e) => setGlobalSettings({ ...globalSettings, latencyHistorySize: Number(e.target.value) })}
                  className="w-full bg-void-black border border-void-gray/50 rounded-lg px-4 py-2 text-white text-sm focus:border-void-red/50 focus:outline-none"
                />
                <p className="text-xs text-gray-600 mt-1">Max latency records per provider</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-6 mt-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max Retries</label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={globalSettings.maxRetries}
                  onChange={(e) => setGlobalSettings({ ...globalSettings, maxRetries: Number(e.target.value) })}
                  className="w-full bg-void-black border border-void-gray/50 rounded-lg px-4 py-2 text-white text-sm focus:border-void-red/50 focus:outline-none"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={globalSettings.fallbackChain}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, fallbackChain: e.target.checked })}
                    className="w-5 h-5 rounded border-void-gray/50 bg-void-black text-void-red focus:ring-void-red/50"
                  />
                  <span className="text-sm text-gray-300">Enable fallback chain</span>
                </label>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Log Level</label>
                <select
                  value={globalSettings.logLevel}
                  onChange={(e) => setGlobalSettings({ ...globalSettings, logLevel: e.target.value })}
                  className="w-full bg-void-black border border-void-gray/50 rounded-lg px-4 py-2 text-white text-sm focus:border-void-red/50 focus:outline-none"
                >
                  <option value="none">None</option>
                  <option value="error">Errors only</option>
                  <option value="info">Info</option>
                  <option value="debug">Debug</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => saveProviders({ globalSettings })}
                disabled={saving}
                className="px-4 py-2 bg-void-red rounded-lg text-sm font-semibold hover:bg-void-red-dark disabled:opacity-50 transition-all glow-red"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ OVERVIEW TAB — Provider List ═══ */}
      {activeTab === "overview" && (
        <div className="space-y-3">
          {sorted.map((provider, idx) => {
            const isExpanded = expandedProvider === provider.id;
            const stats = provider.stats;
            const latencyBars = provider.latencyHistory.slice(-30);

            return (
              <div
                key={provider.id}
                className={`bg-void-dark border rounded-xl transition-all ${
                  provider.enabled ? "border-void-gray/50" : "border-void-gray/20 opacity-60"
                } ${provider.autoDisabled ? "border-red-500/20" : ""}`}
              >
                {/* Main Row */}
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {/* Priority Controls */}
                      <div className="flex flex-col items-center gap-1 pt-1">
                        <button
                          onClick={() => moveProvider(provider.id, "up")}
                          disabled={idx === 0}
                          className="text-gray-600 hover:text-white disabled:opacity-30 text-xs"
                        >▲</button>
                        <span className="text-xs font-mono text-gray-500 w-4 text-center">{idx + 1}</span>
                        <button
                          onClick={() => moveProvider(provider.id, "down")}
                          disabled={idx === sorted.length - 1}
                          className="text-gray-600 hover:text-white disabled:opacity-30 text-xs"
                        >▼</button>
                      </div>

                      {/* Status Dot + Name */}
                      <div className="pt-2">
                        <div className={`w-3 h-3 rounded-full ${statusDot[provider.healthStatus] || statusDot.unknown}`} />
                      </div>

                      <div>
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold text-white">{provider.name}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor[provider.healthStatus] || statusColor.unknown}`}>
                            {provider.autoDisabled ? "auto-disabled" : provider.healthStatus}
                          </span>
                          {provider.autoDisabled && (
                            <span className="text-xs text-red-400/70">
                              Fails: {provider.consecutiveFails}/{globalSettings.autoDisableThreshold}
                            </span>
                          )}
                          {provider.lastLatency !== null && (
                            <span className="text-xs text-gray-500">
                              {provider.lastLatency}ms avg
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{provider.description}</p>

                        {/* Stats Row */}
                        <div className="flex items-center gap-5 mt-2 text-xs text-gray-600">
                          <span title="Success rate (24h)">
                            <span className={stats.successRate >= 90 ? "text-emerald-500/70" : stats.successRate >= 70 ? "text-amber-500/70" : "text-red-500/70"}>
                              {stats.successRate}%
                            </span> success
                          </span>
                          <span title="Avg latency">
                            {stats.avgLatency}ms avg
                          </span>
                          <span title="P95 latency">
                            P95: {stats.p95Latency}ms
                          </span>
                          <span title="Checks in 24h">
                            {stats.checks24h} checks/24h
                          </span>
                          <span>{provider.successCount} ok / {provider.failCount} fail</span>
                          {provider.bypassService !== "none" && (
                            <span className="text-orange-400/70">Bypass: {provider.bypassService}</span>
                          )}
                          {provider.lastChecked && (
                            <span>Last: {new Date(provider.lastChecked).toLocaleTimeString()}</span>
                          )}
                        </div>

                        {/* Latency Sparkline */}
                        {latencyBars.length > 0 && (
                          <div className="flex items-end gap-px mt-2 h-6" title="Latency history (last 30 checks)">
                            {latencyBars.map((r, i) => {
                              const maxLatency = Math.max(...latencyBars.map((x) => x.latency), 1);
                              const height = Math.max(2, (r.latency / maxLatency) * 24);
                              return (
                                <div
                                  key={i}
                                  className={`w-1 rounded-t ${r.success ? "bg-emerald-500/40" : "bg-red-500/60"}`}
                                  style={{ height: `${height}px` }}
                                  title={`${r.latency}ms ${r.success ? "ok" : "fail"} — ${new Date(r.timestamp).toLocaleTimeString()}`}
                                />
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-3">
                      {/* Test Button */}
                      <button
                        onClick={() => testSingleProvider(provider.id)}
                        disabled={testing === provider.id}
                        className="px-3 py-1 bg-void-black border border-void-gray/50 rounded-lg text-xs hover:bg-void-gray/50 disabled:opacity-50 transition-all"
                        title="Test this provider now"
                      >
                        {testing === provider.id ? "..." : "Test"}
                      </button>

                      {/* Bypass */}
                      <select
                        value={provider.bypassService}
                        onChange={(e) => updateBypass(provider.id, e.target.value)}
                        className="bg-void-black border border-void-gray/50 rounded-lg px-2 py-1 text-xs text-gray-300 focus:border-void-red/50 focus:outline-none"
                      >
                        <option value="none">Direct</option>
                        <option value="scrape.do">scrape.do</option>
                        <option value="flaresolverr">FlareSolverr</option>
                      </select>

                      {/* Timeout */}
                      <input
                        type="number"
                        value={provider.timeout}
                        onChange={(e) => updateTimeout(provider.id, Number(e.target.value))}
                        className="w-20 bg-void-black border border-void-gray/50 rounded-lg px-2 py-1 text-xs text-gray-300 focus:border-void-red/50 focus:outline-none"
                        title="Timeout (ms)"
                      />

                      {/* Toggle */}
                      <button
                        onClick={() => toggleProvider(provider.id, !provider.enabled)}
                        className={`w-11 h-6 rounded-full transition-all relative ${
                          provider.enabled
                            ? "bg-void-red/30 border border-void-red/50"
                            : "bg-void-gray/30 border border-void-gray/50"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${
                            provider.enabled ? "left-5 bg-void-red" : "left-0.5 bg-gray-500"
                          }`}
                        />
                      </button>

                      {/* Expand/Collapse */}
                      <button
                        onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}
                        className="text-gray-500 hover:text-white text-xs px-1"
                        title="Expand details"
                      >
                        {isExpanded ? "▾" : "▸"}
                      </button>

                      {/* Delete */}
                      {isOwner && !["local-db", "hardcoded"].includes(provider.id) && (
                        <button
                          onClick={() => removeProvider(provider.id)}
                          className="text-gray-600 hover:text-red-400 text-xs px-2"
                          title="Delete"
                        >✕</button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-void-gray/30 p-5 bg-void-black/30">
                    <div className="grid grid-cols-3 gap-6">
                      {/* Config */}
                      <div>
                        <h5 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Configuration</h5>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-500">ID</span>
                            <span className="text-white font-mono">{provider.id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Type</span>
                            <span className="text-white">{provider.type}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Priority</span>
                            <span className="text-white">{provider.priority}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Timeout</span>
                            <span className="text-white">{provider.timeout}ms</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Bypass</span>
                            <span className="text-white">{provider.bypassService}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Base URL</span>
                            <input
                              value={provider.baseUrl}
                              onChange={(e) => updateBaseUrl(provider.id, e.target.value)}
                              className="w-full bg-void-black border border-void-gray/50 rounded px-2 py-1 text-white text-xs mt-1 focus:border-void-red/50 focus:outline-none"
                              placeholder="https://..."
                            />
                          </div>
                        </div>
                      </div>

                      {/* Health Stats */}
                      <div>
                        <h5 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Health Statistics</h5>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Success Rate (24h)</span>
                            <span className={stats.successRate >= 90 ? "text-emerald-400" : stats.successRate >= 70 ? "text-amber-400" : "text-red-400"}>
                              {stats.successRate}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Uptime (24h)</span>
                            <span className="text-white">{stats.uptime24h}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Avg Latency</span>
                            <span className="text-white">{stats.avgLatency}ms</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">P95 Latency</span>
                            <span className="text-white">{stats.p95Latency}ms</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">P99 Latency</span>
                            <span className="text-white">{stats.p99Latency}ms</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Checks (24h)</span>
                            <span className="text-white">{stats.checks24h}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Total Success</span>
                            <span className="text-emerald-400">{provider.successCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Total Fails</span>
                            <span className="text-red-400">{provider.failCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Consecutive Fails</span>
                            <span className={provider.consecutiveFails > 0 ? "text-amber-400" : "text-white"}>
                              {provider.consecutiveFails}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Recent Errors */}
                      <div>
                        <h5 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Recent Errors (24h)</h5>
                        {stats.last24hErrors.length === 0 ? (
                          <p className="text-xs text-gray-600">No errors in the last 24 hours</p>
                        ) : (
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {stats.last24hErrors.map((err, i) => (
                              <div key={i} className="text-xs text-red-400/70 bg-red-500/5 rounded px-2 py-1">
                                {err}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Auto-Disable Info */}
      <div className="mt-8 bg-void-dark border border-void-gray/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Health Monitoring</h3>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">How it works</h4>
            <div className="font-mono text-xs text-gray-400 space-y-1">
              <div><span className="text-void-red">1.</span> Every {globalSettings.healthCheckInterval} min, cron hits /api/cron/provider-health</div>
              <div><span className="text-void-red">2.</span> Each provider is pinged (with bypass if configured)</div>
              <div><span className="text-void-red">3.</span> Latency + success/fail recorded in history</div>
              <div><span className="text-void-red">4.</span> After {globalSettings.autoDisableThreshold} consecutive fails → auto-disabled</div>
              <div><span className="text-void-red">5.</span> After {globalSettings.recoveryThreshold} consecutive successes → auto-re-enabled</div>
              <div><span className="text-void-red">6.</span> Built-in providers (local-db, hardcoded) are never auto-disabled</div>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Latency Bars</h4>
            <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-3 bg-emerald-500/40 rounded-t inline-block" /> Success
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-3 bg-red-500/60 rounded-t inline-block" /> Failure
              </span>
              <span>Taller = higher latency</span>
            </div>
            <h4 className="text-sm font-medium text-gray-300 mb-2 mt-4">Status Meanings</h4>
            <div className="space-y-1 text-xs text-gray-500">
              <div><span className="text-emerald-400">●</span> Healthy — responding normally</div>
              <div><span className="text-amber-400">●</span> Degraded — slow or partial errors</div>
              <div><span className="text-red-400">●</span> Down — unreachable or timeout</div>
              <div><span className="text-red-400/50">●</span> Auto-disabled — too many failures, will auto-recover</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
