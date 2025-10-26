"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { convertirReservaEnVenta } from "@/app/dashboard/clientes/_actions_crm";
import { MONEDAS, FORMAS_PAGO, type Moneda, type FormaPago } from "@/lib/types/crm-flujo";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reserva: {
    id: string;
    codigo_reserva: string;
    monto_reserva: number;
    moneda: Moneda;
  };
  clienteNombre: string;
  loteNombre?: string;
}

export default function ConvertirReservaVentaModal({
  isOpen,
  onClose,
  reserva,
  clienteNombre,
  loteNombre,
}: Props) {
  const [isPending, startTransition] = useTransition();

  // Form state
  const [precioTotal, setPrecioTotal] = useState("");
  const [moneda, setMoneda] = useState<Moneda>(reserva.moneda);
  const [formaPago, setFormaPago] = useState<FormaPago>("contado");
  const [montoInicial, setMontoInicial] = useState(reserva.monto_reserva.toString());
  const [numeroCuotas, setNumeroCuotas] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [comisionVendedor, setComisionVendedor] = useState("");
  const [notas, setNotas] = useState("");

  const calcularSaldoPendiente = () => {
    const precio = parseFloat(precioTotal) || 0;
    const inicial = parseFloat(montoInicial) || 0;
    return precio - inicial;
  };

  const calcularMontoCuota = () => {
    const saldo = calcularSaldoPendiente();
    const cuotas = parseInt(numeroCuotas) || 1;
    return saldo / cuotas;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!precioTotal || parseFloat(precioTotal) <= 0) {
      toast.error("Ingrese un precio total válido");
      return;
    }

    const precio = parseFloat(precioTotal);
    const inicial = parseFloat(montoInicial) || 0;

    if (inicial > precio) {
      toast.error("El monto inicial no puede ser mayor al precio total");
      return;
    }

    startTransition(async () => {
      const result = await convertirReservaEnVenta({
        reservaId: reserva.id,
        precioTotal: precio,
        moneda: moneda === 'PEN' || moneda === 'USD' ? moneda : undefined,
        formaPago,
        montoInicial: inicial || undefined,
        numeroCuotas: numeroCuotas ? parseInt(numeroCuotas) : undefined,
        fechaEntrega: fechaEntrega || undefined,
        comisionVendedor: comisionVendedor ? parseFloat(comisionVendedor) : undefined,
        notas: notas || undefined,
      });

      if (result.success) {
        toast.success(`Venta ${result.data?.codigo_venta} creada exitosamente`);
        onClose();
      } else {
        toast.error(result.error || "Error al convertir reserva en venta");
      }
    });
  };

  if (!isOpen) return null;

  const simboloMoneda = MONEDAS.find(m => m.value === moneda)?.symbol || "";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl bg-crm-card border-2 border-crm-border rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-crm-text-primary">
              Convertir Reserva en Venta
            </h2>
            <p className="text-sm text-crm-text-secondary mt-1">
              Reserva: {reserva.codigo_reserva}
            </p>
            <p className="text-sm text-crm-text-secondary">
              Cliente: {clienteNombre}
            </p>
            {loteNombre && (
              <p className="text-sm text-crm-text-secondary">
                Lote: {loteNombre}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-crm-text-muted hover:text-crm-text-primary transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Precio Total y Moneda */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">
                Precio Total *
              </label>
              <input
                type="number"
                value={precioTotal}
                onChange={(e) => setPrecioTotal(e.target.value)}
                required
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                placeholder="120000.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">
                Moneda *
              </label>
              <select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value as Moneda)}
                className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
              >
                {MONEDAS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.symbol} {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Forma de Pago */}
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Forma de Pago *
            </label>
            <select
              value={formaPago}
              onChange={(e) => setFormaPago(e.target.value as FormaPago)}
              className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
            >
              {FORMAS_PAGO.map((fp) => (
                <option key={fp.value} value={fp.value}>
                  {fp.label}
                </option>
              ))}
            </select>
          </div>

          {/* Financiamiento */}
          {formaPago !== "contado" && (
            <div className="border border-crm-border rounded-lg p-4 space-y-4">
              <h3 className="text-sm font-semibold text-crm-text-primary">
                Detalles de Financiamiento
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-crm-text-primary mb-2">
                    Monto Inicial
                  </label>
                  <input
                    type="number"
                    value={montoInicial}
                    onChange={(e) => setMontoInicial(e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                  />
                  <p className="text-xs text-crm-text-muted mt-1">
                    Incluye monto de reserva: {simboloMoneda} {reserva.monto_reserva.toLocaleString()}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-crm-text-primary mb-2">
                    Número de Cuotas
                  </label>
                  <input
                    type="number"
                    value={numeroCuotas}
                    onChange={(e) => setNumeroCuotas(e.target.value)}
                    min="1"
                    className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                    placeholder="12"
                  />
                </div>
              </div>

              {/* Cálculos */}
              {precioTotal && (
                <div className="bg-crm-card-hover rounded-lg p-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-crm-text-secondary">Precio Total:</span>
                    <span className="font-semibold text-crm-text-primary">
                      {simboloMoneda} {parseFloat(precioTotal).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-crm-text-secondary">Monto Inicial:</span>
                    <span className="font-semibold text-crm-text-primary">
                      {simboloMoneda} {(parseFloat(montoInicial) || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-crm-border pt-1">
                    <span className="text-crm-text-secondary">Saldo Pendiente:</span>
                    <span className="font-bold text-crm-primary">
                      {simboloMoneda} {calcularSaldoPendiente().toLocaleString()}
                    </span>
                  </div>
                  {numeroCuotas && parseInt(numeroCuotas) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-crm-text-secondary">Cuota Mensual:</span>
                      <span className="font-semibold text-crm-text-primary">
                        {simboloMoneda} {calcularMontoCuota().toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Fecha de Entrega */}
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Fecha de Entrega (estimada)
            </label>
            <input
              type="date"
              value={fechaEntrega}
              onChange={(e) => setFechaEntrega(e.target.value)}
              className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
            />
          </div>

          {/* Comisión del Vendedor */}
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Comisión del Vendedor
            </label>
            <input
              type="number"
              value={comisionVendedor}
              onChange={(e) => setComisionVendedor(e.target.value)}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
              placeholder="3600.00"
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Notas
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary resize-none"
              placeholder="Observaciones sobre la venta..."
            />
          </div>

          {/* Info Box */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <p className="text-sm text-green-800 dark:text-green-300">
              ✅ Al convertir la reserva en venta:
            </p>
            <ul className="text-xs text-green-700 dark:text-green-400 mt-2 space-y-1 ml-5 list-disc">
              <li>Se generará un código de venta automáticamente (VTA-YYYY-####)</li>
              <li>El lote cambiará a estado "Vendido"</li>
              <li>La reserva se marcará como "Convertida en Venta"</li>
              {montoInicial && parseFloat(montoInicial) > 0 && (
                <li>Se registrará el monto inicial como primer pago</li>
              )}
            </ul>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-crm-text-primary border border-crm-border rounded-lg hover:bg-crm-card-hover transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isPending ? "Convirtiendo..." : "Convertir en Venta"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
