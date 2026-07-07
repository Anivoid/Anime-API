"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";

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
    <header className="bg-void-black/95 backdrop-blur-sm border-b border-void-red-dark/30 sticky top-0 z-50" role="banner">
      <nav className="container mx-auto px-4 py-3" aria-label="Main navigation">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-full border-2 border-void-red flex items-center justify-center bg-void-dark group-hover:glow-red transition-all duration-300 animate-glow-pulse">
              <span className="brush-text text-void-red text-lg">V</span>
            </div>
            <div className="hidden sm:block">
              <span className="brush-text text-xl text-white tracking-wider">
                ANIME<span className="text-void-red">VOID</span>
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/browse" className="text-gray-300 hover:text-void-red transition-colors font-medium" aria-current="page">
              Browse
            </Link>
            <Link href="/genres" className="text-gray-300 hover:text-void-red transition-colors font-medium">
              Genres
            </Link>
            <Link href="/schedule" className="text-gray-300 hover:text-void-red transition-colors font-medium">
              Schedule
            </Link>
            <Link href="/forum" className="text-gray-300 hover:text-void-red transition-colors font-medium">
              Forum
            </Link>

            {session ? (
              <>
                <Link href="/dashboard" className="text-gray-300 hover:text-void-red transition-colors font-medium">
                  Dashboard
                </Link>
                <Link href="/watchlist" className="text-gray-300 hover:text-void-red transition-colors font-medium">
                  Watchlist
                </Link>
                {isAdmin && (
                  <Link href="/admin" className="text-void-red hover:text-void-red-glow transition-colors font-medium">
                    Admin
                  </Link>
                )}
                <NotificationBell />
                <ThemeToggle />
                <button
                  onClick={() => signOut()}
                  className="bg-void-red/20 border border-void-red text-void-red px-4 py-2 rounded hover:bg-void-red hover:text-white transition-all duration-300"
                  aria-label="Sign out"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/auth/login" className="text-gray-300 hover:text-white transition-colors">
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  className="bg-void-red px-5 py-2 rounded font-semibold hover:bg-void-red-dark transition-all duration-300 glow-red"
                >
                  Sign Up
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
        className={`md:hidden fixed top-0 right-0 h-full w-72 bg-void-dark border-l border-void-red/20 z-50 transform transition-transform duration-300 ease-out ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* User Info */}
          <div className="p-6 border-b border-void-gray/30">
            {session ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-void-red flex items-center justify-center text-sm font-bold">
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
                <Link href="/auth/login" className="flex-1 text-center border border-void-gray px-4 py-2 rounded text-gray-300 hover:bg-void-gray/30 transition-all">
                  Login
                </Link>
                <Link href="/auth/register" className="flex-1 text-center bg-void-red px-4 py-2 rounded font-semibold hover:bg-void-red-dark transition-all">
                  Sign Up
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
                  className="block px-4 py-3 rounded-lg text-gray-300 hover:bg-void-red/10 hover:text-void-red transition-all duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {session && (
              <div className="mt-4 pt-4 border-t border-void-gray/30 space-y-1">
                {[
                  { href: "/dashboard", label: "Dashboard" },
                  { href: "/watchlist", label: "Watchlist" },
                  { href: "/profile", label: "Profile" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block px-4 py-3 rounded-lg text-gray-300 hover:bg-void-red/10 hover:text-void-red transition-all duration-200"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}

                {isAdmin && (
                  <Link
                    href="/admin"
                    className="block px-4 py-3 rounded-lg text-void-red hover:bg-void-red/10 transition-all duration-200 font-medium"
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
            <div className="p-4 border-t border-void-gray/30">
              <button
                onClick={() => { signOut(); setMobileMenuOpen(false); }}
                className="w-full px-4 py-3 rounded-lg border border-void-red text-void-red hover:bg-void-red hover:text-white transition-all duration-300 font-medium"
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
