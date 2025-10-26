"use client";

import { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { registrarInteraccion, actualizarInteraccion } from "@/app/dashboard/clientes/_actions_crm";
import {
  TIPOS_INTERACCION,
  RESULTADOS_INTERACCION,
  PROXIMAS_ACCIONES,
  type TipoInteraccion,
  type ResultadoInteraccion,
  type ProximaAccion,
} from "@/lib/types/crm-flujo";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  clienteId: string;
  clienteNombre: string;
  interaccionToEdit?: any | null;
}

export default function RegistrarInteraccionModal({
  isOpen,
  onClose,
  clienteId,
  clienteNombre,
  interaccionToEdit = null,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const isEditMode = !!interaccionToEdit;

  // Form state
  const [tipo, setTipo] = useState<TipoInteraccion>("llamada");
  const [resultado, setResultado] = useState<ResultadoInteraccion | "">("");
  const [notas, setNotas] = useState("");
  const [duracionMinutos, setDuracionMinutos] = useState("");
  const [proximaAccion, setProximaAccion] = useState<ProximaAccion | "">("");
  const [fechaProximaAccion, setFechaProximaAccion] = useState("");

  // Poblar formulario cuando se edita
  useEffect(() => {
    if (interaccionToEdit) {
      setTipo(interaccionToEdit.tipo || "llamada");
      setResultado(interaccionToEdit.resultado || "");
      setNotas(interaccionToEdit.notas || "");
      setDuracionMinutos(interaccionToEdit.duracion_minutos?.toString() || "");
      setProximaAccion(interaccionToEdit.proxima_accion || "");

      // Formatear fecha si existe
      if (interaccionToEdit.fecha_proxima_accion) {
        const fecha = new Date(interaccionToEdit.fecha_proxima_accion);
        const formatted = fecha.toISOString().slice(0, 16);
        setFechaProximaAccion(formatted);
      } else {
        setFechaProximaAccion("");
      }
    } else {
      resetForm();
    }
  }, [interaccionToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      let result;

      if (isEditMode && interaccionToEdit) {
        // Modo edición
        result = await actualizarInteraccion({
          interaccionId: interaccionToEdit.id,
          tipo,
          resultado: resultado || undefined,
          notas: notas || undefined,
          duracionMinutos: duracionMinutos ? parseInt(duracionMinutos) : undefined,
          proximaAccion: proximaAccion || undefined,
          fechaProximaAccion: fechaProximaAccion || undefined,
        });
      } else {
        // Modo creación
        result = await registrarInteraccion({
          clienteId,
          tipo,
          resultado: resultado || undefined,
          notas: notas || undefined,
          duracionMinutos: duracionMinutos ? parseInt(duracionMinutos) : undefined,
          proximaAccion: proximaAccion || undefined,
          fechaProximaAccion: fechaProximaAccion || undefined,
        });
      }

      if (result.success) {
        toast.success(isEditMode ? "Interacción actualizada exitosamente" : "Interacción registrada exitosamente");
        resetForm();
        onClose();
      } else {
        toast.error(result.error || (isEditMode ? "Error al actualizar interacción" : "Error al registrar interacción"));
      }
    });
  };

  const resetForm = () => {
    setTipo("llamada");
    setResultado("");
    setNotas("");
    setDuracionMinutos("");
    setProximaAccion("");
    setFechaProximaAccion("");
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
      <div className="relative z-10 w-full max-w-2xl bg-crm-card border-2 border-crm-border rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-crm-text-primary">
              {isEditMode ? "Editar Interacción" : "Registrar Interacción"}
            </h2>
            <p className="text-sm text-crm-text-secondary mt-1">
              Cliente: {clienteNombre}
            </p>
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
          {/* Tipo de Interacción */}
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Tipo de Interacción *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TIPOS_INTERACCION.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setTipo(item.value)}
                  className={`px-4 py-2 rounded-lg border-2 transition-all ${
                    tipo === item.value
                      ? "border-crm-primary bg-crm-primary/10 text-crm-primary"
                      : "border-crm-border text-crm-text-secondary hover:border-crm-primary/50"
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duración (si aplica) */}
          {(tipo === "llamada" || tipo === "reunion" || tipo === "visita") && (
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">
                Duración (minutos)
              </label>
              <input
                type="number"
                value={duracionMinutos}
                onChange={(e) => setDuracionMinutos(e.target.value)}
                min="1"
                className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                placeholder="30"
              />
            </div>
          )}

          {/* Resultado */}
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Resultado
            </label>
            <select
              value={resultado}
              onChange={(e) => setResultado(e.target.value as ResultadoInteraccion)}
              className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
            >
              <option value="">Seleccionar resultado</option>
              {RESULTADOS_INTERACCION.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
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
              rows={4}
              className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary resize-none"
              placeholder="Detalles de la interacción..."
            />
          </div>

          {/* Próxima Acción */}
          <div className="border-t border-crm-border pt-4">
            <h3 className="text-sm font-semibold text-crm-text-primary mb-3">
              Próxima Acción (opcional)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Acción
                </label>
                <select
                  value={proximaAccion}
                  onChange={(e) => setProximaAccion(e.target.value as ProximaAccion)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                >
                  <option value="">Sin acción</option>
                  {PROXIMAS_ACCIONES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              {proximaAccion && proximaAccion !== "ninguna" && (
                <div>
                  <label className="block text-sm font-medium text-crm-text-primary mb-2">
                    Fecha
                  </label>
                  <input
                    type="datetime-local"
                    value={fechaProximaAccion}
                    onChange={(e) => setFechaProximaAccion(e.target.value)}
                    className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                  />
                </div>
              )}
            </div>
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
              {isPending ? "Guardando..." : (isEditMode ? "Actualizar Interacción" : "Guardar Interacción")}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
