import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["OWNER", "ADMIN"].includes(session.user.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const pending = await prisma.scheduledPublish.findMany({
      where: {
        status: "pending",
        scheduledAt: { lte: new Date() },
      },
    });

    const results: { id: string; title: string; status: string; error?: string }[] = [];

    for (const item of pending) {
      try {
        const slug = item.slug || item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

        const existingAnime = await prisma.anime.findUnique({ where: { slug } });
        if (existingAnime) {
          await prisma.scheduledPublish.update({
            where: { id: item.id },
            data: { status: "failed", lastError: "Slug already exists" },
          });
          results.push({ id: item.id, title: item.title, status: "failed", error: "Slug already exists" });
          continue;
        }

        const genreIds: string[] = JSON.parse(item.genreIds || "[]");

        const anime = await prisma.anime.create({
          data: {
            title: item.title,
            slug,
            description: item.description || item.content || null,
            status: "ONGOING",
            type: "TV",
            releaseYear: new Date().getFullYear(),
          },
        });

        for (const genreId of genreIds) {
          await prisma.animeGenre.create({
            data: { animeId: anime.id, genreId },
          });
        }

        await prisma.scheduledPublish.update({
          where: { id: item.id },
          data: { status: "published", publishedAt: new Date() },
        });

        await prisma.activityLog.create({
          data: {
            userId: session.user.id,
            action: "AUTO_PUBLISH",
            entity: "Anime",
            entityId: anime.id,
            details: `Auto-published "${item.title}" from schedule`,
          },
        });

        results.push({ id: item.id, title: item.title, status: "published" });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";

        const newRetryCount = item.retryCount + 1;
        const newStatus = newRetryCount >= item.maxRetries ? "failed" : "pending";

        await prisma.scheduledPublish.update({
          where: { id: item.id },
          data: {
            status: newStatus,
            retryCount: newRetryCount,
            lastError: errorMsg,
          },
        });

        await prisma.activityLog.create({
          data: {
            userId: session.user.id,
            action: "AUTO_PUBLISH_RETRY",
            entity: "ScheduledPublish",
            entityId: item.id,
            details: `Retry ${newRetryCount}/${item.maxRetries}: ${errorMsg}`,
          },
        });

        results.push({ id: item.id, title: item.title, status: newStatus, error: errorMsg });
      }
    }

    return NextResponse.json({ processed: results.length, results });
  } catch (error) {
    console.error("Error processing schedule:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
