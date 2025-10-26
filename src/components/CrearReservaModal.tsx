"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { crearReserva } from "@/app/dashboard/clientes/_actions_crm";
import { MONEDAS, type Moneda } from "@/lib/types/crm-flujo";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  clienteId: string;
  clienteNombre: string;
  loteId?: string;
  loteNombre?: string;
}

export default function CrearReservaModal({
  isOpen,
  onClose,
  clienteId,
  clienteNombre,
  loteId,
  loteNombre,
}: Props) {
  const [isPending, startTransition] = useTransition();

  // Form state
  const [montoReserva, setMontoReserva] = useState("");
  const [moneda, setMoneda] = useState<Moneda>("PEN");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [notas, setNotas] = useState("");

  // Calcular fecha de vencimiento por defecto (30 días)
  const calcularFechaVencimiento = () => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 30);
    return fecha.toISOString().slice(0, 16);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!montoReserva || parseFloat(montoReserva) <= 0) {
      toast.error("Ingrese un monto válido");
      return;
    }

    if (!fechaVencimiento) {
      toast.error("Seleccione fecha de vencimiento");
      return;
    }

    startTransition(async () => {
      const result = await crearReserva({
        clienteId,
        loteId,
        montoReserva: parseFloat(montoReserva),
        moneda: moneda === 'PEN' || moneda === 'USD' ? moneda : undefined,
        fechaVencimiento,
        metodoPago: metodoPago || undefined,
        notas: notas || undefined,
      });

      if (result.success) {
        toast.success(`Reserva ${result.data?.codigo_reserva} creada exitosamente`);
        resetForm();
        onClose();
      } else {
        toast.error(result.error || "Error al crear reserva");
      }
    });
  };

  const resetForm = () => {
    setMontoReserva("");
    setMoneda("PEN");
    setFechaVencimiento("");
    setMetodoPago("");
    setNotas("");
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg bg-crm-card border-2 border-crm-border rounded-2xl shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-crm-text-primary">
              Crear Reserva
            </h2>
            <p className="text-sm text-crm-text-secondary mt-1">
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
          {/* Monto y Moneda */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">
                Monto de Reserva *
              </label>
              <input
                type="number"
                value={montoReserva}
                onChange={(e) => setMontoReserva(e.target.value)}
                required
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                placeholder="5000.00"
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

          {/* Fecha de Vencimiento */}
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Fecha de Vencimiento *
            </label>
            <input
              type="datetime-local"
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
              required
              className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
            />
            <button
              type="button"
              onClick={() => setFechaVencimiento(calcularFechaVencimiento())}
              className="text-xs text-crm-primary hover:underline mt-1"
            >
              Establecer en 30 días
            </button>
          </div>

          {/* Método de Pago */}
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Método de Pago
            </label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
            >
              <option value="">Seleccionar método</option>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="cheque">Cheque</option>
              <option value="deposito">Depósito</option>
            </select>
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
              placeholder="Observaciones sobre la reserva..."
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              ℹ️ Al crear la reserva, el lote cambiará automáticamente a estado <strong>"Reservado"</strong>
            </p>
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
              className="px-4 py-2 text-sm font-medium text-white bg-crm-primary rounded-lg hover:bg-crm-primary/90 transition-colors disabled:opacity-50"
            >
              {isPending ? "Creando..." : "Crear Reserva"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
