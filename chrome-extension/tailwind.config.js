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
          'primary': '#86901F',
          'primary-dark': '#6B7319',
          'secondary': '#9EA64C',
          'accent': '#B0B76D',
          'success': '#22C55E',
          'warning': '#F59E0B',
          'danger': '#DC2626',
          'info': '#3B82F6',
        }
      }
    },
  },
  plugins: [],
}
