"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { NotificationBell } from "./NotificationBell";

export default function Header() {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const userRole = (session?.user as { role?: string })?.role || "";
  const isAdmin = ["OWNER", "ADMIN", "MODERATOR", "UPLOADER"].includes(userRole);

  // Close on outside click
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [mobileMenuOpen]);

  // Body scroll lock
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  // Close on Escape
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [mobileMenuOpen]);

  return (
    <header className="bg-[#0a0a15]/95 backdrop-blur-sm border-b border-white/5 sticky top-0 z-50" role="banner">
      <nav className="container mx-auto px-4 py-3" aria-label="Main navigation">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
            <span className="text-xl font-bold text-white">
              ANIME<span className="text-purple-500">VOID</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-5">
            <Link href="/browse" className="text-gray-300 hover:text-purple-400 transition-colors text-sm font-medium">
              Browse
            </Link>
            <Link href="/genres" className="text-gray-300 hover:text-purple-400 transition-colors text-sm font-medium">
              Genres
            </Link>
            <Link href="/schedule" className="text-gray-300 hover:text-purple-400 transition-colors text-sm font-medium">
              Schedule
            </Link>
            <Link href="/forum" className="text-gray-300 hover:text-purple-400 transition-colors text-sm font-medium">
              Forum
            </Link>
          </div>

          {/* Search bar */}
          <div className="flex-1 max-w-md mx-4">
            <Link href="/browse" className="block">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search anime..."
                  readOnly
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-gray-300 placeholder-gray-500 focus:outline-none cursor-pointer hover:border-purple-500/50 transition-colors"
                />
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </Link>
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {session ? (
              <>
                <Link href="/dashboard" className="text-gray-300 hover:text-purple-400 transition-colors text-sm">
                  Dashboard
                </Link>
                <Link href="/watchlist" className="text-gray-300 hover:text-purple-400 transition-colors text-sm">
                  Watchlist
                </Link>
                {isAdmin && (
                  <Link href="/admin" className="text-purple-400 hover:text-purple-300 transition-colors text-sm font-medium">
                    Admin
                  </Link>
                )}
                <NotificationBell />
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold cursor-pointer">
                  {session.user?.name?.charAt(0) || "U"}
                </div>
                <button
                  onClick={() => signOut()}
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                  aria-label="Sign out"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/auth/login" className="text-gray-300 hover:text-white transition-colors text-sm">
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  className="bg-purple-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors text-white"
                >
                  Sign in
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-white p-2 relative z-50"
            aria-label="Toggle menu"
          >
            <div className="w-6 h-5 relative flex flex-col justify-between">
              <span className={`w-full h-0.5 bg-white transition-all duration-300 origin-left ${mobileMenuOpen ? "rotate-45 translate-x-px" : ""}`} />
              <span className={`w-full h-0.5 bg-white transition-all duration-300 ${mobileMenuOpen ? "opacity-0 scale-x-0" : ""}`} />
              <span className={`w-full h-0.5 bg-white transition-all duration-300 origin-left ${mobileMenuOpen ? "-rotate-45 translate-x-px" : ""}`} />
            </div>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Backdrop */}
      <div
        className={`md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile Menu Panel */}
      <div
        ref={menuRef}
        className={`md:hidden fixed top-0 right-0 h-full w-72 bg-[#0a0a15] border-l border-white/10 z-50 transform transition-transform duration-300 ease-out ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* User Info */}
          <div className="p-6 border-b border-white/5">
            {session ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold">
                  {session.user?.name?.charAt(0) || "U"}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate">{session.user?.name || "User"}</p>
                  <p className="text-xs text-gray-500 truncate">{session.user?.email}</p>
                  {isAdmin && (
                    <span className={`text-xs font-medium ${
                      userRole === "OWNER" ? "text-red-400" :
                      userRole === "ADMIN" ? "text-purple-400" :
                      userRole === "MODERATOR" ? "text-blue-400" :
                      "text-green-400"
                    }`}>
                      {userRole}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <Link href="/auth/login" className="flex-1 text-center border border-white/10 px-4 py-2 rounded text-gray-300 hover:bg-white/5 transition-all">
                  Login
                </Link>
                <Link href="/auth/register" className="flex-1 text-center bg-purple-600 px-4 py-2 rounded font-semibold hover:bg-purple-700 transition-all text-white">
                  Sign in
                </Link>
              </div>
            )}
          </div>

          {/* Nav Links */}
          <nav className="flex-1 p-4 overflow-y-auto" aria-label="Mobile navigation">
            <div className="space-y-1">
              {[
                { href: "/browse", label: "Browse" },
                { href: "/genres", label: "Genres" },
                { href: "/schedule", label: "Schedule" },
                { href: "/forum", label: "Forum" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-4 py-3 rounded-lg text-gray-300 hover:bg-purple-600/10 hover:text-purple-400 transition-all duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {session && (
              <div className="mt-4 pt-4 border-t border-white/5 space-y-1">
                {[
                  { href: "/dashboard", label: "Dashboard" },
                  { href: "/watchlist", label: "Watchlist" },
                  { href: "/profile", label: "Profile" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block px-4 py-3 rounded-lg text-gray-300 hover:bg-purple-600/10 hover:text-purple-400 transition-all duration-200"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}

                {isAdmin && (
                  <Link
                    href="/admin"
                    className="block px-4 py-3 rounded-lg text-purple-400 hover:bg-purple-600/10 transition-all duration-200 font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Admin Panel
                  </Link>
                )}
              </div>
            )}
          </nav>

          {/* Sign Out */}
          {session && (
            <div className="p-4 border-t border-white/5">
              <button
                onClick={() => { signOut(); setMobileMenuOpen(false); }}
                className="w-full px-4 py-3 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 hover:text-white transition-all duration-300 font-medium"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
