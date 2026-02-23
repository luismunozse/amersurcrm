"use client";

import { useEffect, useState } from "react";
import { useMarketingStats } from "@/hooks/useMarketingStats";
import { Play, MessageSquare, Users, TrendingUp, Clock, Target, RefreshCw, BarChart2 } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { obtenerAnalyticsMarketing } from "@/app/dashboard/admin/marketing/_actions";

// ─────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────

type MetricaCampana = {
  nombre: string;
  enviados: number;
  entregados: number;
  leidos: number;
  respondidos: number;
  fallidos: number;
};

type TendenciaDia = { fecha: string; cantidad: number };
type EstadoConv = { estado: string; valor: number };

type Analytics = {
  metricasCampanas: MetricaCampana[];
  tendenciaMensajes: TendenciaDia[];
  distribucionEstados: EstadoConv[];
};

// ─────────────────────────────────────────────────────────
// Colores para el pie chart
// ─────────────────────────────────────────────────────────

const COLORES_ESTADO: Record<string, string> = {
  ABIERTA: "#3b82f6",
  CERRADA: "#10b981",
  ARCHIVADA: "#6b7280",
};

const LABEL_ESTADO: Record<string, string> = {
  ABIERTA: "Abiertas",
  CERRADA: "Cerradas",
  ARCHIVADA: "Archivadas",
};

// ─────────────────────────────────────────────────────────
// Sección de charts
// ─────────────────────────────────────────────────────────

