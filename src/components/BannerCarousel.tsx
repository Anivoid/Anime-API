"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  link: string | null;
}

export function BannerCarousel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/banners")
      .then((r) => r.json())
      .then((data) => setBanners(data.filter((b: Banner & { active: boolean }) => b.active)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % banners.length);
  }, [banners.length]);

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + banners.length) % banners.length);
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [banners.length, next]);

  if (loading || banners.length === 0) return null;

  const banner = banners[current];

  return (
    <section className="relative h-[450px] bg-[#0d0d1a]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {banner.imageUrl && (
        <img src={banner.imageUrl} alt={banner.title} className="absolute inset-0 w-full h-full object-cover opacity-30" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0d0d1a] via-[#0d0d1a]/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d1a] via-transparent to-[#0d0d1a]/50" />

      <div className="container mx-auto px-4 h-full flex items-center relative z-10">
        <div className="max-w-2xl animate-fade-in-up">
          <h1 className="text-5xl md:text-6xl font-black mb-3 leading-tight text-white">
            {banner.title}
          </h1>
          {banner.subtitle && (
            <p className="text-lg text-gray-300 mb-6 line-clamp-3">{banner.subtitle}</p>
          )}
          <div className="flex gap-3">
            {banner.link ? (
              <Link
                href={banner.link}
                className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-bold text-white transition-colors flex items-center gap-2"
              >
                <span className="text-lg">▶</span> PLAY NOW
              </Link>
            ) : (
              <Link
                href="/browse"
                className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-bold text-white transition-colors flex items-center gap-2"
              >
                <span className="text-lg">▶</span> PLAY NOW
              </Link>
            )}
            <Link
              href="/browse"
              className="border border-white/20 hover:border-white/40 px-6 py-3 rounded-lg font-bold text-gray-300 hover:text-white transition-colors"
            >
              BROWSE
            </Link>
          </div>
        </div>
      </div>

      {banners.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors z-20"
          >
            ‹
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors z-20"
          >
            ›
          </button>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === current ? "bg-purple-500 w-6" : "bg-white/30 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
