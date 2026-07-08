import Link from "next/link";

interface LatestEpisodeCardProps {
  animeTitle: string;
  slug: string;
  coverImage: string | null;
  episodeNumber: number;
  subCount?: number | null;
  dubCount?: number | null;
  type?: string | null;
}

export function LatestEpisodeCard({
  animeTitle,
  slug,
  coverImage,
  episodeNumber,
  subCount,
  dubCount,
  type,
}: LatestEpisodeCardProps) {
  return (
    <Link href={`/watch/${slug}/${episodeNumber}`} className="group block">
      <div className="relative aspect-[3/4] bg-[#1a1a2e] rounded overflow-hidden mb-2 border border-white/5 group-hover:border-white/15 transition-all duration-200">
        {coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImage}
            alt={animeTitle}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900/20 to-[#1a1a2e] flex items-center justify-center">
            <span className="text-white/10 text-4xl font-bold">?</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Episode badge */}
        <div className="absolute top-2 right-2 z-10">
          <span className="bg-purple-600/90 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
            EP {episodeNumber}
          </span>
        </div>

        {/* Episode count badges */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 z-10">
          {subCount !== null && subCount !== undefined && (
            <span className="bg-green-600/90 text-white text-[10px] px-1.5 py-0.5 rounded font-bold leading-none">
              SUB {subCount}
            </span>
          )}
          {dubCount !== null && dubCount !== undefined && dubCount > 0 && (
            <span className="bg-yellow-500/90 text-black text-[10px] px-1.5 py-0.5 rounded font-bold leading-none">
              DUB {dubCount}
            </span>
          )}
        </div>

        {/* Type badge */}
        {type && (
          <div className="absolute top-2 left-2 z-10">
            <span className="bg-black/70 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
              {type}
            </span>
          </div>
        )}
      </div>

      <h3 className="font-semibold text-gray-200 group-hover:text-purple-400 transition-colors duration-200 line-clamp-2 text-sm leading-tight">
        {animeTitle}
      </h3>
    </Link>
  );
}
