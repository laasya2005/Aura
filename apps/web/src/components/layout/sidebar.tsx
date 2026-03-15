"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ScrollText,
  BarChart3,
  Calendar,
  Settings,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import { cn, formatEnum } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { AuraLogo } from "@/components/ui/aura-logo";

const AuraNavIcon = ({ className }: { className?: string }) => <AuraLogo className={className} />;

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/aura", label: "Aura", icon: AuraNavIcon },
  { href: "/schedules", label: "Schedules", icon: Calendar },
  { href: "/chat", label: "Activity", icon: ScrollText },
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
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[240px] flex-col border-r border-border/50 bg-card/60 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex h-16 items-center px-5 gap-2.5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-[10px] bg-foreground flex items-center justify-center text-background">
            <AuraLogo />
          </div>
          <span className="text-[17px] font-bold tracking-tight">Aura</span>
        </Link>
        {user?.plan && user.plan !== "FREE" && (
          <span className="ml-auto rounded-full bg-accent border border-border px-2 py-0.5 text-2xs font-medium text-muted-foreground">
            {formatEnum(user.plan)}
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[16px] transition-all duration-200",
                isActive
                  ? "bg-accent text-foreground font-medium shadow-sm"
                  : "text-muted-foreground hover:bg-accent/80 hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-[18px] w-[18px] flex-shrink-0 transition-colors",
                  isActive ? "text-foreground" : "group-hover:text-foreground"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-border/50 px-3 py-4">
        <div className="flex items-center justify-between rounded-[10px] px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-[16px] font-medium truncate">{user?.firstName ?? "User"}</p>
            <p className="text-[14px] text-muted-foreground">
              {formatEnum(user?.plan ?? "FREE")} plan
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={toggleTheme}
              className="rounded-[8px] p-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={handleLogout}
              className="rounded-[8px] p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
