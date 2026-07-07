export default function WatchLoading() {
  return (
    <div className="min-h-screen bg-void-black text-white">
      <div className="bg-void-dark border-b border-void-gray/30 py-4">
        <div className="container mx-auto px-4">
          <div className="h-8 w-48 bg-void-gray rounded animate-pulse" />
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">
        <div className="aspect-video bg-void-dark border border-void-gray/30 rounded-lg animate-pulse mb-6" />
        <div className="h-8 w-64 bg-void-dark rounded animate-pulse mb-2" />
        <div className="h-4 w-32 bg-void-dark rounded animate-pulse mb-6" />
        <div className="bg-void-dark border border-void-gray/30 rounded-lg p-6">
          <div className="h-6 w-24 bg-void-gray rounded animate-pulse mb-4" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-void-gray/50 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
