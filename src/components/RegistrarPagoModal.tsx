"use client";

import { Fragment, useState, useTransition } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { createPortal } from "react-dom";
import { X, CreditCard, DollarSign, Calendar } from "lucide-react";
import { registrarPago } from "@/app/dashboard/clientes/_actions_crm";
import { MONEDAS, METODOS_PAGO, formatearMoneda, type Moneda } from "@/lib/types/crm-flujo";
import toast from "react-hot-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ventaId: string;
  ventaCodigo: string;
  clienteNombre: string;
  saldoPendiente: number;
  monedaVenta: Moneda;
  numeroCuotasTotal?: number;
  ultimaCuotaPagada?: number;
}

export default function RegistrarPagoModal({
  isOpen,
  onClose,
  ventaId,
  ventaCodigo,
  clienteNombre,
  saldoPendiente,
  monedaVenta,
  numeroCuotasTotal,
  ultimaCuotaPagada = 0,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [monto, setMonto] = useState("");
  const [moneda, setMoneda] = useState<Moneda>(monedaVenta);
  const [fechaPago, setFechaPago] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [metodoPago, setMetodoPago] = useState<string>("efectivo");
  const [numeroOperacion, setNumeroOperacion] = useState("");
  const [banco, setBanco] = useState("");
  const [numeroCuota, setNumeroCuota] = useState<number | "">(
    numeroCuotasTotal ? ultimaCuotaPagada + 1 : ""
  );
  const [notas, setNotas] = useState("");

  const simboloMoneda = MONEDAS.find((m) => m.value === moneda)?.symbol || "";

  const resetForm = () => {
    setMonto("");
    setMoneda(monedaVenta);
    setFechaPago(new Date().toISOString().slice(0, 16));
    setFechaVencimiento("");
    setMetodoPago("efectivo");
    setNumeroOperacion("");
    setBanco("");
    setNumeroCuota(numeroCuotasTotal ? ultimaCuotaPagada + 1 : "");
    setNotas("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!monto || parseFloat(monto) <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }

    if (parseFloat(monto) > saldoPendiente) {
      toast.error("El monto no puede ser mayor al saldo pendiente");
      return;
    }

    startTransition(async () => {
      const result = await registrarPago({
        ventaId,
        numeroCuota: numeroCuota !== "" ? Number(numeroCuota) : undefined,
        monto: parseFloat(monto),
        moneda: moneda === 'PEN' || moneda === 'USD' ? moneda : undefined,
        fechaPago,
        fechaVencimiento: fechaVencimiento || undefined,
        metodoPago: metodoPago as any,
        numeroOperacion: numeroOperacion || undefined,
        banco: banco || undefined,
        notas: notas || undefined,
      });

      if (result.success) {
        toast.success("Pago registrado exitosamente");
        resetForm();
        onClose();
      } else {
        toast.error(result.error || "Error al registrar el pago");
      }
    });
  };

  const modalContent = (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-crm-card border border-crm-border shadow-2xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-crm-border bg-crm-background">
                  <div>
                    <Dialog.Title className="text-xl font-bold text-crm-text flex items-center gap-2">
                      <CreditCard className="h-6 w-6 text-crm-primary" />
                      Registrar Pago
                    </Dialog.Title>
                    <p className="text-sm text-crm-text-muted mt-1">
                      Venta {ventaCodigo} - {clienteNombre}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-crm-card-hover rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-crm-text-muted" />
                  </button>
                </div>

                {/* Info Box - Saldo Pendiente */}
                <div className="mx-6 mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Saldo Pendiente
                      </p>
                    </div>
                    <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                      {formatearMoneda(saldoPendiente, monedaVenta)}
                    </p>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  {/* Monto y Moneda */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-crm-text mb-2">
                        Monto del Pago *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-text-muted">
                          {simboloMoneda}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={saldoPendiente}
                          value={monto}
                          onChange={(e) => setMonto(e.target.value)}
                          className="w-full pl-8 pr-4 py-2.5 bg-crm-background border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-transparent text-crm-text"
                          required
                          disabled={isPending}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-crm-text mb-2">
                        Moneda *
                      </label>
                      <select
                        value={moneda}
                        onChange={(e) => setMoneda(e.target.value as Moneda)}
                        className="w-full px-4 py-2.5 bg-crm-background border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-transparent text-crm-text"
                        required
                        disabled={isPending}
                      >
                        {MONEDAS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label} ({m.symbol})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Número de Cuota (opcional) */}
                  {numeroCuotasTotal && (
                    <div>
                      <label className="block text-sm font-medium text-crm-text mb-2">
                        Número de Cuota
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={numeroCuotasTotal}
                        value={numeroCuota}
                        onChange={(e) => setNumeroCuota(e.target.value ? parseInt(e.target.value) : "")}
                        className="w-full px-4 py-2.5 bg-crm-background border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-transparent text-crm-text"
                        disabled={isPending}
                        placeholder={`Cuota ${ultimaCuotaPagada + 1} de ${numeroCuotasTotal}`}
                      />
                      <p className="text-xs text-crm-text-muted mt-1">
                        Última cuota pagada: {ultimaCuotaPagada} de {numeroCuotasTotal}
                      </p>
                    </div>
                  )}

                  {/* Fechas */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-crm-text mb-2">
                        Fecha de Pago *
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-crm-text-muted" />
                        <input
                          type="datetime-local"
                          value={fechaPago}
                          onChange={(e) => setFechaPago(e.target.value)}
                          className="crm-datetime-input pl-10 pr-4"
                          required
                          disabled={isPending}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-crm-text mb-2">
                        Fecha de Vencimiento
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-crm-text-muted" />
                        <input
                          type="date"
                          value={fechaVencimiento}
                          onChange={(e) => setFechaVencimiento(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-crm-background border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-transparent text-crm-text"
                          disabled={isPending}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Método de Pago */}
                  <div>
                    <label className="block text-sm font-medium text-crm-text mb-2">
                      Método de Pago *
                    </label>
                    <select
                      value={metodoPago}
                      onChange={(e) => setMetodoPago(e.target.value)}
                      className="w-full px-4 py-2.5 bg-crm-background border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-transparent text-crm-text"
                      required
                      disabled={isPending}
                    >
                      {METODOS_PAGO.map((metodo) => (
                        <option key={metodo.value} value={metodo.value}>
                          {metodo.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Detalles bancarios (si aplica) */}
                  {(metodoPago === "transferencia" || metodoPago === "deposito" || metodoPago === "cheque") && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-crm-text mb-2">
                          Banco
                        </label>
                        <input
                          type="text"
                          value={banco}
                          onChange={(e) => setBanco(e.target.value)}
                          className="w-full px-4 py-2.5 bg-crm-background border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-transparent text-crm-text"
                          disabled={isPending}
                          placeholder="Ej: BCP, BBVA, Interbank"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-crm-text mb-2">
                          Número de Operación
                        </label>
                        <input
                          type="text"
                          value={numeroOperacion}
                          onChange={(e) => setNumeroOperacion(e.target.value)}
                          className="w-full px-4 py-2.5 bg-crm-background border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-transparent text-crm-text"
                          disabled={isPending}
                          placeholder="Código de operación"
                        />
                      </div>
                    </div>
                  )}

                  {/* Notas */}
                  <div>
                    <label className="block text-sm font-medium text-crm-text mb-2">
                      Notas / Observaciones
                    </label>
                    <textarea
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2.5 bg-crm-background border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-transparent text-crm-text resize-none"
                      disabled={isPending}
                      placeholder="Información adicional sobre el pago..."
                    />
                  </div>

                  {/* Cálculo del nuevo saldo */}
                  {monto && parseFloat(monto) > 0 && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-green-900 dark:text-green-100">
                          Nuevo Saldo Pendiente:
                        </span>
                        <span className="text-lg font-bold text-green-700 dark:text-green-300">
                          {formatearMoneda(
                            saldoPendiente - parseFloat(monto),
                            monedaVenta
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Botones */}
                  <div className="flex gap-3 pt-4 border-t border-crm-border">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-2.5 bg-crm-background border border-crm-border text-crm-text rounded-lg hover:bg-crm-card-hover transition-colors"
                      disabled={isPending}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2.5 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isPending}
                    >
                      {isPending ? "Registrando..." : "Registrar Pago"}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}
