"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";

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
    <section className="relative h-[500px] bg-gradient-to-br from-void-black via-[#1a0000] to-void-black">
      {banner.imageUrl && (
        <Image src={banner.imageUrl} alt={banner.title} unoptimized fill className="object-cover opacity-20" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-void-black via-void-black/60 to-transparent" />
      <div className="absolute top-1/4 right-1/4 w-32 h-32 rounded-full bg-void-red/10 animate-float-slow pointer-events-none" />
      <div className="container mx-auto px-4 h-full flex items-center relative z-10">
        <div className="max-w-2xl animate-fade-in-up">
          <p className="text-void-red text-sm mb-4 font-mono tracking-widest">虛無の先に物語がある</p>
          <h1 className="text-5xl md:text-7xl font-black mb-4 leading-tight">
            <span className="text-white block">{banner.title}</span>
            {banner.subtitle && <span className="text-void-red brush-text block mt-2">{banner.subtitle}</span>}
          </h1>
          <div className="h-1 w-24 bg-void-red mb-6" />
          <p className="text-xl text-gray-400 mb-8">Stream thousands of anime series and movies.</p>
          <div className="flex gap-4">
            <Link href="/browse" className="bg-void-red px-8 py-4 rounded font-bold text-white hover:bg-void-red-dark transition-colors">BROWSE ANIME →</Link>
            <Link href="/auth/register" className="border border-void-gray px-8 py-4 rounded font-bold text-gray-300 hover:text-white hover:border-void-red transition-colors">SIGN UP FREE</Link>
          </div>
        </div>
      </div>
      {banners.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-void-black/50 border border-void-gray/50 flex items-center justify-center text-gray-400 hover:text-void-red transition-colors z-20">‹</button>
          <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-void-black/50 border border-void-gray/50 flex items-center justify-center text-gray-400 hover:text-void-red transition-colors z-20">›</button>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {banners.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} className={`w-2 h-2 rounded-full transition-all ${i === current ? "bg-void-red w-6" : "bg-void-gray"}`} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
