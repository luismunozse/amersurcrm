"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Users } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import type { EquipoDecision } from "@/app/dashboard/admin/usuarios/_actions";

type Coordinador = { id: string; username: string; nombre_completo: string };

interface EquipoDecisionModalProps {
  open: boolean;
  coordinadorNombre: string;
  equipoSize: number;
  coordinadoresDisponibles: Coordinador[];
  onConfirm: (decision: EquipoDecision) => Promise<void>;
  onClose: () => void;
}

/**
 * Mandatory decision step shown when deactivating/deleting a coordinador
 * who still has team members. Mirrors ReasignarClientesModal's layout, but
 * has NO "omitir" option: the lifecycle action cannot proceed without a
 * decision — the caller (page.tsx) already excludes the coordinador being
 * removed from `coordinadoresDisponibles`.
 */
export default function EquipoDecisionModal({
  open,
  coordinadorNombre,
  equipoSize,
  coordinadoresDisponibles,
  onConfirm,
  onClose,
}: EquipoDecisionModalProps) {
  const [opcion, setOpcion] = useState<"transferir" | "dejar">("transferir");
  const [transferirA, setTransferirA] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setOpcion("transferir");
      setTransferirA("");
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

  const puedeConfirmar = opcion === "dejar" || (opcion === "transferir" && transferirA !== "");

  const handleConfirm = async () => {
    if (!puedeConfirmar) return;
    setIsLoading(true);
    try {
      const decision: EquipoDecision =
        opcion === "transferir" ? { transferirA } : { dejarSinCoordinador: true };
      await onConfirm(decision);
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

        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Users className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-crm-text-primary mb-1">
              Equipo del coordinador
            </h2>
            <p className="text-sm text-crm-text-secondary">
              <span className="font-medium">{coordinadorNombre}</span> tiene{" "}
              <span className="font-bold text-amber-600">{equipoSize}</span> vendedor(es) a cargo.
              Debe indicar qué hacer con ellos antes de continuar.
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="equipo-decision"
              checked={opcion === "transferir"}
              onChange={() => setOpcion("transferir")}
              disabled={isLoading}
              className="mt-1"
            />
            <span className="text-sm text-crm-text-primary">Transferir el equipo a otro coordinador</span>
          </label>

          {opcion === "transferir" && (
            <select
              value={transferirA}
              onChange={(e) => setTransferirA(e.target.value)}
              disabled={isLoading}
              className="w-full ml-6 px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
            >
              <option value="">Seleccionar coordinador...</option>
              {coordinadoresDisponibles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre_completo} (@{c.username})
                </option>
              ))}
            </select>
          )}

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="equipo-decision"
              checked={opcion === "dejar"}
              onChange={() => setOpcion("dejar")}
              disabled={isLoading}
              className="mt-1"
            />
            <span className="text-sm text-crm-text-primary">Dejar a los vendedores sin coordinador</span>
          </label>

          {opcion === "dejar" && (
            <p className="ml-6 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-lg p-2">
              Los vendedores quedarán sin coordinador y solo serán visibles para administradores y gerentes.
            </p>
          )}
        </div>

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
            disabled={!puedeConfirmar || isLoading}
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-lg shadow-amber-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Spinner size="sm" color="white" />
                Confirmando...
              </div>
            ) : (
              "Confirmar"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
