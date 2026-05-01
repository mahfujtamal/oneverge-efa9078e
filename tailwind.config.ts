import type { Config } from "tailwindcss";

export default {
  // Enables class-based dark mode support
  darkMode: ["class"],
  // Scans all files for Tailwind classes to include in the final bundle
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    // Standard Container setup for centered layouts
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // --- ONEVERGE BRAND TOKENS ---
        ov: {
          dark: "#03060b",
          primary: "#22d3ee", // Vibrant Cyan
          accent: "#e2136e", // Signature Magenta (Link3/bKash style)
          "accent-hover": "#d01165",
          card: "rgba(255, 255, 255, 0.03)",
          border: "rgba(255, 255, 255, 0.05)",
        },
        // --- SHADCN & UI COMPONENT COMPATIBILITY ---
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        // Signature "Suite" rounding for main cards
        "ov-suite": "2.5rem",
        // "Card" rounding for smaller inner elements
        "ov-card": "2rem",
        // Shadcn UI base radii
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // Custom animation for "Secure Node" pulse
        "ov-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "ov-pulse": "ov-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  // Essential for Shadcn UI animations
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
