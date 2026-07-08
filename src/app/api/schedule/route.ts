import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface ScheduleEntry {
  animeTitle: string;
  slug: string;
  episodeNumber: number;
  airTime: string;
  airDay: string;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export async function GET() {
  try {
    const schedules = await prisma.seasonSchedule.findMany({
      where: { status: "airing" },
      orderBy: { nextAirDate: "asc" },
    });

    const schedule: ScheduleEntry[] = schedules
      .filter((s) => s.airDay && DAYS.includes(s.airDay))
      .map((s) => ({
        animeTitle: s.animeTitle,
        slug: s.animeTitle
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/[\s_]+/g, "-")
          .replace(/^-+|-+$/g, ""),
        episodeNumber: s.nextEpisode || 1,
        airTime: s.airTime || "TBD",
        airDay: s.airDay || "Mon",
      }));

    return NextResponse.json({ schedule });
  } catch {
    return NextResponse.json({ schedule: [] });
  }
}
