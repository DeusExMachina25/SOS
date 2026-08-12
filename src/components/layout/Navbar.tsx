"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import ModeToggle from "../ui/ModeToggle";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { path: "/", label: "Home", num: "001//" },
  { path: "/platter", label: "Platter", num: "002//" },
  { path: "/us", label: "Us", num: "003//" },
  // { path: "/blog", label: "Blog", num: "004//" },
  { path: "/login", label: "Login", num: "005//" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY <= 50) {
        setVisible(true);
      } else if (currentScrollY > lastScrollY) {
        // Scrolling down
        setVisible(false);
      } else {
        // Scrolling up
        setVisible(true);
      }
      
      setLastScrollY(currentScrollY);
      setScrolled(currentScrollY > 50);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <nav 
      className={`sos-nav ${scrolled ? 'py-3 scrolled' : 'py-5'}`}
      style={{
        transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), background 0.4s, padding 0.4s, opacity 0.4s ease",
        transform: visible ? "translateY(0)" : "translateY(-100%)",
        opacity: visible ? 1 : 0
      }}
    >
      <div className="flex items-center gap-2">
        <Link href="/" className="flex items-center">
          <Image 
            src="/SOS Logo.png" 
            alt="SOS Logo" 
            width={120} 
            height={40} 
            className="h-8 md:h-10 w-auto object-contain dark:invert-0 light:invert" 
            priority
          />
        </Link>
      </div>

      <div className="flex items-center gap-8">
        <div className="hidden md:flex items-center gap-6">
          {NAV_ITEMS.map((item) => (
            <Link 
              key={item.path} 
              href={item.path}
              className={`nav-link ${pathname === item.path ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        
        <div className="flex items-center gap-4">
          <ModeToggle />
        </div>
      </div>
    </nav>
  );
}
