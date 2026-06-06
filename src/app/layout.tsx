import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SOS | Expert Consultation",
  description: "End-to-end strategy, planning, execution and consulting.",
};

import Navbar from "@/components/layout/Navbar";
import Preloader from "@/components/layout/Preloader";
import CustomCursor from "@/components/layout/CustomCursor";

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
      <body className="min-h-[100vh] flex flex-col relative">
        <Preloader />
        <CustomCursor />
        <Navbar />
        <main className="flex-1 mt-20 md:mt-24">
          {children}
        </main>
      </body>
    </html>
  );
}
