import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCache } from "@/lib/cache";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const genre = searchParams.get("genre") || "";
    const status = searchParams.get("status") || "";
    const type = searchParams.get("type") || "";
    const season = searchParams.get("season") || "";
    const year = searchParams.get("year") || "";
    const letter = searchParams.get("letter") || "";
    const trending = searchParams.get("trending") === "true";
    const sort = searchParams.get("sort") || "title";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (search) {
      where.title = { contains: search };
    }

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (season) {
      where.season = season;
    }

    if (year) {
      where.releaseYear = parseInt(year);
    }

    if (trending) {
      where.trending = true;
    }

    if (genre) {
      where.genres = {
        some: {
          genre: { slug: genre },
        },
      };
    }

    if (letter && letter !== "All") {
      if (letter === "#") {
        where.title = { not: { startsWith: /[A-Za-z]/.source } };
      } else {
        where.title = { startsWith: letter };
      }
    }

    const orderBy = sort === "new" ? { createdAt: "desc" as const } : { title: "asc" as const };

    const [anime, total] = await Promise.all([
      prisma.anime.findMany({
        where,
        include: {
          genres: {
            include: { genre: true },
          },
          _count: {
            select: { episodes: true, animeLikes: true, ratings: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.anime.count({ where }),
    ]);

    const response = NextResponse.json({
      anime,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
    return withCache(response, "medium");
  } catch (error) {
    console.error("Error fetching anime:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, coverImage, bannerImage, type, status, releaseYear, rating, genreIds } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const slug = slugify(title);

    const anime = await prisma.anime.create({
      data: {
        title,
        slug,
        description: description || null,
        coverImage: coverImage || null,
        bannerImage: bannerImage || null,
        type: type || "TV",
        status: status || "ONGOING",
        releaseYear: releaseYear || new Date().getFullYear(),
        rating: rating || null,
        genres: genreIds?.length
          ? {
              create: genreIds.map((id: string) => ({
                genreId: id,
              })),
            }
          : undefined,
      },
      include: { genres: true },
    });

    return NextResponse.json(anime, { status: 201 });
  } catch (error) {
    console.error("Error creating anime:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
