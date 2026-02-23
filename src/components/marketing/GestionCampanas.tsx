"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Play, Pause, Eye, BarChart3, Calendar, Users, MessageSquare,
  Trash2, AlertTriangle, X, CheckCircle, Clock, TrendingUp,
} from "lucide-react";
import { obtenerCampanas, actualizarEstadoCampana, eliminarCampana, obtenerConversionesCampana } from "@/app/dashboard/admin/marketing/_actions";
import type { MarketingCampana } from "@/types/whatsapp-marketing";
import toast from "react-hot-toast";
import ModalCrearCampana from "./ModalCrearCampana";

// ---- Modal de confirmación de eliminación ----
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
            <h4 className="text-base font-semibold text-crm-text-primary">Eliminar campaña</h4>
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

// ---- Modal de detalles de campaña ----
type ConversionItem = {
  id: string;
  conversion_registrada_at: string;
  conversion_monto: number | null;
  conversion_nota: string | null;
  cliente: { id: string; nombre: string; telefono?: string } | null;
};

function ModalDetalleCampana({
  campana,
  onCerrar,
}: {
  campana: MarketingCampana;
  onCerrar: () => void;
}) {
  const [conversiones, setConversiones] = useState<ConversionItem[]>([]);
  const [loadingROI, setLoadingROI] = useState(true);

  const cargarConversiones = useCallback(async () => {
    setLoadingROI(true);
    const result = await obtenerConversionesCampana(campana.id);
    if (result.data) {
      // Supabase returns joined relations as arrays; normalize cliente to single object
      const normalized = (result.data as Record<string, unknown>[]).map((c) => ({
        ...c,
        cliente: Array.isArray(c.cliente) ? (c.cliente[0] ?? null) : (c.cliente ?? null),
      })) as ConversionItem[];
      setConversiones(normalized);
    }
    setLoadingROI(false);
  }, [campana.id]);

  useEffect(() => {
    cargarConversiones();
  }, [cargarConversiones]);

  const tasaEntrega = campana.total_enviados > 0
    ? ((campana.total_entregados / campana.total_enviados) * 100).toFixed(1)
    : "0";
  const tasaLectura = campana.total_entregados > 0
    ? ((campana.total_leidos / campana.total_entregados) * 100).toFixed(1)
    : "0";
  const tasaRespuesta = campana.total_leidos > 0
    ? ((campana.total_respondidos / campana.total_leidos) * 100).toFixed(1)
    : "0";
  const tasaConversion = campana.total_enviados > 0
    ? ((campana.total_conversiones / campana.total_enviados) * 100).toFixed(1)
    : "0";

  const montoTotal = conversiones.reduce((sum, c) => sum + (c.conversion_monto ?? 0), 0);

  const estadoColor: Record<string, string> = {
    RUNNING: "text-crm-success bg-crm-success/10 border-crm-success/30",
    SCHEDULED: "text-crm-info bg-crm-info/10 border-crm-info/30",
    PAUSED: "text-crm-warning bg-crm-warning/10 border-crm-warning/30",
    COMPLETED: "text-crm-text-secondary bg-crm-card-hover border-crm-border",
    DRAFT: "text-crm-text-muted bg-crm-card-hover border-crm-border",
    CANCELLED: "text-crm-error bg-crm-error/10 border-crm-error/30",
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onCerrar} />
        <div className="relative w-full max-w-xl bg-crm-card rounded-xl shadow-xl border border-crm-border max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-crm-card border-b border-crm-border p-6 flex items-center justify-between z-10">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-crm-primary/10 rounded-lg">
                <BarChart3 className="w-5 h-5 text-crm-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-crm-text-primary">{campana.nombre}</h3>
                <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full border ${estadoColor[campana.estado] ?? estadoColor.DRAFT}`}>
                  {campana.estado}
                </span>
              </div>
            </div>
            <button onClick={onCerrar} className="text-crm-text-muted hover:text-crm-text-primary">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Descripción */}
            {campana.descripcion && (
              <p className="text-sm text-crm-text-secondary">{campana.descripcion}</p>
            )}

            {/* Info general */}
            <div className="space-y-2">
              {campana.template && (
                <div className="flex items-center gap-2 text-sm text-crm-text-secondary">
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  <span>Plantilla: <strong className="text-crm-text-primary">{campana.template.nombre}</strong></span>
                </div>
              )}
              {campana.audiencia && (
                <div className="flex items-center gap-2 text-sm text-crm-text-secondary">
                  <Users className="w-4 h-4 flex-shrink-0" />
                  <span>Audiencia: <strong className="text-crm-text-primary">{campana.audiencia.nombre}</strong> ({campana.audiencia.contactos_count} contactos)</span>
                </div>
              )}
              {campana.fecha_inicio && (
                <div className="flex items-center gap-2 text-sm text-crm-text-secondary">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>Inicio: <strong className="text-crm-text-primary">{new Date(campana.fecha_inicio).toLocaleString("es-PE")}</strong></span>
                </div>
              )}
              {campana.completado_at && (
                <div className="flex items-center gap-2 text-sm text-crm-text-secondary">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 text-crm-success" />
                  <span>Completada: <strong className="text-crm-text-primary">{new Date(campana.completado_at).toLocaleString("es-PE")}</strong></span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-crm-text-secondary">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span>Velocidad: <strong className="text-crm-text-primary">{campana.max_envios_por_segundo} mensajes/seg</strong></span>
              </div>
            </div>

            {/* Métricas principales */}
            <div>
              <h4 className="text-sm font-semibold text-crm-text-primary mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Métricas de Envío
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Enviados", value: campana.total_enviados, color: "text-crm-text-primary" },
                  { label: "Entregados", value: `${campana.total_entregados} (${tasaEntrega}%)`, color: "text-crm-success" },
                  { label: "Leídos", value: `${campana.total_leidos} (${tasaLectura}%)`, color: "text-crm-info" },
                  { label: "Respondidos", value: `${campana.total_respondidos} (${tasaRespuesta}%)`, color: "text-crm-primary" },
                  { label: "Fallidos", value: campana.total_fallidos, color: "text-crm-error" },
                  { label: "Conversiones", value: `${campana.total_conversiones} (${tasaConversion}%)`, color: "text-crm-warning" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-crm-bg-secondary border border-crm-border rounded-lg p-3">
                    <p className="text-xs text-crm-text-muted mb-1">{label}</p>
                    <p className={`text-lg font-bold ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Objetivo / config adicional */}
            {campana.objetivo && (
              <div className="bg-crm-info/10 border border-crm-info/20 rounded-lg p-3">
                <p className="text-xs font-medium text-crm-info mb-1">Configuración</p>
                <p className="text-sm text-crm-text-secondary">{campana.objetivo}</p>
              </div>
            )}

            {/* ROI — Conversiones atribuidas */}
            <div>
              <h4 className="text-sm font-semibold text-crm-text-primary mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-crm-success" />
                ROI — Conversiones atribuidas
              </h4>
              {loadingROI ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-12 bg-crm-border/40 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : conversiones.length === 0 ? (
                <p className="text-sm text-crm-text-muted text-center py-4">
                  Sin conversiones registradas para esta campaña
                </p>
              ) : (
                <div className="space-y-2">
                  {montoTotal > 0 && (
                    <div className="flex items-center justify-between p-3 bg-crm-success/10 border border-crm-success/30 rounded-lg mb-3">
                      <span className="text-sm font-medium text-crm-success">Monto total</span>
                      <span className="text-lg font-bold text-crm-success">
                        S/ {montoTotal.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {conversiones.map((c) => (
                    <div key={c.id} className="flex items-start justify-between p-3 bg-crm-bg-secondary border border-crm-border rounded-lg gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-crm-text-primary truncate">
                          {c.cliente?.nombre ?? "Cliente desconocido"}
                        </p>
                        {c.conversion_nota && (
                          <p className="text-xs text-crm-text-muted truncate">{c.conversion_nota}</p>
                        )}
                        <p className="text-xs text-crm-text-muted">
                          {new Date(c.conversion_registrada_at).toLocaleDateString("es-PE")}
                        </p>
                      </div>
                      {c.conversion_monto != null && (
                        <span className="text-sm font-semibold text-crm-success whitespace-nowrap">
                          S/ {c.conversion_monto.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Componente principal ----
export default function GestionCampanas() {
  const [campanas, setCampanas] = useState<MarketingCampana[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalCrear, setModalCrear] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState<{ id: string; nombre: string } | null>(null);
  const [detallesCampana, setDetallesCampana] = useState<MarketingCampana | null>(null);

  useEffect(() => {
    cargarCampanas();
  }, []);

  const cargarCampanas = async () => {
    setLoading(true);
    const result = await obtenerCampanas();
    if (result.error) {
      toast.error(result.error);
    } else if (result.data) {
      setCampanas(result.data);
    }
    setLoading(false);
  };

  const handleCambiarEstado = async (id: string, nuevoEstado: "RUNNING" | "PAUSED") => {
    const result = await actualizarEstadoCampana(id, nuevoEstado);
    if (result.success) {
      toast.success(`Campaña ${nuevoEstado === "RUNNING" ? "iniciada" : "pausada"}`);
      cargarCampanas();
    } else {
      toast.error(result.error || "Error actualizando campaña");
    }
  };

  const handleEliminar = async () => {
    if (!confirmarEliminar) return;
    const result = await eliminarCampana(confirmarEliminar.id);
    if (result.success) {
      toast.success("Campaña eliminada exitosamente");
      setConfirmarEliminar(null);
      cargarCampanas();
    } else {
      toast.error(result.error || "Error eliminando campaña");
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "RUNNING":   return "bg-crm-success/10 text-crm-success border-crm-success/30";
      case "SCHEDULED": return "bg-crm-info/10 text-crm-info border-crm-info/30";
      case "PAUSED":    return "bg-crm-warning/10 text-crm-warning border-crm-warning/30";
      default:          return "bg-crm-card-hover text-crm-text-secondary border-crm-border";
    }
  };

  const calcularTasaEntrega = (c: MarketingCampana) =>
    c.total_enviados === 0 ? 0 : ((c.total_entregados / c.total_enviados) * 100).toFixed(1);
  const calcularTasaLectura = (c: MarketingCampana) =>
    c.total_entregados === 0 ? 0 : ((c.total_leidos / c.total_entregados) * 100).toFixed(1);
  const calcularTasaRespuesta = (c: MarketingCampana) =>
    c.total_leidos === 0 ? 0 : ((c.total_respondidos / c.total_leidos) * 100).toFixed(1);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
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
          <h2 className="text-xl font-semibold text-crm-text-primary">Campañas de WhatsApp</h2>
          <p className="text-sm text-crm-text-secondary mt-1">
            Gestiona tus campañas masivas de marketing
          </p>
        </div>
        <button
          onClick={() => setModalCrear(true)}
          className="flex items-center gap-2 px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva Campaña
        </button>
      </div>

      {/* Lista */}
      {campanas.length === 0 ? (
        <div className="bg-crm-card border border-crm-border rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-crm-card-hover rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-crm-text-muted" />
          </div>
          <h3 className="text-lg font-medium text-crm-text-primary mb-2">No hay campañas creadas</h3>
          <p className="text-sm text-crm-text-secondary mb-6">
            Crea tu primera campaña para comenzar a enviar mensajes masivos
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {campanas.map((campana) => (
            <div key={campana.id} className="bg-crm-card border border-crm-border rounded-xl p-6">
              {/* Header de campaña */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-crm-text-primary mb-2 truncate">
                    {campana.nombre}
                  </h3>
                  <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full border ${getEstadoColor(campana.estado)}`}>
                    {campana.estado}
                  </span>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  {campana.estado === "RUNNING" ? (
                    <button
                      onClick={() => handleCambiarEstado(campana.id, "PAUSED")}
                      className="inline-flex items-center justify-center w-8 h-8 text-crm-warning hover:bg-crm-warning/10 rounded-lg transition-colors"
                      title="Pausar campaña"
                    >
                      <Pause className="w-4 h-4" />
                    </button>
                  ) : (campana.estado === "PAUSED" || campana.estado === "DRAFT") ? (
                    <button
                      onClick={() => handleCambiarEstado(campana.id, "RUNNING")}
                      className="inline-flex items-center justify-center w-8 h-8 text-crm-success hover:bg-crm-success/10 rounded-lg transition-colors"
                      title="Iniciar campaña"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  ) : null}
                  <button
                    onClick={() => setDetallesCampana(campana)}
                    className="inline-flex items-center justify-center w-8 h-8 text-crm-info hover:bg-crm-info/10 rounded-lg transition-colors"
                    title="Ver detalles"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmarEliminar({ id: campana.id, nombre: campana.nombre })}
                    className="inline-flex items-center justify-center w-8 h-8 text-crm-error hover:bg-crm-error/10 rounded-lg transition-colors"
                    title="Eliminar campaña"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Información */}
              <div className="space-y-2 mb-4">
                {campana.template && (
                  <div className="flex items-center gap-2 text-sm text-crm-text-secondary">
                    <MessageSquare className="w-4 h-4" />
                    <span>Plantilla: {campana.template.nombre}</span>
                  </div>
                )}
                {campana.audiencia && (
                  <div className="flex items-center gap-2 text-sm text-crm-text-secondary">
                    <Users className="w-4 h-4" />
                    <span>Audiencia: {campana.audiencia.nombre} ({campana.audiencia.contactos_count} contactos)</span>
                  </div>
                )}
                {campana.fecha_inicio && (
                  <div className={`flex items-center gap-2 text-sm ${campana.estado === "SCHEDULED" ? "text-crm-info font-medium" : "text-crm-text-secondary"}`}>
                    <Calendar className="w-4 h-4" />
                    <span>
                      {campana.estado === "SCHEDULED" ? "Programada: " : "Inicio: "}
                      {new Date(campana.fecha_inicio).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </div>
                )}
              </div>

              {/* Métricas */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-crm-border">
                <div>
                  <p className="text-xs text-crm-text-muted mb-1">Enviados</p>
                  <p className="text-lg font-semibold text-crm-text-primary">{campana.total_enviados}</p>
                </div>
                <div>
                  <p className="text-xs text-crm-text-muted mb-1">Entregados</p>
                  <p className="text-lg font-semibold text-crm-success">
                    {campana.total_entregados} ({calcularTasaEntrega(campana)}%)
                  </p>
                </div>
                <div>
                  <p className="text-xs text-crm-text-muted mb-1">Leídos</p>
                  <p className="text-lg font-semibold text-crm-info">
                    {campana.total_leidos} ({calcularTasaLectura(campana)}%)
                  </p>
                </div>
                <div>
                  <p className="text-xs text-crm-text-muted mb-1">Respondidos</p>
                  <p className="text-lg font-semibold text-crm-primary">
                    {campana.total_respondidos} ({calcularTasaRespuesta(campana)}%)
                  </p>
                </div>
              </div>

              {campana.total_conversiones > 0 && (
                <div className="mt-4 p-3 bg-crm-success/10 border border-crm-success/30 rounded-lg flex items-center justify-between">
                  <span className="text-sm font-medium text-crm-success">Conversiones</span>
                  <span className="text-lg font-bold text-crm-success">{campana.total_conversiones}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modales */}
      <ModalCrearCampana
        open={modalCrear}
        onClose={() => setModalCrear(false)}
        onSuccess={cargarCampanas}
      />

      {confirmarEliminar && (
        <ModalConfirmarEliminar
          nombre={confirmarEliminar.nombre}
          onConfirmar={handleEliminar}
          onCancelar={() => setConfirmarEliminar(null)}
        />
      )}

      {detallesCampana && (
        <ModalDetalleCampana
          campana={detallesCampana}
          onCerrar={() => setDetallesCampana(null)}
        />
      )}
    </div>
  );
}