function SeccionCharts() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    obtenerAnalyticsMarketing().then((r) => {
      if (r.data) setAnalytics(r.data as Analytics);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-crm-card border border-crm-border rounded-xl p-5 h-64 animate-pulse">
            <div className="h-4 bg-crm-border rounded w-32 mb-4" />
            <div className="h-full bg-crm-border/30 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const tieneCampanas = (analytics?.metricasCampanas.length ?? 0) > 0;
  const tieneTendencia = (analytics?.tendenciaMensajes.length ?? 0) > 0;
  const tieneEstados = (analytics?.distribucionEstados.length ?? 0) > 0;

  const EmptyChart = () => (
    <div className="flex flex-col items-center justify-center h-48 text-center">
      <BarChart2 className="w-8 h-8 text-crm-text-muted mb-2" />
      <p className="text-sm text-crm-text-muted">Sin datos disponibles</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Bar Chart — métricas por campaña */}
      <div className="bg-crm-card border border-crm-border rounded-xl p-5 lg:col-span-2">
        <h3 className="text-sm font-semibold text-crm-text-primary mb-4 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-crm-primary" />
          Rendimiento por campaña
        </h3>
        {tieneCampanas ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analytics!.metricasCampanas} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--crm-border, #e5e7eb)" />
              <XAxis dataKey="nombre" tick={{ fontSize: 10, fill: "var(--crm-text-muted, #6b7280)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--crm-text-muted, #6b7280)" }} />
              <Tooltip
                contentStyle={{ background: "var(--crm-card, #fff)", border: "1px solid var(--crm-border, #e5e7eb)", borderRadius: 8, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="enviados" name="Enviados" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="entregados" name="Entregados" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="leidos" name="Leídos" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="fallidos" name="Fallidos" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </div>

      {/* Pie Chart — distribución de estados */}
      <div className="bg-crm-card border border-crm-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-crm-text-primary mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-crm-primary" />
          Estado conversaciones
        </h3>
        {tieneEstados ? (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={analytics!.distribucionEstados}
                dataKey="valor"
                nameKey="estado"
                cx="50%"
                cy="50%"
                outerRadius={75}
                label={(props) => {
                  const estado = props.estado as string ?? "";
                  const pct = typeof props.percent === "number" ? props.percent : 0;
                  return `${LABEL_ESTADO[estado as keyof typeof LABEL_ESTADO] ?? estado} ${(pct * 100).toFixed(0)}%`;
                }}
                labelLine={false}
              >
                {analytics!.distribucionEstados.map((entry) => (
                  <Cell
                    key={entry.estado}
                    fill={COLORES_ESTADO[entry.estado] ?? "#d1d5db"}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [value, LABEL_ESTADO[name as string] ?? name]}
                contentStyle={{ background: "var(--crm-card, #fff)", border: "1px solid var(--crm-border, #e5e7eb)", borderRadius: 8, fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </div>

      {/* Line Chart — tendencia mensajes 30 días */}
      <div className="bg-crm-card border border-crm-border rounded-xl p-5 lg:col-span-3">
        <h3 className="text-sm font-semibold text-crm-text-primary mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-crm-primary" />
          Mensajes enviados — últimos 30 días
        </h3>
        {tieneTendencia ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={analytics!.tendenciaMensajes} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--crm-border, #e5e7eb)" />
              <XAxis
                dataKey="fecha"
                tick={{ fontSize: 10, fill: "var(--crm-text-muted, #6b7280)" }}
                tickFormatter={(v) => v.slice(5)} // MM-DD
              />
              <YAxis tick={{ fontSize: 10, fill: "var(--crm-text-muted, #6b7280)" }} />
              <Tooltip
                contentStyle={{ background: "var(--crm-card, #fff)", border: "1px solid var(--crm-border, #e5e7eb)", borderRadius: 8, fontSize: 12 }}
                labelFormatter={(v) => `Fecha: ${v}`}
              />
              <Line
                type="monotone"
                dataKey="cantidad"
                name="Mensajes"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────

export default function DashboardMetricas() {
  const { data, loading, error, recargar, formatearTiempo } = useMarketingStats(true);

  if (loading) {
    return (
      <div className="space-y-6">
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
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-crm-danger/10 border border-crm-danger/30 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-crm-danger/20 rounded-lg flex items-center justify-center">
              <span className="text-crm-danger text-sm">⚠️</span>
            </div>
            <div>
              <h3 className="text-sm font-medium text-crm-danger">Error cargando métricas</h3>
              <p className="text-xs text-crm-text-secondary">{error}</p>
            </div>
          </div>
          <button
            onClick={recargar}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-crm-danger border border-crm-danger/30 rounded-lg hover:bg-crm-danger/10 transition-colors"
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
      color: "text-crm-primary",
      bgColor: "bg-crm-primary/10",
    },
    {
      title: "Mensajes Hoy",
      value: data?.mensajes_enviados_hoy || 0,
      subtitle: "Enviados",
      icon: MessageSquare,
      color: "text-crm-secondary",
      bgColor: "bg-crm-secondary/10",
    },
    {
      title: "Conversaciones",
      value: data?.conversaciones_abiertas || 0,
      subtitle: "Abiertas",
      icon: Users,
      color: "text-crm-accent",
      bgColor: "bg-crm-accent/10",
    },
    {
      title: "Tasa Respuesta",
      value: `${data?.tasa_respuesta_promedio.toFixed(1) || 0}%`,
      subtitle: "Promedio",
      icon: TrendingUp,
      color: "text-crm-success",
      bgColor: "bg-crm-success/10",
    },
    {
      title: "Tiempo Respuesta",
      value: data ? formatearTiempo(data.tiempo_respuesta_promedio_segundos) : "0s",
      subtitle: "Promedio",
      icon: Clock,
      color: "text-crm-info",
      bgColor: "bg-crm-info/10",
    },
    {
      title: "Conversiones",
      value: data?.conversiones_mes || 0,
      subtitle: "Este mes",
      icon: Target,
      color: "text-crm-warning",
      bgColor: "bg-crm-warning/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metricas.map((metrica, index) => (
          <div
            key={index}
            className="bg-crm-card border border-crm-border rounded-xl p-6 hover:shadow-lg transition-shadow duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-crm-text-secondary">{metrica.title}</h3>
              <div className={`p-2 rounded-lg ${metrica.bgColor}`}>
                <metrica.icon className={`w-4 h-4 ${metrica.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-crm-text-primary mb-1">{metrica.value}</div>
            <p className="text-xs text-crm-text-muted">{metrica.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <SeccionCharts />
    </div>
  );
}
