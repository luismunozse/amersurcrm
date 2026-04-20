"use client";

import { useState, useTransition } from "react";
import { ShieldAlert, CalendarPlus, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  anularSeparacion,
  extenderVencimientoSeparacion,
} from "./_actions-separacion";

interface Props {
  reservaId: string;
  reservaCodigo: string;
  fechaVencimiento: string;
}

export default function AdminSeparacionActions({
  reservaId,
  reservaCodigo,
  fechaVencimiento,
}: Props) {
  const [openAction, setOpenAction] = useState<null | "anular" | "extender">(null);
  const [motivo, setMotivo] = useState("");
  const [nuevaFecha, setNuevaFecha] = useState(
    new Date(new Date(fechaVencimiento).getTime() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
  );
  const [isPending, startTransition] = useTransition();

  function handleAnular() {
    if (!motivo.trim()) {
      toast.error("Ingresá un motivo");
      return;
    }
    startTransition(async () => {
      const res = await anularSeparacion(reservaId, motivo.trim());
      if (!res.success) {
        toast.error(res.error ?? "Error anulando");
        return;
      }
      toast.success(`Separación ${reservaCodigo} anulada`);
      setOpenAction(null);
      setMotivo("");
    });
  }

  function handleExtender() {
    if (!nuevaFecha) {
      toast.error("Seleccioná una fecha");
      return;
    }
    startTransition(async () => {
      const iso = new Date(nuevaFecha).toISOString();
      const res = await extenderVencimientoSeparacion(reservaId, iso);
      if (!res.success) {
        toast.error(res.error ?? "Error extendiendo");
        return;
      }
      toast.success("Vencimiento extendido");
      setOpenAction(null);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpenAction("extender")}
        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
        title="Extender vencimiento (admin)"
      >
        <CalendarPlus className="h-4 w-4" />
      </button>
      <button
        onClick={() => setOpenAction("anular")}
        className="p-1.5 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded transition-colors"
        title="Anular separación (admin)"
      >
        <ShieldAlert className="h-4 w-4" />
      </button>

      {openAction && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => !isPending && setOpenAction(null)}
        >
          <div
            className="bg-crm-card rounded-xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-crm-border">
              <h3 className="font-semibold text-crm-text-primary">
                {openAction === "anular" ? "Anular separación" : "Extender vencimiento"}
              </h3>
              <button
                onClick={() => !isPending && setOpenAction(null)}
                className="text-crm-text-muted hover:text-crm-text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-crm-text-muted">
                Separación <span className="font-mono font-semibold">{reservaCodigo}</span>
              </p>

              {openAction === "anular" ? (
                <>
                  <label className="block text-sm font-medium text-crm-text-primary">
                    Motivo de anulación
                  </label>
                  <textarea
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    rows={3}
                    required
                    className="w-full border border-crm-border rounded-lg px-3 py-2 bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Ej: cliente se arrepintió, cayó el crédito bancario, etc."
                  />
                  <p className="text-xs text-crm-text-muted">
                    Esto cancela la reserva, libera el lote, cancela el proceso de adquisición y
                    revierte al cliente al estado <strong>potencial</strong>.
                  </p>
                </>
              ) : (
                <>
                  <label className="block text-sm font-medium text-crm-text-primary">
                    Nueva fecha de vencimiento
                  </label>
                  <input
                    type="date"
                    value={nuevaFecha}
                    onChange={(e) => setNuevaFecha(e.target.value)}
                    required
                    className="w-full border border-crm-border rounded-lg px-3 py-2 bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-crm-border">
              <button
                onClick={() => !isPending && setOpenAction(null)}
                className="px-3 py-2 text-sm text-crm-text-secondary hover:text-crm-text-primary"
              >
                Cancelar
              </button>
              <button
                onClick={openAction === "anular" ? handleAnular : handleExtender}
                disabled={isPending}
                className={`px-3 py-2 text-white rounded-lg text-sm disabled:opacity-50 flex items-center gap-2 ${
                  openAction === "anular"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {openAction === "anular" ? "Anular separación" : "Extender"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
