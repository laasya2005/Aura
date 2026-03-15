import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        border: "var(--border)",
        ring: "var(--ring)",
      },
      fontFamily: {
        sans: [
          '"Inter"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "system-ui",
          "sans-serif",
        ],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "float-delayed": "float 6s ease-in-out infinite 3s",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        shimmer: "shimmer 2s infinite",
        "scale-in": "scale-in 0.3s ease-out",
        "bounce-subtle": "bounce-subtle 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
