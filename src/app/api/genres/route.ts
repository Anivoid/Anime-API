import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCache } from "@/lib/cache";

export async function GET() {
  try {
    const genres = await prisma.genre.findMany({
      include: {
        _count: {
          select: { animes: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const response = NextResponse.json(genres);
    return withCache(response, "static");
  } catch (error) {
    console.error("Error fetching genres:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
