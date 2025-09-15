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
        
        // Colores específicos para CRM
        crm: {
          'primary': 'var(--crm-primary)',
          'primary-hover': 'var(--crm-primary-hover)',
          'secondary': 'var(--crm-secondary)',
          'accent': 'var(--crm-accent)',
          'success': 'var(--crm-success)',
          'warning': 'var(--crm-warning)',
          'danger': 'var(--crm-danger)',
          'info': 'var(--crm-info)',
          'sidebar': 'var(--crm-sidebar)',
          'sidebar-hover': 'var(--crm-sidebar-hover)',
          'card': 'var(--crm-card)',
          'card-hover': 'var(--crm-card-hover)',
          'border': 'var(--crm-border)',
          'border-hover': 'var(--crm-border-hover)',
          'text-primary': 'var(--crm-text-primary)',
          'text-secondary': 'var(--crm-text-secondary)',
          'text-muted': 'var(--crm-text-muted)',
          'bg-primary': 'var(--crm-bg-primary)',
        }
      },
      borderRadius: { xl: "1rem", "2xl": "1.25rem" },
      boxShadow: { 
        card: "0 8px 24px rgba(0,0,0,.08)",
        'crm': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'crm-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'crm-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-mont)", "Montserrat", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
