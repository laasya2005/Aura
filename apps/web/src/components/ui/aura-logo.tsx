import { cn } from "@/lib/utils";

interface AuraLogoProps {
  className?: string;
}

/**
 * Aura brand mark — a central orb with concentric rings radiating
 * outward, representing energy and presence. Uses currentColor so it
 * adapts to any foreground/background context.
 */
export function AuraLogo({ className }: AuraLogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-4 w-4", className)}
    >
      {/* Core orb */}
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
      {/* Inner aura ring */}
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
      {/* Outer aura ring */}
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
  );
}
