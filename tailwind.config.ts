// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", "class"],
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
  	extend: {
  		colors: {
  			brand: {
  				'50': 'var(--brand-50)',
  				'300': 'var(--brand-300)',
  				'400': 'var(--brand-400)',
  				'500': 'var(--brand-500)',
  				'600': 'var(--brand-600)',
  				'700': 'var(--brand-700)'
  			},
  			slateBrand: {
  				'50': 'var(--slate-50)',
  				'400': 'var(--slate-400)',
  				'500': 'var(--slate-500)',
  				'600': 'var(--slate-600)'
  			},
  			neutral: {
  				'50': 'var(--neutral-50)',
  				'100': 'var(--neutral-100)',
  				'300': 'var(--neutral-300)',
  				'500': 'var(--neutral-500)',
  				'600': 'var(--neutral-600)',
  				'700': 'var(--neutral-700)',
  				'900': 'var(--neutral-900)'
  			},
  			success: 'var(--success)',
  			warning: 'var(--warning)',
  			danger: 'var(--danger)',
  			info: 'var(--info)',
  			bg: {
  				DEFAULT: 'var(--bg)',
  				muted: 'var(--bg-muted)',
  				card: 'var(--bg-card)'
  			},
  			text: {
  				DEFAULT: 'var(--text)',
  				muted: 'var(--text-muted)'
  			},
  			border: 'hsl(var(--border))',
  			crm: {
  				primary: 'var(--crm-primary)',
  				'primary-hover': 'var(--crm-primary-hover)',
  				secondary: 'var(--crm-secondary)',
  				accent: 'var(--crm-accent)',
  				success: 'var(--crm-success)',
  				warning: 'var(--crm-warning)',
  				danger: 'var(--crm-danger)',
  				info: 'var(--crm-info)',
  				sidebar: 'var(--crm-sidebar)',
  				'sidebar-hover': 'var(--crm-sidebar-hover)',
  				card: 'var(--crm-card)',
  				'card-hover': 'var(--crm-card-hover)',
  				border: 'var(--crm-border)',
  				'border-hover': 'var(--crm-border-hover)',
  				'text-primary': 'var(--crm-text-primary)',
  				'text-secondary': 'var(--crm-text-secondary)',
  				'text-muted': 'var(--crm-text-muted)',
  				'bg-primary': 'var(--crm-bg-primary)'
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			xl: '1rem',
  			'2xl': '1.25rem',
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		boxShadow: {
  			card: '0 8px 24px rgba(0,0,0,.08)',
  			crm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  			'crm-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  			'crm-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
  		},
  		fontFamily: {
  			sans: [
  				'var(--font-inter)',
  				'Inter',
  				'system-ui',
  				'sans-serif'
  			],
  			display: [
  				'var(--font-mont)',
  				'Montserrat',
  				'Inter',
  				'system-ui',
  				'sans-serif'
  			]
  		}
  	}
  },
  plugins: [
    require('@tailwindcss/typography'),
      require("tailwindcss-animate")
],
};

export default config;
