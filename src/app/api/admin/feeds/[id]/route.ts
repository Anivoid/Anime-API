import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { importFromFeed } from "@/lib/rss-importer";

// GET /api/admin/feeds/[id] - Get feed details with recent items
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const feed = await prisma.feedSource.findUnique({
    where: { id },
    include: {
      items: { orderBy: { createdAt: "desc" }, take: 50 },
      importLogs: { orderBy: { createdAt: "desc" }, take: 30 },
      _count: { select: { items: true } },
    },
  });

  if (!feed) {
    return NextResponse.json({ error: "Feed not found" }, { status: 404 });
  }

  return NextResponse.json(feed);
}

// PATCH /api/admin/feeds/[id] - Update feed settings
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const feed = await prisma.feedSource.findUnique({ where: { id } });
  if (!feed) {
    return NextResponse.json({ error: "Feed not found" }, { status: 404 });
  }

  const updated = await prisma.feedSource.update({
    where: { id },
    data: {
      name: body.name ?? feed.name,
      url: body.url ?? feed.url,
      enabled: body.enabled ?? feed.enabled,
      checkInterval: body.checkInterval ?? feed.checkInterval,
      category: body.category ?? feed.category,
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/admin/feeds/[id] - Delete feed and its items
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const feed = await prisma.feedSource.findUnique({ where: { id } });
  if (!feed) {
    return NextResponse.json({ error: "Feed not found" }, { status: 404 });
  }

  await prisma.feedSource.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

// POST /api/admin/feeds/[id] - Manual sync
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const feed = await prisma.feedSource.findUnique({ where: { id } });
  if (!feed) {
    return NextResponse.json({ error: "Feed not found" }, { status: 404 });
  }

  try {
    const result = await importFromFeed(id);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}
