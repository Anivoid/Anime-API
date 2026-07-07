"use client";

import { Suspense, lazy, ComponentType, ReactNode } from "react";

function LoadingFallback() {
  return (
    <div className="animate-pulse bg-void-dark border border-void-gray/30 rounded-lg">
      <div className="h-48 bg-void-gray/20 rounded-t-lg" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-void-gray/20 rounded w-3/4" />
        <div className="h-3 bg-void-gray/10 rounded w-1/2" />
      </div>
    </div>
  );
}

export function lazyLoad(
  factory: () => Promise<{ default: ComponentType<any> }>,
  fallback?: ReactNode
) {
  const LazyComponent = lazy(factory);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function LazyWrapper(props: any) {
    return (
      <Suspense fallback={fallback || <LoadingFallback />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  }

  return LazyWrapper;
}
