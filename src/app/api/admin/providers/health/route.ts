import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runFullHealthCheck } from "@/lib/health-monitor";

// POST /api/admin/providers/health — run health check on all providers
export async function POST() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || !["OWNER", "ADMIN"].includes(role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runFullHealthCheck();
  return NextResponse.json({ success: true, ...result });
}
