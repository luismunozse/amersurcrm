"use client";

import { Fragment, useState, useTransition } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { createPortal } from "react-dom";
import { X, AlertTriangle } from "lucide-react";
import { cancelarReserva } from "@/app/dashboard/clientes/_actions_crm";
import toast from "react-hot-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reservaId: string;
  reservaCodigo: string;
  clienteNombre: string;
  loteNombre?: string;
}

export default function CancelarReservaModal({
  isOpen,
  onClose,
  reservaId,
  reservaCodigo,
  clienteNombre,
  loteNombre,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [motivo, setMotivo] = useState("");

  const motivosPredefinidos = [
    "Cliente no interesado",
    "Cliente encontró otra propiedad",
    "Problemas de financiamiento",
    "Cambio de planes del cliente",
    "Propiedad vendida a otro cliente",
    "Error en la reserva",
    "Otro"
  ];

  const [motivoSeleccionado, setMotivoSeleccionado] = useState("");

  const resetForm = () => {
    setMotivo("");
    setMotivoSeleccionado("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const motivoFinal = motivoSeleccionado === "Otro" ? motivo : motivoSeleccionado;

    if (!motivoFinal || motivoFinal.trim() === "") {
      toast.error("Debes proporcionar un motivo de cancelación");
      return;
    }

    startTransition(async () => {
      const result = await cancelarReserva(reservaId, motivoFinal);

      if (result.success) {
        toast.success("Reserva cancelada exitosamente");
        resetForm();
        onClose();
      } else {
        toast.error(result.error || "Error al cancelar la reserva");
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
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-crm-card border border-crm-border shadow-2xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-crm-border bg-crm-background">
                  <div>
                    <Dialog.Title className="text-xl font-bold text-crm-text flex items-center gap-2">
                      <AlertTriangle className="h-6 w-6 text-red-500" />
                      Cancelar Reserva
                    </Dialog.Title>
                    <p className="text-sm text-crm-text-muted mt-1">
                      {reservaCodigo} - {clienteNombre}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-crm-card-hover rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-crm-text-muted" />
                  </button>
                </div>

                {/* Warning Box */}
                <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
                        Esta acción no se puede deshacer
                      </p>
                      <ul className="text-xs text-red-700 dark:text-red-300 space-y-1 list-disc list-inside">
                        <li>La reserva se marcará como cancelada</li>
                        {loteNombre && <li>El lote "{loteNombre}" volverá a estado "Disponible"</li>}
                        <li>Se registrará el motivo de cancelación</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  {/* Motivo Predefinido */}
                  <div>
                    <label className="block text-sm font-medium text-crm-text mb-2">
                      Motivo de Cancelación *
                    </label>
                    <div className="space-y-2">
                      {motivosPredefinidos.map((motivoPred) => (
                        <label
                          key={motivoPred}
                          className="flex items-center gap-3 p-3 border border-crm-border rounded-lg hover:bg-crm-card-hover cursor-pointer transition-colors"
                        >
                          <input
                            type="radio"
                            name="motivo"
                            value={motivoPred}
                            checked={motivoSeleccionado === motivoPred}
                            onChange={(e) => setMotivoSeleccionado(e.target.value)}
                            className="h-4 w-4 text-crm-primary focus:ring-crm-primary border-crm-border"
                            disabled={isPending}
                          />
                          <span className="text-sm text-crm-text">{motivoPred}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Campo de texto para "Otro" */}
                  {motivoSeleccionado === "Otro" && (
                    <div>
                      <label className="block text-sm font-medium text-crm-text mb-2">
                        Especifica el motivo *
                      </label>
                      <textarea
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2.5 bg-crm-background border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-transparent text-crm-text resize-none"
                        disabled={isPending}
                        placeholder="Describe el motivo de la cancelación..."
                        required
                      />
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
                      Volver
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      disabled={isPending}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      {isPending ? "Cancelando..." : "Cancelar Reserva"}
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
