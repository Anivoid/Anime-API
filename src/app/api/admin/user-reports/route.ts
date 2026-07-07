import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { reportError } from "@/lib/error-monitor";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["OWNER", "ADMIN", "MODERATOR"].includes(session.user.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";

    const reports = await prisma.userReport.findMany({
      where: { status },
      include: {
        reportedUser: { select: { id: true, name: true, username: true, email: true, role: true } },
        reporter: { select: { name: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const counts = await prisma.userReport.groupBy({
      by: ["status"],
      _count: true,
    });

    return NextResponse.json({ reports, counts: Object.fromEntries(counts.map((c) => [c.status, c._count])) });
  } catch (error) {
    console.error("Error fetching user reports:", error);
    reportError(error instanceof Error ? error : "Unknown error", { api: "User Reports API" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reportedUserId, reason, details } = await request.json();

    if (!reportedUserId || !reason?.trim()) {
      return NextResponse.json({ error: "Reported user ID and reason required" }, { status: 400 });
    }

    if (reportedUserId === session.user.id) {
      return NextResponse.json({ error: "Cannot report yourself" }, { status: 400 });
    }

    const existing = await prisma.userReport.findFirst({
      where: { reporterId: session.user.id, reportedUserId },
    });

    if (existing) {
      return NextResponse.json({ error: "You have already reported this user" }, { status: 409 });
    }

    const report = await prisma.userReport.create({
      data: {
        reporterId: session.user.id,
        reportedUserId,
        reason: reason.trim(),
        details: details?.trim() || null,
      },
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("Error creating user report:", error);
    reportError(error instanceof Error ? error : "Unknown error", { api: "User Reports API" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["OWNER", "ADMIN"].includes(session.user.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { reportId, status } = await request.json();

    if (!reportId || !status) {
      return NextResponse.json({ error: "Report ID and status required" }, { status: 400 });
    }

    const report = await prisma.userReport.update({
      where: { id: reportId },
      data: { status, reviewedBy: session.user.id },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "USER_REPORT_REVIEW",
        entity: "UserReport",
        entityId: reportId,
        details: `User report ${status}`,
      },
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("Error updating user report:", error);
    reportError(error instanceof Error ? error : "Unknown error", { api: "User Reports API" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
