"use client";

import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "@/components/layout/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Mesh background */}
      <div className="mesh-bg">
        <div className="mesh-blob" />
      </div>

      <Sidebar />
      <main className="relative z-10 ml-[240px] flex-1 px-8 py-6">{children}</main>
    </div>
  );
}
