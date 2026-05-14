"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bookmark, BookmarkPlus, X, Star } from "lucide-react";
import { useSavedReportViews } from "./useSavedReportViews";

interface SavedViewsBarProps {
  /** Query string actual sin "?" (ej. "seccion=funnel&periodo=90"). */
  currentQuery: string;
  /** Etiqueta sugerida para el nombre al guardar (ej. nombre del tab activo). */
  defaultName?: string;
}

export default function SavedViewsBar({ currentQuery, defaultName = "" }: SavedViewsBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { views, ready, guardar, eliminar } = useSavedReportViews();
  const [mostrarInput, setMostrarInput] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");

  if (!ready) {
    // Placeholder mientras hidrata para evitar layout shift
    return <div className="h-10" />;
  }

  const yaGuardada = views.some((v) => v.query === currentQuery);

  const handleSave = () => {
    const nombre = nombreNuevo.trim() || defaultName.trim() || "Vista sin nombre";
    const result = guardar(nombre, currentQuery);
    if (result) {
      setNombreNuevo("");
      setMostrarInput(false);
    }
  };

  const handleNavegar = (query: string) => {
    router.replace(`${pathname}?${query}`, { scroll: false });
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4" data-pdf-ignore>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-crm-text-secondary uppercase tracking-wider shrink-0">
        <Bookmark className="w-3.5 h-3.5" />
        <span>Vistas guardadas</span>
      </div>

      <div className="flex flex-wrap gap-1.5 items-center flex-1">
        {views.length === 0 ? (
          <span className="text-xs text-crm-text-muted">
            Ninguna. Guarde combinaciones de filtros frecuentes.
          </span>
        ) : (
          views.map((v) => {
            const activa = v.query === currentQuery;
            return (
              <div
                key={v.id}
                className={
                  "inline-flex items-center gap-1 rounded-full text-xs transition-colors " +
                  (activa
                    ? "bg-crm-primary text-white"
                    : "bg-crm-card border border-crm-border text-crm-text-primary hover:bg-crm-card-hover")
                }
              >
                <button
                  onClick={() => handleNavegar(v.query)}
                  className="px-3 py-1 inline-flex items-center gap-1.5"
                  title={v.query}
                >
                  {activa && <Star className="w-3 h-3" />}
                  <span className="font-medium">{v.nombre}</span>
                </button>
                <button
                  onClick={() => eliminar(v.id)}
                  className={
                    "p-1 rounded-full transition-colors " +
                    (activa
                      ? "hover:bg-white/20"
                      : "hover:bg-crm-card-hover text-crm-text-muted hover:text-red-600")
                  }
                  aria-label={`Eliminar vista ${v.nombre}`}
                  title="Eliminar"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })
        )}

        {!mostrarInput && !yaGuardada && (
          <button
            onClick={() => {
              setMostrarInput(true);
              setNombreNuevo(defaultName);
            }}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-crm-primary/10 text-crm-primary text-xs font-medium hover:bg-crm-primary/20 transition-colors"
            title="Guardar combinación actual de filtros + sección"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            Guardar vista
          </button>
        )}

        {mostrarInput && (
          <div className="inline-flex items-center gap-1.5 bg-crm-card border border-crm-primary/40 rounded-full px-2 py-0.5">
            <input
              autoFocus
              value={nombreNuevo}
              onChange={(e) => setNombreNuevo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") {
                  setMostrarInput(false);
                  setNombreNuevo("");
                }
              }}
              placeholder="Nombre de la vista"
              maxLength={60}
              className="bg-transparent text-xs text-crm-text-primary outline-none placeholder:text-crm-text-muted w-40"
            />
            <button
              onClick={handleSave}
              className="text-xs font-medium text-crm-primary hover:underline px-1.5"
            >
              OK
            </button>
            <button
              onClick={() => {
                setMostrarInput(false);
                setNombreNuevo("");
              }}
              className="text-crm-text-muted hover:text-crm-text-primary"
              aria-label="Cancelar"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
