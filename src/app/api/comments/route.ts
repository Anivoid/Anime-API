import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { withCache } from "@/lib/cache";
import { createNotification } from "@/lib/notifications";
import { reportError } from "@/lib/error-monitor";
import { checkForSpam, validateContentLength } from "@/lib/anti-spam";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const animeId = searchParams.get("animeId");
    const episodeId = searchParams.get("episodeId");
    const commentId = searchParams.get("commentId");

    if (commentId) {
      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
        include: {
          user: { select: { id: true, name: true, username: true, image: true } },
          replies: {
            include: {
              user: { select: { id: true, name: true, username: true, image: true } },
              commentLikes: true,
            },
            orderBy: { createdAt: "asc" },
          },
          commentLikes: true,
        },
      });
      const commentResponse = NextResponse.json(comment);
      return withCache(commentResponse, "comments");
    }

    if (!animeId) {
      return NextResponse.json({ error: "Anime ID is required" }, { status: 400 });
    }

    const where: Record<string, unknown> = { animeId, parentId: null };
    if (episodeId) where.episodeId = episodeId;

    const comments = await prisma.comment.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, username: true, image: true } },
        replies: {
          include: {
            user: { select: { id: true, name: true, username: true, image: true } },
            commentLikes: true,
          },
          orderBy: { createdAt: "asc" },
        },
        commentLikes: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const commentsResponse = NextResponse.json(comments);
    return withCache(commentsResponse, "comments");
  } catch (error) {
    console.error("Error fetching comments:", error);
    reportError(error instanceof Error ? error : "Unknown error", { api: "Comments API" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { allowed, headers } = applyRateLimit(request, RATE_LIMITS.comment);
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { animeId, episodeId, content, parentId } = await request.json();

    if (!animeId || !content?.trim()) {
      return NextResponse.json({ error: "Anime ID and content are required" }, { status: 400 });
    }

    const lengthCheck = validateContentLength(content.trim(), "comment");
    if (!lengthCheck.valid) {
      return NextResponse.json({ error: lengthCheck.error }, { status: 400 });
    }

    const spamCheck = checkForSpam(content);
    if (spamCheck.isSpam) {
      return NextResponse.json({ error: "Comment flagged as spam" }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: {
        userId: session.user.id,
        animeId,
        episodeId: episodeId || null,
        parentId: parentId || null,
        content: content.trim(),
      },
      include: {
        user: { select: { id: true, name: true, username: true, image: true } },
        commentLikes: true,
      },
    });

    // Handle @mentions
    const mentionRegex = /@(\w+)/g;
    const mentions = [...content.matchAll(mentionRegex)].map((m) => m[1]);

    if (mentions.length > 0) {
      const mentionedUsers = await prisma.user.findMany({
        where: { username: { in: mentions }, notifMentions: true },
        select: { id: true, username: true },
      });

      const sender = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, username: true },
      });

      for (const mentioned of mentionedUsers) {
        await createNotification({
          userId: mentioned.id,
          senderId: session.user.id,
          type: "MENTION",
          title: "You were mentioned",
          message: `${sender?.username || sender?.name} mentioned you in a comment`,
          link: `/anime/${animeId}#comment-${comment.id}`,
        });
      }
    }

    // Notify parent comment author (for replies)
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { userId: true },
      });

      if (parentComment && parentComment.userId !== session.user.id) {
        const parentUser = await prisma.user.findUnique({
          where: { id: parentComment.userId },
          select: { id: true, notifComments: true, name: true, username: true },
        });

        if (parentUser?.notifComments) {
          const sender = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { name: true, username: true },
          });

          await createNotification({
            userId: parentComment.userId,
            senderId: session.user.id,
            type: "COMMENT_REPLY",
            title: "New reply to your comment",
            message: `${sender?.username || sender?.name} replied to your comment`,
            link: `/anime/${animeId}#comment-${comment.id}`,
          });
        }
      }
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    reportError(error instanceof Error ? error : "Unknown error", { api: "Comments API" });
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
    const commentId = searchParams.get("commentId");

    if (!commentId) {
      return NextResponse.json({ error: "commentId is required" }, { status: 400 });
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { userId: true },
    });

    if (!comment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const userRole = (session.user as { role?: string }).role || "";
    if (comment.userId !== session.user.id && !["OWNER", "ADMIN", "MODERATOR"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.comment.delete({ where: { id: commentId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting comment:", error);
    reportError(error instanceof Error ? error : "Unknown error", { api: "Comments API" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
