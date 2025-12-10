"use client";

import { useState, useEffect } from "react";
import { MessageSquare, User, Clock, CheckCircle, Archive, Send } from "lucide-react";
import { obtenerConversaciones, asignarVendedorConversacion as _asignarVendedorConversacion } from "@/app/dashboard/admin/marketing/_actions";
import type { MarketingConversacion } from "@/types/whatsapp-marketing";
import toast from "react-hot-toast";

export default function BandejaConversaciones() {
  const [conversaciones, setConversaciones] = useState<MarketingConversacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<'ABIERTA' | 'CERRADA' | undefined>('ABIERTA');
  const [conversacionSeleccionada, setConversacionSeleccionada] = useState<string | null>(null);

  useEffect(() => {
    cargarConversaciones();
  }, [filtroEstado]);

  const cargarConversaciones = async () => {
    setLoading(true);
    const result = await obtenerConversaciones({ estado: filtroEstado });
    
    if (result.error) {
      toast.error(result.error);
    } else if (result.data) {
      setConversaciones(result.data);
    }
    
    setLoading(false);
  };

  const formatearTiempoRelativo = (fecha: string) => {
    const ahora = new Date();
    const entonces = new Date(fecha);
    const diff = ahora.getTime() - entonces.getTime();
    
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);
    
    if (minutos < 1) return 'Ahora';
    if (minutos < 60) return `Hace ${minutos}m`;
    if (horas < 24) return `Hace ${horas}h`;
    return `Hace ${dias}d`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
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
      {/* Header con filtros */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-crm-text-primary">Bandeja de Conversaciones</h2>
          <p className="text-sm text-crm-text-secondary mt-1">
            Gestiona las conversaciones de WhatsApp con tus clientes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFiltroEstado('ABIERTA')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filtroEstado === 'ABIERTA'
                ? 'bg-green-600 text-white'
                : 'bg-crm-card-hover text-crm-text-primary hover:bg-crm-sidebar-hover'
            }`}
          >
            Abiertas ({conversaciones.filter(c => c.estado === 'ABIERTA').length})
          </button>
          <button
            onClick={() => setFiltroEstado('CERRADA')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filtroEstado === 'CERRADA'
                ? 'bg-gray-600 text-white'
                : 'bg-crm-card-hover text-crm-text-primary hover:bg-crm-sidebar-hover'
            }`}
          >
            Cerradas
          </button>
          <button
            onClick={() => setFiltroEstado(undefined)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              !filtroEstado
                ? 'bg-blue-600 text-white'
                : 'bg-crm-card-hover text-crm-text-primary hover:bg-crm-sidebar-hover'
            }`}
          >
            Todas
          </button>
        </div>
      </div>

      {/* Lista de conversaciones */}
      {conversaciones.length === 0 ? (
        <div className="bg-crm-card border border-crm-border rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-crm-text-primary mb-2">
            No hay conversaciones
          </h3>
          <p className="text-sm text-crm-text-secondary">
            Las conversaciones aparecerán aquí cuando los clientes te escriban
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {conversaciones.map((conversacion) => (
            <div 
              key={conversacion.id} 
              className={`bg-crm-card border rounded-xl p-6 hover:shadow-lg transition-all duration-200 cursor-pointer ${
                conversacionSeleccionada === conversacion.id 
                  ? 'border-green-500 ring-2 ring-green-200' 
                  : 'border-crm-border'
              }`}
              onClick={() => setConversacionSeleccionada(conversacion.id)}
            >
              <div className="flex items-start justify-between">
                {/* Información del cliente */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-crm-text-primary">
                        {conversacion.cliente?.nombre || conversacion.telefono}
                      </h3>
                      <p className="text-xs text-crm-text-muted">
                        {conversacion.telefono}
                      </p>
                    </div>
                  </div>

                  {/* Estado de sesión */}
                  <div className="flex items-center gap-2 mb-3">
                    {conversacion.is_session_open ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        Sesión activa (24h)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                        <Clock className="w-3 h-3" />
                        Sesión cerrada
                      </span>
                    )}
                    {conversacion.vendedor_asignado && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        @{conversacion.vendedor_asignado}
                      </span>
                    )}
                  </div>

                  {/* Métricas */}
                  <div className="flex items-center gap-4 text-xs text-crm-text-secondary">
                    <span>📥 {conversacion.total_mensajes_in} recibidos</span>
                    <span>📤 {conversacion.total_mensajes_out} enviados</span>
                    {conversacion.last_inbound_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatearTiempoRelativo(conversacion.last_inbound_at)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Acciones rápidas */}
                <div className="flex flex-col gap-2">
                  <button
                    className="inline-flex items-center justify-center w-8 h-8 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                    title="Enviar mensaje"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                  {conversacion.estado === 'ABIERTA' && (
                    <button
                      className="inline-flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                      title="Archivar"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
