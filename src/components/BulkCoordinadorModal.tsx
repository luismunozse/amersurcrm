"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

interface BulkCoordinadorModalProps {
  open: boolean;
  onClose: () => void;
  selectedCount: number;
  coordinadores: { id: string; username: string; nombre_completo: string }[];
  onConfirm: (coordinadorId: string | null) => Promise<void>;
}

export default function BulkCoordinadorModal({
  open,
  onClose,
  selectedCount,
  coordinadores,
  onConfirm,
}: BulkCoordinadorModalProps) {
  const [coordinadorId, setCoordinadorId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  if (!open) return null;

  const vendedorLabel = selectedCount === 1 ? "vendedor" : "vendedores";
  const coordinadorSeleccionado = coordinadores.find((c) => c.id === coordinadorId);
  const resumen = coordinadorId
    ? `Va a asignar a ${coordinadorSeleccionado?.nombre_completo || coordinadorSeleccionado?.username || "el coordinador seleccionado"} como coordinador de los ${vendedorLabel} seleccionados.`
    : `Va a quitar el coordinador asignado a los ${vendedorLabel} seleccionados.`;

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm(coordinadorId === "" ? null : coordinadorId);
      setCoordinadorId("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setCoordinadorId("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-in fade-in duration-150">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal — bottom sheet en mobile */}
      <div className="relative w-full sm:max-w-md sm:mx-4 bg-crm-card border-t sm:border border-crm-border rounded-t-xl sm:rounded-xl shadow-crm-lg max-h-[92vh] overflow-y-auto pb-[env(safe-area-inset-bottom)] sm:pb-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-crm-border">
          <h3 className="text-lg font-semibold text-crm-text-primary">Asignar coordinador</h3>
          <button onClick={handleClose} disabled={isLoading} aria-label="Cerrar" className="text-crm-text-muted hover:text-crm-text-primary disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-crm-text-secondary">
            {selectedCount} {vendedorLabel} seleccionado{selectedCount === 1 ? "" : "s"}.
          </p>

          <div>
            <label htmlFor="bulk-coordinador-select" className="block text-sm font-medium text-crm-text-primary mb-2">
              Coordinador
            </label>
            <select
              id="bulk-coordinador-select"
              value={coordinadorId}
              onChange={(e) => setCoordinadorId(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
            >
              <option value="">Sin coordinador asignado</option>
              {coordinadores.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre_completo || c.username}</option>
              ))}
            </select>
          </div>

          <p className="text-sm text-crm-text-secondary bg-crm-card-hover border border-crm-border rounded-lg p-3">
            {resumen}
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={handleClose} disabled={isLoading} className="px-4 py-2 text-crm-text-muted hover:text-crm-text-primary border border-crm-border rounded-lg transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="button" onClick={handleConfirm} disabled={isLoading} className="crm-button-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Spinner size="sm" color="white" />
                  Asignando...
                </div>
              ) : (
                "Confirmar"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
