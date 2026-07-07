import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { testProvider } from "@/lib/health-monitor";

// POST /api/admin/providers/test — test a single provider
export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || !["OWNER", "ADMIN"].includes(role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const id = body.id;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const result = await testProvider(id);
  return NextResponse.json({ success: true, result });
}
