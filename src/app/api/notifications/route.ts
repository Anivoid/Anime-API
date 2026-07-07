import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/notifications - Get user notifications
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unread") === "true";
  const limit = parseInt(url.searchParams.get("limit") || "50");

  const where: Record<string, unknown> = { userId };
  if (unreadOnly) where.read = false;

  const [notifications, unreadCount] = await Promise.all([
    prisma.userNotification.findMany({
      where,
      include: { anime: { select: { id: true, title: true, slug: true, coverImage: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.userNotification.count({ where: { userId, read: false } }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await req.json();
  const { markAllRead, notificationIds } = body;

  if (markAllRead) {
    await prisma.userNotification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });
  } else if (notificationIds?.length) {
    await prisma.userNotification.updateMany({
      where: { userId, id: { in: notificationIds } },
      data: { read: true, readAt: new Date() },
    });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/notifications - Clear notifications
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const url = new URL(req.url);
  const olderThan = url.searchParams.get("olderThan");

  const where: Record<string, unknown> = { userId };
  if (olderThan) {
    where.createdAt = { lt: new Date(olderThan) };
  }

  await prisma.userNotification.deleteMany({ where });
  return NextResponse.json({ success: true });
}
