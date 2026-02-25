"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" />

      <div className="relative z-10 w-full max-w-md bg-crm-card border-2 border-crm-border rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
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
