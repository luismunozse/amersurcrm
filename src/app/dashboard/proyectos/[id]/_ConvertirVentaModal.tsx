"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import {
  convertirReservaAVenta,
  type ConvertirVentaInput,
} from "./_venta-actions";

type FormaPago = "contado" | "financiado" | "credito_bancario" | "mixto";

interface Props {
  open: boolean;
  onClose: () => void;
  loteId: string;
  loteCodigo: string;
  precioSugerido?: number | null;
  reservaId?: string;
  onSuccess?: () => void;
}

export default function ConvertirVentaModal({
  open,
  onClose,
  loteId,
  loteCodigo,
  precioSugerido,
  reservaId,
  onSuccess,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [formaPago, setFormaPago] = useState<FormaPago>("contado");
  const [precioTotal, setPrecioTotal] = useState<string>("");
  const [montoInicial, setMontoInicial] = useState<string>("");
  const [numeroCuotas, setNumeroCuotas] = useState<string>("");
  const [fechaEntrega, setFechaEntrega] = useState<string>("");
  const [comisionVendedor, setComisionVendedor] = useState<string>("");
  const [notas, setNotas] = useState<string>("");

  useEffect(() => {
    if (open) {
      setSubmitting(false);
      setFormaPago("contado");
      setPrecioTotal(precioSugerido ? String(precioSugerido) : "");
      setMontoInicial(precioSugerido ? String(precioSugerido) : "");
      setNumeroCuotas("");
      setFechaEntrega("");
      setComisionVendedor("");
      setNotas("");
    }
  }, [open, precioSugerido]);

  useEffect(() => {
    if (formaPago === "contado" && precioTotal) {
      setMontoInicial(precioTotal);
      setNumeroCuotas("");
    }
  }, [formaPago, precioTotal]);

  if (!open) return null;

  const precioTotalNum = parseFloat(precioTotal) || 0;
  const montoInicialNum = parseFloat(montoInicial) || 0;
  const saldoPendiente = Math.max(precioTotalNum - montoInicialNum, 0);
  const requiereCuotas = formaPago !== "contado";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (precioTotalNum <= 0) {
      toast.error("Precio total debe ser mayor a 0");
      return;
    }

    if (montoInicialNum < 0 || montoInicialNum > precioTotalNum) {
      toast.error("Monto inicial fuera de rango");
      return;
    }

    if (requiereCuotas && (!numeroCuotas || parseInt(numeroCuotas, 10) <= 0)) {
      toast.error("Número de cuotas requerido para venta financiada");
      return;
    }

    setSubmitting(true);
    try {
      const payload: ConvertirVentaInput = {
        loteId,
        reservaId,
        formaPago,
        precioTotal: precioTotalNum,
        montoInicial: montoInicialNum,
        numeroCuotas: requiereCuotas ? parseInt(numeroCuotas, 10) : null,
        fechaEntrega: fechaEntrega || null,
        comisionVendedor: comisionVendedor ? parseFloat(comisionVendedor) : null,
        notas: notas.trim() || null,
      };

      const res = await convertirReservaAVenta(payload);
      if (res.error || !res.data) {
        toast.error(res.error || "No se pudo convertir a venta");
        setSubmitting(false);
        return;
      }

      toast.success(`Venta ${res.data.codigo_venta} creada para lote ${res.data.codigo_lote}`);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error convirtiendo a venta");
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
      <div className="relative w-full md:max-w-lg bg-crm-card border-t md:border border-crm-border md:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-crm-border">
          <h2 className="text-lg font-semibold text-crm-text-primary">
            Convertir reserva en venta — Lote {loteCodigo}
          </h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-2 text-crm-text-muted hover:text-crm-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-crm-text-secondary mb-1">
              Forma de pago *
            </label>
            <select
              value={formaPago}
              onChange={(e) => setFormaPago(e.target.value as FormaPago)}
              disabled={submitting}
              className="w-full rounded-lg border border-crm-border bg-crm-card-hover px-3 py-2 text-sm"
            >
              <option value="contado">Contado</option>
              <option value="financiado">Financiado (cuotas directas)</option>
              <option value="credito_bancario">Crédito bancario</option>
              <option value="mixto">Mixto</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-crm-text-secondary mb-1">
                Precio total (S/) *
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={precioTotal}
                onChange={(e) => setPrecioTotal(e.target.value)}
                disabled={submitting}
                required
                className="w-full rounded-lg border border-crm-border bg-crm-card-hover px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-crm-text-secondary mb-1">
                Monto inicial (S/) *
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={montoInicial}
                onChange={(e) => setMontoInicial(e.target.value)}
                disabled={submitting || formaPago === "contado"}
                required
                className="w-full rounded-lg border border-crm-border bg-crm-card-hover px-3 py-2 text-sm"
              />
            </div>
          </div>

          {requiereCuotas && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-crm-text-secondary mb-1">
                  Número de cuotas *
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={numeroCuotas}
                  onChange={(e) => setNumeroCuotas(e.target.value)}
                  disabled={submitting}
                  required
                  className="w-full rounded-lg border border-crm-border bg-crm-card-hover px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-crm-text-secondary mb-1">
                  Saldo pendiente
                </label>
                <input
                  type="text"
                  value={`S/ ${saldoPendiente.toFixed(2)}`}
                  disabled
                  className="w-full rounded-lg border border-crm-border bg-crm-card-hover px-3 py-2 text-sm text-crm-text-muted"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-crm-text-secondary mb-1">
                Fecha de entrega
              </label>
              <input
                type="date"
                value={fechaEntrega}
                onChange={(e) => setFechaEntrega(e.target.value)}
                disabled={submitting}
                className="w-full rounded-lg border border-crm-border bg-crm-card-hover px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-crm-text-secondary mb-1">
                Comisión vendedor (S/)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={comisionVendedor}
                onChange={(e) => setComisionVendedor(e.target.value)}
                disabled={submitting}
                className="w-full rounded-lg border border-crm-border bg-crm-card-hover px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-crm-text-secondary mb-1">
              Notas
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              disabled={submitting}
              className="w-full rounded-lg border border-crm-border bg-crm-card-hover px-3 py-2 text-sm"
            />
          </div>
        </form>

        <div className="flex justify-end gap-2 border-t border-crm-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-crm-border px-4 py-2 text-sm text-crm-text-primary hover:bg-crm-card-hover"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit as unknown as () => void}
            disabled={submitting}
            className="flex items-center gap-2 rounded-lg bg-crm-primary px-4 py-2 text-sm font-semibold text-white hover:bg-crm-primary-hover disabled:opacity-50"
          >
            <CheckCircle className="h-4 w-4" />
            {submitting ? "Procesando..." : "Confirmar venta"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
