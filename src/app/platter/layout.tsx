import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Platter | SOS",
  description: "Meet the vetted experts, see each one's flat session rate, and book a single honest second opinion.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
