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

    const { title, type } = await request.json();

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    let result: string;

    switch (type) {
      case "description":
        result = generateDescription(title);
        break;
      case "tags":
        result = JSON.stringify(generateTags(title));
        break;
      case "synopsis":
        result = generateSynopsis(title);
        break;
      default:
        result = generateDescription(title);
    }

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "AI_GENERATE",
        entity: "Anime",
        details: `Generated ${type || "description"} for "${title}"`,
      },
    });

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Error generating content:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function generateDescription(title: string): string {
  const themes = [
    "A gripping tale of courage and sacrifice",
    "An epic journey through uncharted territories",
    "A heartwarming story of friendship and growth",
    "A dark and mysterious adventure unfolds",
    "A thrilling battle between good and evil",
    "A tender romance blooming in extraordinary circumstances",
    "A comedic romp through everyday life",
    "A mind-bending sci-fi experience",
  ];

  const settings = [
    "in a world where magic and technology coexist",
    "in a post-apocalyptic landscape",
    "within the walls of an ancient kingdom",
    "across multiple dimensions",
    "in a bustling modern city",
    "on a distant planet far from Earth",
    "in a realm where dreams become reality",
    "during a pivotal moment in history",
  ];

  const theme = themes[Math.floor(Math.random() * themes.length)];
  const setting = settings[Math.floor(Math.random() * settings.length)];

  return `${title} is ${theme.toLowerCase()} ${setting}. Follow the protagonist as they navigate challenges, forge bonds, and discover the true meaning of their existence. With stunning visuals and a compelling narrative, this anime will keep you on the edge of your seat from start to finish.`;
}

function generateTags(title: string): string[] {
  const baseTags = ["anime", "action", "adventure"];
  const extras = [
    "drama", "fantasy", "comedy", "romance", "sci-fi", "mystery",
    "supernatural", "slice-of-life", "thriller", "horror",
    "mecha", "isekai", "psychological", "military", "historical",
  ];
  const count = 3 + Math.floor(Math.random() * 3);
  const shuffled = extras.sort(() => 0.5 - Math.random());
  return [...baseTags, ...shuffled.slice(0, count)];
}

function generateSynopsis(title: string): string {
  return `${title} follows the journey of a young hero who discovers a hidden power within themselves. As they embark on a quest to save their world, they encounter allies and enemies alike, each with their own motivations and secrets. Through trials and tribulations, the hero must learn to trust in others and believe in themselves to overcome the darkness that threatens to consume everything they hold dear.`;
}
