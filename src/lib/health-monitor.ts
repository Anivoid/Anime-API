import {
  loadProviderConfig,
  updateProviderHealth,
  computeProviderStats,
  type ProviderConfig,
  type ProviderStoreData,
  type ProviderStats,
} from "./provider-config";

// ═══════════════════════════════════════════════════════════
// Provider Health Monitor
// Runs every 5 minutes via /api/cron/provider-health
// Checks each provider, records stats, auto-disables failures
// ═══════════════════════════════════════════════════════════

export interface HealthCheckResult {
  id: string;
  name: string;
  status: "healthy" | "degraded" | "down" | "auto-disabled" | "skipped";
  latency: number | null;
  error?: string;
  autoDisabled?: boolean;
  autoReEnabled?: boolean;
}

// Health check endpoint URL per provider type
function getHealthUrl(provider: ProviderConfig): string | null {
  if (!provider.baseUrl) return null;

  switch (provider.id) {
    case "sankanime":
      return `${provider.baseUrl}/samehadaku/search?q=naruto`;
    case "aniwatch":
      return `${provider.baseUrl}/aniwatch/search?keyword=naruto&page=1`;
    case "consumet":
      return `${provider.baseUrl}/anime/zoro/naruto`;
    default:
      return provider.baseUrl;
  }
}

// ═══════════════════════════════════════════════════════════
// Check a Single Provider
// ═══════════════════════════════════════════════════════════
async function checkProvider(
  provider: ProviderConfig,
  settings: ProviderStoreData["globalSettings"]
): Promise<HealthCheckResult> {
  const base: HealthCheckResult = {
    id: provider.id,
    name: provider.name,
    status: "down",
    latency: null,
  };

  // Local DB — check Prisma connection
  if (provider.id === "local-db") {
    const start = Date.now();
    try {
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient();
      await prisma.anime.count({ take: 1 });
      const latency = Date.now() - start;
      updateProviderHealth("local-db", "healthy", latency);
      return { ...base, status: "healthy", latency };
    } catch (e) {
      const latency = Date.now() - start;
      const error = (e as Error).message;
      updateProviderHealth("local-db", "down", latency, error);
      return { ...base, status: "down", latency, error };
    }
  }

  // Skip disabled providers (unless auto-disabled — we still check to see if they recover)
  if (!provider.enabled && !provider.autoDisabled) {
    return { ...base, status: "skipped" };
  }

  const url = getHealthUrl(provider);
  if (!url) {
    return { ...base, status: "down", error: "No base URL configured" };
  }

  const start = Date.now();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(provider.timeout || 10000, 8000));

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "AnimeVoid-HealthMonitor/1.0" },
    });
    clearTimeout(timer);

    const latency = Date.now() - start;

    if (res.ok) {
      updateProviderHealth(provider.id, "healthy", latency);

      // Auto-re-enable if previously auto-disabled
      if (provider.autoDisabled) {
        updateProviderHealth(provider.id, "healthy", latency);
        return { ...base, status: "healthy", latency, autoReEnabled: true };
      }

      return { ...base, status: "healthy", latency };
    }

    // Non-200 but got a response = degraded (might be partial)
    const error = `HTTP ${res.status}`;
    if (res.status >= 500) {
      updateProviderHealth(provider.id, "down", latency, error);
      return { ...base, status: "down", latency, error };
    }
    updateProviderHealth(provider.id, "degraded", latency, error);
    return { ...base, status: "degraded", latency, error };
  } catch (e) {
    const latency = Date.now() - start;
    const error = (e as Error).name === "AbortError" ? "Timeout" : (e as Error).message;
    updateProviderHealth(provider.id, "down", latency, error);

    // Check if auto-disable should trigger
    const updatedConfig = loadProviderConfig();
    const updatedProvider = updatedConfig.providers.find((p) => p.id === provider.id);
    if (updatedProvider?.autoDisabled) {
      return { ...base, status: "auto-disabled", latency, error, autoDisabled: true };
    }

    return { ...base, status: "down", latency, error };
  }
}

// ═══════════════════════════════════════════════════════════
// Full Health Check — runs all providers
// ═══════════════════════════════════════════════════════════
export async function runFullHealthCheck(): Promise<{
  results: HealthCheckResult[];
  summary: { total: number; healthy: number; degraded: number; down: number; autoDisabled: number; skipped: number };
  timestamp: string;
}> {
  const config = loadProviderConfig();
  const results: HealthCheckResult[] = [];

  // Check all providers (including auto-disabled ones for recovery detection)
  for (const provider of config.providers) {
    const result = await checkProvider(provider, config.globalSettings);
    results.push(result);
  }

  const summary = {
    total: results.length,
    healthy: results.filter((r) => r.status === "healthy").length,
    degraded: results.filter((r) => r.status === "degraded").length,
    down: results.filter((r) => r.status === "down").length,
    autoDisabled: results.filter((r) => r.status === "auto-disabled").length,
    skipped: results.filter((r) => r.status === "skipped").length,
  };

  const timestamp = new Date().toISOString();
  console.log(
    `[HealthMonitor] ${timestamp} — ${summary.healthy} healthy, ${summary.degraded} degraded, ${summary.down} down, ${summary.autoDisabled} auto-disabled`
  );

  return { results, summary, timestamp };
}

// ═══════════════════════════════════════════════════════════
// Single Provider Test (manual from admin panel)
// ═══════════════════════════════════════════════════════════
export async function testProvider(id: string): Promise<HealthCheckResult> {
  const config = loadProviderConfig();
  const provider = config.providers.find((p) => p.id === id);
  if (!provider) {
    return { id, name: id, status: "down", latency: null, error: "Provider not found" };
  }
  return checkProvider(provider, config.globalSettings);
}

// ═══════════════════════════════════════════════════════════
// Get Full Provider Status with Stats
// ═══════════════════════════════════════════════════════════
export interface ProviderStatusWithStats {
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
  description: string;
  baseUrl: string;
  timeout: number;
  stats: ProviderStats;
  latencyHistory: { timestamp: string; latency: number; success: boolean }[];
}

export function getFullProviderStatus(): {
  providers: ProviderStatusWithStats[];
  globalSettings: ProviderStoreData["globalSettings"];
} {
  const config = loadProviderConfig();

  return {
    providers: config.providers.map((p) => ({
      id: p.id,
      name: p.name,
      enabled: p.enabled,
      priority: p.priority,
      type: p.type,
      healthStatus: p.healthStatus,
      lastChecked: p.lastChecked,
      lastError: p.lastError,
      lastLatency: p.lastLatency,
      successCount: p.successCount,
      failCount: p.failCount,
      consecutiveFails: p.consecutiveFails,
      autoDisabled: p.autoDisabled,
      description: p.description,
      baseUrl: p.baseUrl,
      timeout: p.timeout,
      stats: computeProviderStats(p),
      latencyHistory: p.latencyHistory.map((r) => ({
        timestamp: r.timestamp,
        latency: r.latency,
        success: r.success,
      })),
    })),
    globalSettings: config.globalSettings,
  };
}
