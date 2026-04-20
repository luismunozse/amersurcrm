"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import type { EstadoCliente } from "@/lib/types/clientes";

const OPCIONES: { value: EstadoCliente; label: string; dot: string }[] = [
  { value: "por_contactar", label: "Por Contactar", dot: "bg-blue-500" },
  { value: "contactado", label: "Contactado", dot: "bg-yellow-500" },
  { value: "intermedio", label: "Intermedio", dot: "bg-cyan-500" },
  { value: "potencial", label: "Potencial", dot: "bg-purple-500" },
  { value: "en_proceso", label: "En Proceso", dot: "bg-indigo-500" },
  { value: "transferido", label: "Transferido", dot: "bg-green-500" },
  { value: "desestimado", label: "Desestimado", dot: "bg-gray-400" },
];

interface Props {
  estadoActual: EstadoCliente;
  onSeleccionar: (estado: EstadoCliente) => void;
  disabled?: boolean;
}

export default function CardMenu({ estadoActual, onSeleccionar, disabled }: Props) {
  const [abierto, setAbierto] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const onClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [abierto]);

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onPointerDownCapture={(e) => e.stopPropagation()}
      onMouseDownCapture={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setAbierto((v) => !v);
        }}
        disabled={disabled}
        aria-label="Acciones"
        aria-haspopup="menu"
        aria-expanded={abierto}
        className="p-1 rounded-md text-crm-text-muted hover:bg-crm-bg-elevated hover:text-crm-text-primary transition disabled:opacity-50"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {abierto ? (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-lg border border-crm-border bg-crm-card shadow-xl py-1"
        >
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-crm-text-muted">
            Mover a
          </div>
          {OPCIONES.filter((o) => o.value !== estadoActual).map((o) => (
            <button
              key={o.value}
              role="menuitem"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAbierto(false);
                onSeleccionar(o.value);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-crm-text-primary hover:bg-crm-bg-elevated text-left"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${o.dot}`} aria-hidden="true" />
              {o.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
