"use client";

import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import type { PropiedadResumen } from "@/types/propiedades-interes";

type Props = {
  isOpen: boolean;
  propiedad: PropiedadResumen | null;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function EliminarPropiedadInteresModal({
  isOpen,
  propiedad,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  if (!isOpen || !propiedad) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150"
      onClick={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onCancel();
        }
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 w-full sm:max-w-md bg-crm-card border-t sm:border border-crm-border rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 pb-[max(env(safe-area-inset-bottom),1.25rem)] sm:pb-6 animate-in slide-in-from-bottom-4 sm:zoom-in-95 sm:slide-in-from-bottom-0 duration-200">
        <div className="sm:hidden flex justify-center -mt-1 mb-3">
          <span className="h-1 w-10 rounded-full bg-crm-border" aria-hidden />
        </div>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-red-500/10 text-red-500">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-crm-text">Eliminar propiedad</h2>
            <p className="text-sm text-crm-text-muted">
              ¿Seguro que quieres quitar esta propiedad de la lista de deseos del cliente?
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-crm-border bg-crm-background p-4 text-sm">
          <p className="font-semibold text-crm-text">
            {propiedad.lote
              ? `Lote ${propiedad.lote.numero_lote || propiedad.lote.codigo || "s/c"}`
              : "Propiedad sin datos"}
          </p>
          {propiedad.lote?.proyecto?.nombre && (
            <p className="text-crm-text-muted">{propiedad.lote.proyecto.nombre}</p>
          )}
          {propiedad.notas && (
            <p className="text-crm-text-muted mt-2 border-t border-dashed border-crm-border pt-2">
              “{propiedad.notas}”
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg border border-crm-border px-4 py-2 text-sm font-medium text-crm-text hover:bg-crm-background disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-70"
          >
            {loading && <Spinner size="sm" />}
            Eliminar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
