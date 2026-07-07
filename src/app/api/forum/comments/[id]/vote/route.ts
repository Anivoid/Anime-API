import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { reportError } from "@/lib/error-monitor";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { value } = await request.json();

    if (value !== 1 && value !== -1) {
      return NextResponse.json({ error: "Vote value must be 1 or -1" }, { status: 400 });
    }

    const comment = await prisma.forumComment.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Check existing vote
    const existingVote = await prisma.forumVote.findUnique({
      where: {
        userId_commentId: {
          userId: session.user.id,
          commentId: id,
        },
      },
    });

    if (existingVote) {
      if (existingVote.value === value) {
        // Same vote - remove it (toggle off)
        await prisma.forumVote.delete({
          where: { id: existingVote.id },
        });
      } else {
        // Opposite vote - flip it
        await prisma.forumVote.update({
          where: { id: existingVote.id },
          data: { value },
        });
      }
    } else {
      // New vote
      await prisma.forumVote.create({
        data: {
          userId: session.user.id,
          commentId: id,
          value,
        },
      });
    }

    // Update comment vote counts
    const commentVotes = await prisma.forumVote.aggregate({
      where: { commentId: id },
      _sum: { value: true },
    });

    const totalValue = commentVotes._sum.value || 0;
    const upvotes = Math.max(0, totalValue);
    const downvotes = Math.abs(Math.min(0, totalValue));

    await prisma.forumComment.update({
      where: { id },
      data: { upvotes, downvotes },
    });

    return NextResponse.json({ success: true, upvotes, downvotes });
  } catch (error) {
    console.error("Error voting on forum comment:", error);
    reportError(error instanceof Error ? error : "Unknown error", { api: "Forum Comment Vote API" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}