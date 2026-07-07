import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

// ═══════════════════════════════════════════════════════════
// Provider Configuration Store
// Persists to data/providers.json — hot-reloadable, no code changes
// ═══════════════════════════════════════════════════════════

export interface LatencyRecord {
  timestamp: string;
  latency: number;
  success: boolean;
  error?: string;
}

export interface ProviderConfig {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  type: "api" | "scrape" | "local" | "embed";
  baseUrl: string;
  apiKeyEnv?: string;
  bypassService?: "scrape.do" | "flaresolverr" | "none";
  bypassKeyEnv?: string;
  timeout: number;
  maxConcurrent: number;
  supportsSub: boolean;
  supportsDub: boolean;
  description: string;
  // Health tracking
  healthStatus: "healthy" | "degraded" | "down" | "unknown" | "auto-disabled";
  lastChecked: string | null;
  lastError: string | null;
  lastLatency: number | null;
  successCount: number;
  failCount: number;
  consecutiveFails: number;
  autoDisabled: boolean;
  latencyHistory: LatencyRecord[];
}

export interface ProviderStoreData {
  version: number;
  providers: ProviderConfig[];
  globalSettings: {
    maxRetries: number;
    fallbackChain: boolean;
    scrapeDoToken: string;
    flaresolverrUrl: string;
    logLevel: "none" | "error" | "info" | "debug";
    healthCheckInterval: number; // minutes
    autoDisableThreshold: number; // consecutive fails to auto-disable
    recoveryThreshold: number; // consecutive successes to re-enable
    latencyHistorySize: number; // max records to keep
  };
}

const CONFIG_DIR = join(process.cwd(), "data");
const CONFIG_FILE = join(CONFIG_DIR, "providers.json");

function makeProvider(overrides: Partial<ProviderConfig> & { id: string; name: string }): ProviderConfig {
  return {
    enabled: true,
    priority: 0,
    type: "api",
    baseUrl: "",
    timeout: 10000,
    maxConcurrent: 3,
    supportsSub: true,
    supportsDub: true,
    description: "",
    healthStatus: "unknown",
    lastChecked: null,
    lastError: null,
    lastLatency: null,
    successCount: 0,
    failCount: 0,
    consecutiveFails: 0,
    autoDisabled: false,
    latencyHistory: [],
    ...overrides,
  };
}

const DEFAULT_CONFIG: ProviderStoreData = {
  version: 2,
  globalSettings: {
    maxRetries: 2,
    fallbackChain: true,
    scrapeDoToken: process.env.SCRAPE_DO_TOKEN || "",
    flaresolverrUrl: process.env.FLARESOLVERR_URL || "",
    logLevel: "info",
    healthCheckInterval: 5,
    autoDisableThreshold: 5,
    recoveryThreshold: 3,
    latencyHistorySize: 50,
  },
  providers: [
    makeProvider({
      id: "local-db",
      name: "Local Database",
      enabled: true,
      priority: 1,
      type: "local",
      baseUrl: "",
      timeout: 5000,
      maxConcurrent: 5,
      description: "Pre-seeded anime with local video URLs",
    }),
    makeProvider({
      id: "miruro",
      name: "MiruroAPI",
      enabled: true,
      priority: 2,
      type: "api",
      baseUrl: process.env.MIRURO_API_URL || "https://miruro-api-coral.vercel.app",
      apiKeyEnv: undefined,
      bypassService: "scrape.do",
      bypassKeyEnv: "SCRAPE_DO_TOKEN",
      timeout: 12000,
      description: "Community scraping API — Kiwi, Anify, AnimeSkip providers",
    }),
    makeProvider({
      id: "aniwatch",
      name: "AniWatch (Anime-API)",
      enabled: true,
      priority: 3,
      type: "api",
      baseUrl: process.env.ANIME_API_URL || "https://anime-api-roan-ten.vercel.app",
      timeout: 15000,
      description: "AniWatch/HiAnime source via community API",
    }),
    makeProvider({
      id: "consumet",
      name: "Consumet",
      enabled: false,
      priority: 4,
      type: "api",
      baseUrl: process.env.CONSUMET_URL || "https://api.consumet.org",
      timeout: 12000,
      description: "Consumet API — multi-source anime aggregator",
    }),
  ],
};

