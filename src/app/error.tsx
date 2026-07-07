"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-void-black text-white flex items-center justify-center">
      <div className="text-center px-4">
        <div className="relative mb-8">
          <h1 className="text-[120px] font-black text-red-500/20 leading-none">500</h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="brush-text text-6xl text-red-500 mb-2">ERROR</p>
              <p className="text-gray-500 text-sm">虛無の先に物語がある — something went wrong</p>
            </div>
          </div>
        </div>
        <p className="text-gray-400 mb-8 max-w-md mx-auto">
          An unexpected error has occurred. Our systems have been notified 
          and are working to fix the issue.
        </p>
        {error.digest && (
          <p className="text-gray-600 text-xs mb-6 font-mono">Error ID: {error.digest}</p>
        )}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="bg-void-red px-6 py-3 rounded-lg font-medium text-white hover:bg-void-red-dark transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="border border-void-gray px-6 py-3 rounded-lg font-medium text-gray-400 hover:text-white hover:border-void-red transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
