"use client";

import { Suspense } from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="mesh-bg">
        <div className="mesh-blob" />
      </div>
      <main className="relative z-10">
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center">
              <div className="h-8 w-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
            </div>
          }
        >
          {children}
        </Suspense>
      </main>
    </div>
  );
}
