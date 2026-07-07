import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  loadProviderConfig,
  saveProviderConfig,
  type ProviderConfig,
  type ProviderStoreData,
} from "@/lib/provider-config";
import { runFullHealthCheck, getFullProviderStatus } from "@/lib/health-monitor";

// GET /api/admin/providers — list all providers + global settings
export async function GET() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || !["OWNER", "ADMIN"].includes(role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(getFullProviderStatus());
}

// PATCH /api/admin/providers — update providers or global settings
export async function PATCH(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || !["OWNER", "ADMIN"].includes(role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = await req.json();
  const config = loadProviderConfig();

  // Update global settings
  if (body.globalSettings) {
    config.globalSettings = { ...config.globalSettings, ...body.globalSettings };
  }

  // Update individual providers
  if (body.providers && Array.isArray(body.providers)) {
    for (const update of body.providers) {
      const idx = config.providers.findIndex((p) => p.id === update.id);
      if (idx >= 0) {
        config.providers[idx] = { ...config.providers[idx], ...update };
      }
    }
  }

  // Reorder by priority
  if (body.reorder && Array.isArray(body.reorder)) {
    for (const item of body.reorder) {
      const p = config.providers.find((pr) => pr.id === item.id);
      if (p) p.priority = item.priority;
    }
    config.providers.sort((a, b) => a.priority - b.priority);
  }

  saveProviderConfig(config);
  return NextResponse.json({ success: true, ...getFullProviderStatus() });
}

// POST /api/admin/providers — add a new provider
export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized — OWNER only" }, { status: 401 });
  }

  const body = await req.json();
  const config = loadProviderConfig();

  if (!body.id || !body.name) {
    return NextResponse.json({ error: "id and name required" }, { status: 400 });
  }

  if (config.providers.find((p) => p.id === body.id)) {
    return NextResponse.json({ error: "Provider ID already exists" }, { status: 409 });
  }

  const newProvider: ProviderConfig = {
    id: body.id,
    name: body.name,
    enabled: body.enabled ?? true,
    priority: body.priority ?? config.providers.length + 1,
    type: body.type ?? "api",
    baseUrl: body.baseUrl ?? "",
    apiKeyEnv: body.apiKeyEnv,
    bypassService: body.bypassService ?? "none",
    bypassKeyEnv: body.bypassKeyEnv,
    timeout: body.timeout ?? 10000,
    maxConcurrent: body.maxConcurrent ?? 3,
    supportsSub: body.supportsSub ?? true,
    supportsDub: body.supportsDub ?? true,
    description: body.description ?? "",
    healthStatus: "unknown",
    lastChecked: null,
    lastError: null,
    lastLatency: null,
    successCount: 0,
    failCount: 0,
    consecutiveFails: 0,
    autoDisabled: false,
    latencyHistory: [],
  };

  config.providers.push(newProvider);
  config.providers.sort((a, b) => a.priority - b.priority);
  saveProviderConfig(config);

  return NextResponse.json({ success: true, provider: newProvider });
}

// DELETE /api/admin/providers?id=<id> — remove a provider
export async function DELETE(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized — OWNER only" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const config = loadProviderConfig();
  const idx = config.providers.findIndex((p) => p.id === id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Don't allow deleting critical built-in providers
  if (["local-db", "hardcoded"].includes(id)) {
    return NextResponse.json({ error: "Cannot delete built-in provider" }, { status: 400 });
  }

  config.providers.splice(idx, 1);
  saveProviderConfig(config);

  return NextResponse.json({ success: true });
}
