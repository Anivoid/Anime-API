import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PWARegister } from "@/components/PWARegister";

const inter = Inter({ subsets: ["latin"], preload: false });

export const viewport: Viewport = {
  themeColor: "#8B0000",
};

export const metadata: Metadata = {
  title: "AnimeVoid - Beyond Imagination, Beyond Reality",
  description: "Watch your favorite anime series and movies in the void",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://s4.anilist.co" />
        <link rel="dns-prefetch" href="https://s4.anilist.co" />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <PWARegister />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
