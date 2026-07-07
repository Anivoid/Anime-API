export default function AnimeLoading() {
  return (
    <div className="min-h-screen bg-void-black text-white">
      <div className="bg-void-dark border-b border-void-gray/30 py-4">
        <div className="container mx-auto px-4">
          <div className="h-8 w-48 bg-void-gray rounded animate-pulse" />
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-48 h-72 bg-void-dark border border-void-gray/30 rounded-lg animate-pulse" />
          <div className="flex-1">
            <div className="h-10 w-64 bg-void-dark rounded animate-pulse mb-4" />
            <div className="h-4 w-32 bg-void-dark rounded animate-pulse mb-4" />
            <div className="flex gap-2 mb-6">
              <div className="h-6 w-16 bg-void-red/20 rounded animate-pulse" />
              <div className="h-6 w-20 bg-void-dark rounded animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-void-dark rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-void-dark rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
