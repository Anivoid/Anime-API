import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

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

    const reports = await prisma.commentReport.findMany({
      where: { status },
      include: {
        comment: {
          include: {
            anime: { select: { title: true, slug: true } },
            user: { select: { id: true, name: true, username: true } },
          },
        },
        user: { select: { name: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const counts = await prisma.commentReport.groupBy({
      by: ["status"],
      _count: true,
    });

    return NextResponse.json({ reports, counts: Object.fromEntries(counts.map((c) => [c.status, c._count])) });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["OWNER", "ADMIN", "MODERATOR"].includes(session.user.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { reportId, status } = await request.json();

    if (!reportId || !status) {
      return NextResponse.json({ error: "Report ID and status are required" }, { status: 400 });
    }

    if (!["pending", "reviewed", "dismissed"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const report = await prisma.commentReport.update({
      where: { id: reportId },
      data: { status, reviewedBy: session.user.id },
    });

    // Log the action
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "REPORT_REVIEW",
        entity: "CommentReport",
        entityId: reportId,
        details: `Report ${status}`,
      },
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("Error updating report:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
