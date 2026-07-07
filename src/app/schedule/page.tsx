import Header from "@/components/Header";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

async function getOngoingAnime() {
  return prisma.anime.findMany({
    where: { status: "ONGOING" },
    include: { episodes: { orderBy: { number: "desc" }, take: 1 } },
    orderBy: { title: "asc" },
  });
}

export default async function SchedulePage() {
  const ongoingAnime = await getOngoingAnime();
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <div className="min-h-screen bg-void-black text-white">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">
          RELEASE <span className="text-void-red">SCHEDULE</span>
        </h1>
        <div className="space-y-8">
          {days.map((day, index) => {
            const dayAnime = ongoingAnime.filter((_, i) => i % 7 === index);
            if (dayAnime.length === 0) return null;
            return (
              <div key={day}>
                <h2 className="text-xl font-bold mb-4 text-void-red">{day}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dayAnime.map((anime) => (
                    <Link key={anime.id} href={`/anime/${anime.slug}`} className="bg-void-dark border border-void-gray/50 rounded-lg p-4 hover:border-void-red/50 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-20 bg-void-gray rounded overflow-hidden flex-shrink-0">
                          <div className="w-full h-full bg-gradient-to-br from-void-crimson/30 to-void-dark" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{anime.title}</h3>
                          <p className="text-sm text-gray-500">Latest: Episode {anime.episodes[0]?.number || "?"}</p>
                          <p className="text-xs text-void-red mt-1">12:00 PM JST</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {ongoingAnime.length === 0 && (
          <div className="text-center py-12 text-gray-500">No ongoing anime to display.</div>
        )}
      </div>
    </div>
  );
}
