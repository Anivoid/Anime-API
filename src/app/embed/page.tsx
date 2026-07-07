"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Hls from "hls.js";

function EmbedContent() {
  const searchParams = useSearchParams();
  const episodeId = searchParams.get("episodeId");
  const anilistId = searchParams.get("anilistId");
  const episodeNum = searchParams.get("episodeNum") || "1";
  const server = searchParams.get("server") || "kiwi";
  const audioType = searchParams.get("type") || "sub";
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<string>("");
  const [qualities, setQualities] = useState<{ height: number; index: number }[]>([]);
  const [currentQuality, setCurrentQuality] = useState(-1);
  const [showSettings, setShowSettings] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [skipIntro, setSkipIntro] = useState(false);
  const [skipOutro, setSkipOutro] = useState(false);
  const [showKeyHelp, setShowKeyHelp] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stream fetching — uses provider system with proper fallback
  useEffect(() => {
    if (!episodeId && !anilistId) {
      setError("No episode provided");
      setIsLoading(false);
      return;
    }

    const fetchStream = async () => {
      try {
        // Step 1: Get episode info from local DB (for title + videoUrl)
        let title = "";
        let localVideoUrl: string | null = null;

        if (episodeId && !episodeId.startsWith("anilist-")) {
          const epRes = await fetch(`/api/episodes/${episodeId}`);
          if (epRes.ok) {
            const epData = await epRes.json();
            title = epData.anime?.title || "";
            const vUrl = epData.episode?.videoUrl;
            // Only use local URL if it's a real stream (not demo)
            if (vUrl && !vUrl.includes("test-streams.mux.dev") && !vUrl.includes("demo.unified-streaming") && !vUrl.includes("bitdash-a.akamaihd")) {
              localVideoUrl = vUrl;
            }
          }
        }

        // Step 2: If we have a real local URL, use it
        if (localVideoUrl) {
          setProvider("local-db");
          initPlayer(localVideoUrl);
          return;
        }

        // Step 3: Fetch from provider system
        const params = new URLSearchParams();
        if (anilistId) params.set("id", anilistId);
        if (title) params.set("title", title);
        params.set("episode", episodeNum);
        params.set("audio", audioType);
        params.set("provider", server);

        const res = await fetch(`/api/stream?type=watch&${params}`);
        if (!res.ok) {
          throw new Error(`Stream API error: ${res.status}`);
        }

        const data = await res.json();

        if (data.success && data.results?.streams?.length > 0) {
          setProvider(data.results.provider || server);
          // Prefer HLS streams
          const hlsStream = data.results.streams.find((s: { type: string; url: string }) => s.type === "hls" || s.url?.endsWith(".m3u8"));
          const stream = hlsStream || data.results.streams[0];
          if (stream.url) {
            initPlayer(stream.url, stream.referer ? { Referer: stream.referer } : undefined);
            return;
          }
        }

        // Step 4: No streams available
        if (data.results?.providerStatus) {
          const statuses = Object.entries(data.results.providerStatus) as [string, { enabled: boolean; healthy: boolean }][];
          const enabledCount = statuses.filter(([, s]) => s.enabled).length;
          const healthyCount = statuses.filter(([, s]) => s.healthy).length;
          setError(`No streams available (${enabledCount} providers enabled, ${healthyCount} healthy). Add a SCRAPE_DO_TOKEN for real streams.`);
        } else {
          setError("No streams available for this episode");
        }
        setIsLoading(false);
      } catch (e) {
        console.error("[Embed] Stream fetch error:", e);
        setError(`Failed to load video: ${(e as Error).message}`);
        setIsLoading(false);
      }
    };

    fetchStream();
  }, [episodeId, anilistId, episodeNum, server, audioType]);

  const initPlayer = useCallback((url: string, headers?: Record<string, string>) => {
    const video = videoRef.current;
    if (!video) return;

    if (url.endsWith(".m3u8") && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 30,
        xhrSetup: (xhr) => {
          if (headers) {
            Object.entries(headers).forEach(([key, value]) => {
              xhr.setRequestHeader(key, value);
            });
          }
        },
      });

      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        setIsLoading(false);
        const levels = data.levels
          .filter((l) => l.height > 0)
          .map((l, i) => ({ height: l.height, index: i }))
          .sort((a, b) => b.height - a.height);
        setQualities(levels);

        video.addEventListener("loadedmetadata", () => {
          const dur = video.duration;
          if (dur > 120) setSkipIntro(true);
          if (dur > 300) setSkipOutro(true);
        });

        window.parent.postMessage(JSON.stringify({ type: "ready", provider }), "*");
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.error("[Embed] HLS fatal error:", data);
          setError("Stream failed to load");
          setIsLoading(false);
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.addEventListener("loadedmetadata", () => {
        setIsLoading(false);
        window.parent.postMessage(JSON.stringify({ type: "ready", provider }), "*");
      });
    } else {
      video.src = url;
      video.addEventListener("loadedmetadata", () => setIsLoading(false));
    }
  }, [provider]);

  // Track progress
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setDuration(video.duration || 0);
      window.parent.postMessage(
        JSON.stringify({ type: "timeupdate", time: video.currentTime, duration: video.duration }),
        "*"
      );
    };

    const handlePlay = () => { setIsPlaying(true); window.parent.postMessage(JSON.stringify({ type: "play" }), "*"); };
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => { setIsPlaying(false); window.parent.postMessage(JSON.stringify({ type: "ended" }), "*"); };
    const handleVolumeChange = () => { setVolume(video.volume); setIsMuted(video.muted); };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("volumechange", handleVolumeChange);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("volumechange", handleVolumeChange);
    };
  }, []);

  // Listen for messages from parent
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data.type === "seek" && videoRef.current) videoRef.current.currentTime = data.time;
      } catch {}
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;
      switch (e.key) {
        case " ": case "k": e.preventDefault(); video.paused ? video.play() : video.pause(); break;
        case "f": document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); break;
        case "ArrowLeft": case "j": e.preventDefault(); video.currentTime = Math.max(0, video.currentTime - 10); break;
        case "ArrowRight": case "l": e.preventDefault(); video.currentTime = Math.min(video.duration, video.currentTime + 10); break;
        case "ArrowUp": e.preventDefault(); video.volume = Math.min(1, video.volume + 0.1); break;
        case "ArrowDown": e.preventDefault(); video.volume = Math.max(0, video.volume - 0.1); break;
        case "m": video.muted = !video.muted; break;
        case "0": case "1": case "2": case "3": case "4": case "5": case "6": case "7": case "8": case "9":
          e.preventDefault(); video.currentTime = video.duration * (parseInt(e.key) / 10); break;
        case "p":
          document.pictureInPictureElement ? document.exitPictureInPicture() : video.requestPictureInPicture?.();
          break;
        case "?": setShowKeyHelp((v) => !v); break;
        case "Escape": setShowKeyHelp(false); setShowSettings(false); break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const togglePlay = () => { const v = videoRef.current; if (v) v.paused ? v.play() : v.pause(); };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const bar = e.currentTarget;
    if (!video || !bar) return;
    const rect = bar.getBoundingClientRect();
    video.currentTime = ((e.clientX - rect.left) / rect.width) * video.duration;
  };

  const changeQuality = (index: number) => { if (hlsRef.current) { hlsRef.current.currentLevel = index; setCurrentQuality(index); } setShowSettings(false); };
  const changeSpeed = (rate: number) => { if (videoRef.current) { videoRef.current.playbackRate = rate; setPlaybackRate(rate); } setShowSettings(false); };

  const formatTime = (t: number) => {
    if (isNaN(t)) return "0:00";
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = Math.floor(t % 60);
    return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}` : `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="relative w-full h-full bg-black group"
      onMouseMove={() => {
        setShowControls(true);
        if (hideTimer.current) clearTimeout(hideTimer.current);
        if (isPlaying) hideTimer.current = setTimeout(() => setShowControls(false), 3000);
      }}
      onMouseLeave={() => { if (isPlaying) hideTimer.current = setTimeout(() => setShowControls(false), 1000); }}
    >
      <video ref={videoRef} className="w-full h-full" playsInline onClick={togglePlay}
        onDoubleClick={() => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); }}
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-void-red border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            {provider && <span className="text-gray-400 text-xs">Trying {provider}...</span>}
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center px-4">
            <p className="text-red-500 text-lg mb-1">{error}</p>
            {provider && <p className="text-gray-500 text-sm mb-3">Last provider: {provider}</p>}
            <button onClick={() => window.location.reload()} className="text-void-red hover:text-void-red-glow text-sm">Try Again</button>
          </div>
        </div>
      )}

      {!isPlaying && !isLoading && !error && (
        <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-16 h-16 bg-void-red rounded-full flex items-center justify-center hover:bg-void-red-dark transition">
            <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </div>
        </button>
      )}

      {skipIntro && currentTime >= 80 && currentTime <= 115 && (
        <button onClick={() => { videoRef.current!.currentTime = 115; setSkipIntro(false); }}
          className="absolute bottom-20 right-4 z-20 bg-white/10 backdrop-blur-sm border border-white/30 text-white px-5 py-2 rounded-lg hover:bg-white/20 transition text-sm font-medium">
          Skip Intro
        </button>
      )}
      {skipOutro && duration > 0 && currentTime >= duration - 80 && (
        <button onClick={() => { videoRef.current!.currentTime = duration; setSkipOutro(false); }}
          className="absolute bottom-20 right-4 z-20 bg-white/10 backdrop-blur-sm border border-white/30 text-white px-5 py-2 rounded-lg hover:bg-white/20 transition text-sm font-medium">
          Skip Outro
        </button>
      )}

      {/* Keyboard help overlay */}
      {showKeyHelp && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setShowKeyHelp(false)}>
          <div className="bg-void-dark border border-void-gray/50 rounded-xl p-6 max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-semibold mb-3">Keyboard Shortcuts</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                ["Space / K", "Play / Pause"], ["F", "Fullscreen"], ["M", "Mute"], ["P", "PiP"],
                ["← / J", "Back 10s"], ["→ / L", "Forward 10s"], ["↑ / ↓", "Volume"], ["0-9", "Jump to %"], ["?", "Toggle help"],
              ].map(([key, desc]) => (
                <div key={key} className="flex gap-2">
                  <kbd className="text-void-red font-mono text-xs bg-void-black px-1.5 py-0.5 rounded border border-void-gray/30">{key}</kbd>
                  <span className="text-gray-400">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-10 transition-opacity duration-300 z-10 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        {/* Progress bar */}
        <div className="relative h-1.5 bg-gray-600 rounded-full cursor-pointer mb-3 group/prog hover:h-2.5 transition-all" onClick={handleSeek}
          onMouseMove={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setHoverTime(((e.clientX - rect.left) / rect.width) * duration); setHoverX(e.clientX - rect.left); }}
          onMouseLeave={() => setHoverTime(null)}
        >
          <div className="absolute h-full bg-void-red rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
          <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-void-red rounded-full opacity-0 group-hover/prog:opacity-100 transition shadow-lg" style={{ left: `calc(${progressPercent}% - 6px)` }} />
          {hoverTime !== null && (
            <div className="absolute bottom-full mb-2 bg-black/90 text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap" style={{ left: `${hoverX}px`, transform: "translateX(-50%)" }}>
              {formatTime(hoverTime)}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={togglePlay} className="text-white hover:text-void-red transition">
              {isPlaying ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              )}
            </button>
            <button onClick={() => { if (videoRef.current) videoRef.current.currentTime -= 10; }} className="text-white hover:text-void-red transition" title="Back 10s (J)">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" /></svg>
            </button>
            <button onClick={() => { if (videoRef.current) videoRef.current.currentTime += 10; }} className="text-white hover:text-void-red transition" title="Forward 10s (L)">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.01 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" /></svg>
            </button>
            <div className="flex items-center gap-1 group/vol">
              <button onClick={() => { if (videoRef.current) videoRef.current.muted = !videoRef.current.muted; }} className="text-white hover:text-void-red transition">
                {isMuted ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" /></svg>
                ) : volume < 0.5 ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
                )}
              </button>
              <input type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume}
                onChange={(e) => { if (videoRef.current) { videoRef.current.volume = parseFloat(e.target.value); videoRef.current.muted = parseFloat(e.target.value) === 0; } }}
                className="w-0 group-hover/vol:w-16 transition-all accent-void-red"
              />
            </div>
            <span className="text-white text-xs font-mono">{formatTime(currentTime)} / {formatTime(duration)}</span>
            {provider && <span className="text-gray-500 text-xs ml-1">({provider})</span>}
          </div>

          <div className="flex items-center gap-1">
            {qualities.length > 0 && (
              <div className="relative">
                <button onClick={() => setShowSettings(!showSettings)} className="text-white hover:text-void-red p-1 transition text-xs font-semibold border border-white/30 rounded px-2">
                  {currentQuality === -1 ? "Auto" : `${qualities.find((q) => q.index === currentQuality)?.height || "?"}p`}
                </button>
                {showSettings && (
                  <div className="absolute bottom-full right-0 mb-2 bg-void-dark border border-void-gray/50 rounded-lg p-2 min-w-[120px] shadow-xl z-30">
                    <button onClick={() => changeQuality(-1)} className={`block w-full text-left px-2 py-1 text-sm rounded ${currentQuality === -1 ? "text-void-red" : "text-white hover:bg-void-gray/30"}`}>Auto</button>
                    {qualities.map((q) => (
                      <button key={q.index} onClick={() => changeQuality(q.index)} className={`block w-full text-left px-2 py-1 text-sm rounded ${currentQuality === q.index ? "text-void-red" : "text-white hover:bg-void-gray/30"}`}>{q.height}p</button>
                    ))}
                    <div className="border-t border-void-gray/30 mt-1 pt-1">
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
                        <button key={r} onClick={() => changeSpeed(r)} className={`block w-full text-left px-2 py-1 text-sm rounded ${playbackRate === r ? "text-void-red" : "text-white hover:bg-void-gray/30"}`}>{r}x</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <button onClick={() => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); }}
              className="text-white hover:text-void-red transition p-1" title="Fullscreen (F)">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" /></svg>
            </button>
            <button onClick={() => { const v = videoRef.current; if (v) document.pictureInPictureElement ? document.exitPictureInPicture() : v.requestPictureInPicture?.(); }}
              className="text-white hover:text-void-red transition p-1" title="Picture-in-Picture (P)">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 1.98 2 1.98h18c1.1 0 2-.88 2-1.98V5c0-1.1-.9-2-2-2zm0 16.01H3V4.98h18v14.03z" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmbedPage() {
  return (
    <Suspense fallback={<div className="w-full h-full bg-black flex items-center justify-center"><div className="w-10 h-10 border-4 border-void-red border-t-transparent rounded-full animate-spin" /></div>}>
      <EmbedContent />
    </Suspense>
  );
}
