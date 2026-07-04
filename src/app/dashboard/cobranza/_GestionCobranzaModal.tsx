"use client";

import { useState, useTransition } from "react";
import { PhoneCall, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  registrarGestionCobranza,
  type MedioGestionCobranza,
  type ResultadoGestionCobranza,
} from "./_actions-cobranza";
import { limaToday } from "@/lib/cobranza/tiers";

interface Props {
  alertaId: string;
  cuotaId: string;
  clienteId: string;
  clienteNombre: string;
  numeroCuota: number;
  onClose: () => void;
  onSuccess?: () => void;
}

const MEDIOS: { value: MedioGestionCobranza; label: string }[] = [
  { value: "llamada", label: "Llamada" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "visita", label: "Visita" },
  { value: "mensaje", label: "Mensaje" },
];

const RESULTADOS: { value: ResultadoGestionCobranza; label: string }[] = [
  { value: "contactado", label: "Contactado" },
  { value: "no_contactado", label: "No contactado" },
  { value: "promesa_pago", label: "Promesa de pago" },
  { value: "pago_parcial", label: "Pago parcial" },
  { value: "renegociacion", label: "Renegociación" },
  { value: "ilocalizable", label: "Ilocalizable" },
];

export default function GestionCobranzaModal({
  alertaId,
  cuotaId,
  clienteId,
  clienteNombre,
  numeroCuota,
  onClose,
  onSuccess,
}: Props) {
  const [medio, setMedio] = useState<MedioGestionCobranza>("llamada");
  const [resultado, setResultado] = useState<ResultadoGestionCobranza>("contactado");
  const [notas, setNotas] = useState("");
  const [fechaGestion, setFechaGestion] = useState(() => limaToday());
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      const result = await registrarGestionCobranza({
        alertaId,
        cuotaId,
        clienteId,
        medio,
        resultado,
        notas: notas.trim() || undefined,
        fechaGestion,
      });

      if (result.success) {
        toast.success("Gestión registrada");
        onSuccess?.();
        onClose();
      } else {
        toast.error(result.error || "Error al registrar la gestión");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-crm-card rounded-t-xl sm:rounded-xl shadow-2xl w-full sm:max-w-md p-5 sm:p-6 space-y-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] sm:pb-6 max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center -mt-1">
          <span className="h-1 w-10 rounded-full bg-crm-border" aria-hidden />
        </div>
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-crm-text-primary flex items-center gap-2">
            <PhoneCall className="h-5 w-5 text-crm-primary" /> Registrar Gestión
          </h4>
          <button
            onClick={onClose}
            className="text-crm-text-muted hover:text-crm-text-primary transition-transform duration-150 ease-out-strong active:scale-[0.9]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-crm-background rounded-lg p-3 text-sm">
          <p className="text-crm-text-muted">
            Cliente: <span className="font-medium text-crm-text-primary">{clienteNombre}</span>
          </p>
          <p className="text-crm-text-muted">Cuota #{numeroCuota}</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-1">Fecha de gestión *</label>
            <input
              type="date"
              value={fechaGestion}
              max={limaToday()}
              onChange={(e) => setFechaGestion(e.target.value)}
              className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-1">Medio *</label>
            <select
              value={medio}
              onChange={(e) => setMedio(e.target.value as MedioGestionCobranza)}
              className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
            >
              {MEDIOS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-1">Resultado *</label>
            <select
              value={resultado}
              onChange={(e) => setResultado(e.target.value as ResultadoGestionCobranza)}
              className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
            >
              {RESULTADOS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-1">Notas</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Opcional"
              rows={3}
              className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card text-crm-text-primary resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 bg-crm-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-[opacity,transform] duration-200 ease-out-strong active:scale-[0.97] disabled:active:scale-100"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneCall className="h-4 w-4" />}
            {isPending ? "Registrando…" : "Registrar Gestión"}
          </button>
          <button
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2.5 border border-crm-border rounded-lg text-sm text-crm-text-muted hover:bg-crm-background disabled:opacity-50 transition-[background-color,transform] duration-200 ease-out-strong active:scale-[0.97] disabled:active:scale-100"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
