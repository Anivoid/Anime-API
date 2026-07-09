"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Header from "@/components/Header";
import { AnimeCard } from "@/components/AnimeCard";
import { useDebounce } from "@/hooks/useDebounce";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

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
  subCount: number | null;
  dubCount: number | null;
  featured: boolean;
  trending: boolean;
  genres: { genre: { name: string } }[];
  _count?: { animeLikes: number; episodes: number };
}

interface Genre {
  id: string;
  name: string;
  slug: string;
}

type SortOption = "title" | "rating" | "releaseYear" | "popular" | "trending";

const TYPES = ["All", "TV", "Movie", "OVA", "ONA", "Special"];
const SEASONS = ["All", "Winter", "Spring", "Summer", "Fall"];
const STATUSES = ["All", "Ongoing", "Completed", "Upcoming"];
const YEARS = ["All", ...Array.from({ length: 20 }, (_, i) => String(2026 - i))];
const LETTERS = ["All", "#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];

function BrowseContent() {
  const searchParams = useSearchParams();
  const initialLetter = searchParams.get("letter") || "All";

  const [anime, setAnime] = useState<Anime[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedSeason, setSelectedSeason] = useState("All");
  const [selectedYear, setSelectedYear] = useState("All");
  const [selectedLetter, setSelectedLetter] = useState(initialLetter);
  const [sortBy, setSortBy] = useState<SortOption>("title");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const fetchIdRef = useRef(0);

  const debouncedSearch = useDebounce(searchInput, 300);

  useEffect(() => {
    fetch("/api/genres").then((r) => r.json()).then(setGenres).catch(console.error);
  }, []);

  useEffect(() => {
    const currentFetchId = ++fetchIdRef.current;
    const controller = new AbortController();

    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (selectedGenre !== "All") params.set("genre", selectedGenre);
    if (selectedStatus !== "All") params.set("status", selectedStatus);
    if (selectedType !== "All") params.set("type", selectedType);
    if (selectedSeason !== "All") params.set("season", selectedSeason);
    if (selectedYear !== "All") params.set("year", selectedYear);
    if (selectedLetter !== "All") params.set("letter", selectedLetter);
    if (sortBy === "trending") params.set("trending", "true");
    params.set("page", page.toString());
    params.set("limit", "30");

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
  }, [debouncedSearch, selectedGenre, selectedStatus, selectedType, selectedSeason, selectedYear, selectedLetter, sortBy, page]);

  const resetFilters = () => {
    setSearchInput("");
    setSelectedGenre("All");
    setSelectedStatus("All");
    setSelectedType("All");
    setSelectedSeason("All");
    setSelectedYear("All");
    setSelectedLetter("All");
    setSortBy("title");
    setPage(1);
  };

  const hasFilters = searchInput || selectedGenre !== "All" || selectedStatus !== "All" || selectedType !== "All" || selectedSeason !== "All" || selectedYear !== "All" || selectedLetter !== "All";

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-white">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-6">Browse Anime</h1>

        {/* A-Z Letter filter */}
        <div className="mb-6">
          <p className="text-gray-500 text-sm mb-3">Searching anime order by alphabet name A to Z.</p>
          <div className="flex flex-wrap gap-1.5">
            {LETTERS.map((letter) => (
              <button
                key={letter}
                onClick={() => { setSelectedLetter(letter); setPage(1); }}
                className={`w-9 h-9 flex items-center justify-center rounded text-sm font-medium transition-colors ${
                  selectedLetter === letter
                    ? "bg-purple-600 text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
        </div>

        {/* Season Selector - Large Visual Buttons */}
        <div className="bg-[#1a1a2e] border border-white/5 rounded-lg p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Season</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const idx = YEARS.indexOf(selectedYear);
                  if (idx < YEARS.length - 1) setSelectedYear(YEARS[idx + 1]);
                }}
                className="w-8 h-8 rounded bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                &#8249;
              </button>
              <span className="text-white font-bold text-sm min-w-[60px] text-center">{selectedYear === "All" ? "All Years" : selectedYear}</span>
              <button
                onClick={() => {
                  const idx = YEARS.indexOf(selectedYear);
                  if (idx > 0) setSelectedYear(YEARS[idx - 1]);
                }}
                className="w-8 h-8 rounded bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                &#8250;
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <button
              onClick={() => { setSelectedSeason("All"); setPage(1); }}
              className={`py-4 rounded-lg font-bold text-sm transition-all border ${
                selectedSeason === "All"
                  ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/20"
                  : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              All Seasons
            </button>
            {[
              { name: "Winter", icon: "\u2744", color: "from-blue-500/20 to-cyan-500/20" },
              { name: "Spring", icon: "\uD83C\uDF38", color: "from-green-500/20 to-emerald-500/20" },
              { name: "Summer", icon: "\u2600", color: "from-orange-500/20 to-yellow-500/20" },
              { name: "Fall", icon: "\uD83C\uDF42", color: "from-red-500/20 to-orange-500/20" },
            ].map((s) => (
              <button
                key={s.name}
                onClick={() => { setSelectedSeason(selectedSeason === s.name ? "All" : s.name); setPage(1); }}
                className={`py-4 rounded-lg font-bold text-sm transition-all border ${
                  selectedSeason === s.name
                    ? `bg-gradient-to-br ${s.color} border-purple-500 text-white shadow-lg shadow-purple-600/20`
                    : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <span className="text-lg">{s.icon}</span>
                <div className="mt-1">{s.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#1a1a2e] border border-white/5 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="col-span-2 md:col-span-3 lg:col-span-1">
              <label className="block text-xs text-gray-500 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search anime..."
                value={searchInput}
                onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
                className="w-full bg-[#0d0d1a] border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Genre</label>
              <select value={selectedGenre} onChange={(e) => { setSelectedGenre(e.target.value); setPage(1); }}
                className="w-full bg-[#0d0d1a] border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500">
                <option value="All">All Genres</option>
                {genres.map((g) => <option key={g.id} value={g.slug}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type</label>
              <select value={selectedType} onChange={(e) => { setSelectedType(e.target.value); setPage(1); }}
                className="w-full bg-[#0d0d1a] border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500">
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select value={selectedStatus} onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
                className="w-full bg-[#0d0d1a] border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500">
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Sort By</label>
              <select value={sortBy} onChange={(e) => { setSortBy(e.target.value as SortOption); setPage(1); }}
                className="w-full bg-[#0d0d1a] border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500">
                <option value="title">Title A-Z</option>
                <option value="rating">Highest Rated</option>
                <option value="releaseYear">Newest First</option>
                <option value="popular">Most Popular</option>
                <option value="trending">Trending</option>
              </select>
            </div>
          </div>

          {hasFilters && (
            <button onClick={resetFilters} className="mt-3 text-purple-400 text-xs hover:text-purple-300 transition-colors">
              Clear all filters
            </button>
          )}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">
            <div className="inline-block w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p>Loading...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {anime.map((item) => (
                <AnimeCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  slug={item.slug}
                  coverImage={item.coverImage}
                  rating={item.rating}
                  releaseYear={item.releaseYear}
                  status={item.status}
                  type={item.type || undefined}
                  season={item.season}
                  subCount={item.subCount}
                  dubCount={item.dubCount}
                  episodeCount={item._count?.episodes ?? null}
                  genres={item.genres.map((ag) => ag.genre.name)}
                />
              ))}
            </div>
            {anime.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg mb-2">No anime found</p>
                <button onClick={resetFilters} className="text-purple-400 text-sm hover:text-purple-300">Clear filters</button>
              </div>
            )}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded hover:bg-white/10 disabled:opacity-50 text-white transition-all">
                  Previous
                </button>
                <span className="px-4 py-2 text-gray-400">Page {page} of {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded hover:bg-white/10 disabled:opacity-50 text-white transition-all">
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0d0d1a] text-white flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <BrowseContent />
    </Suspense>
  );
}
