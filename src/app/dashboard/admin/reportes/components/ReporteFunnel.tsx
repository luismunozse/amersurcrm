"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { TrendingUp, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { obtenerReporteFunnel } from "../_actions";
import toast from "react-hot-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ReporteFunnelProps {
  periodo: string;
}

const ESTADO_LABELS: Record<string, string> = {
  nuevo:           'Nuevo',
  activo:          'Activo',
  en_negociacion:  'En negociación',
  interesado:      'Interesado',
  no_interesado:   'No interesado',
  reservado:       'Reservado',
  vendido:         'Vendido',
  perdido:         'Perdido',
  sin_estado:      'Sin estado',
};

const ESTADO_COLORS: Record<string, string> = {
  nuevo:           'bg-blue-100 text-blue-800',
  activo:          'bg-green-100 text-green-800',
  en_negociacion:  'bg-yellow-100 text-yellow-800',
  interesado:      'bg-indigo-100 text-indigo-800',
  no_interesado:   'bg-gray-100 text-gray-600',
  reservado:       'bg-orange-100 text-orange-800',
  vendido:         'bg-emerald-100 text-emerald-800',
  perdido:         'bg-red-100 text-red-700',
  sin_estado:      'bg-gray-100 text-gray-500',
};

export default function ReporteFunnel({ periodo }: ReporteFunnelProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await obtenerReporteFunnel(periodo);
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        setData(result.data);
      }
    } catch {
      setError('Error al cargar los datos del funnel');
    } finally {
      setLoading(false);
    }
  }, [periodo]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-crm-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-900/20">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data || data.totalLeads === 0) {
    return (
      <div className="text-center py-16 text-crm-text-muted">
        <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">Sin datos para el período seleccionado</p>
        <p className="text-sm mt-1">No se registraron nuevos leads en los últimos {periodo} días.</p>
      </div>
    );
  }

  const maxCantidad = data.etapas[0]?.cantidad || 1;

  return (
    <div className="space-y-6">
      {/* KPIs superiores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="crm-card p-4 text-center">
          <p className="text-3xl font-bold text-crm-text-primary">{data.totalLeads}</p>
          <p className="text-xs text-crm-text-muted mt-1">Leads captados</p>
        </div>
        <div className="crm-card p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{data.totalVentas}</p>
          <p className="text-xs text-crm-text-muted mt-1">Ventas cerradas</p>
        </div>
        <div className="crm-card p-4 text-center">
          <p className="text-3xl font-bold text-crm-primary">{data.tasaConversionFinal}%</p>
          <p className="text-xs text-crm-text-muted mt-1">Conversión lead→venta</p>
        </div>
        <div className="crm-card p-4 text-center">
          <p className="text-2xl font-bold text-crm-text-primary">
            {data.valorVentas > 0
              ? new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(data.valorVentas)
              : '—'}
          </p>
          <p className="text-xs text-crm-text-muted mt-1">Valor generado</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funnel visual */}
        <div className="lg:col-span-2">
          <Card className="bg-crm-card border-crm-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-crm-text-primary flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Embudo de conversión
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.etapas.map((etapa: any, idx: number) => {
                const anchoPct = Math.max((etapa.cantidad / maxCantidad) * 100, 4);
                return (
                  <div key={etapa.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-crm-text-muted mb-1">
                      <span className="font-medium text-crm-text-primary flex items-center gap-1.5">
                        <span>{etapa.icon}</span>
                        {etapa.label}
                      </span>
                      <span className="font-bold text-crm-text-primary tabular-nums">
                        {etapa.cantidad} <span className="font-normal text-crm-text-muted">({etapa.porcentaje}%)</span>
                      </span>
                    </div>
                    <div className="relative h-10 bg-crm-border/40 rounded-lg overflow-hidden">
                      <div
                        className="h-full rounded-lg flex items-center justify-center transition-all duration-700"
                        style={{ width: `${anchoPct}%`, backgroundColor: etapa.color }}
                      >
                        {etapa.cantidad > 0 && (
                          <span className="text-white text-xs font-bold px-2 truncate">{etapa.cantidad}</span>
                        )}
                      </div>
                    </div>
                    {idx < data.etapas.length - 1 && data.conversiones[idx] && (
                      <div className="flex items-center gap-1 text-xs text-crm-text-muted pl-1 py-0.5">
                        <ArrowRight className="w-3 h-3 flex-shrink-0" />
                        <span>Conversión a siguiente etapa:</span>
                        <span className={`font-bold ${
                          data.conversiones[idx].tasa >= 50 ? 'text-green-600' :
                          data.conversiones[idx].tasa >= 25 ? 'text-yellow-600' :
                          'text-red-500'
                        }`}>
                          {data.conversiones[idx].tasa}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Panel derecho */}
        <div className="space-y-4">
          {/* Tasas de conversión entre etapas */}
          <Card className="bg-crm-card border-crm-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-crm-text-primary">Conversión por etapa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.conversiones.map((conv: any, idx: number) => (
                <div key={idx}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-crm-text-muted">{conv.desde}</span>
                    <span className={`text-xs font-bold ${
                      conv.tasa >= 50 ? 'text-green-600' :
                      conv.tasa >= 25 ? 'text-yellow-600' :
                      'text-red-500'
                    }`}>{conv.tasa}%</span>
                  </div>
                  <div className="h-1.5 bg-crm-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        conv.tasa >= 50 ? 'bg-green-500' :
                        conv.tasa >= 25 ? 'bg-yellow-500' :
                        'bg-red-400'
                      }`}
                      style={{ width: `${Math.min(conv.tasa, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Distribución por estado */}
          <Card className="bg-crm-card border-crm-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-crm-text-primary">Estado de los leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(data.distribucionEstado as Record<string, number>)
                  .sort(([, a], [, b]) => b - a)
                  .map(([estado, count]) => (
                    <div key={estado} className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLORS[estado] || 'bg-gray-100 text-gray-600'}`}>
                        {ESTADO_LABELS[estado] || estado}
                      </span>
                      <span className="text-xs font-bold text-crm-text-primary tabular-nums">{count as number}</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
