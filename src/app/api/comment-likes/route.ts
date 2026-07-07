import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get("commentId");

    if (!commentId) {
      return NextResponse.json({ error: "commentId is required" }, { status: 400 });
    }

    const session = await auth();
    const userId = session?.user?.id;

    let userLike = null;
    if (userId) {
      const like = await prisma.commentLike.findUnique({
        where: { userId_commentId: { userId, commentId } },
      });
      userLike = like?.value || null;
    }

    const likes = await prisma.commentLike.aggregate({
      where: { commentId, value: 1 },
      _count: true,
    });

    const dislikes = await prisma.commentLike.aggregate({
      where: { commentId, value: -1 },
      _count: true,
    });

    return NextResponse.json({
      likes: likes._count,
      dislikes: dislikes._count,
      userLike,
    });
  } catch (error) {
    console.error("Error fetching comment likes:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { commentId, value } = await request.json();

    if (!commentId || (value !== 1 && value !== -1)) {
      return NextResponse.json({ error: "commentId and value (1 or -1) required" }, { status: 400 });
    }

    const existing = await prisma.commentLike.findUnique({
      where: { userId_commentId: { userId: session.user.id, commentId } },
    });

    if (existing) {
      if (existing.value === value) {
        // Toggle off
        await prisma.commentLike.delete({ where: { id: existing.id } });
        return NextResponse.json({ userLike: null });
      }
      // Switch like/dislike
      await prisma.commentLike.update({
        where: { id: existing.id },
        data: { value },
      });
    } else {
      await prisma.commentLike.create({
        data: { userId: session.user.id, commentId, value },
      });

      // Notify comment author
      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
        select: { userId: true },
      });

      if (comment && comment.userId !== session.user.id) {
        const commentUser = await prisma.user.findUnique({
          where: { id: comment.userId },
          select: { id: true, notifComments: true },
        });

        if (commentUser?.notifComments) {
          const sender = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { name: true, username: true },
          });

          await createNotification({
            userId: comment.userId,
            senderId: session.user.id,
            type: "COMMENT_LIKE",
            title: value === 1 ? "Comment liked" : "Comment disliked",
            message: `${sender?.username || sender?.name || "Someone"} ${value === 1 ? "liked" : "disliked"} your comment`,
          });
        }
      }
    }

    // Recount
    const likes = await prisma.commentLike.aggregate({
      where: { commentId, value: 1 },
      _count: true,
    });
    const dislikes = await prisma.commentLike.aggregate({
      where: { commentId, value: -1 },
      _count: true,
    });

    const updated = await prisma.commentLike.findUnique({
      where: { userId_commentId: { userId: session.user.id, commentId } },
    });

    return NextResponse.json({
      likes: likes._count,
      dislikes: dislikes._count,
      userLike: updated?.value || null,
    });
  } catch (error) {
    console.error("Error updating comment like:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
