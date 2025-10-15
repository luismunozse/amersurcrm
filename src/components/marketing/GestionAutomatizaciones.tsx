"use client";

import { useState } from "react";
import { Zap, Plus, Play, Pause, Edit, Trash2, TrendingUp } from "lucide-react";

export default function GestionAutomatizaciones() {
  const [automatizaciones] = useState([
    {
      id: '1',
      nombre: 'Bienvenida Inmediata',
      trigger: 'lead.created',
      activo: true,
      total_ejecutadas: 156,
      total_completadas: 142,
      tasa_exito: 91.0
    },
    {
      id: '2',
      nombre: 'Seguimiento 24h',
      trigger: 'lead.no_respuesta_24h',
      activo: true,
      total_ejecutadas: 89,
      total_completadas: 67,
      tasa_exito: 75.3
    },
    {
      id: '3',
      nombre: 'Recordatorio Visita',
      trigger: 'visita.agendada',
      activo: false,
      total_ejecutadas: 45,
      total_completadas: 43,
      tasa_exito: 95.6
    }
  ]);

  const getTriggerLabel = (trigger: string) => {
    const labels: Record<string, string> = {
      'lead.created': '🎯 Nuevo Lead',
      'lead.no_respuesta_24h': '⏰ Sin Respuesta 24h',
      'visita.agendada': '📅 Visita Agendada',
      'visita.completada': '✅ Visita Completada',
      'pago.vencido': '💰 Pago Vencido',
      'cliente.inactivo_30d': '😴 Inactivo 30 días'
    };
    return labels[trigger] || trigger;
  };

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
        <button className="flex items-center gap-2 px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover transition-colors">
          <Plus className="w-4 h-4" />
          Nueva Automatización
        </button>
      </div>

      {/* Lista de automatizaciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {automatizaciones.map((auto) => (
          <div key={auto.id} className="bg-crm-card border border-crm-border rounded-xl p-6 hover:shadow-lg transition-shadow duration-200">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className={`w-5 h-5 ${auto.activo ? 'text-crm-primary' : 'text-crm-text-muted'}`} />
                  <h3 className="text-lg font-semibold text-crm-text-primary">
                    {auto.nombre}
                  </h3>
                </div>
                <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                  auto.activo
                    ? 'bg-crm-success/10 text-crm-success border border-crm-success/20'
                    : 'bg-crm-card-hover text-crm-text-secondary border border-crm-border'
                }`}>
                  {auto.activo ? 'Activa' : 'Pausada'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {auto.activo ? (
                  <button
                    className="inline-flex items-center justify-center w-8 h-8 text-crm-warning hover:text-crm-warning hover:bg-crm-warning/10 rounded-lg transition-colors"
                    title="Pausar"
                  >
                    <Pause className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    className="inline-flex items-center justify-center w-8 h-8 text-crm-success hover:text-crm-success hover:bg-crm-success/10 rounded-lg transition-colors"
                    title="Activar"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                )}
                <button
                  className="inline-flex items-center justify-center w-8 h-8 text-crm-info hover:text-crm-info hover:bg-crm-info/10 rounded-lg transition-colors"
                  title="Editar"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  className="inline-flex items-center justify-center w-8 h-8 text-crm-danger hover:text-crm-danger hover:bg-crm-danger/10 rounded-lg transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Trigger */}
            <div className="mb-4 p-3 bg-crm-primary/10 border border-crm-primary/20 rounded-lg">
              <p className="text-sm font-medium text-crm-primary">
                {getTriggerLabel(auto.trigger)}
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
                  {auto.tasa_exito}%
                  <TrendingUp className="w-3 h-3" />
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info sobre automatizaciones */}
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
    </div>
  );
}
