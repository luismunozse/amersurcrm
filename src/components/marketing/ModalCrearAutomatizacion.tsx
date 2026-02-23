"use client";

import { useState, useEffect } from "react";
import { X, Zap, Plus, Trash2, Clock, Send, ArrowDown, GripVertical } from "lucide-react";
import { crearAutomatizacion, obtenerPlantillas } from "@/app/dashboard/admin/marketing/_actions";
import type { MarketingTemplate } from "@/types/whatsapp-marketing";
import toast from "react-hot-toast";

interface ModalCrearAutomatizacionProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TRIGGERS = [
  { value: "lead.created", label: "🎯 Nuevo Lead" },
  { value: "lead.no_respuesta_24h", label: "⏰ Sin Respuesta 24h" },
  { value: "visita.agendada", label: "📅 Visita Agendada" },
  { value: "visita.completada", label: "✅ Visita Completada" },
  { value: "pago.vencido", label: "💰 Pago Vencido" },
  { value: "cliente.inactivo_30d", label: "😴 Inactivo 30 días" },
  { value: "propiedad.disponible", label: "🏠 Propiedad Disponible" },
];

type TipoAccion = "enviar_template" | "esperar";

interface Paso {
  id: string;           // UUID local para key de lista
  tipo: TipoAccion;
  template_id: string;
  delay_minutos: number;
  solo_si_no_respondio: boolean;
}

const nuevoPaso = (): Paso => ({
  id: Math.random().toString(36).slice(2),
  tipo: "enviar_template",
  template_id: "",
  delay_minutos: 0,
  solo_si_no_respondio: false,
});

