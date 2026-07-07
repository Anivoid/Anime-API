"use client";

import { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import { AnimeCard } from "@/components/AnimeCard";
import { useDebounce } from "@/hooks/useDebounce";
import Link from "next/link";

interface Anime {
  id: string;
  title: string;
  slug: string;
  coverImage: string | null;
  rating: number | null;
  releaseYear: number;
  status: string;
  type: string | null;
  season: string | null;
  featured: boolean;
  trending: boolean;
  genres: { genre: { name: string } }[];
  _count?: { animeLikes: number };
}

interface JikanAnime {
  id: string;
  title: string;
  slug: string;
  coverImage: string | null;
  rating: number | null;
  releaseYear: number | null;
  status: string;
  type: string | null;
  season: string | null;
  genres: { genre: { name: string; slug: string } }[];
  episodeCount: number | null;
  synopsis: string | null;
  source: string;
  malId: number;
  url: string;
}

interface Genre {
  id: string;
  name: string;
  slug: string;
}

type SortOption = "title" | "rating" | "releaseYear" | "popular" | "trending";
type TabOption = "local" | "mal";

const TYPES = ["All", "TV", "Movie", "OVA", "ONA", "Special"];
const SEASONS = ["All", "Winter", "Spring", "Summer", "Fall"];
const STATUSES = ["All", "Ongoing", "Completed", "Upcoming"];
const YEARS = ["All", ...Array.from({ length: 15 }, (_, i) => String(2026 - i))];
const JIKAN_GENRES = [
  { id: "1", name: "Action" }, { id: "2", name: "Adventure" }, { id: "5", name: "Avant Garde" },
  { id: "46", name: "Award Winning" }, { id: "28", name: "Boys Love" }, { id: "4", name: "Comedy" },
  { id: "7", name: "Drama" }, { id: "10", name: "Fantasy" }, { id: "22", name: "Gourmet" },
  { id: "14", name: "Horror" }, { id: "74", name: "Isekai" }, { id: "43", name: "Girls Love" },
  { id: "24", name: "Mystery" }, { id: "25", name: "Psychological" }, { id: "37", name: "Romance" },
  { id: "30", name: "Sci-Fi" }, { id: "36", name: "Slice of Life" }, { id: "27", name: "Shounen" },
  { id: "23", name: "Sports" }, { id: "11", name: "Supernatural" }, { id: "38", name: "Suspense" },
  { id: "9", name: "Ecchi" }, { id: "49", name: "Erotica" }, { id: "50", name: "Adult Cast" },
  { id: "51", name: "Anthropomorphic" }, { id: "52", name: "CGDCT" }, { id: "53", name: "Childcare" },
  { id: "54", name: "Combat Sports" }, { id: "55", name: "Crossdressing" }, { id: "56", name: "Delinquents" },
  { id: "57", name: "Detective" }, { id: "58", name: "Educational" }, { id: "59", name: "Ghost" },
  { id: "60", name: "Goblin" }, { id: "61", name: "Harem" }, { id: "62", name: "Historical" },
  { id: "63", name: "Idol" }, { id: "64", name: "Isekai" }, { id: "65", name: "Maid" },
  { id: "66", name: "Military" }, { id: "67", name: "Music" }, { id: "68", name: "Mythology" },
  { id: "69", name: "Parody" }, { id: "70", name: "Police" }, { id: "71", name: "Post-Apocalyptic" },
  { id: "72", name: "Reincarnation" }, { id: "73", name: "Reverse Harem" }, { id: "75", name: "Samurai" },
  { id: "76", name: "School" }, { id: "77", name: "Space" }, { id: "78", name: "Strategy Game" },
  { id: "79", name: "Super Power" }, { id: "80", name: "Vampire" }, { id: "81", name: "Workplace" },
];

export default function BrowsePage() {
  const [anime, setAnime] = useState<Anime[]>([]);
  const [jikanAnime, setJikanAnime] = useState<JikanAnime[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedSeason, setSelectedSeason] = useState("All");
  const [selectedYear, setSelectedYear] = useState("All");
  const [showTrending, setShowTrending] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("title");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabOption>("mal");
  const [jikanPage, setJikanPage] = useState(1);
  const [jikanTotalPages, setJikanTotalPages] = useState(1);
  const [jikanLoading, setJikanLoading] = useState(false);
  const [jikanGenre, setJikanGenre] = useState("");
  const fetchIdRef = useRef(0);

  const debouncedSearch = useDebounce(searchInput, 300);

  useEffect(() => {
    fetch("/api/genres").then((r) => r.json()).then(setGenres).catch(console.error);
  }, []);

  // Auto-switch to MAL tab when searching and no local results
  useEffect(() => {
    if (debouncedSearch && activeTab === "local" && anime.length === 0 && !isLoading) {
      setActiveTab("mal");
    }
  }, [debouncedSearch, anime.length, isLoading, activeTab]);

  // Fetch local anime
  useEffect(() => {
    if (activeTab !== "local") return;
    const currentFetchId = ++fetchIdRef.current;
    const controller = new AbortController();

    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (selectedGenre !== "All") params.set("genre", selectedGenre);
    if (selectedStatus !== "All") params.set("status", selectedStatus);
    if (selectedType !== "All") params.set("type", selectedType);
    if (selectedSeason !== "All") params.set("season", selectedSeason);
    if (selectedYear !== "All") params.set("year", selectedYear);
    if (showTrending) params.set("trending", "true");
    params.set("page", page.toString());
    params.set("limit", "24");

    fetch(`/api/anime?${params}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (currentFetchId !== fetchIdRef.current) return;
        const items = data.anime || [];
        const sorted = [...items].sort((a: Anime, b: Anime) => {
          if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
          if (sortBy === "releaseYear") return b.releaseYear - a.releaseYear;
          if (sortBy === "popular") return (b._count?.animeLikes || 0) - (a._count?.animeLikes || 0);
          if (sortBy === "trending") return (b.trending ? 1 : 0) - (a.trending ? 1 : 0);
          return a.title.localeCompare(b.title);
        });
        setAnime(sorted);
        setTotalPages(data.pagination?.totalPages || 1);
        setIsLoading(false);
      })
      .catch((e) => {
        if (e instanceof Error && e.name !== "AbortError") setIsLoading(false);
      });

    return () => controller.abort();
  }, [activeTab, debouncedSearch, selectedGenre, selectedStatus, selectedType, selectedSeason, selectedYear, showTrending, page, sortBy]);

  // Fetch Jikan (MAL) anime
  useEffect(() => {
    if (activeTab !== "mal") return;
    setJikanLoading(true);
    const controller = new AbortController();

    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (jikanGenre) params.set("genre", jikanGenre);
    params.set("page", jikanPage.toString());
    if (sortBy === "rating") { params.set("order_by", "score"); params.set("sort", "desc"); }
    else if (sortBy === "releaseYear") { params.set("order_by", "start_date"); params.set("sort", "desc"); }
    else { params.set("order_by", "score"); params.set("sort", "desc"); }

    fetch(`/api/jikan?${params}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        setJikanAnime(data.data || []);
        setJikanTotalPages(data.pagination?.last_visible_page || 1);
        setJikanLoading(false);
      })
      .catch((e) => {
        if (e instanceof Error && e.name !== "AbortError") setJikanLoading(false);
      });

    return () => controller.abort();
  }, [activeTab, debouncedSearch, jikanPage, sortBy, jikanGenre]);

  const resetFilters = () => {
    setSearchInput("");
    setSelectedGenre("All");
    setSelectedStatus("All");
    setSelectedType("All");
    setSelectedSeason("All");
    setSelectedYear("All");
    setShowTrending(false);
    setSortBy("title");
    setPage(1);
    setJikanPage(1);
    setJikanGenre("");
  };

  const hasFilters = searchInput || selectedGenre !== "All" || selectedStatus !== "All" || selectedType !== "All" || selectedSeason !== "All" || selectedYear !== "All" || showTrending;

  return (
    <div className="min-h-screen bg-void-black text-white">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Quick tabs */}
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-3xl font-black">
            BROWSE <span className="text-void-red">ANIME</span>
          </h1>
        </div>

        {/* Source tabs */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => { setActiveTab("local"); setPage(1); }}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "local" ? "bg-void-red text-white glow-red" : "bg-void-dark border border-void-gray text-gray-400 hover:text-white"
            }`}
          >
            My Collection
          </button>
          <button
            onClick={() => { setActiveTab("mal"); setJikanPage(1); }}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "mal" ? "bg-void-red text-white glow-red" : "bg-void-dark border border-void-gray text-gray-400 hover:text-white"
            }`}
          >
            MyAnimeList
          </button>
          <div className="h-8 w-px bg-void-gray mx-2" />
          <button
            onClick={() => { setShowTrending(false); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              !showTrending ? "bg-void-red text-white" : "bg-void-dark border border-void-gray text-gray-400 hover:text-white"
            }`}
          >
            All Anime
          </button>
          <button
            onClick={() => { setShowTrending(true); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              showTrending ? "bg-void-red text-white" : "bg-void-dark border border-void-gray text-gray-400 hover:text-white"
            }`}
          >
            🔥 Trending
          </button>
        </div>

        {/* Season tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {SEASONS.filter((s) => s !== "All").map((s) => (
            <button
              key={s}
              onClick={() => { setSelectedSeason(selectedSeason === s ? "All" : s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedSeason === s ? "bg-void-red text-white" : "bg-void-dark border border-void-gray text-gray-400 hover:text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Advanced filters */}
        <div className="bg-void-dark border border-void-gray/50 rounded-lg p-4 mb-8">
          <div className={`grid gap-4 ${activeTab === "mal" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-6"}`}>
            <div className={activeTab === "mal" ? "col-span-2" : ""}>
              <label className="block text-xs text-gray-500 mb-1">Search</label>
              <input
                type="text"
                placeholder={activeTab === "mal" ? "Search MyAnimeList..." : "Search local collection..."}
                value={searchInput}
                onChange={(e) => { setSearchInput(e.target.value); setPage(1); setJikanPage(1); }}
                className="w-full bg-void-black border border-void-gray rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-void-red"
              />
            </div>
            {activeTab === "local" ? (
              <>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Genre</label>
                  <select value={selectedGenre} onChange={(e) => { setSelectedGenre(e.target.value); setPage(1); }}
                    className="w-full bg-void-black border border-void-gray rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-void-red">
                    <option value="All">All Genres</option>
                    {genres.map((g) => <option key={g.id} value={g.slug}>{g.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Type</label>
                  <select value={selectedType} onChange={(e) => { setSelectedType(e.target.value); setPage(1); }}
                    className="w-full bg-void-black border border-void-gray rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-void-red">
                    {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Status</label>
                  <select value={selectedStatus} onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
                    className="w-full bg-void-black border border-void-gray rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-void-red">
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Year</label>
                  <select value={selectedYear} onChange={(e) => { setSelectedYear(e.target.value); setPage(1); }}
                    className="w-full bg-void-black border border-void-gray rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-void-red">
                    {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Genre (MAL)</label>
                <select value={jikanGenre} onChange={(e) => { setJikanGenre(e.target.value); setJikanPage(1); }}
                  className="w-full bg-void-black border border-void-gray rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-void-red">
                  <option value="">All Genres</option>
                  {JIKAN_GENRES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Sort By</label>
              <select value={sortBy} onChange={(e) => { setSortBy(e.target.value as SortOption); setPage(1); setJikanPage(1); }}
                className="w-full bg-void-black border border-void-gray rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-void-red">
                <option value="rating">Highest Rated</option>
                <option value="releaseYear">Newest First</option>
                {activeTab === "local" && <option value="title">Title A-Z</option>}
                {activeTab === "local" && <option value="popular">Most Popular</option>}
                {activeTab === "local" && <option value="trending">Trending</option>}
              </select>
            </div>
          </div>
          {hasFilters && (
            <button onClick={resetFilters} className="mt-3 text-void-red text-xs hover:text-void-red-glow transition-colors">
              Clear all filters
            </button>
          )}
        </div>

        {/* Results */}
        {activeTab === "local" ? (
          isLoading ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                {anime.map((item, i) => (
                  <div key={item.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
                    <AnimeCard
                      id={item.id}
                      title={item.title}
                      slug={item.slug}
                      coverImage={item.coverImage}
                      rating={item.rating}
                      releaseYear={item.releaseYear}
                      status={item.status}
                      genres={item.genres.map((ag) => ag.genre.name)}
                    />
                  </div>
                ))}
              </div>
              {anime.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg mb-2">No anime found in your collection</p>
                  <p className="text-gray-600 text-sm mb-4">Try searching MyAnimeList for a wider selection</p>
                  <button onClick={() => { setActiveTab("mal"); setJikanPage(1); }} className="text-void-red text-sm hover:text-void-red-glow">
                    Search MyAnimeList →
                  </button>
                </div>
              )}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 bg-void-dark border border-void-gray rounded hover:bg-void-red/20 disabled:opacity-50 text-white btn-ripple transition-all">Previous</button>
                  <span className="px-4 py-2 text-gray-400">Page {page} of {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 bg-void-dark border border-void-gray rounded hover:bg-void-red/20 disabled:opacity-50 text-white btn-ripple transition-all">Next</button>
                </div>
              )}
            </>
          )
        ) : (
          jikanLoading ? (
            <div className="text-center py-12 text-gray-400">
              <div className="inline-block w-8 h-8 border-2 border-void-red border-t-transparent rounded-full animate-spin mb-3" />
              <p>Searching MyAnimeList...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                {jikanAnime.map((item, i) => (
                  <div key={item.id} className="animate-fade-in-up group" style={{ animationDelay: `${i * 50}ms` }}>
                    <Link href={`/anime/anilist-${item.malId}`}
                      className="bg-void-dark border border-void-gray/50 rounded-lg overflow-hidden hover:border-void-red/50 hover:translate-y-[-2px] transition-all block">
                      <div className="aspect-[3/4] bg-gradient-to-br from-void-crimson/30 to-void-dark relative overflow-hidden">
                        {item.coverImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-void-red/30 text-4xl font-black">
                            {item.title.charAt(0)}
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-void-red/90 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">
                          MAL
                        </div>
                      </div>
                      <div className="p-3">
                        <h3 className="font-semibold text-sm text-gray-300 group-hover:text-void-red transition-colors line-clamp-2">
                          {item.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          {item.rating && <span>★ {item.rating}</span>}
                          {item.releaseYear && <span>{item.releaseYear}</span>}
                          {item.episodeCount && <span>{item.episodeCount} ep</span>}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.genres.slice(0, 2).map((g) => (
                            <span key={g.genre.slug} className="text-[10px] bg-void-gray/30 text-gray-500 px-1.5 py-0.5 rounded">
                              {g.genre.name}
                            </span>
                          ))}
                        </div>
                        {item.synopsis && (
                          <p className="text-[11px] text-gray-600 mt-2 line-clamp-2">{item.synopsis}</p>
                        )}
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
              {jikanAnime.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg mb-2">No results found on MyAnimeList</p>
                  <button onClick={resetFilters} className="text-void-red text-sm hover:text-void-red-glow">Clear filters</button>
                </div>
              )}
              {jikanTotalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  <button onClick={() => setJikanPage((p) => Math.max(1, p - 1))} disabled={jikanPage === 1} className="px-4 py-2 bg-void-dark border border-void-gray rounded hover:bg-void-red/20 disabled:opacity-50 text-white btn-ripple transition-all">Previous</button>
                  <span className="px-4 py-2 text-gray-400">Page {jikanPage} of {jikanTotalPages}</span>
                  <button onClick={() => setJikanPage((p) => Math.min(jikanTotalPages, p + 1))} disabled={jikanPage === jikanTotalPages} className="px-4 py-2 bg-void-dark border border-void-gray rounded hover:bg-void-red/20 disabled:opacity-50 text-white btn-ripple transition-all">Next</button>
                </div>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
}
