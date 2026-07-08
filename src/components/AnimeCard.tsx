import Link from "next/link";

interface AnimeCardProps {
  id: string;
  title: string;
  slug: string;
  coverImage?: string | null;
  rating?: number | null;
  releaseYear: number;
  status: string;
  type?: string;
  season?: string | null;
  subCount?: number | null;
  dubCount?: number | null;
  episodeCount?: number | null;
  genres?: string[];
  className?: string;
}

function formatCount(n: number | null | undefined): string {
  if (n === null || n === undefined) return "?";
  return String(n);
}

function formatSeason(season: string | null | undefined): string {
  if (!season) return "";
  const map: Record<string, string> = {
    WINTER: "Winter",
    SPRING: "Spring",
    SUMMER: "Summer",
    FALL: "Fall",
  };
  return map[season] || season;
}

export function AnimeCard({
  title,
  slug,
  coverImage,
  rating,
  releaseYear,
  status,
  type,
  season,
  subCount,
  dubCount,
  episodeCount,
  genres,
  className = "",
}: AnimeCardProps) {
  const totalEpisodes = episodeCount ?? subCount ?? 0;

  return (
    <Link href={`/anime/${slug}`} className={`group block ${className}`}>
      <div className="relative aspect-[3/4] bg-[#1a1a2e] rounded overflow-hidden mb-2 border border-white/5 group-hover:border-white/15 transition-all duration-200">
        {coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImage}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900/20 to-[#1a1a2e] flex items-center justify-center">
            <span className="text-white/10 text-4xl font-bold">?</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Episode count badges */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 z-10">
          {subCount !== null && subCount !== undefined && (
            <span className="bg-green-600/90 text-white text-[10px] px-1.5 py-0.5 rounded font-bold leading-none">
              SUB {formatCount(subCount)}
            </span>
          )}
          {dubCount !== null && dubCount !== undefined && dubCount > 0 && (
            <span className="bg-yellow-500/90 text-black text-[10px] px-1.5 py-0.5 rounded font-bold leading-none">
              DUB {formatCount(dubCount)}
            </span>
          )}
          {totalEpisodes > 0 && (
            <span className="bg-blue-600/90 text-white text-[10px] px-1.5 py-0.5 rounded font-bold leading-none">
              {formatCount(totalEpisodes)}
            </span>
          )}
        </div>

        {/* Type badge - top left */}
        {type && (
          <div className="absolute top-2 left-2 z-10">
            <span className="bg-black/70 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
              {type}
            </span>
          </div>
        )}
      </div>

      <h3 className="font-semibold text-gray-200 group-hover:text-purple-400 transition-colors duration-200 line-clamp-2 text-sm leading-tight">
        {title}
      </h3>

      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-500">
        {season && <span>{formatSeason(season)}</span>}
        {releaseYear > 0 && <span>{releaseYear}</span>}
        {type && <span>• {type}</span>}
      </div>
    </Link>
  );
}
