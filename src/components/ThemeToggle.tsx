"use client";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="border border-crm-border rounded-xl px-2 sm:px-3 py-1.5 text-sm hover:bg-crm-card-hover transition-colors"
      aria-label="Cambiar tema"
      title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      <span className="hidden sm:inline">
        {theme === "dark" ? "☀️ Claro" : "🌙 Oscuro"}
      </span>
      <span className="sm:hidden text-lg">
        {theme === "dark" ? "☀️" : "🌙"}
      </span>
    </button>
  );
}
