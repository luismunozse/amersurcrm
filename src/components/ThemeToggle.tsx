"use client";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="border rounded-xl px-3 py-1.5 text-sm hover:bg-neutral-50"
      aria-label="Cambiar tema"
      title="Cambiar tema"
    >
      {theme === "dark" ? "☀️ Claro" : "🌙 Oscuro"}
    </button>
  );
}
