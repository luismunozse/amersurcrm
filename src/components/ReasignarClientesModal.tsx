"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Users } from "lucide-react";
import { Spinner } from '@/components/ui/Spinner';

type Vendedor = {
  id: string;
  username: string;
  nombre_completo: string;
};

interface Props {
  open: boolean;
  userId: string;
  userName: string;
  clientesCount: number;
  vendedores: Vendedor[];
  onConfirm: (toUserId: string) => Promise<void>;
  onSkip: () => void;
  onClose: () => void;
}

export default function ReasignarClientesModal({
  open,
  userId,
  userName,
  clientesCount,
  vendedores,
  onConfirm,
  onSkip,
  onClose,
}: Props) {
  const [selectedVendedor, setSelectedVendedor] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedVendedor("");
      setIsLoading(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, isLoading]);

  if (!open) return null;

  const vendedoresDisponibles = vendedores.filter((v) => v.id !== userId);

  const handleConfirm = async () => {
    if (!selectedVendedor) return;
    setIsLoading(true);
    try {
      await onConfirm(selectedVendedor);
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      aria-modal="true"
      role="dialog"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" />

      <div className="relative z-10 w-full sm:max-w-md bg-crm-card border-t-2 sm:border-2 border-crm-border rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 pb-[max(env(safe-area-inset-bottom),1.25rem)] sm:pb-6 animate-in slide-in-from-bottom-4 sm:zoom-in-95 sm:slide-in-from-bottom-0 duration-200">
        <div className="sm:hidden flex justify-center -mt-1 mb-3">
          <span className="h-1 w-10 rounded-full bg-crm-border" aria-hidden />
        </div>
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Users className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-crm-text-primary mb-1">
              Reasignar Clientes
            </h2>
            <p className="text-sm text-crm-text-secondary">
              <span className="font-medium">{userName}</span> tiene{" "}
              <span className="font-bold text-amber-600">{clientesCount}</span> cliente(s)
              asignado(s).
            </p>
          </div>
        </div>

        <p className="text-sm text-crm-text-muted mb-4">
          Selecciona un vendedor para reasignar los clientes antes de continuar, o puedes omitir este paso.
        </p>

        {/* Selector de vendedor */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-crm-text-primary mb-2">
            Reasignar a:
          </label>
          <select
            value={selectedVendedor}
            onChange={(e) => setSelectedVendedor(e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
          >
            <option value="">Seleccionar vendedor...</option>
            {vendedoresDisponibles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nombre_completo} (@{v.username})
              </option>
            ))}
          </select>
          {vendedoresDisponibles.length === 0 && (
            <p className="text-xs text-red-500 mt-1">
              No hay otros vendedores activos disponibles.
            </p>
          )}
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-crm-text-primary bg-crm-card-hover border border-crm-border rounded-lg hover:bg-crm-border transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSkip}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-crm-text-muted border border-crm-border rounded-lg hover:bg-crm-card-hover transition-colors disabled:opacity-50"
          >
            Omitir
          </button>
          <button
            type="button"
            disabled={!selectedVendedor || isLoading}
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-lg shadow-amber-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Spinner size="sm" color="white" />
                Reasignando...
              </div>
            ) : (
              `Reasignar ${clientesCount} cliente(s)`
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
