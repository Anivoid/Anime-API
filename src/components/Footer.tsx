import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-[#0a0a15] border-t border-white/5 py-10" role="contentinfo">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl font-bold text-white">
                ANIME<span className="text-purple-500">VOID</span>
              </span>
            </div>
            <p className="text-gray-500 text-sm">Stream thousands of anime series and movies.</p>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-gray-300 text-sm">Browse</h4>
            <ul className="space-y-1.5 text-gray-500 text-sm">
              <li><Link href="/browse" className="hover:text-purple-400 transition-colors">All Anime</Link></li>
              <li><Link href="/browse?letter=All" className="hover:text-purple-400 transition-colors">A-Z List</Link></li>
              <li><Link href="/genres" className="hover:text-purple-400 transition-colors">Genres</Link></li>
              <li><Link href="/schedule" className="hover:text-purple-400 transition-colors">Schedule</Link></li>
              <li><Link href="/collections" className="hover:text-purple-400 transition-colors">Collections</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-gray-300 text-sm">Community</h4>
            <ul className="space-y-1.5 text-gray-500 text-sm">
              <li><Link href="/forum" className="hover:text-purple-400 transition-colors">Forum</Link></li>
              <li><Link href="/dashboard" className="hover:text-purple-400 transition-colors">Dashboard</Link></li>
              <li><Link href="/watchlist" className="hover:text-purple-400 transition-colors">Watchlist</Link></li>
              <li><Link href="/notifications" className="hover:text-purple-400 transition-colors">Notifications</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-gray-300 text-sm">Account</h4>
            <ul className="space-y-1.5 text-gray-500 text-sm">
              <li><Link href="/auth/login" className="hover:text-purple-400 transition-colors">Login</Link></li>
              <li><Link href="/auth/register" className="hover:text-purple-400 transition-colors">Register</Link></li>
              <li><Link href="/profile" className="hover:text-purple-400 transition-colors">Profile</Link></li>
              <li><Link href="/notifications/preferences" className="hover:text-purple-400 transition-colors">Settings</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-gray-300 text-sm">Legal</h4>
            <ul className="space-y-1.5 text-gray-500 text-sm">
              <li><Link href="/terms" className="hover:text-purple-400 transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-purple-400 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/dmca" className="hover:text-purple-400 transition-colors">DMCA</Link></li>
              <li><Link href="/contact" className="hover:text-purple-400 transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-600 text-sm">
            &copy; {new Date().getFullYear()} AnimeVoid. All rights reserved.
          </p>
          <p className="text-gray-600 text-xs">
            This site does not store any files on its server. All contents are provided by non-affiliated third parties.
          </p>
        </div>
      </div>
    </footer>
  );
}
