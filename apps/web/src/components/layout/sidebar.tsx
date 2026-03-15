"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageCircle,
  Target,
  Sparkles,
  Calendar,
  Settings,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import { cn, formatEnum } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/aura", label: "Aura", icon: Sparkles },
  { href: "/schedules", label: "Schedules", icon: Calendar },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    document.cookie = "aura_logged_in=; path=/; max-age=0";
    await logout();
    window.location.href = "/login";
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[220px] flex-col border-r border-border/50 bg-card/60 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex h-14 items-center px-4 gap-2">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-foreground flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-background" />
          </div>
          <span className="text-base font-bold">Aura</span>
        </Link>
        {user?.plan && user.plan !== "FREE" && (
          <span className="ml-auto rounded-full bg-accent border border-border px-2 py-0.5 text-2xs font-medium text-muted-foreground">
            {formatEnum(user.plan)}
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-2 py-3">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-all duration-200",
                isActive
                  ? "bg-accent text-foreground font-medium border-l-2 border-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent/80 hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 flex-shrink-0 transition-colors",
                  isActive ? "text-foreground" : "group-hover:text-foreground"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-border/50 px-2 py-3">
        <div className="flex items-center justify-between rounded-xl px-3 py-2">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user?.firstName ?? "User"}</p>
            <p className="text-2xs text-muted-foreground">
              {formatEnum(user?.plan ?? "FREE")} plan
            </p>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={toggleTheme}
              className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? (
                <Sun className="h-3.5 w-3.5" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              onClick={handleLogout}
              className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
