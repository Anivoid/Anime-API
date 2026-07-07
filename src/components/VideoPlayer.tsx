"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Hls from "hls.js";

interface VideoPlayerProps {
  src: string;
  title?: string;
  introStart?: number;
  introEnd?: number;
  outroStart?: number;
  outroEnd?: number;
  initialTime?: number;
  onProgress?: (progress: number, duration: number) => void;
  onEnded?: () => void;
  autoPlay?: boolean;
}

export function VideoPlayer({
  src,
  title,
  introStart,
  introEnd,
  outroStart,
  outroEnd,
  initialTime = 0,
  onProgress,
  onEnded,
  autoPlay = false,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isPiP, setIsPiP] = useState(false);

  // Quality & Subtitle
  const [qualities, setQualities] = useState<{ height: number; bitrate: number; index: number }[]>([]);
  const [currentQuality, setCurrentQuality] = useState(-1); // -1 = auto
  const [subtitles, setSubtitles] = useState<{ label: string; index: number }[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState(-1); // -1 = off
  const [showSettings, setShowSettings] = useState(false);

  // Skip intro/outro
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipOutro, setShowSkipOutro] = useState(false);

  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);
  const resumedRef = useRef(false);

  // Initialize HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (src.endsWith(".m3u8") && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });

      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        setIsLoading(false);

        // Extract quality levels
        const levels = data.levels
          .map((level, index) => ({
            height: level.height,
            bitrate: level.bitrate,
            index,
          }))
          .filter((l) => l.height > 0)
          .sort((a, b) => b.height - a.height);
        setQualities(levels);

        // Extract subtitle tracks from video element after HLS attaches
        setTimeout(() => {
          const tracks = video.textTracks;
          const subs: { label: string; index: number }[] = [];
          for (let i = 0; i < tracks.length; i++) {
            if (tracks[i].kind === "subtitles" || tracks[i].kind === "captions") {
              subs.push({
                label: tracks[i].label || tracks[i].language || `Track ${i + 1}`,
                index: i,
              });
            }
          }
          if (subs.length > 0) setSubtitles(subs);
        }, 500);

        if (autoPlay) {
          video.play().catch(() => {});
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          setError("Failed to load video");
          setIsLoading(false);
        }
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.addEventListener("loadedmetadata", () => {
        setIsLoading(false);
        if (autoPlay) video.play().catch(() => {});
      });
    } else if (src) {
      video.src = src;
      video.addEventListener("loadedmetadata", () => {
        setIsLoading(false);
      });
    }
  }, [src, autoPlay]);

  // Resume from saved position
  useEffect(() => {
    if (initialTime > 0 && videoRef.current && !resumedRef.current && duration > 0) {
      videoRef.current.currentTime = initialTime;
      resumedRef.current = true;
    }
  }, [initialTime, duration]);

  // Track progress
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      const dur = video.duration || 0;
      setCurrentTime(time);
      setDuration(dur);

      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }

      // Skip intro/outro auto-detect
      if (introStart !== undefined && introEnd !== undefined) {
        setShowSkipIntro(time >= introStart && time <= introEnd);
      }
      if (outroStart !== undefined && outroEnd !== undefined) {
        setShowSkipOutro(time >= outroStart && time <= outroEnd);
      }

      if (onProgress && dur) {
        onProgress(time, dur);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

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
  }, [onProgress, onEnded, introStart, introEnd, outroStart, outroEnd]);

  // Fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // PiP
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnterPiP = () => setIsPiP(true);
    const handleLeavePiP = () => setIsPiP(false);

    video.addEventListener("enterpictureinpicture", handleEnterPiP);
    video.addEventListener("leavepictureinpicture", handleLeavePiP);
    return () => {
      video.removeEventListener("enterpictureinpicture", handleEnterPiP);
      video.removeEventListener("leavepictureinpicture", handleLeavePiP);
    };
  }, []);

  // Cleanup timer
  useEffect(() => {
    const timer = hideControlsTimer.current;
    return () => { if (timer) clearTimeout(timer); };
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  }, []);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const v = parseFloat(e.target.value);
    video.volume = v;
    video.muted = v === 0;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const bar = progressRef.current;
    if (!video || !bar) return;
    const rect = bar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * video.duration;
  };

  const toggleFullscreen = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else c.requestFullscreen();
  }, []);

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch {}
  };

  const changePlaybackRate = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const changeQuality = (index: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.currentLevel = index;
    setCurrentQuality(index);
    setShowSettings(false);
  };

  const changeSubtitle = (index: number) => {
    const hls = hlsRef.current;
    const video = videoRef.current;
    if (!hls || !video) return;

    if (index === -1) {
      hls.subtitleTrack = -1;
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = "hidden";
      }
    } else {
      hls.subtitleTrack = index;
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = i === index ? "showing" : "hidden";
      }
    }
    setCurrentSubtitle(index);
    setShowSettings(false);
  };

  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
  };

  const skipIntro = () => {
    const video = videoRef.current;
    if (!video || introEnd === undefined) return;
    video.currentTime = introEnd + 0.5;
    setShowSkipIntro(false);
  };

  const skipOutro = () => {
    const video = videoRef.current;
    if (!video) return;
    // Skip to end triggers onEnded
    video.currentTime = video.duration;
    setShowSkipOutro(false);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const h = Math.floor(time / 3600);
    const m = Math.floor((time % 3600) / 60);
    const s = Math.floor(time % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration ? (buffered / duration) * 100 : 0;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "m":
          toggleMute();
          break;
        case "f":
          toggleFullscreen();
          break;
        case "p":
          togglePiP();
          break;
        case "ArrowLeft":
          e.preventDefault();
          skip(-10);
          break;
        case "ArrowRight":
          e.preventDefault();
          skip(10);
          break;
        case "ArrowUp":
          e.preventDefault();
          if (videoRef.current) {
            const v = Math.min(1, videoRef.current.volume + 0.1);
            videoRef.current.volume = v;
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          if (videoRef.current) {
            const v = Math.max(0, videoRef.current.volume - 0.1);
            videoRef.current.volume = v;
          }
          break;
        case "j":
          skip(-10);
          break;
        case "l":
          skip(10);
          break;
        case "0":
        case "Home":
          if (videoRef.current) videoRef.current.currentTime = 0;
          break;
        case "End":
          if (videoRef.current) videoRef.current.currentTime = videoRef.current.duration;
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, toggleMute, toggleFullscreen, togglePiP]);

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-lg overflow-hidden group"
      onMouseMove={() => {
        setShowControls(true);
        if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
        if (isPlaying) {
          hideControlsTimer.current = setTimeout(() => setShowControls(false), 3000);
        }
      }}
      onMouseLeave={() => {
        if (isPlaying && !showSettings) {
          if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
          hideControlsTimer.current = setTimeout(() => setShowControls(false), 1000);
        }
      }}
    >
      {/* Video */}
      <video ref={videoRef} className="w-full aspect-video" playsInline onClick={togglePlay} />

      {/* Loading */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="w-12 h-12 border-4 border-void-red border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <p className="text-red-500 text-lg mb-2">{error}</p>
            <button onClick={() => window.location.reload()} className="text-void-red hover:text-void-red-glow">
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Play overlay */}
      {!isPlaying && !isLoading && !error && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <div className="w-16 h-16 bg-void-red rounded-full flex items-center justify-center hover:bg-void-red-dark transition glow-red">
            <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </button>
      )}

      {/* Title */}
      {title && showControls && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4 z-10">
          <h3 className="text-white font-semibold">{title}</h3>
        </div>
      )}

      {/* Skip Intro Button */}
      {showSkipIntro && (
        <button
          onClick={skipIntro}
          className="absolute bottom-24 right-6 z-20 bg-white/10 backdrop-blur-sm border border-white/30 text-white px-6 py-2 rounded-lg hover:bg-white/20 transition-all font-medium"
        >
          Skip Intro ▶▶
        </button>
      )}

      {/* Skip Outro Button */}
      {showSkipOutro && (
        <button
          onClick={skipOutro}
          className="absolute bottom-24 right-6 z-20 bg-white/10 backdrop-blur-sm border border-white/30 text-white px-6 py-2 rounded-lg hover:bg-white/20 transition-all font-medium"
        >
          Skip Outro ▶▶
        </button>
      )}

      {/* Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-12 transition-opacity duration-300 z-10 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Progress Bar */}
        <div
          ref={progressRef}
          className="relative h-1.5 bg-gray-600 rounded-full cursor-pointer mb-4 group/progress hover:h-2.5 transition-all"
          onClick={handleSeek}
          role="slider"
          aria-label="Seek video"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progressPercent)}
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "ArrowLeft") skip(-10); if (e.key === "ArrowRight") skip(10); }}
        >
          {/* Intro/outro markers */}
          {introStart !== undefined && introEnd !== undefined && duration > 0 && (
            <div
              className="absolute h-full bg-yellow-500/30 rounded"
              style={{
                left: `${(introStart / duration) * 100}%`,
                width: `${((introEnd - introStart) / duration) * 100}%`,
              }}
            />
          )}
          {outroStart !== undefined && outroEnd !== undefined && duration > 0 && (
            <div
              className="absolute h-full bg-blue-500/30 rounded"
              style={{
                left: `${(outroStart / duration) * 100}%`,
                width: `${((outroEnd - outroStart) / duration) * 100}%`,
              }}
            />
          )}
          {/* Buffered */}
          <div className="absolute h-full bg-gray-500 rounded-full" style={{ width: `${bufferedPercent}%` }} />
          {/* Progress */}
          <div className="absolute h-full bg-void-red rounded-full" style={{ width: `${progressPercent}%` }} role="slider" aria-label="Video progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progressPercent)} aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`} tabIndex={0} onKeyDown={(e) => { if (e.key === "ArrowLeft") skip(-10); if (e.key === "ArrowRight") skip(10); }} />
          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-void-red rounded-full opacity-0 group-hover/progress:opacity-100 transition shadow-lg"
            style={{ left: `calc(${progressPercent}% - 6px)` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button onClick={togglePlay} className="text-white hover:text-void-red transition-colors" aria-label={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Skip -10s */}
            <button onClick={() => skip(-10)} className="text-white hover:text-void-red transition-colors" title="Back 10s (J)" aria-label="Rewind 10 seconds">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
                <text x="9" y="16" fontSize="7" fontWeight="bold">10</text>
              </svg>
            </button>

            {/* Skip +10s */}
            <button onClick={() => skip(10)} className="text-white hover:text-void-red transition-colors" title="Forward 10s (L)" aria-label="Forward 10 seconds">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.01 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" />
                <text x="9" y="16" fontSize="7" fontWeight="bold">10</text>
              </svg>
            </button>

            {/* Volume */}
            <div className="flex items-center gap-2 group/volume">
              <button onClick={toggleMute} className="text-white hover:text-void-red transition-colors" aria-label={isMuted ? "Unmute" : "Mute"}>
                {isMuted || volume === 0 ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  </svg>
                ) : volume < 0.5 ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-0 group-hover/volume:w-20 transition-all accent-void-red"
                aria-label="Volume"
                role="slider"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round((isMuted ? 0 : volume) * 100)}
              />
            </div>

            {/* Time */}
            <span className="text-white text-sm font-mono">
              {formatTime(currentTime)} <span className="text-gray-500">/</span> {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* PiP */}
            <button
              onClick={togglePiP}
              className={`text-sm px-2 py-1 rounded transition-colors ${isPiP ? "text-void-red" : "text-white hover:text-void-red"}`}
              title="Picture-in-Picture (P)"
              aria-label="Toggle Picture-in-Picture"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z" />
              </svg>
            </button>

            {/* Settings */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="text-white hover:text-void-red p-1 rounded transition-colors"
                title="Settings"
                aria-label="Player settings"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1115.6 12 3.611 3.611 0 0112 15.6z" />
                </svg>
              </button>

              {/* Settings dropdown */}
              {showSettings && (
                <div className="absolute bottom-full right-0 mb-2 bg-void-dark border border-void-gray/50 rounded-lg p-3 min-w-[200px] shadow-xl z-30">
                  {/* Quality */}
                  {qualities.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">Quality</p>
                      <button
                        onClick={() => changeQuality(-1)}
                        className={`block w-full text-left px-2 py-1 text-sm rounded transition-colors ${
                          currentQuality === -1 ? "text-void-red bg-void-red/10" : "text-white hover:bg-void-gray/30"
                        }`}
                      >
                        Auto ({qualities[0]?.height}p)
                      </button>
                      {qualities.map((q) => (
                        <button
                          key={q.index}
                          onClick={() => changeQuality(q.index)}
                          className={`block w-full text-left px-2 py-1 text-sm rounded transition-colors ${
                            currentQuality === q.index ? "text-void-red bg-void-red/10" : "text-white hover:bg-void-gray/30"
                          }`}
                        >
                          {q.height}p
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Subtitles */}
                  {subtitles.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">Subtitles</p>
                      <button
                        onClick={() => changeSubtitle(-1)}
                        className={`block w-full text-left px-2 py-1 text-sm rounded transition-colors ${
                          currentSubtitle === -1 ? "text-void-red bg-void-red/10" : "text-white hover:bg-void-gray/30"
                        }`}
                      >
                        Off
                      </button>
                      {subtitles.map((s) => (
                        <button
                          key={s.index}
                          onClick={() => changeSubtitle(s.index)}
                          className={`block w-full text-left px-2 py-1 text-sm rounded transition-colors ${
                            currentSubtitle === s.index ? "text-void-red bg-void-red/10" : "text-white hover:bg-void-gray/30"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Playback Speed */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Speed</p>
                    {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => { changePlaybackRate(rate); setShowSettings(false); }}
                        className={`block w-full text-left px-2 py-1 text-sm rounded transition-colors ${
                          playbackRate === rate ? "text-void-red bg-void-red/10" : "text-white hover:bg-void-gray/30"
                        }`}
                      >
                        {rate}x {rate === 1 && "(Normal)"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button onClick={toggleFullscreen} className="text-white hover:text-void-red transition-colors" title="Fullscreen (F)" aria-label="Toggle fullscreen">
              {isFullscreen ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
