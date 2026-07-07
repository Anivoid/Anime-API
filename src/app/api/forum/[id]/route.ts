import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { withCache } from "@/lib/cache";
import { reportError } from "@/lib/error-monitor";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const post = await prisma.forumPost.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, username: true, image: true } },
        comments: {
          where: { parentId: null },
          include: {
            user: { select: { id: true, name: true, username: true, image: true } },
            votes: true,
            replies: {
              include: {
                user: { select: { id: true, name: true, username: true, image: true } },
                votes: true,
              },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        votes: true,
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Increment view count
    await prisma.forumPost.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    const response = NextResponse.json(post);
    return withCache(response, "comments");
  } catch (error) {
    console.error("Error fetching forum post:", error);
    reportError(error instanceof Error ? error : "Unknown error", { api: "Forum API" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const post = await prisma.forumPost.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const userRole = (session.user as { role?: string }).role || "";
    if (post.userId !== session.user.id && !["OWNER", "ADMIN", "MODERATOR"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.forumPost.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting forum post:", error);
    reportError(error instanceof Error ? error : "Unknown error", { api: "Forum API" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}