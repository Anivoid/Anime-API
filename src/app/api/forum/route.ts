import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { withCache } from "@/lib/cache";
import { reportError } from "@/lib/error-monitor";
import { checkForSpam, validateContentLength } from "@/lib/anti-spam";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort") || "hot";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (category && category !== "all") {
      where.category = category;
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
        { tags: { contains: search } },
      ];
    }

    let orderBy: Record<string, string>;
    switch (sort) {
      case "new":
        orderBy = { createdAt: "desc" };
        break;
      case "top":
        orderBy = { upvotes: "desc" };
        break;
      case "hot":
      default:
        orderBy = { createdAt: "desc" };
        break;
    }

    const [posts, total] = await Promise.all([
      prisma.forumPost.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, username: true, image: true } },
          _count: { select: { comments: true } },
        },
        orderBy: [
          { pinned: "desc" },
          orderBy,
        ],
        skip,
        take: limit,
      }),
      prisma.forumPost.count({ where }),
    ]);

    const response = NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
    return withCache(response, "comments");
  } catch (error) {
    console.error("Error fetching forum posts:", error);
    reportError(error instanceof Error ? error : "Unknown error", { api: "Forum API" });
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

    const { title, content, category, tags } = await request.json();

    if (!title || title.length < 3 || title.length > 200) {
      return NextResponse.json({ error: "Title must be between 3 and 200 characters" }, { status: 400 });
    }

    if (!content || content.length < 10 || content.length > 10000) {
      return NextResponse.json({ error: "Content must be between 10 and 10000 characters" }, { status: 400 });
    }

    const lengthCheck = validateContentLength(content, "review");
    if (!lengthCheck.valid) {
      return NextResponse.json({ error: lengthCheck.error }, { status: 400 });
    }

    const spamCheck = checkForSpam(`${title} ${content}`);
    if (spamCheck.isSpam) {
      return NextResponse.json({ error: "Post flagged as spam" }, { status: 400 });
    }

    const validCategories = ["discussion", "theory", "recommendation", "meme", "news"];
    if (category && !validCategories.includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    const post = await prisma.forumPost.create({
      data: {
        userId: session.user.id,
        title: title.trim(),
        content: content.trim(),
        category: category || "discussion",
        tags: tags || null,
      },
      include: {
        user: { select: { id: true, name: true, username: true, image: true } },
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("Error creating forum post:", error);
    reportError(error instanceof Error ? error : "Unknown error", { api: "Forum API" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}