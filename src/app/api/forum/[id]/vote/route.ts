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

    const post = await prisma.forumPost.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check existing vote
    const existingVote = await prisma.forumVote.findUnique({
      where: {
        userId_postId: {
          userId: session.user.id,
          postId: id,
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
          postId: id,
          value,
        },
      });
    }

    // Update post vote counts
    const postVotes = await prisma.forumVote.aggregate({
      where: { postId: id },
      _sum: { value: true },
    });

    const totalValue = postVotes._sum.value || 0;
    const upvotes = Math.max(0, totalValue);
    const downvotes = Math.abs(Math.min(0, totalValue));

    await prisma.forumPost.update({
      where: { id },
      data: { upvotes, downvotes },
    });

    return NextResponse.json({ success: true, upvotes, downvotes });
  } catch (error) {
    console.error("Error voting on forum post:", error);
    reportError(error instanceof Error ? error : "Unknown error", { api: "Forum Vote API" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}