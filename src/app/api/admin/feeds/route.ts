import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { importFromFeed } from "@/lib/rss-importer";

// GET /api/admin/feeds - List all feed sources
export async function GET() {
  const feeds = await prisma.feedSource.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { items: true, importLogs: true } },
    },
  });

  return NextResponse.json(feeds);
}

// POST /api/admin/feeds - Create a new feed source
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, url, type = "nyaa", category = "anime", checkInterval = 10 } = body;

    if (!name || !url) {
      return NextResponse.json({ error: "Name and URL are required" }, { status: 400 });
    }

    const feed = await prisma.feedSource.create({
      data: { name, url, type, category, checkInterval },
    });

    return NextResponse.json(feed, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create feed" },
      { status: 500 }
    );
  }
}