export default function ModalCrearAutomatizacion({ open, onClose, onSuccess }: ModalCrearAutomatizacionProps) {
  const [loading, setLoading] = useState(false);
  const [plantillas, setPlantillas] = useState<MarketingTemplate[]>([]);
  const [loadingPlantillas, setLoadingPlantillas] = useState(true);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [triggerEvento, setTriggerEvento] = useState("");
  const [activo, setActivo] = useState(true);
  const [pasos, setPasos] = useState<Paso[]>([nuevoPaso()]);

  useEffect(() => {
    if (open) cargarPlantillas();
  }, [open]);

  const cargarPlantillas = async () => {
    setLoadingPlantillas(true);
    const result = await obtenerPlantillas();
    if (result.data) {
      setPlantillas(result.data.filter((p) => p.estado_aprobacion === "APPROVED"));
    }
    setLoadingPlantillas(false);
  };

  const agregarPaso = () => setPasos((prev) => [...prev, nuevoPaso()]);

  const eliminarPaso = (id: string) =>
    setPasos((prev) => prev.filter((p) => p.id !== id));

  const actualizarPaso = (id: string, cambios: Partial<Paso>) =>
    setPasos((prev) => prev.map((p) => (p.id === id ? { ...p, ...cambios } : p)));

  const resetForm = () => {
    setNombre("");
    setDescripcion("");
    setTriggerEvento("");
    setActivo(true);
    setPasos([nuevoPaso()]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!triggerEvento) {
      toast.error("Selecciona un evento disparador");
      return;
    }

    // Validar que los pasos de tipo enviar_template tengan una plantilla
    const pasosInvalidos = pasos.filter(
      (p) => p.tipo === "enviar_template" && !p.template_id
    );
    if (pasosInvalidos.length) {
      toast.error("Todos los pasos de envío deben tener una plantilla seleccionada");
      return;
    }

    setLoading(true);
    try {
      const acciones = pasos.map((p) => {
        if (p.tipo === "esperar") {
          return { tipo: "esperar" as const, delay_minutos: p.delay_minutos };
        }
        return {
          tipo: "enviar_template" as const,
          template_id: p.template_id,
          delay_minutos: p.delay_minutos,
          solo_si_no_respondio: p.solo_si_no_respondio,
        };
      });

      const result = await crearAutomatizacion({
        nombre,
        descripcion: descripcion || undefined,
        trigger_evento: triggerEvento,
        condiciones: {},
        acciones,
        activo,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Automatización creada exitosamente");
        onSuccess();
        onClose();
        resetForm();
      }
    } catch {
      toast.error("Error creando automatización");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
        <div className="relative w-full max-w-2xl bg-crm-card rounded-xl shadow-xl border border-crm-border max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-crm-card border-b border-crm-border p-6 flex items-center justify-between z-10">
            <div>
              <h3 className="text-xl font-semibold text-crm-text-primary flex items-center gap-2">
                <Zap className="w-5 h-5 text-crm-primary" />
                Nueva Automatización
              </h3>
              <p className="text-sm text-crm-text-secondary mt-1">
                Configura un flujo multi-paso basado en eventos
              </p>
            </div>
            <button onClick={onClose} className="text-crm-text-muted hover:text-crm-text-primary transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">Nombre *</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-bg-primary text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                placeholder="Ej: Seguimiento post-visita"
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">Descripción</label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-bg-primary text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                placeholder="Descripción opcional del flujo"
              />
            </div>

            {/* Trigger */}
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">Evento Disparador *</label>
              <select
                required
                value={triggerEvento}
                onChange={(e) => setTriggerEvento(e.target.value)}
                className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-bg-primary text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
              >
                <option value="">-- Seleccionar evento --</option>
                {TRIGGERS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Journey flow (pasos) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-crm-text-primary flex items-center gap-2">
                  <Zap className="w-4 h-4 text-crm-primary" />
                  Pasos del flujo ({pasos.length})
                </label>
              </div>

              <div className="space-y-2">
                {pasos.map((paso, idx) => (
                  <div key={paso.id}>
                    {/* Conector entre pasos */}
                    {idx > 0 && (
                      <div className="flex justify-center my-1">
                        <ArrowDown className="w-4 h-4 text-crm-text-muted" />
                      </div>
                    )}

                    {/* Tarjeta del paso */}
                    <div className="border border-crm-border rounded-xl p-4 bg-crm-bg-primary space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-crm-text-muted" />
                          <span className="text-xs font-semibold text-crm-text-muted uppercase tracking-wide">
                            Paso {idx + 1}
                          </span>
                        </div>
                        {pasos.length > 1 && (
                          <button
                            type="button"
                            onClick={() => eliminarPaso(paso.id)}
                            className="text-crm-text-muted hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Tipo de paso */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => actualizarPaso(paso.id, { tipo: "enviar_template" })}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg border transition-colors ${
                            paso.tipo === "enviar_template"
                              ? "bg-crm-primary text-white border-crm-primary"
                              : "border-crm-border text-crm-text-secondary hover:bg-crm-card-hover"
                          }`}
                        >
                          <Send className="w-3 h-3" />
                          Enviar plantilla
                        </button>
                        <button
                          type="button"
                          onClick={() => actualizarPaso(paso.id, { tipo: "esperar" })}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg border transition-colors ${
                            paso.tipo === "esperar"
                              ? "bg-amber-500 text-white border-amber-500"
                              : "border-crm-border text-crm-text-secondary hover:bg-crm-card-hover"
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          Esperar
                        </button>
                      </div>

                      {/* Campos según tipo */}
                      {paso.tipo === "enviar_template" && (
                        <>
                          <div>
                            <label className="text-xs text-crm-text-secondary mb-1 block">Plantilla *</label>
                            {loadingPlantillas ? (
                              <div className="animate-pulse h-9 bg-crm-border rounded" />
                            ) : (
                              <select
                                value={paso.template_id}
                                onChange={(e) => actualizarPaso(paso.id, { template_id: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                              >
                                <option value="">-- Seleccionar plantilla --</option>
                                {plantillas.map((p) => (
                                  <option key={p.id} value={p.id}>{p.nombre}</option>
                                ))}
                              </select>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-crm-text-secondary mb-1 block">Delay (minutos)</label>
                              <input
                                type="number"
                                min={0}
                                value={paso.delay_minutos}
                                onChange={(e) =>
                                  actualizarPaso(paso.id, { delay_minutos: parseInt(e.target.value) || 0 })
                                }
                                className="w-full px-3 py-2 text-sm border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                                placeholder="0"
                              />
                              {paso.delay_minutos > 0 && (
                                <p className="text-[10px] text-crm-text-muted mt-1">
                                  ≈ {paso.delay_minutos >= 60
                                    ? `${(paso.delay_minutos / 60).toFixed(1)}h`
                                    : `${paso.delay_minutos}min`}
                                </p>
                              )}
                            </div>
                            <div className="flex items-end pb-2">
                              <label className="flex items-start gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={paso.solo_si_no_respondio}
                                  onChange={(e) =>
                                    actualizarPaso(paso.id, { solo_si_no_respondio: e.target.checked })
                                  }
                                  className="w-4 h-4 mt-0.5 text-crm-primary border-crm-border rounded flex-shrink-0"
                                />
                                <span className="text-xs text-crm-text-secondary leading-tight">
                                  Solo si no ha respondido
                                </span>
                              </label>
                            </div>
                          </div>
                        </>
                      )}

                      {paso.tipo === "esperar" && (
                        <div>
                          <label className="text-xs text-crm-text-secondary mb-1 block">Tiempo de espera (minutos) *</label>
                          <input
                            type="number"
                            min={1}
                            value={paso.delay_minutos || ""}
                            onChange={(e) =>
                              actualizarPaso(paso.id, { delay_minutos: parseInt(e.target.value) || 0 })
                            }
                            className="w-full px-3 py-2 text-sm border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                            placeholder="Ej: 1440 (= 24h)"
                          />
                          {paso.delay_minutos > 0 && (
                            <p className="text-xs text-amber-600 mt-1">
                              El flujo se pausará {paso.delay_minutos >= 60
                                ? `${(paso.delay_minutos / 60).toFixed(1)} horas`
                                : `${paso.delay_minutos} minutos`}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Agregar paso */}
              <button
                type="button"
                onClick={agregarPaso}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 text-sm border border-dashed border-crm-border rounded-xl text-crm-text-muted hover:text-crm-primary hover:border-crm-primary transition-colors"
              >
                <Plus className="w-4 h-4" />
                Agregar paso
              </button>
            </div>

            {/* Activar al crear */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
                className="w-4 h-4 text-crm-primary border-crm-border rounded"
              />
              <span className="text-sm font-medium text-crm-text-primary">
                Activar automatización al crear
              </span>
            </label>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-crm-border">
              <button
                type="button"
                onClick={() => { onClose(); resetForm(); }}
                disabled={loading}
                className="px-4 py-2 text-crm-text-muted hover:text-crm-text-primary border border-crm-border rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Crear Automatización
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
