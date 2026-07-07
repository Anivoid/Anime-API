import Link from "next/link";

const seasons = [
  { name: "Winter", slug: "winter", icon: "❄", color: "from-blue-500 to-cyan-500", months: "Jan - Mar" },
  { name: "Spring", slug: "spring", icon: "🌸", color: "from-pink-500 to-rose-500", months: "Apr - Jun" },
  { name: "Summer", slug: "summer", icon: "☀", color: "from-orange-500 to-yellow-500", months: "Jul - Sep" },
  { name: "Fall", slug: "fall", icon: "🍂", color: "from-red-500 to-orange-500", months: "Oct - Dec" },
];

export default function SeasonLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-void-black">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              <span className="text-void-red">Seasonal</span> Anime
            </h1>
            <p className="text-gray-500 mt-2">Browse anime by season and year</p>
          </div>
          <div className="flex gap-3">
            {seasons.map((s) => (
              <Link
                key={s.slug}
                href={`/season/${s.slug}`}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-void-dark border border-void-gray/30 hover:border-void-red/50 transition-all text-sm"
              >
                <span>{s.icon}</span>
                <span>{s.name}</span>
              </Link>
            ))}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
