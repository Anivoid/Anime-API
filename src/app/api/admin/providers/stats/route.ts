import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFullProviderStatus } from "@/lib/health-monitor";

// GET /api/admin/providers/stats — full provider status with health stats
export async function GET() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || !["OWNER", "ADMIN"].includes(role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(getFullProviderStatus());
}
