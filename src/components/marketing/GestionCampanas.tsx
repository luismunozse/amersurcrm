"use client";

import { useState, useEffect } from "react";
import { Plus, Play, Pause, Eye, BarChart3, Calendar, Users, MessageSquare, Trash2 } from "lucide-react";
import { obtenerCampanas, actualizarEstadoCampana, eliminarCampana } from "@/app/dashboard/admin/marketing/_actions";
import type { MarketingCampana } from "@/types/whatsapp-marketing";
import toast from "react-hot-toast";
import ModalCrearCampana from "./ModalCrearCampana";

export default function GestionCampanas() {
  const [campanas, setCampanas] = useState<MarketingCampana[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalCrear, setModalCrear] = useState(false);

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

  const handleCambiarEstado = async (id: string, nuevoEstado: 'RUNNING' | 'PAUSED') => {
    const result = await actualizarEstadoCampana(id, nuevoEstado);

    if (result.success) {
      toast.success(`Campaña ${nuevoEstado === 'RUNNING' ? 'iniciada' : 'pausada'}`);
      cargarCampanas();
    } else {
      toast.error(result.error || 'Error actualizando campaña');
    }
  };

  const handleEliminar = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar la campaña "${nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    const result = await eliminarCampana(id);

    if (result.success) {
      toast.success('Campaña eliminada exitosamente');
      cargarCampanas();
    } else {
      toast.error(result.error || 'Error eliminando campaña');
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'RUNNING':
        return 'bg-crm-success/10 text-crm-success border-crm-success/30';
      case 'SCHEDULED':
        return 'bg-crm-info/10 text-crm-info border-crm-info/30';
      case 'PAUSED':
        return 'bg-crm-warning/10 text-crm-warning border-crm-warning/30';
      case 'COMPLETED':
        return 'bg-crm-text-muted/10 text-crm-text-secondary border-crm-border';
      case 'DRAFT':
        return 'bg-crm-text-muted/10 text-crm-text-muted border-crm-border';
      default:
        return 'bg-crm-text-muted/10 text-crm-text-secondary border-crm-border';
    }
  };

  const calcularTasaEntrega = (campana: MarketingCampana) => {
    if (campana.total_enviados === 0) return 0;
    return ((campana.total_entregados / campana.total_enviados) * 100).toFixed(1);
  };

  const calcularTasaLectura = (campana: MarketingCampana) => {
    if (campana.total_entregados === 0) return 0;
    return ((campana.total_leidos / campana.total_entregados) * 100).toFixed(1);
  };

  const calcularTasaRespuesta = (campana: MarketingCampana) => {
    if (campana.total_leidos === 0) return 0;
    return ((campana.total_respondidos / campana.total_leidos) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-crm-card border border-crm-border rounded-xl p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-crm-border rounded w-48 mb-4"></div>
              <div className="h-4 bg-crm-border rounded w-full mb-2"></div>
              <div className="h-4 bg-crm-border rounded w-3/4"></div>
            </div>
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

      {/* Lista de campañas */}
      {campanas.length === 0 ? (
        <div className="bg-crm-card border border-crm-border rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-crm-text-primary mb-2">
            No hay campañas creadas
          </h3>
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
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-crm-text-primary mb-2">
                    {campana.nombre}
                  </h3>
                  <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full border ${getEstadoColor(campana.estado)}`}>
                    {campana.estado}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {campana.estado === 'RUNNING' ? (
                    <button
                      onClick={() => handleCambiarEstado(campana.id, 'PAUSED')}
                      className="inline-flex items-center justify-center w-8 h-8 text-crm-warning hover:text-crm-warning hover:bg-crm-warning/10 rounded-lg transition-colors"
                      title="Pausar campaña"
                    >
                      <Pause className="w-4 h-4" />
                    </button>
                  ) : campana.estado === 'PAUSED' || campana.estado === 'DRAFT' ? (
                    <button
                      onClick={() => handleCambiarEstado(campana.id, 'RUNNING')}
                      className="inline-flex items-center justify-center w-8 h-8 text-crm-success hover:text-crm-success hover:bg-crm-success/10 rounded-lg transition-colors"
                      title="Iniciar campaña"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  ) : null}
                  <button
                    className="inline-flex items-center justify-center w-8 h-8 text-crm-info hover:text-crm-info hover:bg-crm-info/10 rounded-lg transition-colors"
                    title="Ver detalles"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEliminar(campana.id, campana.nombre)}
                    className="inline-flex items-center justify-center w-8 h-8 text-crm-error hover:text-crm-error hover:bg-crm-error/10 rounded-lg transition-colors"
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
                  <div className="flex items-center gap-2 text-sm text-crm-text-secondary">
                    <Calendar className="w-4 h-4" />
                    <span>Inicio: {new Date(campana.fecha_inicio).toLocaleDateString('es-PE')}</span>
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

              {/* Conversiones */}
              {campana.total_conversiones > 0 && (
                <div className="mt-4 p-3 bg-crm-success/10 border border-crm-success/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-crm-success">Conversiones</span>
                    <span className="text-lg font-bold text-crm-success">{campana.total_conversiones}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <ModalCrearCampana
        open={modalCrear}
        onClose={() => setModalCrear(false)}
        onSuccess={cargarCampanas}
      />
    </div>
  );
}
