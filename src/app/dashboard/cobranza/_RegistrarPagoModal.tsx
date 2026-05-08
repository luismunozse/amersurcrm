"use client";

import { useState, useTransition } from "react";
import { CreditCard, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { registrarPagoCuota } from "../clientes/_actions-cuotas";
import { formatearMoneda, METODOS_PAGO } from "@/lib/types/crm-flujo";

interface CuotaContext {
  cuotaId: string;
  ventaId: string;
  clienteId: string;
  numeroCuota: number;
  estado: string;
  montoProgramado: number;
  montoPagado: number;
  montoMora: number;
  moneda: string;
}

interface Props {
  cuota: CuotaContext;
  onClose: () => void;
  onSuccess?: () => void;
}

const ESTADO_BADGE: Record<string, string> = {
  pendiente: "bg-gray-100 text-gray-700",
  pagada: "bg-green-100 text-green-700",
  vencida: "bg-red-100 text-red-700",
  en_mora: "bg-red-200 text-red-800",
  parcial: "bg-orange-100 text-orange-700",
};

export default function RegistrarPagoModal({ cuota, onClose, onSuccess }: Props) {
  const saldo = Math.max(0, cuota.montoProgramado - cuota.montoPagado + cuota.montoMora);
  const [monto, setMonto] = useState<string>(saldo.toFixed(2));
  const [metodoPago, setMetodoPago] = useState<string>("transferencia");
  const [banco, setBanco] = useState("");
  const [numeroOperacion, setNumeroOperacion] = useState("");
  const [notas, setNotas] = useState("");
  const [isPending, startTransition] = useTransition();

  const moneda = (cuota.moneda || "PEN") as "PEN" | "USD";
  const montoNum = Number(monto) || 0;
  const muestraBanco = ["transferencia", "deposito", "cheque"].includes(metodoPago);

  function handleSubmit() {
    if (montoNum <= 0) {
      toast.error("Ingrese un monto válido");
      return;
    }
    if (montoNum > saldo + 0.01) {
      toast.error(`El monto excede el saldo de la cuota (${formatearMoneda(saldo, moneda)})`);
      return;
    }

    startTransition(async () => {
      const result = await registrarPagoCuota({
        ventaId: cuota.ventaId,
        cuotaId: cuota.cuotaId,
        monto: montoNum,
        moneda,
        metodoPago,
        banco: banco || undefined,
        numeroOperacion: numeroOperacion || undefined,
        notas: notas || undefined,
        clienteId: cuota.clienteId,
      });

      if (result.success) {
        toast.success("Pago registrado");
        onSuccess?.();
        onClose();
      } else {
        toast.error(result.error || "Error al registrar pago");
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
            <CreditCard className="h-5 w-5 text-green-600" /> Registrar Pago
          </h4>
          <button onClick={onClose} className="text-crm-text-muted hover:text-crm-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-crm-background rounded-lg p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-crm-text-muted">Cuota #{cuota.numeroCuota}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[cuota.estado] ?? "bg-gray-100 text-gray-700"}`}>
              {cuota.estado}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-crm-text-muted">Programado:</span>
            <span className="font-medium">{formatearMoneda(cuota.montoProgramado, moneda)}</span>
          </div>
          {cuota.montoPagado > 0 && (
            <div className="flex justify-between">
              <span className="text-crm-text-muted">Pagado hasta hoy:</span>
              <span className="text-green-600">{formatearMoneda(cuota.montoPagado, moneda)}</span>
            </div>
          )}
          {cuota.montoMora > 0 && (
            <div className="flex justify-between">
              <span className="text-crm-text-muted">Mora:</span>
              <span className="text-red-600">{formatearMoneda(cuota.montoMora, moneda)}</span>
            </div>
          )}
          <div className="flex justify-between pt-1 border-t border-crm-border/50 font-semibold">
            <span>Saldo:</span>
            <span>{formatearMoneda(saldo, moneda)}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-1">Monto *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-1">Método de pago *</label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {METODOS_PAGO.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          {muestraBanco && (
            <>
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-1">Banco</label>
                <input
                  type="text"
                  value={banco}
                  onChange={(e) => setBanco(e.target.value)}
                  className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card text-crm-text-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-1">N° operación</label>
                <input
                  type="text"
                  value={numeroOperacion}
                  onChange={(e) => setNumeroOperacion(e.target.value)}
                  className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card text-crm-text-primary"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-1">Notas</label>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Opcional"
              className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card text-crm-text-primary"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            {isPending ? "Registrando…" : "Registrar Pago"}
          </button>
          <button
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2.5 border border-crm-border rounded-lg text-sm text-crm-text-muted hover:bg-crm-background disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
