import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { withCache } from "@/lib/cache";
import { reportError } from "@/lib/error-monitor";
import { checkForSpam, validateContentLength } from "@/lib/anti-spam";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const comments = await prisma.forumComment.findMany({
      where: { postId: id, parentId: null },
      include: {
        user: { select: { id: true, name: true, username: true, image: true } },
        replies: {
          include: {
            user: { select: { id: true, name: true, username: true, image: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const response = NextResponse.json(comments);
    return withCache(response, "comments");
  } catch (error) {
    console.error("Error fetching forum comments:", error);
    reportError(error instanceof Error ? error : "Unknown error", { api: "Forum Comments API" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { allowed, headers } = applyRateLimit(request, RATE_LIMITS.comment);
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { content, parentId } = await request.json();

    if (!content || content.length < 2 || content.length > 5000) {
      return NextResponse.json({ error: "Content must be between 2 and 5000 characters" }, { status: 400 });
    }

    const lengthCheck = validateContentLength(content, "comment");
    if (!lengthCheck.valid) {
      return NextResponse.json({ error: lengthCheck.error }, { status: 400 });
    }

    const spamCheck = checkForSpam(content);
    if (spamCheck.isSpam) {
      return NextResponse.json({ error: "Comment flagged as spam" }, { status: 400 });
    }

    const post = await prisma.forumPost.findUnique({
      where: { id },
      select: { id: true, locked: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.locked) {
      return NextResponse.json({ error: "Post is locked" }, { status: 403 });
    }

    if (parentId) {
      const parentComment = await prisma.forumComment.findUnique({
        where: { id: parentId },
        select: { id: true, postId: true },
      });

      if (!parentComment || parentComment.postId !== id) {
        return NextResponse.json({ error: "Invalid parent comment" }, { status: 400 });
      }
    }

    const comment = await prisma.forumComment.create({
      data: {
        postId: id,
        userId: session.user.id,
        content: content.trim(),
        parentId: parentId || null,
      },
      include: {
        user: { select: { id: true, name: true, username: true, image: true } },
      },
    });

    // Update comment count on post
    await prisma.forumPost.update({
      where: { id },
      data: { commentCount: { increment: 1 } },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("Error creating forum comment:", error);
    reportError(error instanceof Error ? error : "Unknown error", { api: "Forum Comments API" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}