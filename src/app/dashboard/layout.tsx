"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  CalendarDays, 
  FolderLock, 
  MessageSquare, 
  Video, 
  LogOut 
} from "lucide-react";
import ModeToggle from "@/components/ui/ModeToggle";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Determine base path for the role (mocking based on URL for now)
  const role = pathname.includes("/expert") ? "expert" : pathname.includes("/admin") ? "admin" : "client";
  const basePath = `/dashboard/${role}`;

  const navItems = [
    { name: "Overview", icon: LayoutDashboard, path: `${basePath}` },
    { name: "Sessions Tracker", icon: CalendarDays, path: `${basePath}#sessions` },
    { name: "Vault", icon: FolderLock, path: `${basePath}#vault` },
    { name: "Messages", icon: MessageSquare, path: `${basePath}#chat` },
    { name: "Video Call", icon: Video, path: `/dashboard/video-call` },
  ];

  return (
    <div className="dash-layout">
      {/* Sidebar */}
      <aside className="dash-sidebar flex flex-col hidden md:flex">
        <div className="mb-10 px-4">
          <Link href="/" className="font-mono-sos text-xl font-bold text-[var(--color-primary)] tracking-widest">
            SOS Dashboard
          </Link>
          <div className="text-xs text-[var(--text-faint)] mt-1 uppercase tracking-widest">{role} Access</div>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <Link 
              key={item.name} 
              href={item.path}
              className={`dash-nav-item ${pathname === item.path ? "active" : ""}`}
            >
              <item.icon size={18} />
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t border-[var(--border)] pt-4 px-4 flex justify-between items-center">
          <Link href="/login" className="flex items-center gap-2 text-sm text-[var(--color-pink)] hover:opacity-80 transition-opacity">
            <LogOut size={16} />
            Sign Out
          </Link>
          <ModeToggle />
        </div>
      </aside>

      {/* Main Content */}
      <main className="dash-main">
        {children}
      </main>
    </div>
  );
}
