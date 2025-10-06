"use client";
import { useTheme } from "./ThemeProvider";
import { Sun, Moon } from "lucide-react";

interface Props {
  compact?: boolean;
}

export default function ThemeToggle({ compact = false }: Props) {
  const { theme, toggle } = useTheme();

  if (compact) {
    // Versión toggle compacto para el menú
    return (
      <button
        onClick={toggle}
        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-crm-primary focus:ring-offset-2 bg-crm-border hover:bg-crm-primary/20"
        aria-label="Cambiar tema"
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-crm-primary transition-transform ${
            theme === "dark" ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    );
  }

  // Versión original para el header
  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg text-crm-text-secondary hover:text-crm-text-primary hover:bg-crm-card-hover transition-colors"
      aria-label="Cambiar tema"
      title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      {theme === "dark" ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
}
