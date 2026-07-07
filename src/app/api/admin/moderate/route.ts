import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { reportError } from "@/lib/error-monitor";

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["OWNER", "ADMIN"].includes(session.user.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, action, reason, duration } = await request.json();

    if (!userId || !action) {
      return NextResponse.json({ error: "User ID and action required" }, { status: 400 });
    }

    // Prevent self-moderation
    if (userId === session.user.id) {
      return NextResponse.json({ error: "Cannot moderate yourself" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true, username: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Owner cannot be moderated
    if (user.role === "OWNER") {
      return NextResponse.json({ error: "Cannot moderate the owner" }, { status: 403 });
    }

    // Admin cannot be moderated by non-owner
    if (user.role === "ADMIN" && session.user.role !== "OWNER") {
      return NextResponse.json({ error: "Only owner can moderate admins" }, { status: 403 });
    }

    let details = "";

    switch (action) {
      case "ban": {
        const bannedUntil = duration
          ? new Date(Date.now() + duration * 60000)
          : null; // null = permanent

        await prisma.user.update({
          where: { id: userId },
          data: { role: "BANNED" },
        });

        details = `Banned ${user.username || user.name}${duration ? ` for ${duration} minutes` : " permanently"}`;
        if (reason) details += `: ${reason}`;
        break;
      }
      case "unban": {
        await prisma.user.update({
          where: { id: userId },
          data: { role: "USER" },
        });
        details = `Unbanned ${user.username || user.name}`;
        break;
      }
      case "mute": {
        details = `Muted ${user.username || user.name} (feature coming soon)`;
        break;
      }
      case "change-role": {
        const { newRole } = await request.json();
        if (!newRole || !["USER", "UPLOADER", "MODERATOR"].includes(newRole)) {
          return NextResponse.json({ error: "Invalid role" }, { status: 400 });
        }
        await prisma.user.update({
          where: { id: userId },
          data: { role: newRole },
        });
        details = `Changed ${user.username || user.name} role to ${newRole}`;
        break;
      }
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: `USER_${action.toUpperCase()}`,
        entity: "User",
        entityId: userId,
        details,
      },
    });

    return NextResponse.json({ success: true, details });
  } catch (error) {
    console.error("Error moderating user:", error);
    reportError(error instanceof Error ? error : "Unknown error", { api: "Moderate API" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
