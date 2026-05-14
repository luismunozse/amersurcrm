"use client";

import { useMemo, useState } from "react";
import { Menu, X, ChevronDown, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface SeccionReporte {
  id: string;
  title: string;
  icon: LucideIcon;
}

export interface GrupoSecciones {
  id: string;
  title: string;
  secciones: SeccionReporte[];
}

interface SidebarSeccionesProps {
  /** Acepta array plano o array de grupos. */
  secciones: SeccionReporte[] | GrupoSecciones[];
  activeId: string;
  onChange: (id: string) => void;
}

function esGrupo(item: SeccionReporte | GrupoSecciones): item is GrupoSecciones {
  return Array.isArray((item as GrupoSecciones).secciones);
}

export default function SidebarSecciones({
  secciones,
  activeId,
  onChange,
}: SidebarSeccionesProps) {
  const grupos: GrupoSecciones[] = useMemo(() => {
    if (secciones.length === 0) return [];
    if (esGrupo(secciones[0])) return secciones as GrupoSecciones[];
    return [{ id: "__flat__", title: "", secciones: secciones as SeccionReporte[] }];
  }, [secciones]);

  const todasSecciones = useMemo(
    () => grupos.flatMap((g) => g.secciones),
    [grupos],
  );

  // Grupo activo se expande automáticamente; colapsados manualmente persisten.
  const grupoActivoId = useMemo(
    () => grupos.find((g) => g.secciones.some((s) => s.id === activeId))?.id,
    [grupos, activeId],
  );

  const [colapsados, setColapsados] = useState<Set<string>>(new Set());
  const [menuAbierto, setMenuAbierto] = useState(false);

  const toggleGrupo = (id: string) => {
    setColapsados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClick = (id: string) => {
    onChange(id);
    setMenuAbierto(false);
  };

  const activeItem = todasSecciones.find((s) => s.id === activeId);
  const mostrarHeaders = grupos.length > 1 || grupos[0]?.id !== "__flat__";

  return (
    <aside className="md:w-60 md:shrink-0 md:border-r md:border-crm-border">
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

      <nav
        className={`${menuAbierto ? "block" : "hidden md:block"} p-2 space-y-3`}
        data-pdf-ignore
      >
        {grupos.map((grupo) => {
          const isFlat = grupo.id === "__flat__";
          const colapsado = colapsados.has(grupo.id) && grupo.id !== grupoActivoId;
          return (
            <div key={grupo.id} className="space-y-1">
              {mostrarHeaders && !isFlat && (
                <button
                  onClick={() => toggleGrupo(grupo.id)}
                  className="w-full flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-crm-text-muted hover:text-crm-text-primary transition-colors"
                  aria-expanded={!colapsado}
                >
                  {colapsado ? (
                    <ChevronRight className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                  <span>{grupo.title}</span>
                </button>
              )}
              {!colapsado &&
                grupo.secciones.map((s) => {
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
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
