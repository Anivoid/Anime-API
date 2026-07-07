import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-void-dark border-t border-void-gray/30 py-12 animate-fade-in-up" role="contentinfo">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full border border-void-red flex items-center justify-center">
                <span className="brush-text text-void-red text-sm">V</span>
              </div>
              <span className="brush-text text-lg text-white">
                ANIME<span className="text-void-red">VOID</span>
              </span>
            </div>
            <p className="text-gray-500 text-sm mb-4">Beyond Imagination, Beyond Reality.</p>
            <p className="text-gray-600 text-xs">虛無の先に物語がある</p>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-gray-300 text-sm uppercase tracking-wider">Browse</h4>
            <ul className="space-y-2 text-gray-500 text-sm">
              <li><Link href="/browse" className="hover:text-void-red transition-colors">All Anime</Link></li>
              <li><Link href="/genres" className="hover:text-void-red transition-colors">Genres</Link></li>
              <li><Link href="/schedule" className="hover:text-void-red transition-colors">Schedule</Link></li>
              <li><Link href="/collections" className="hover:text-void-red transition-colors">Collections</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-gray-300 text-sm uppercase tracking-wider">Community</h4>
            <ul className="space-y-2 text-gray-500 text-sm">
              <li><Link href="/forum" className="hover:text-void-red transition-colors">Forum</Link></li>
              <li><Link href="/dashboard" className="hover:text-void-red transition-colors">Dashboard</Link></li>
              <li><Link href="/watchlist" className="hover:text-void-red transition-colors">Watchlist</Link></li>
              <li><Link href="/notifications" className="hover:text-void-red transition-colors">Notifications</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-gray-300 text-sm uppercase tracking-wider">Account</h4>
            <ul className="space-y-2 text-gray-500 text-sm">
              <li><Link href="/auth/login" className="hover:text-void-red transition-colors">Login</Link></li>
              <li><Link href="/auth/register" className="hover:text-void-red transition-colors">Register</Link></li>
              <li><Link href="/profile" className="hover:text-void-red transition-colors">Profile</Link></li>
              <li><Link href="/notifications/preferences" className="hover:text-void-red transition-colors">Settings</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-gray-300 text-sm uppercase tracking-wider">Legal</h4>
            <ul className="space-y-2 text-gray-500 text-sm">
              <li><Link href="/terms" className="hover:text-void-red transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-void-red transition-colors">Privacy Policy</Link></li>
              <li><Link href="/dmca" className="hover:text-void-red transition-colors">DMCA</Link></li>
              <li><Link href="/contact" className="hover:text-void-red transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-void-gray/30 mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-600 text-sm">
            &copy; {new Date().getFullYear()} AnimeVoid. All rights reserved. Built with passion for anime.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-gray-600 hover:text-void-red transition-colors" aria-label="Twitter">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="#" className="text-gray-600 hover:text-void-red transition-colors" aria-label="Discord">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/></svg>
            </a>
            <a href="#" className="text-gray-600 hover:text-void-red transition-colors" aria-label="GitHub">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
