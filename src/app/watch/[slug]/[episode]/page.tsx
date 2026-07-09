"use client";

import { useState, useEffect, useCallback } from "react";
import { use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Link from "next/link";
import { EmbedPlayer, ServerSelector, type VideoServer } from "@/components/EmbedPlayer";
import { EpisodeCommentSection } from "@/components/EpisodeCommentSection";

interface Episode {
  id: string;
  number: number;
  title: string | null;
  duration: number | null;
  videoUrl: string | null;
}

interface AnimeData {
  id: string;
  title: string;
  slug: string;
  season: string | null;
  episodes: Episode[];
}

interface WatchHistoryEntry {
  episodeId: string;
  position: number;
  duration: number;
  progress: number;
  completed: boolean;
}

const SERVERS: VideoServer[] = [
  { name: "Sankanime", id: "sankanime", type: "sub" },
  { name: "AniWatch", id: "aniwatch", type: "sub" },
];

export default function WatchPage({
  params,
}: {
  params: Promise<{ slug: string; episode: string }>;
}) {
  const { slug, episode } = use(params);
  const episodeNumber = parseInt(episode);
  const { data: session } = useSession();
  const router = useRouter();

  const [anime, setAnime] = useState<AnimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWatched, setIsWatched] = useState(false);
  const [watchHistory, setWatchHistory] = useState<Record<string, WatchHistoryEntry>>({});
  const [autoNext, setAutoNext] = useState(true);
  const [autoPlay, setAutoPlay] = useState(false);
  const [autoSkip, setAutoSkip] = useState(true);
  const [showNextPrompt, setShowNextPrompt] = useState(false);
  const [selectedServer, setSelectedServer] = useState<VideoServer>(SERVERS[0]);
  const [audioType, setAudioType] = useState<"sub" | "dub">("sub");
  const [anilistId, setAnilistId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnime = async () => {
      try {
        // If slug is anilist-*, extract ID directly from slug
        if (slug.startsWith("anilist-")) {
          const anilistIdNum = parseInt(slug.replace("anilist-", ""));
          setAnilistId(String(anilistIdNum));
          const query = `query ($id: Int) {
            Media(id: $id, type: ANIME) {
              id
              title { romaji english }
              coverImage { large }
              episodes
              duration
              status
            }
          }`;
          const anilistRes = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ query, variables: { id: anilistIdNum } }),
          });
          if (anilistRes.ok) {
            const { data } = await anilistRes.json();
            const m = data?.Media;
            if (m) {
              const title = m.title.english || m.title.romaji;
              const airedEpisodes = m.status === "RELEASING"
                ? (m.nextAiringEpisode?.episode || 1) - 1
                : (m.episodes || 0);
              const totalEpisodes = m.episodes || airedEpisodes || 12;
              const episodeCount = airedEpisodes || totalEpisodes;
              setAnime({
                id: slug,
                title,
                slug,
                season: null,
                episodes: Array.from({ length: episodeCount }, (_, i) => ({
                  id: `${slug}-ep-${i + 1}`,
                  number: i + 1,
                  title: `Episode ${i + 1}`,
                  duration: m.duration || 24,
                  videoUrl: null,
                })),
              });
            }
          }
          return;
        }

        // Local anime — fetch from DB
        const res = await fetch(`/api/anime/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setAnime(data);
          // Look up AniList ID by title for streaming
          try {
            const searchRes = await fetch(`/api/search/anilist?q=${encodeURIComponent(data.title)}&perPage=1`);
            if (searchRes.ok) {
              const searchData = await searchRes.json();
              if (searchData.data?.length > 0) {
                // malId field is actually the AniList numeric ID (misleading name)
                setAnilistId(String(searchData.data[0].malId));
              }
            }
          } catch {}
        }
      } catch (error) {
        console.error("Error fetching anime:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnime();
  }, [slug]);

  const currentEpisode = anime?.episodes.find((e) => e.number === episodeNumber) || null;
  const prevEpisode = episodeNumber > 1 ? episodeNumber - 1 : null;
  const nextEpisode = anime ? (episodeNumber < anime.episodes.length ? episodeNumber + 1 : null) : null;

  // Group episodes by season-like chunks (12 episodes per cour)
  const courSize = 12;
  const currentCour = Math.floor((episodeNumber - 1) / courSize) + 1;
  const totalCours = anime ? Math.ceil(anime.episodes.length / courSize) : 1;

  // Fetch watch history
  useEffect(() => {
    if (!session || !anime) return;
    const fetchHistory = async () => {
      try {
        const res = await fetch("/api/watch-history");
        if (res.ok) {
          const data = await res.json();
          const historyMap: Record<string, WatchHistoryEntry> = {};
          for (const entry of data) {
            historyMap[entry.episodeId] = {
              episodeId: entry.episodeId,
              position: entry.position || 0,
              duration: entry.duration || 0,
              progress: entry.progress || 0,
              completed: entry.completed || false,
            };
          }
          setWatchHistory(historyMap);
        }
      } catch (error) {
        console.error("Error fetching history:", error);
      }
    };
    fetchHistory();
  }, [session, anime]);

  const handleEnded = useCallback(() => {
    setIsWatched(true);
    if (autoNext && nextEpisode) {
      setShowNextPrompt(true);
      const timer = setTimeout(() => {
        router.push(`/watch/${slug}/${nextEpisode}`);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [autoNext, slug, nextEpisode, router]);

  // Keyboard: N for next episode
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.key === "n" || e.key === "N") && nextEpisode) {
        router.push(`/watch/${slug}/${nextEpisode}`);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [nextEpisode, slug, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-void-black text-white">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="min-h-screen bg-void-black text-white">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center text-gray-500">Anime not found</div>
        </div>
      </div>
    );
  }

  const currentEpHistory = currentEpisode ? watchHistory[currentEpisode.id] : null;

  return (
    <div className="min-h-screen bg-void-black text-white">
      <Header />

      <div className="container mx-auto px-4 py-6">
        {/* Auto-next prompt */}
        {showNextPrompt && nextEpisode && (
          <div className="mb-4 bg-void-dark border border-void-red/30 rounded-lg p-4 flex items-center justify-between animate-fade-in-up">
            <span className="text-gray-300">Playing next episode in 8s...</span>
            <div className="flex gap-2">
              <Link href={`/watch/${slug}/${nextEpisode}`} className="bg-void-red px-4 py-1 rounded text-sm text-white hover:bg-void-red-dark">
                Play Now
              </Link>
              <button onClick={() => setShowNextPrompt(false)} className="text-gray-500 hover:text-white text-sm px-3 py-1 rounded border border-void-gray/50">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Video Player with multi-server */}
        <EmbedPlayer
          servers={SERVERS}
          episodeId={currentEpisode?.id || ""}
          episodeNumber={episodeNumber}
          title={`${anime.title} - Episode ${episodeNumber}`}
          anilistId={anilistId || undefined}
          autoPlay={autoPlay}
          autoNext={autoNext}
          autoSkip={autoSkip}
          onEnded={handleEnded}
        />

        {/* Server selector */}
        <ServerSelector
          servers={SERVERS}
          selectedServer={selectedServer}
          audioType={audioType}
          onServerChange={setSelectedServer}
          onAudioTypeChange={setAudioType}
        />

        {/* Title + controls bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
          <div>
            <h1 className="text-2xl font-bold">
              {anime.title} - <span className="text-void-red">Episode {episodeNumber}</span>
            </h1>
            <p className="text-gray-500 mt-1">{currentEpisode?.title || `Episode ${episodeNumber}`}</p>
            {anime.season && (
              <span className="text-xs bg-void-dark border border-void-gray/50 text-gray-400 px-2 py-0.5 rounded mt-1 inline-block">
                {anime.season} Cour {currentCour} of {totalCours}
              </span>
            )}
            <div className="flex items-center gap-3 mt-2">
              {isWatched && (
                <span className="text-sm bg-green-600/20 text-green-400 border border-green-600/50 px-2 py-1 rounded">Watched</span>
              )}
              {currentEpHistory && currentEpHistory.progress > 0 && (
                <span className="text-sm text-gray-500">{currentEpHistory.progress}% watched</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Auto toggles */}
            <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
              <input type="checkbox" checked={autoPlay} onChange={(e) => setAutoPlay(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-void-black border-void-gray text-void-red focus:ring-void-red" />
              Auto Play
            </label>
            <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
              <input type="checkbox" checked={autoSkip} onChange={(e) => setAutoSkip(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-void-black border-void-gray text-void-red focus:ring-void-red" />
              Auto Skip
            </label>
            <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
              <input type="checkbox" checked={autoNext} onChange={(e) => setAutoNext(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-void-black border-void-gray text-void-red focus:ring-void-red" />
              Auto Next
            </label>

            {prevEpisode && (
              <Link href={`/watch/${slug}/${prevEpisode}`}
                className="bg-void-dark border border-void-gray/50 px-3 py-1.5 rounded-lg hover:bg-void-red/10 hover:border-void-red/50 transition-all text-sm flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
                Prev
              </Link>
            )}
            {nextEpisode && (
              <Link href={`/watch/${slug}/${nextEpisode}`}
                className="bg-void-red px-3 py-1.5 rounded-lg hover:bg-void-red-dark transition-all text-sm flex items-center gap-1 glow-red">
                Next
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg>
              </Link>
            )}
          </div>
        </div>

        {/* Season/Cour navigation */}
        {totalCours > 1 && (
          <div className="mt-6 bg-void-dark border border-void-gray/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Seasons &amp; Cours</h3>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: totalCours }, (_, i) => {
                const courStart = i * courSize + 1;
                const courEnd = Math.min((i + 1) * courSize, anime.episodes.length);
                const isActive = currentCour === i + 1;
                return (
                  <Link
                    key={i}
                    href={`/watch/${slug}/${courStart}`}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-void-red text-white glow-red"
                        : "bg-void-black border border-void-gray text-gray-400 hover:text-white hover:border-void-red/50"
                    }`}
                  >
                    {anime.season ? `${anime.season} ${i + 1}` : `Cour ${i + 1}`}
                    <span className="text-[10px] ml-1 opacity-60">({courStart}-{courEnd})</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Episode list */}
        <div className="mt-6 bg-void-dark border border-void-gray/50 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">
            Episodes <span className="text-void-red">({anime.episodes.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
            {anime.episodes.map((ep) => {
              const epHistory = watchHistory[ep.id];
              return (
                <Link
                  key={ep.id}
                  href={`/watch/${slug}/${ep.number}`}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    ep.number === episodeNumber
                      ? "bg-void-red/20 border border-void-red/50"
                      : "bg-void-black/50 border border-void-gray/30 hover:bg-void-red/10 hover:border-void-red/30"
                  }`}
                >
                  <div className="w-8 text-center text-gray-500 font-mono">{ep.number}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-medium text-sm truncate ${ep.number === episodeNumber ? "text-void-red" : "text-gray-400"}`}>
                      {ep.title || `Episode ${ep.number}`}
                    </h3>
                    {epHistory && epHistory.progress > 0 && (
                      <div className="mt-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${epHistory.completed ? "bg-green-500" : "bg-void-red"}`} style={{ width: `${epHistory.progress}%` }} />
                      </div>
                    )}
                  </div>
                  {ep.number === episodeNumber && <div className="text-void-red">▶</div>}
                  {epHistory?.completed && ep.number !== episodeNumber && <div className="text-green-500 text-xs">✓</div>}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Keyboard shortcuts */}
        <div className="mt-6 text-sm text-gray-500">
          <p className="font-semibold mb-2 text-gray-400">Keyboard Shortcuts:</p>
          <div className="flex flex-wrap gap-4">
            <span>Space/K: Play/Pause</span>
            <span>←/→: Back/Forward 10s</span>
            <span>M: Mute</span>
            <span>F: Fullscreen</span>
            <span>N: Next Episode</span>
          </div>
        </div>

        {/* Comments */}
        <div className="mt-8 bg-void-dark border border-void-gray/50 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Episode {episodeNumber} Comments</h2>
          <EpisodeCommentSection animeId={anime.id} episodeId={currentEpisode?.id || ""} />
        </div>
      </div>
    </div>
  );
}
