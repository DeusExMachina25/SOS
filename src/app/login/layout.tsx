import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in | SOS",
  description: "Sign in to book, manage and join your SOS sessions.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
