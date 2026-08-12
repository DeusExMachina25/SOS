import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SOS | Expert Consultation",
  description: "End-to-end strategy, planning, execution and consulting.",
};

import Navbar from "@/components/layout/Navbar";
import Preloader from "@/components/layout/Preloader";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Alfa+Slab+One&family=Anton&family=Bebas+Neue&family=Merriweather&family=Montserrat:wght@300;400;500;600;700;900&family=Oswald&family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Righteous&family=Special+Elite&display=swap" rel="stylesheet" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Courier+Prime&family=Bungee&family=Shrikhand&family=VT323&family=Creepster&family=Rampart+One&family=Monoton&family=Cinzel:wght@400;700&family=Syne:wght@700;800&family=Space+Mono:wght@400;700&family=Unbounded:wght@700;900&family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900&display=swap" rel="stylesheet" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=Megrim&family=Silkscreen:wght@400;700&family=Ewert&family=Bungee+Hairline&family=Teko:wght@400;700&family=Archivo+Black&family=Kanit:wght@400;700&family=Titan+One&family=Staatliches&family=Russo+One&family=Bangers&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-[100vh] flex flex-col relative">
        <Preloader />
        <Navbar />
        <main className="flex-1 mt-20 md:mt-24">
          {children}
        </main>
      </body>
    </html>
  );
}
