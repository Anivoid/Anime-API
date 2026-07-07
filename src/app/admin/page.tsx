import { prisma } from "@/lib/prisma";

async function getStats() {
  const [animeCount, episodeCount, userCount, commentCount, ongoingCount] = await Promise.all([
    prisma.anime.count(),
    prisma.episode.count(),
    prisma.user.count(),
    prisma.comment.count(),
    prisma.anime.count({ where: { status: "ONGOING" } }),
  ]);

  const recentAnime = await prisma.anime.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { episodes: true, animeLikes: true } } },
  });

  const recentUsers = await prisma.user.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  return { animeCount, episodeCount, userCount, commentCount, ongoingCount, recentAnime, recentUsers };
}

export default async function AdminDashboardPage() {
  const stats = await getStats();

  const statCards = [
    { label: "Total Anime", value: stats.animeCount, color: "text-void-red" },
    { label: "Total Episodes", value: stats.episodeCount, color: "text-void-red" },
    { label: "Users", value: stats.userCount, color: "text-void-red" },
    { label: "Comments", value: stats.commentCount, color: "text-void-red" },
    { label: "Ongoing", value: stats.ongoingCount, color: "text-void-red" },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">
        Admin <span className="text-void-red">Dashboard</span>
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-void-dark border border-void-gray/30 rounded-lg p-6">
            <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-bold mb-4">
            Recent <span className="text-void-red">Anime</span>
          </h2>
          <div className="space-y-2">
            {stats.recentAnime.map((anime) => (
              <div key={anime.id} className="bg-void-dark border border-void-gray/30 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{anime.title}</h3>
                  <p className="text-sm text-gray-500">{anime._count.episodes} episodes • {anime._count.animeLikes} likes</p>
                </div>
                <a href={`/anime/${anime.slug}`} className="text-void-red hover:text-void-red-glow text-sm">
                  View →
                </a>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4">
            Recent <span className="text-void-red">Users</span>
          </h2>
          <div className="space-y-2">
            {stats.recentUsers.map((user) => (
              <div key={user.id} className="bg-void-dark border border-void-gray/30 rounded-lg p-4">
                <h3 className="font-semibold">{user.name || "Anonymous"}</h3>
                <p className="text-sm text-gray-500">{user.email}</p>
                <p className="text-xs text-gray-600 mt-1">Joined {new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
