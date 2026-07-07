import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const seasonIcons: Record<string, string> = {
  Winter: "❄",
  Spring: "🌸",
  Summer: "☀",
  Fall: "🍂",
};

const seasonColors: Record<string, string> = {
  Winter: "text-blue-400",
  Spring: "text-pink-400",
  Summer: "text-orange-400",
  Fall: "text-red-400",
};

export default async function SeasonDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ season: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { season: seasonSlug } = await params;
  const sp = await searchParams;
  const season = seasonSlug.charAt(0).toUpperCase() + seasonSlug.slice(1);
  const year = typeof sp.year === "string" ? parseInt(sp.year) : new Date().getFullYear();
  const genre = typeof sp.genre === "string" ? sp.genre : undefined;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const type = typeof sp.type === "string" ? sp.type : undefined;

  // Build where clause
  const where: Prisma.AnimeWhereInput = { season, releaseYear: year };
  if (genre) {
    where.genres = { some: { genre: { name: genre } } };
  }
  if (status) where.status = status;
  if (type) where.type = type;

  const [animes, genres, totalCount] = await Promise.all([
    prisma.anime.findMany({
      where,
      include: {
        genres: { include: { genre: true } },
        episodes: { select: { id: true } },
        studios: { include: { studio: true } },
        ratings: { select: { value: true } },
      },
      orderBy: [{ rating: "desc" }, { title: "asc" }],
      take: 60,
    }),
    prisma.genre.findMany({
      include: { animes: { where: { anime: { season, releaseYear: year } } } },
      orderBy: { name: "asc" },
    }),
    prisma.anime.count({ where }),
  ]);

  // Calculate average rating for each anime
  const animesWithRating = animes.map((a) => ({
    ...a,
    avgRating:
      a.ratings.length > 0
        ? a.ratings.reduce((sum, r) => sum + r.value, 0) / a.ratings.length
        : a.rating || 0,
  }));

  const activeGenres = genres.filter((g) => g.animes.length > 0);

  const statusOptions = ["ONGOING", "COMPLETED", "UPCOMING"];
  const typeOptions = ["TV", "MOVIE", "OVA", "ONA", "SPECIAL", "TV_SHORT"];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <span className="text-4xl">{seasonIcons[season]}</span>
        <div>
          <h2 className={`text-2xl font-bold ${seasonColors[season]}`}>
            {season} {year}
          </h2>
          <p className="text-gray-500">{totalCount} anime found</p>
        </div>
      </div>

      {/* Year Navigation */}
      <div className="flex gap-2 mb-6">
        {[year - 1, year, year + 1].map((y) => (
          <Link
            key={y}
            href={`/season/${seasonSlug}?year=${y}`}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              y === year
                ? "bg-void-red text-white"
                : "bg-void-dark border border-void-gray/30 text-gray-400 hover:border-void-red/50"
            }`}
          >
            {y}
          </Link>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-void-dark border border-void-gray/30 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <div className="flex gap-1">
              <Link
                href={`/season/${seasonSlug}?year=${year}`}
                className={`px-3 py-1 rounded text-xs ${!status ? "bg-void-red text-white" : "bg-void-gray/30 text-gray-400 hover:bg-void-gray/50"}`}
              >
                All
              </Link>
              {statusOptions.map((s) => (
                <Link
                  key={s}
                  href={`/season/${seasonSlug}?year=${year}&status=${s}`}
                  className={`px-3 py-1 rounded text-xs ${status === s ? "bg-void-red text-white" : "bg-void-gray/30 text-gray-400 hover:bg-void-gray/50"}`}
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Type</label>
            <div className="flex gap-1">
              <Link
                href={`/season/${seasonSlug}?year=${year}`}
                className={`px-3 py-1 rounded text-xs ${!type ? "bg-void-red text-white" : "bg-void-gray/30 text-gray-400 hover:bg-void-gray/50"}`}
              >
                All
              </Link>
              {typeOptions.map((t) => (
                <Link
                  key={t}
                  href={`/season/${seasonSlug}?year=${year}&type=${t}`}
                  className={`px-3 py-1 rounded text-xs ${type === t ? "bg-void-red text-white" : "bg-void-gray/30 text-gray-400 hover:bg-void-gray/50"}`}
                >
                  {t}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Genre</label>
            <div className="flex gap-1 flex-wrap">
              <Link
                href={`/season/${seasonSlug}?year=${year}`}
                className={`px-3 py-1 rounded text-xs ${!genre ? "bg-void-red text-white" : "bg-void-gray/30 text-gray-400 hover:bg-void-gray/50"}`}
              >
                All
              </Link>
              {activeGenres.slice(0, 10).map((g) => (
                <Link
                  key={g.id}
                  href={`/season/${seasonSlug}?year=${year}&genre=${g.name}`}
                  className={`px-3 py-1 rounded text-xs ${genre === g.name ? "bg-void-red text-white" : "bg-void-gray/30 text-gray-400 hover:bg-void-gray/50"}`}
                >
                  {g.name} ({g.animes.length})
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Anime Grid */}
      {animesWithRating.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">{seasonIcons[season]}</div>
          <h3 className="text-xl font-bold text-gray-400 mb-2">No anime found</h3>
          <p className="text-gray-600">Try adjusting your filters or check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {animesWithRating.map((anime) => (
            <Link
              key={anime.id}
              href={`/anime/${anime.slug}`}
              className="group relative bg-void-dark border border-void-gray/20 rounded-xl overflow-hidden hover:border-void-red/50 transition-all"
            >
              <div className="aspect-[3/4] relative">
                {anime.coverImage ? (
                  <img
                    src={anime.coverImage}
                    alt={anime.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-void-gray/20 flex items-center justify-center">
                    <span className="text-4xl">{seasonIcons[season]}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                {anime.avgRating > 0 && (
                  <div className="absolute top-2 right-2 bg-black/70 px-2 py-0.5 rounded text-xs font-bold text-yellow-400">
                    {anime.avgRating.toFixed(1)}
                  </div>
                )}
                <div className="absolute top-2 left-2 flex gap-1">
                  <span className="bg-void-red/80 px-1.5 py-0.5 rounded text-[10px] font-bold">{anime.type}</span>
                </div>
              </div>
              <div className="p-3">
                <h3 className="font-medium text-sm line-clamp-2 group-hover:text-void-red transition-colors">
                  {anime.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">{anime.episodes.length} eps</span>
                  {anime.studios[0] && (
                    <span className="text-xs text-gray-600 truncate">{anime.studios[0].studio.name}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {anime.genres.slice(0, 2).map((g) => (
                    <span key={g.genreId} className="text-[10px] px-1.5 py-0.5 rounded bg-void-gray/30 text-gray-400">
                      {g.genre.name}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
