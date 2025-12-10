/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        'crm': {
          'primary': 'var(--crm-primary)',
          'primary-hover': 'var(--crm-primary-hover)',
          'primary-dark': 'var(--crm-primary-hover)', // Alias para compatibilidad
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
      }
    },
  },
  plugins: [],
}
