"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import SiteFooter from "./SiteFooter";

/**
 * Chooses the chrome for the current route.
 *
 * The dashboard carries its own sidebar and top bar, so the marketing navbar,
 * the footer and the `mt-20` offset that clears the navbar must not render
 * there — otherwise `/dashboard/*` shows two navigations stacked and a
 * marketing footer beneath the console.
 *
 * `children` arrives as a prop, so marking this file "use client" does not
 * pull the page tree into the client bundle.
 */
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith("/dashboard") ?? false;

  if (isDashboard) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main id="main" className="flex-1 mt-20 md:mt-24">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
