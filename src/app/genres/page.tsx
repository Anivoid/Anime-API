import Header from "@/components/Header";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

async function getGenres() {
  const genres = await prisma.genre.findMany({
    include: { _count: { select: { animes: true } } },
    orderBy: { name: "asc" },
  });
  return genres;
}

export default async function GenresPage() {
  const genres = await getGenres();

  return (
    <div className="min-h-screen bg-void-black text-white">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">
          BROWSE BY <span className="text-void-red">GENRE</span>
        </h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {genres.map((genre) => (
            <Link
              key={genre.id}
              href={`/genres/${genre.slug}`}
              className="bg-void-dark border border-void-gray/50 rounded-lg p-6 text-center hover:bg-void-red/10 hover:border-void-red/50 transition-all group"
            >
              <span className="text-xl font-semibold text-gray-300 group-hover:text-void-red transition-colors">
                {genre.name}
              </span>
              <span className="block text-sm text-gray-600 mt-2">
                {genre._count.animes} anime
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
