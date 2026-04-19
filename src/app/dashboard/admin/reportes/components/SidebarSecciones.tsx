"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface SeccionReporte {
  id: string;
  title: string;
  icon: LucideIcon;
}

interface SidebarSeccionesProps {
  secciones: SeccionReporte[];
  activeId: string;
  onChange: (id: string) => void;
}

export default function SidebarSecciones({
  secciones,
  activeId,
  onChange,
}: SidebarSeccionesProps) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const activeItem = secciones.find((s) => s.id === activeId);

  const handleClick = (id: string) => {
    onChange(id);
    setMenuAbierto(false);
  };

  return (
    <aside className="md:w-56 md:shrink-0 md:border-r md:border-crm-border">
      {/* Header móvil con toggle */}
      <div className="md:hidden flex items-center justify-between p-3 border-b border-crm-border">
        <button
          onClick={() => setMenuAbierto((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-crm-text-primary"
          aria-expanded={menuAbierto}
          aria-label="Abrir secciones"
        >
          {menuAbierto ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          <span>{activeItem?.title ?? "Secciones"}</span>
        </button>
      </div>

      {/* Nav vertical */}
      <nav
        className={`${menuAbierto ? "block" : "hidden md:block"} p-2 space-y-1`}
        data-pdf-ignore
      >
        {secciones.map((s) => {
          const Icon = s.icon;
          const isActive = s.id === activeId;
          return (
            <button
              key={s.id}
              onClick={() => handleClick(s.id)}
              className={
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left " +
                (isActive
                  ? "bg-crm-primary text-white"
                  : "text-crm-text-primary hover:bg-crm-card-hover")
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{s.title}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
