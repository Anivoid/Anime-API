import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function SeasonPage() {
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear + 1];

  const seasonData = await Promise.all(
    years.flatMap((year) =>
      ["Winter", "Spring", "Summer", "Fall"].map(async (season) => {
        const count = await prisma.seasonSchedule.count({
          where: { season, year },
        });
        return { season, year, count };
      })
    )
  );

  const seasonColors: Record<string, string> = {
    Winter: "from-blue-500 to-cyan-500",
    Spring: "from-pink-500 to-rose-500",
    Summer: "from-orange-500 to-yellow-500",
    Fall: "from-red-500 to-orange-500",
  };

  const seasonIcons: Record<string, string> = {
    Winter: "❄",
    Spring: "🌸",
    Summer: "☀",
    Fall: "🍂",
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {years.map((year) => (
        <div key={year} className="space-y-4">
          <h2 className="text-xl font-bold text-center text-gray-300">{year}</h2>
          {["Winter", "Spring", "Summer", "Fall"].map((season) => {
            const data = seasonData.find((d) => d.season === season && d.year === year);
            return (
              <Link
                key={`${year}-${season}`}
                href={`/season/${season.toLowerCase()}?year=${year}`}
                className="block bg-void-dark border border-void-gray/30 rounded-xl p-6 hover:border-void-red/50 transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{seasonIcons[season]}</span>
                  <div>
                    <div className="font-semibold group-hover:text-void-red transition-colors">{season}</div>
                    <div className="text-xs text-gray-500">
                      {season === "Winter" && "Jan - Mar"}
                      {season === "Spring" && "Apr - Jun"}
                      {season === "Summer" && "Jul - Sep"}
                      {season === "Fall" && "Oct - Dec"}
                    </div>
                  </div>
                </div>
                <div className={`h-1 rounded-full bg-gradient-to-r ${seasonColors[season]} opacity-50 group-hover:opacity-100 transition-opacity`} />
                <div className="text-sm text-gray-500 mt-3">{data?.count || 0} anime</div>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}
