"use client";

import { useEffect } from "react";
import { Clock, Calendar, TrendingUp, Activity } from "lucide-react";

interface EstadisticasUsuarioProps {
  userId: string;
  fechaAlta: string;
  ultimoAcceso?: string | null;
}

export default function EstadisticasUsuario({ 
  userId, 
  fechaAlta, 
  ultimoAcceso 
}: EstadisticasUsuarioProps) {
  useEffect(() => {
    // Placeholder para futuras cargas de actividad
  }, [userId]);

  const calcularDiasActivo = () => {
    const fecha = new Date(fechaAlta);
    const hoy = new Date();
    const diffTime = Math.abs(hoy.getTime() - fecha.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatearFecha = (fecha: string | null | undefined) => {
    if (!fecha) return "Nunca";
    try {
      const date = new Date(fecha);
      const ahora = new Date();
      const diffMs = ahora.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Hace unos momentos";
      if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
      if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
      if (diffDays === 1) return "Ayer";
      if (diffDays < 7) return `Hace ${diffDays} días`;
      
      return date.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return "Fecha inválida";
    }
  };

  const diasActivo = calcularDiasActivo();

  return (
    <div className="bg-crm-card border border-crm-border rounded-xl p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-crm-text-primary mb-6 flex items-center gap-2">
        <Activity className="h-6 w-6 text-crm-primary" />
        Estadísticas
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Último Acceso */}
        <div className="p-4 bg-crm-bg-primary dark:bg-crm-card rounded-lg border border-crm-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-crm-text-muted">Último Acceso</p>
              <p className="text-sm font-semibold text-crm-text-primary">
                {formatearFecha(ultimoAcceso)}
              </p>
            </div>
          </div>
          {ultimoAcceso && (
            <p className="text-xs text-crm-text-muted mt-1">
              {new Date(ultimoAcceso).toLocaleDateString('es-PE', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          )}
        </div>

        {/* Fecha de Alta */}
        <div className="p-4 bg-crm-bg-primary dark:bg-crm-card rounded-lg border border-crm-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-crm-text-muted">Fecha de Alta</p>
              <p className="text-sm font-semibold text-crm-text-primary">
                {new Date(fechaAlta).toLocaleDateString('es-PE', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Días Activo */}
        <div className="p-4 bg-crm-bg-primary dark:bg-crm-card rounded-lg border border-crm-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-crm-text-muted">Días Activo</p>
              <p className="text-sm font-semibold text-crm-text-primary">
                {diasActivo} día{diasActivo !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Última Actualización */}
        <div className="p-4 bg-crm-bg-primary dark:bg-crm-card rounded-lg border border-crm-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
              <Activity className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-crm-text-muted">Estado</p>
              <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                Activo
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

