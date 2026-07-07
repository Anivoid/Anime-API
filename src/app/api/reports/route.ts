import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reports = await prisma.commentReport.findMany({
      where: { userId: session.user.id },
      include: {
        comment: {
          include: {
            anime: { select: { title: true, slug: true } },
            user: { select: { name: true, username: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { commentId, reason, details } = await request.json();

    if (!commentId || !reason?.trim()) {
      return NextResponse.json({ error: "Comment ID and reason are required" }, { status: 400 });
    }

    const existing = await prisma.commentReport.findUnique({
      where: { userId_commentId: { userId: session.user.id, commentId } },
    });

    if (existing) {
      return NextResponse.json({ error: "You have already reported this comment" }, { status: 409 });
    }

    const report = await prisma.commentReport.create({
      data: {
        userId: session.user.id,
        commentId,
        reason: reason.trim(),
        details: details?.trim() || null,
      },
      include: {
        comment: { select: { id: true } },
      },
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("Error creating report:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get("reportId");

    if (!reportId) {
      return NextResponse.json({ error: "Report ID is required" }, { status: 400 });
    }

    const report = await prisma.commentReport.findUnique({ where: { id: reportId } });
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (report.userId !== session.user.id && !["OWNER", "ADMIN"].includes(session.user.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.commentReport.delete({ where: { id: reportId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting report:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
