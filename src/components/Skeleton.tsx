"use client";

// Reusable skeleton loading primitives
export function SkeletonBox({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-void-gray/20 rounded ${className}`} aria-hidden="true" />;
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBox key={i} className={`h-3 ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-void-dark border border-void-gray/30 rounded-lg overflow-hidden ${className}`} aria-hidden="true">
      <SkeletonBox className="h-48 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <SkeletonBox className="h-4 w-3/4" />
        <SkeletonBox className="h-3 w-1/2" />
        <div className="flex gap-2">
          <SkeletonBox className="h-5 w-16 rounded-full" />
          <SkeletonBox className="h-5 w-12 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonEpisodeCard() {
  return (
    <div className="bg-void-dark border border-void-gray/30 rounded-lg overflow-hidden" aria-hidden="true">
      <SkeletonBox className="h-32 w-full rounded-none" />
      <div className="p-3 space-y-2">
        <SkeletonBox className="h-3 w-1/4" />
        <SkeletonBox className="h-4 w-3/4" />
      </div>
    </div>
  );
}

export function SkeletonForumPost() {
  return (
    <div className="bg-void-dark border border-void-gray/30 rounded-lg p-4 flex gap-4" aria-hidden="true">
      <div className="flex flex-col items-center gap-1">
        <SkeletonBox className="w-6 h-6 rounded" />
        <SkeletonBox className="w-8 h-3" />
        <SkeletonBox className="w-6 h-6 rounded" />
      </div>
      <div className="flex-1 space-y-2">
        <SkeletonBox className="h-4 w-3/4" />
        <SkeletonText lines={2} />
        <div className="flex gap-3">
          <SkeletonBox className="h-3 w-20" />
          <SkeletonBox className="h-3 w-16" />
          <SkeletonBox className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      <SkeletonBox className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBox key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

// Full page skeletons for common pages
export function AnimeListSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
      {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

export function ForumListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => <SkeletonForumPost key={i} />)}
    </div>
  );
}
