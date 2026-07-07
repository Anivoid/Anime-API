import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["OWNER", "ADMIN"].includes(session.user.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const scheduled = await prisma.scheduledPublish.findMany({
      orderBy: { scheduledAt: "asc" },
    });

    return NextResponse.json(scheduled);
  } catch (error) {
    console.error("Error fetching scheduled:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["OWNER", "ADMIN"].includes(session.user.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { title, description, content, slug, genreIds, scheduledAt } = await request.json();

    if (!title?.trim() || !scheduledAt) {
      return NextResponse.json({ error: "Title and scheduled time are required" }, { status: 400 });
    }

    const scheduled = await prisma.scheduledPublish.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        content: content?.trim() || null,
        slug: slug?.trim() || null,
        genreIds: JSON.stringify(genreIds || []),
        scheduledAt: new Date(scheduledAt),
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "SCHEDULE_CREATE",
        entity: "ScheduledPublish",
        entityId: scheduled.id,
        details: `Scheduled "${title}" for ${scheduledAt}`,
      },
    });

    return NextResponse.json(scheduled);
  } catch (error) {
    console.error("Error creating schedule:", error);
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

    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: "ID and status are required" }, { status: 400 });
    }

    const scheduled = await prisma.scheduledPublish.update({
      where: { id },
      data: { status },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: `SCHEDULE_${status.toUpperCase()}`,
        entity: "ScheduledPublish",
        entityId: id,
        details: `Schedule ${status}: "${scheduled.title}"`,
      },
    });

    return NextResponse.json(scheduled);
  } catch (error) {
    console.error("Error updating schedule:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["OWNER", "ADMIN"].includes(session.user.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.scheduledPublish.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "SCHEDULE_DELETE",
        entity: "ScheduledPublish",
        entityId: id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting schedule:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
