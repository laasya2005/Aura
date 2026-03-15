"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-md" onClick={onClose} />
      <div
        className={cn(
          "relative z-10 w-full max-w-[420px] rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl mx-4 animate-scale-in",
          className
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
