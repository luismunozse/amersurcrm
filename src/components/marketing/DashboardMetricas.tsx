"use client";

import { useMarketingStats } from "@/hooks/useMarketingStats";
import { Play, MessageSquare, Users, TrendingUp, Clock, Target, RefreshCw } from "lucide-react";

export default function DashboardMetricas() {
  const { data, loading, error, recargar, formatearTiempo } = useMarketingStats(true);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="bg-crm-card border border-crm-border rounded-xl p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-crm-border rounded w-24 mb-4"></div>
              <div className="h-8 bg-crm-border rounded w-16 mb-2"></div>
              <div className="h-3 bg-crm-border rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-red-600 text-sm">⚠️</span>
            </div>
            <div>
              <h3 className="text-sm font-medium text-red-800">Error cargando métricas</h3>
              <p className="text-xs text-red-600">{error}</p>
            </div>
          </div>
          <button
            onClick={recargar}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const metricas = [
    {
      title: "Campañas Activas",
      value: data?.campanas_activas || 0,
      subtitle: "En ejecución",
      icon: Play,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Mensajes Hoy",
      value: data?.mensajes_enviados_hoy || 0,
      subtitle: "Enviados",
      icon: MessageSquare,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Conversaciones",
      value: data?.conversaciones_abiertas || 0,
      subtitle: "Abiertas",
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Tasa Respuesta",
      value: `${data?.tasa_respuesta_promedio.toFixed(1) || 0}%`,
      subtitle: "Promedio",
      icon: TrendingUp,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    {
      title: "Tiempo Respuesta",
      value: data ? formatearTiempo(data.tiempo_respuesta_promedio_segundos) : '0s',
      subtitle: "Promedio",
      icon: Clock,
      color: "text-cyan-600",
      bgColor: "bg-cyan-50"
    },
    {
      title: "Conversiones",
      value: data?.conversiones_mes || 0,
      subtitle: "Este mes",
      icon: Target,
      color: "text-pink-600",
      bgColor: "bg-pink-50"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {metricas.map((metrica, index) => (
        <div key={index} className="bg-crm-card border border-crm-border rounded-xl p-6 hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-crm-text-secondary">
              {metrica.title}
            </h3>
            <div className={`p-2 rounded-lg ${metrica.bgColor}`}>
              <metrica.icon className={`w-4 h-4 ${metrica.color}`} />
            </div>
          </div>
          <div className="text-2xl font-bold text-crm-text-primary mb-1">
            {metrica.value}
          </div>
          <p className="text-xs text-crm-text-muted">
            {metrica.subtitle}
          </p>
        </div>
      ))}
    </div>
  );
}
