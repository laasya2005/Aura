import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Converts enum values to readable labels
// e.g. DATA_PROCESSING → "Data processing", WEB → "Web"
export function formatEnum(value: string): string {
  const words = value.split("_");
  return words
    .map((w, i) =>
      i === 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()
    )
    .join(" ");
}
