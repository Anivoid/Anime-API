import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    
    // Owner, Admin, Moderator can access featured content
    if (!["OWNER", "ADMIN", "MODERATOR"].includes(userRole || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const anime = await prisma.anime.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        featured: true,
        trending: true,
        pinned: true,
        rating: true,
        status: true,
      },
      orderBy: { title: "asc" },
    });

    return NextResponse.json(anime);
  } catch (error) {
    console.error("Error fetching anime:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    
    // Only Owner and Admin can feature content
    if (!["OWNER", "ADMIN"].includes(userRole || "")) {
      return NextResponse.json({ error: "Only Owner/Admin can feature content" }, { status: 403 });
    }

    const body = await request.json();
    const { animeId, featured, trending, pinned } = body;

    if (!animeId) {
      return NextResponse.json({ error: "animeId is required" }, { status: 400 });
    }

    const updated = await prisma.anime.update({
      where: { id: animeId },
      data: {
        ...(featured !== undefined && { featured }),
        ...(trending !== undefined && { trending }),
        ...(pinned !== undefined && { pinned }),
      },
      select: { id: true, title: true, featured: true, trending: true, pinned: true },
    });

    const changes: string[] = [];
    if (featured !== undefined) changes.push(`featured=${featured}`);
    if (trending !== undefined) changes.push(`trending=${trending}`);
    if (pinned !== undefined) changes.push(`pinned=${pinned}`);

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "FEATURED_TOGGLE",
        entity: "Anime",
        entityId: animeId,
        details: `${updated.title}: ${changes.join(", ")}`,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating featured content:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
