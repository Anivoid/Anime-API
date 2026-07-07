import Link from "next/link";
import Image from "next/image";

interface AnimeCardProps {
  id: string;
  title: string;
  slug: string;
  coverImage?: string | null;
  rating?: number | null;
  releaseYear: number;
  status: string;
  genres?: string[];
  className?: string;
}

export function AnimeCard({
  title,
  slug,
  coverImage,
  rating,
  releaseYear,
  status,
  genres,
  className = "",
}: AnimeCardProps) {
  return (
    <Link href={`/anime/${slug}`} className={`group block card-hover ${className}`}>
      <div className="relative aspect-[3/4] bg-void-dark rounded-lg overflow-hidden mb-3 border border-void-gray/30 group-hover:border-void-red/60 transition-all duration-300 card-glow">
        {/* Cover image */}
        {coverImage ? (
          coverImage.startsWith("data:") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverImage} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <Image
              src={coverImage}
              alt={title}
              fill
              unoptimized
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          )
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-void-crimson/20 to-void-dark flex items-center justify-center">
            <span className="text-void-red/30 text-4xl brush-text">V</span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-void-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Red glow on hover */}
        <div className="absolute inset-0 bg-void-red/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Rating badge */}
        <div className="absolute top-2 right-2 z-10">
          {rating !== null && rating !== undefined && (
            <span className="bg-void-red/90 backdrop-blur-sm text-white text-xs px-2 py-1 rounded font-semibold shadow-lg">
              ★ {rating}
            </span>
          )}
        </div>

        {/* Status badge - slides up on hover */}
        <div className="absolute bottom-2 left-2 right-2 z-10 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <span className="bg-void-black/80 backdrop-blur-sm text-gray-300 text-xs px-2 py-1 rounded border border-void-gray/50">
            {status}
          </span>
        </div>
      </div>

      {/* Title with underline animation */}
      <h3 className="font-semibold text-gray-200 group-hover:text-void-red transition-colors duration-300 line-clamp-1 text-sm relative">
        {title}
        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-void-red group-hover:w-full transition-all duration-300" />
      </h3>

      <p className="text-xs text-gray-500 mt-0.5">{releaseYear}</p>

      {genres && genres.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {genres.slice(0, 2).map((genre) => (
            <span
              key={genre}
              className="text-xs bg-void-dark border border-void-gray/50 text-gray-400 px-2 py-0.5 rounded group-hover:border-void-red/30 transition-colors duration-300"
            >
              {genre}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