function ensureConfigDir() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadProviderConfig(): ProviderStoreData {
  try {
    ensureConfigDir();
    if (!existsSync(CONFIG_FILE)) {
      writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
      return structuredClone(DEFAULT_CONFIG);
    }
    const raw = readFileSync(CONFIG_FILE, "utf-8");
    const data = JSON.parse(raw) as ProviderStoreData;

    // Merge with defaults for any missing fields
    const merged: ProviderStoreData = {
      version: data.version ?? DEFAULT_CONFIG.version,
      globalSettings: { ...DEFAULT_CONFIG.globalSettings, ...(data.globalSettings || {}) },
      providers: (data.providers?.length ? data.providers : DEFAULT_CONFIG.providers).map((p) => ({
        ...makeProvider({ id: p.id, name: p.name }),
        ...p,
        latencyHistory: p.latencyHistory || [],
        consecutiveFails: p.consecutiveFails ?? 0,
        autoDisabled: p.autoDisabled ?? false,
        lastLatency: p.lastLatency ?? null,
      })),
    };

    return merged;
  } catch {
    return structuredClone(DEFAULT_CONFIG);
  }
}

export function saveProviderConfig(data: ProviderStoreData): void {
  ensureConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
}

export function getProviderById(id: string): ProviderConfig | undefined {
  return loadProviderConfig().providers.find((p) => p.id === id);
}

// ═══════════════════════════════════════════════════════════
// Health Update — records latency, manages auto-disable
// ═══════════════════════════════════════════════════════════
export function updateProviderHealth(
  id: string,
  status: "healthy" | "degraded" | "down",
  latency?: number,
  error?: string
): void {
  const config = loadProviderConfig();
  const provider = config.providers.find((p) => p.id === id);
  if (!provider) return;

  const now = new Date().toISOString();
  const settings = config.globalSettings;

  // Record latency
  if (latency !== undefined) {
    provider.lastLatency = latency;
    provider.latencyHistory.push({
      timestamp: now,
      latency,
      success: status === "healthy",
      error,
    });
    // Trim history
    if (provider.latencyHistory.length > settings.latencyHistorySize) {
      provider.latencyHistory = provider.latencyHistory.slice(-settings.latencyHistorySize);
    }
  }

  provider.healthStatus = status;
  provider.lastChecked = now;

  if (status === "healthy") {
    provider.lastError = null;
    provider.successCount++;
    provider.consecutiveFails = 0;

    // Auto-re-enable if previously auto-disabled
    if (provider.autoDisabled && provider.consecutiveFails >= settings.recoveryThreshold) {
      provider.autoDisabled = false;
      provider.enabled = true;
      provider.healthStatus = "healthy";
      console.log(`[HealthMonitor] ✓ Auto-re-enabled "${provider.name}" after ${settings.recoveryThreshold} consecutive successes`);
    }
  } else {
    if (error) provider.lastError = error;
    provider.failCount++;
    provider.consecutiveFails++;

    // Auto-disable if threshold reached
    if (
      provider.consecutiveFails >= settings.autoDisableThreshold &&
      !provider.autoDisabled &&
      provider.id !== "local-db"
    ) {
      provider.autoDisabled = true;
      provider.enabled = false;
      provider.healthStatus = "auto-disabled";
      console.log(`[HealthMonitor] ✗ Auto-disabled "${provider.name}" after ${provider.consecutiveFails} consecutive failures`);
    }
  }

  saveProviderConfig(config);
}

// ═══════════════════════════════════════════════════════════
// Compute Stats — derived from latency history
// ═══════════════════════════════════════════════════════════
export interface ProviderStats {
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  successRate: number;
  uptime24h: number;
  checks24h: number;
  last24hErrors: string[];
}

export function computeProviderStats(provider: ProviderConfig): ProviderStats {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const allHistory = provider.latencyHistory;
  const dayHistory = allHistory.filter((r) => new Date(r.timestamp).getTime() > oneDayAgo);

  // Latency stats (from all history)
  const latencies = allHistory
    .filter((r) => r.success && r.latency > 0)
    .map((r) => r.latency)
    .sort((a, b) => a - b);

  const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
  const p95Idx = Math.floor(latencies.length * 0.95);
  const p99Idx = Math.floor(latencies.length * 0.99);
  const p95Latency = latencies[p95Idx] ?? avgLatency;
  const p99Latency = latencies[p99Idx] ?? avgLatency;

  // Success rate (24h)
  const checks24h = dayHistory.length;
  const successes24h = dayHistory.filter((r) => r.success).length;
  const successRate = checks24h > 0 ? Math.round((successes24h / checks24h) * 100) : 100;

  // Uptime (24h) = percentage of time with healthy status
  const uptime24h = checks24h > 0 ? Math.round((successes24h / checks24h) * 100) : 100;

  // Recent errors
  const last24hErrors = dayHistory
    .filter((r) => !r.success && r.error)
    .slice(-10)
    .map((r) => r.error!);

  return {
    avgLatency,
    p95Latency,
    p99Latency,
    successRate,
    uptime24h,
    checks24h,
    last24hErrors,
  };
}
