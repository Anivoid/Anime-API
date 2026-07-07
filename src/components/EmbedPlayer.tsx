"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface VideoServer {
  name: string;
  id: string;
  type: "sub" | "dub";
}

export interface SkipTimestamp {
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
}

interface EmbedPlayerProps {
  servers: VideoServer[];
  episodeId: string;
  episodeNumber: number;
  title: string;
  anilistId?: string;
  autoPlay?: boolean;
  autoNext?: boolean;
  autoSkip?: boolean;
  onEnded?: () => void;
  onTimeUpdate?: (time: number, duration: number) => void;
  introOutro?: SkipTimestamp;
}

const DEFAULT_SERVERS: VideoServer[] = [
  { name: "VHD-1", id: "hd-1", type: "sub" },
  { name: "VHD-2", id: "hd-2", type: "sub" },
  { name: "VHD-3", id: "hd-3", type: "sub" },
  { name: "VHD-4", id: "vidcloud", type: "sub" },
  { name: "VHD-5", id: "streamtape", type: "sub" },
  { name: "VHD-6", id: "mp4upload", type: "sub" },
];

export function EmbedPlayer({
  servers,
  episodeId,
  episodeNumber,
  title,
  anilistId,
  autoPlay = false,
  autoNext = true,
  autoSkip = true,
  onEnded,
  onTimeUpdate,
  introOutro,
}: EmbedPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [selectedServer, setSelectedServer] = useState<VideoServer | null>(null);
  const [audioType, setAudioType] = useState<"sub" | "dub">("sub");
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipOutro, setShowSkipOutro] = useState(false);
  const [embedUrl, setEmbedUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeServers = servers.length > 0 ? servers : DEFAULT_SERVERS;
  const filteredServers = activeServers.filter((s) => s.type === audioType);
  const dubServers = activeServers.filter((s) => s.type === "dub");

  // Build embed URL when server or episode changes
  useEffect(() => {
    if (!selectedServer && filteredServers.length > 0) {
      setSelectedServer(filteredServers[0]);
    }
  }, [filteredServers, selectedServer]);

  useEffect(() => {
    if (!selectedServer || !episodeId) return;
    setLoading(true);
    setError(null);

    // Build embed URL with anilistId for streaming API
    const anilistParam = anilistId ? `&anilistId=${anilistId}&episodeNum=${episodeNumber}` : "";
    const url = `/embed?episodeId=${episodeId}&server=${selectedServer.id}&type=${audioType}${anilistParam}`;
    setEmbedUrl(url);
  }, [selectedServer, episodeId, audioType, anilistId, episodeNumber]);

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    setLoading(false);
  }, []);

  // Listen for messages from embed player for time updates
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data.type === "timeupdate" && onTimeUpdate) {
          onTimeUpdate(data.time, data.duration);
        }
        if (data.type === "ended") {
          onEnded?.();
        }
        if (data.type === "ready") {
          setLoading(false);
        }
      } catch {
        // Not JSON, ignore
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onTimeUpdate, onEnded]);

  // Skip intro/outro logic
  useEffect(() => {
    if (!autoSkip || !introOutro) return;

    const checkSkip = setInterval(() => {
      if (introOutro.intro) {
        setShowSkipIntro(true);
      }
      if (introOutro.outro) {
        setShowSkipOutro(true);
      }
    }, 1000);

    return () => clearInterval(checkSkip);
  }, [autoSkip, introOutro]);

  const handleSkipIntro = () => {
    setShowSkipIntro(false);
    // Send message to iframe to seek
    iframeRef.current?.contentWindow?.postMessage({ type: "seek", time: introOutro?.intro?.end || 0 }, "*");
  };

  const handleSkipOutro = () => {
    setShowSkipOutro(false);
    onEnded?.();
  };

  const handleServerChange = (server: VideoServer) => {
    setSelectedServer(server);
    setLoading(true);
  };

  return (
    <div className="relative bg-black rounded-lg overflow-hidden group">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-void-red border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Loading video from {selectedServer?.name || "server"}...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
          <div className="text-center">
            <p className="text-red-500 mb-2">{error}</p>
            <button
              onClick={() => { setError(null); setLoading(true); setEmbedUrl(""); setTimeout(() => setEmbedUrl(`/api/embed?episodeId=${episodeId}&server=${selectedServer?.id || "hd-2"}&type=${audioType}`), 100); }}
              className="text-void-red hover:text-void-red-glow text-sm"
            >
              Try another server
            </button>
          </div>
        </div>
      )}

      {/* Embed iframe */}
      <div className="relative w-full aspect-video">
        {embedUrl && (
          <iframe
            ref={iframeRef}
            src={embedUrl}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            onLoad={handleIframeLoad}
            onError={() => setError("Failed to load video")}
            title={title}
          />
        )}
      </div>

      {/* Skip Intro/Outro buttons */}
      {showSkipIntro && (
        <button
          onClick={handleSkipIntro}
          className="absolute bottom-20 right-6 z-30 bg-white/10 backdrop-blur-sm border border-white/30 text-white px-6 py-2 rounded-lg hover:bg-white/20 transition-all font-medium"
        >
          Skip Intro ▶▶
        </button>
      )}
      {showSkipOutro && (
        <button
          onClick={handleSkipOutro}
          className="absolute bottom-20 right-6 z-30 bg-white/10 backdrop-blur-sm border border-white/30 text-white px-6 py-2 rounded-lg hover:bg-white/20 transition-all font-medium"
        >
          Skip Outro ▶▶
        </button>
      )}
    </div>
  );
}

// Server selector panel (below the player)
export function ServerSelector({
  servers,
  selectedServer,
  audioType,
  onServerChange,
  onAudioTypeChange,
}: {
  servers: VideoServer[];
  selectedServer: VideoServer | null;
  audioType: "sub" | "dub";
  onServerChange: (server: VideoServer) => void;
  onAudioTypeChange: (type: "sub" | "dub") => void;
}) {
  const activeServers = servers.length > 0 ? servers : DEFAULT_SERVERS;
  const hasDub = activeServers.some((s) => s.type === "dub");
  const filteredServers = activeServers.filter((s) => s.type === audioType);

  return (
    <div className="bg-void-dark border border-void-gray/50 rounded-lg p-4 mt-4">
      {/* Audio type tabs */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
          {audioType === "sub" ? "Subtitled" : "Dubbed"}:
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => onAudioTypeChange("sub")}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
              audioType === "sub" ? "bg-void-red text-white" : "bg-void-black border border-void-gray text-gray-400 hover:text-white"
            }`}
          >
            SUB
          </button>
          {hasDub && (
            <button
              onClick={() => onAudioTypeChange("dub")}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                audioType === "dub" ? "bg-void-red text-white" : "bg-void-black border border-void-gray text-gray-400 hover:text-white"
              }`}
            >
              DUB
            </button>
          )}
        </div>
      </div>

      {/* Server buttons */}
      <div className="flex flex-wrap gap-2">
        {filteredServers.map((server) => (
          <button
            key={server.id}
            onClick={() => onServerChange(server)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              selectedServer?.id === server.id
                ? "bg-void-red text-white glow-red"
                : "bg-void-black border border-void-gray text-gray-400 hover:text-white hover:border-void-red/50"
            }`}
          >
            {server.name}
          </button>
        ))}
      </div>

      {/* Source info */}
      <p className="text-[11px] text-gray-600 mt-2">
        If the current server doesn&apos;t work, try other servers above.
      </p>
    </div>
  );
}
