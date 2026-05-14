"use client";

import { useState, useTransition } from "react";
import { BellOff, AlertTriangle, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { actualizarWhatsAppOptOut } from "@/app/dashboard/clientes/_actions";
import { useRouter } from "next/navigation";

interface Props {
  clienteId: string;
  optOut: boolean;
  fecha?: string | null;
  motivo?: string | null;
  puedeEditar: boolean;
}

const MOTIVOS_SUGERIDOS = [
  "Cliente pidió no recibir mensajes",
  "Número incorrecto",
  "Cliente respondió STOP",
  "Solicitud por privacidad",
];

export default function WhatsAppOptOutToggle({
  clienteId,
  optOut,
  fecha,
  motivo,
  puedeEditar,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [modal, setModal] = useState(false);
  const [motivoInput, setMotivoInput] = useState("");

  const activarOptOut = () => {
    startTransition(async () => {
      try {
        await actualizarWhatsAppOptOut(clienteId, true, motivoInput.trim() || undefined);
        toast.success("Opt-out activado. Este cliente no recibirá envíos.");
        setModal(false);
        setMotivoInput("");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  };

  const desactivarOptOut = () => {
    if (!confirm("¿Reactivar envíos de WhatsApp a este cliente?")) return;
    startTransition(async () => {
      try {
        await actualizarWhatsAppOptOut(clienteId, false);
        toast.success("Opt-out desactivado");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  };

  if (optOut) {
    return (
      <>
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg">
          <BellOff className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-red-900 dark:text-red-100">
              No recibe WhatsApp
            </p>
            {motivo && (
              <p className="text-xs text-red-800 dark:text-red-200 mt-0.5">
                Motivo: {motivo}
              </p>
            )}
            {fecha && (
              <p className="text-[11px] text-red-700/80 dark:text-red-300/80 mt-0.5">
                Desde: {new Date(fecha).toLocaleDateString("es-PE")}
              </p>
            )}
          </div>
          {puedeEditar && (
            <button
              type="button"
              onClick={desactivarOptOut}
              disabled={pending}
              className="text-xs text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 underline disabled:opacity-50 whitespace-nowrap"
            >
              {pending ? "..." : "Reactivar"}
            </button>
          )}
        </div>
      </>
    );
  }

  if (!puedeEditar) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setModal(true)}
        className="inline-flex items-center gap-1.5 text-[11px] text-crm-text-muted hover:text-red-600 underline-offset-2 hover:underline"
      >
        <BellOff className="w-3 h-3" />
        Marcar &quot;No enviar WhatsApp&quot;
      </button>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150">
          <div className="fixed inset-0 bg-black/50" onClick={() => setModal(false)} />
          <div className="relative bg-crm-card border-t sm:border border-crm-border rounded-t-xl sm:rounded-xl shadow-xl p-5 sm:p-6 w-full sm:max-w-md">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 bg-red-100 dark:bg-red-950 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-semibold text-crm-text-primary">
                  Activar Opt-out WhatsApp
                </h4>
                <p className="text-sm text-crm-text-secondary mt-1">
                  El cliente dejará de recibir envíos de plantillas y campañas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModal(false)}
                className="text-crm-text-muted hover:text-crm-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-medium text-crm-text-muted uppercase mb-1.5">
                  Motivo (opcional)
                </label>
                <input
                  type="text"
                  value={motivoInput}
                  onChange={(e) => setMotivoInput(e.target.value)}
                  placeholder="Ej: cliente pidió no recibir mensajes"
                  maxLength={200}
                  className="w-full px-3 py-2 bg-crm-bg-secondary border border-crm-border rounded-lg text-sm text-crm-text-primary"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {MOTIVOS_SUGERIDOS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMotivoInput(m)}
                    className="px-2 py-0.5 text-[11px] text-crm-text-secondary border border-crm-border rounded hover:bg-crm-card-hover"
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModal(false)}
                disabled={pending}
                className="px-4 py-2 text-sm text-crm-text-secondary border border-crm-border rounded-lg hover:bg-crm-card-hover disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={activarOptOut}
                disabled={pending}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {pending && <Loader2 className="w-4 h-4 animate-spin" />}
                Activar Opt-out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
