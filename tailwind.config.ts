// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "var(--brand-50)",
          300: "var(--brand-300)",
          400: "var(--brand-400)",
          500: "var(--brand-500)",
          600: "var(--brand-600)",
          700: "var(--brand-700)",
        },
        slateBrand: {
          50:  "var(--slate-50)",
          400: "var(--slate-400)",
          500: "var(--slate-500)",
          600: "var(--slate-600)",
        },
        neutral: {
          50:  "var(--neutral-50)",
          100: "var(--neutral-100)",
          300: "var(--neutral-300)",
          500: "var(--neutral-500)",
          600: "var(--neutral-600)",
          700: "var(--neutral-700)",
          900: "var(--neutral-900)",
        },
        success: "var(--success)",
        warning: "var(--warning)",
        danger:  "var(--danger)",
        info:    "var(--info)",
        bg: { DEFAULT: "var(--bg)", muted: "var(--bg-muted)", card: "var(--bg-card)" },
        text:{ DEFAULT: "var(--text)", muted: "var(--text-muted)" },
        border: "var(--border)",
      },
      borderRadius: { xl: "1rem", "2xl": "1.25rem" },
      boxShadow: { card: "0 8px 24px rgba(0,0,0,.08)" },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-mont)", "Montserrat", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
