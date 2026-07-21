"use client";

import { X } from "lucide-react";

interface SeleccionadoVendedor {
  id: string;
  nombre: string;
}

interface SelectedVendedoresBarProps {
  seleccionados: SeleccionadoVendedor[];
  onQuitar: (id: string) => void;
  onLimpiar: () => void;
  onAsignar: () => void;
}

const MAX_CHIPS_VISIBLES = 8;

export default function SelectedVendedoresBar({
  seleccionados,
  onQuitar,
  onLimpiar,
  onAsignar,
}: SelectedVendedoresBarProps) {
  if (seleccionados.length === 0) return null;

  const visibles = seleccionados.slice(0, MAX_CHIPS_VISIBLES);
  const restantes = seleccionados.length - visibles.length;
  const vendedorLabel = seleccionados.length === 1 ? "vendedor" : "vendedores";

  return (
    <div className="crm-card p-4 mb-4 bg-crm-card-hover border border-crm-border flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {visibles.map((v) => (
          <span
            key={v.id}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-crm-card border border-crm-border rounded-full text-crm-text-primary"
          >
            {v.nombre}
            <button
              type="button"
              onClick={() => onQuitar(v.id)}
              aria-label={`Quitar a ${v.nombre}`}
              className="text-crm-text-muted hover:text-crm-primary transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {restantes > 0 && (
          <span className="px-2.5 py-1 text-xs font-medium text-crm-text-muted">
            +{restantes} más
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-crm-text-primary">
            {seleccionados.length} {vendedorLabel} seleccionado{seleccionados.length === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            onClick={onLimpiar}
            className="text-sm text-crm-text-muted hover:text-crm-primary transition-colors underline"
          >
            Limpiar selección
          </button>
        </div>
        <button
          type="button"
          onClick={onAsignar}
          className="crm-button-primary px-4 py-2 rounded-lg text-sm font-medium"
        >
          Asignar coordinador
        </button>
      </div>
    </div>
  );
}
