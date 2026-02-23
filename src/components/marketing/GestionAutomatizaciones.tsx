"use client";

import { useState, useEffect } from "react";
import { Zap, Plus, Play, Pause, Trash2, TrendingUp, AlertTriangle, X } from "lucide-react";
import {
  obtenerAutomatizaciones,
  actualizarEstadoAutomatizacion,
  eliminarAutomatizacion,
} from "@/app/dashboard/admin/marketing/_actions";
import type { MarketingAutomatizacion } from "@/types/whatsapp-marketing";
import toast from "react-hot-toast";
import ModalCrearAutomatizacion from "./ModalCrearAutomatizacion";

function ModalConfirmarEliminar({
  nombre,
  onConfirmar,
  onCancelar,
}: {
  nombre: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onCancelar} />
      <div className="relative bg-crm-card border border-crm-border rounded-xl shadow-xl p-6 w-full max-w-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 bg-crm-error/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-crm-error" />
          </div>
          <div>
            <h4 className="text-base font-semibold text-crm-text-primary">Eliminar automatización</h4>
            <p className="text-sm text-crm-text-secondary mt-1">
              ¿Estás seguro de eliminar <strong>&quot;{nombre}&quot;</strong>? Esta acción no se puede deshacer.
            </p>
          </div>
          <button onClick={onCancelar} className="ml-auto text-crm-text-muted hover:text-crm-text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancelar}
            className="px-4 py-2 text-sm text-crm-text-secondary border border-crm-border rounded-lg hover:bg-crm-card-hover transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            className="px-4 py-2 text-sm bg-crm-error text-white rounded-lg hover:bg-crm-error/90 transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

const TRIGGER_LABELS: Record<string, string> = {
  "lead.created": "🎯 Nuevo Lead",
  "lead.no_respuesta_24h": "⏰ Sin Respuesta 24h",
  "visita.agendada": "📅 Visita Agendada",
  "visita.completada": "✅ Visita Completada",
  "pago.vencido": "💰 Pago Vencido",
  "cliente.inactivo_30d": "😴 Inactivo 30 días",
};

export default function GestionAutomatizaciones() {
  const [automatizaciones, setAutomatizaciones] = useState<MarketingAutomatizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalCrear, setModalCrear] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState<{ id: string; nombre: string } | null>(null);

  useEffect(() => {
    cargarAutomatizaciones();
  }, []);

  const cargarAutomatizaciones = async () => {
    setLoading(true);
    const result = await obtenerAutomatizaciones();
    if (result.error) {
      toast.error(result.error);
    } else if (result.data) {
      setAutomatizaciones(result.data);
    }
    setLoading(false);
  };

  const handleToggleActivo = async (id: string, activoActual: boolean) => {
    const result = await actualizarEstadoAutomatizacion(id, !activoActual);
    if (result.success) {
      toast.success(activoActual ? "Automatización pausada" : "Automatización activada");
      cargarAutomatizaciones();
    } else {
      toast.error(result.error || "Error actualizando automatización");
    }
  };

  const handleEliminar = async () => {
    if (!confirmarEliminar) return;
    const result = await eliminarAutomatizacion(confirmarEliminar.id);
    if (result.success) {
      toast.success("Automatización eliminada");
      setConfirmarEliminar(null);
      cargarAutomatizaciones();
    } else {
      toast.error(result.error || "Error eliminando automatización");
    }
  };

  const calcularTasaExito = (auto: MarketingAutomatizacion) => {
    if (auto.total_ejecutadas === 0) return "—";
    return `${((auto.total_completadas / auto.total_ejecutadas) * 100).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-crm-card border border-crm-border rounded-xl p-6 animate-pulse">
            <div className="h-6 bg-crm-border rounded w-48 mb-4" />
            <div className="h-4 bg-crm-border rounded w-full mb-2" />
            <div className="h-4 bg-crm-border rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-crm-text-primary">Automatizaciones</h2>
          <p className="text-sm text-crm-text-secondary mt-1">
            Journeys automáticos basados en eventos
          </p>
        </div>
        <button
          onClick={() => setModalCrear(true)}
          className="flex items-center gap-2 px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva Automatización
        </button>
      </div>

      {/* Lista */}
      {automatizaciones.length === 0 ? (
        <div className="bg-crm-card border border-crm-border rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-crm-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-crm-primary" />
          </div>
          <h3 className="text-lg font-medium text-crm-text-primary mb-2">
            No hay automatizaciones creadas
          </h3>
          <p className="text-sm text-crm-text-secondary">
            Crea tu primera automatización para enviar mensajes de forma automática
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {automatizaciones.map((auto) => (
            <div
              key={auto.id}
              className="bg-crm-card border border-crm-border rounded-xl p-6 hover:shadow-lg transition-shadow duration-200"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className={`w-5 h-5 ${auto.activo ? "text-crm-primary" : "text-crm-text-muted"}`} />
                    <h3 className="text-lg font-semibold text-crm-text-primary">{auto.nombre}</h3>
                  </div>
                  {auto.descripcion && (
                    <p className="text-xs text-crm-text-secondary mb-2">{auto.descripcion}</p>
                  )}
                  <span
                    className={`inline-block px-3 py-1 text-xs font-medium rounded-full border ${
                      auto.activo
                        ? "bg-crm-success/10 text-crm-success border-crm-success/20"
                        : "bg-crm-card-hover text-crm-text-secondary border-crm-border"
                    }`}
                  >
                    {auto.activo ? "Activa" : "Pausada"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleActivo(auto.id, auto.activo)}
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                      auto.activo
                        ? "text-crm-warning hover:bg-crm-warning/10"
                        : "text-crm-success hover:bg-crm-success/10"
                    }`}
                    title={auto.activo ? "Pausar" : "Activar"}
                  >
                    {auto.activo ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setConfirmarEliminar({ id: auto.id, nombre: auto.nombre })}
                    className="inline-flex items-center justify-center w-8 h-8 text-crm-error hover:bg-crm-error/10 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Trigger */}
              <div className="mb-4 p-3 bg-crm-primary/10 border border-crm-primary/20 rounded-lg">
                <p className="text-sm font-medium text-crm-primary">
                  {TRIGGER_LABELS[auto.trigger_evento] || auto.trigger_evento}
                </p>
              </div>

              {/* Métricas */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-crm-text-muted mb-1">Ejecutadas</p>
                  <p className="text-lg font-semibold text-crm-text-primary">{auto.total_ejecutadas}</p>
                </div>
                <div>
                  <p className="text-xs text-crm-text-muted mb-1">Completadas</p>
                  <p className="text-lg font-semibold text-crm-success">{auto.total_completadas}</p>
                </div>
                <div>
                  <p className="text-xs text-crm-text-muted mb-1">Tasa Éxito</p>
                  <p className="text-lg font-semibold text-crm-info flex items-center gap-1">
                    {calcularTasaExito(auto)}
                    {auto.total_ejecutadas > 0 && <TrendingUp className="w-3 h-3" />}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="bg-crm-info/10 border border-crm-info/20 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-crm-info/15 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-crm-info" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-crm-info mb-1">¿Qué son las automatizaciones?</h4>
            <p className="text-xs text-crm-info">
              Las automatizaciones son flujos que se ejecutan automáticamente cuando ocurre un evento específico.
              Por ejemplo, enviar un mensaje de bienvenida cuando se crea un nuevo lead, o recordar una visita 24h antes.
            </p>
          </div>
        </div>
      </div>

      {/* Modales */}
      <ModalCrearAutomatizacion
        open={modalCrear}
        onClose={() => setModalCrear(false)}
        onSuccess={cargarAutomatizaciones}
      />

      {confirmarEliminar && (
        <ModalConfirmarEliminar
          nombre={confirmarEliminar.nombre}
          onConfirmar={handleEliminar}
          onCancelar={() => setConfirmarEliminar(null)}
        />
      )}
    </div>
  );
}
