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

    if (!["OWNER", "ADMIN"].includes(session.user.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const entity = searchParams.get("entity");
    const action = searchParams.get("action");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "100");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "30");
    const statsOnly = searchParams.get("stats") === "true";

    if (statsOnly) {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now.getTime() - 7 * 86400000);

      const [total, today, thisWeek, actionBreakdown] = await Promise.all([
        prisma.activityLog.count(),
        prisma.activityLog.count({ where: { createdAt: { gte: startOfDay } } }),
        prisma.activityLog.count({ where: { createdAt: { gte: startOfWeek } } }),
        prisma.activityLog.groupBy({
          by: ["action"],
          _count: true,
          orderBy: { _count: { action: "desc" } },
          take: 10,
        }),
      ]);

      return NextResponse.json({
        total,
        today,
        thisWeek,
        actionBreakdown: actionBreakdown.map((a) => ({ action: a.action, count: a._count })),
      });
    }

    const where: Record<string, unknown> = {};
    if (entity) where.entity = entity;
    if (action) where.action = action;
    if (search) {
      where.details = { contains: search };
    }

    const skip = (page - 1) * pageSize;

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          user: { select: { name: true, username: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        take: Math.min(pageSize, 100),
        skip,
      }),
      prisma.activityLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      totalPages: Math.ceil(total / pageSize),
      total,
    });
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    reportError(error instanceof Error ? error : "Unknown error", { api: "Admin Activity API" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, entity, entityId, details } = await request.json();

    if (!action || !entity) {
      return NextResponse.json({ error: "Action and entity are required" }, { status: 400 });
    }

    const log = await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action,
        entity,
        entityId: entityId || null,
        details: details || null,
      },
    });

    return NextResponse.json(log);
  } catch (error) {
    console.error("Error creating activity log:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
