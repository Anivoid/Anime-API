import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-void-black text-white flex items-center justify-center">
      <div className="text-center px-4">
        <div className="relative mb-8">
          <h1 className="text-[120px] font-black text-void-red/20 leading-none">404</h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="brush-text text-6xl text-void-red mb-2">VOID</p>
              <p className="text-gray-500 text-sm">物語の世界へようこそ — but this page doesn&apos;t exist</p>
            </div>
          </div>
        </div>
        <p className="text-gray-400 mb-8 max-w-md mx-auto">
          The page you&apos;re looking for has been lost in the void. 
          Perhaps it was moved, or maybe it never existed at all.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/"
            className="bg-void-red px-6 py-3 rounded-lg font-medium text-white hover:bg-void-red-dark transition-colors"
          >
            Return to Safety
          </Link>
          <Link
            href="/browse"
            className="border border-void-gray px-6 py-3 rounded-lg font-medium text-gray-400 hover:text-white hover:border-void-red transition-colors"
          >
            Browse Anime
          </Link>
        </div>
      </div>
    </div>
  );
}
