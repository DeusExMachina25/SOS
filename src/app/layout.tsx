import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "SOS | Expert Consultation",
  description: "End-to-end strategy, planning, execution and consulting.",
  openGraph: {
    title: "SOS | Expert Consultation",
    description: "End-to-end strategy, planning, execution and consulting.",
    type: "website",
  },
};

import Navbar from "@/components/layout/Navbar";
import Preloader from "@/components/layout/Preloader";
import SiteFooter from "@/components/layout/SiteFooter";
import ScrollMemory from "@/components/layout/ScrollMemory";

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
        {/* Before first paint: skip the intro for returning visitors and apply the saved theme (no dark-to-light flash). */}
        <script dangerouslySetInnerHTML={{ __html: "try{var d=document.documentElement;if(sessionStorage.getItem('sos_intro')==='1')d.classList.add('sos-seen');var t=localStorage.getItem('sos-theme')||localStorage.getItem('theme');if(t==='light'||t==='dark')d.setAttribute('data-theme',t)}catch(e){}" }} />
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
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[10001] focus:rounded-md focus:bg-[var(--text-primary)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--bg-base)]"
        >
          Skip to content
        </a>
        <ScrollMemory />
        <Preloader />
        <Navbar />
        <main id="main" className="flex-1 mt-20 md:mt-24">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
