"use client";

import { useEffect, useState } from "react";
import {
  Play,
  MessageSquare,
  TrendingUp,
  Send,
  CheckCircle2,
  Reply,
  RefreshCw,
  BarChart2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useMarketingStats } from "@/hooks/useMarketingStats";
import { obtenerAnalyticsMarketing } from "@/app/dashboard/admin/marketing/_actions";

type MetricaCampana = {
  nombre: string;
  abiertos: number;
  enviados: number;
  respondidos: number;
  descartados: number;
};

type TendenciaDia = { fecha: string; cantidad: number };
type DistEstado = { estado: string; valor: number };

type Analytics = {
  metricasCampanas: MetricaCampana[];
  tendenciaMensajes: TendenciaDia[];
  distribucionEstados: DistEstado[];
};

const COLORES_ESTADO: Record<string, string> = {
  abierto: "#3b82f6",
  enviado: "#10b981",
  respondido: "#8b5cf6",
  descartado: "#6b7280",
};

const LABEL_ESTADO: Record<string, string> = {
  abierto: "Abiertos",
  enviado: "Enviados",
  respondido: "Respondidos",
  descartado: "Descartados",
};

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
          <div
            key={i}
            className="bg-crm-card border border-crm-border rounded-xl p-5 h-64 animate-pulse"
          >
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

  const Empty = () => (
    <div className="flex flex-col items-center justify-center h-48 text-center">
      <BarChart2 className="w-8 h-8 text-crm-text-muted mb-2" />
      <p className="text-sm text-crm-text-muted">Sin datos disponibles</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="bg-crm-card border border-crm-border rounded-xl p-5 lg:col-span-2">
        <h3 className="text-sm font-semibold text-crm-text-primary mb-4 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-crm-primary" />
          Rendimiento por campaña
        </h3>
        {tieneCampanas ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={analytics!.metricasCampanas}
              margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--crm-border, #e5e7eb)"
              />
              <XAxis
                dataKey="nombre"
                tick={{ fontSize: 10, fill: "var(--crm-text-muted, #6b7280)" }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--crm-text-muted, #6b7280)" }}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--crm-card, #fff)",
                  border: "1px solid var(--crm-border, #e5e7eb)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="abiertos" name="Abiertos" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="enviados" name="Enviados" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="respondidos" name="Respondidos" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="descartados" name="Descartados" fill="#6b7280" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Empty />
        )}
      </div>

      <div className="bg-crm-card border border-crm-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-crm-text-primary mb-4 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-crm-primary" />
          Estado de envíos
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
                  const estado = (props.estado as string) ?? "";
                  const pct = typeof props.percent === "number" ? props.percent : 0;
                  return `${LABEL_ESTADO[estado] ?? estado} ${(pct * 100).toFixed(0)}%`;
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
                formatter={(value, name) => [
                  value,
                  LABEL_ESTADO[name as string] ?? name,
                ]}
                contentStyle={{
                  background: "var(--crm-card, #fff)",
                  border: "1px solid var(--crm-border, #e5e7eb)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <Empty />
        )}
      </div>

      <div className="bg-crm-card border border-crm-border rounded-xl p-5 lg:col-span-3">
        <h3 className="text-sm font-semibold text-crm-text-primary mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-crm-primary" />
          Envíos de plantillas — últimos 30 días
        </h3>
        {tieneTendencia ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart
              data={analytics!.tendenciaMensajes}
              margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--crm-border, #e5e7eb)"
              />
              <XAxis
                dataKey="fecha"
                tick={{ fontSize: 10, fill: "var(--crm-text-muted, #6b7280)" }}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--crm-text-muted, #6b7280)" }}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--crm-card, #fff)",
                  border: "1px solid var(--crm-border, #e5e7eb)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={(v) => `Fecha: ${v}`}
              />
              <Line
                type="monotone"
                dataKey="cantidad"
                name="Envíos"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <Empty />
        )}
      </div>
    </div>
  );
}

export default function DashboardMetricas() {
  const { data, loading, error, recargar } = useMarketingStats(true);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-crm-card border border-crm-border rounded-xl p-6 animate-pulse"
            >
              <div className="h-4 bg-crm-border rounded w-24 mb-4" />
              <div className="h-8 bg-crm-border rounded w-16 mb-2" />
              <div className="h-3 bg-crm-border rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-crm-danger/10 border border-crm-danger/30 rounded-xl p-6 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-crm-danger">
            Error cargando métricas
          </h3>
          <p className="text-xs text-crm-text-secondary">{error}</p>
        </div>
        <button
          onClick={recargar}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-crm-danger border border-crm-danger/30 rounded-lg hover:bg-crm-danger/10"
        >
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </button>
      </div>
    );
  }

  const metricas = [
    {
      title: "Campañas Activas",
      value: data?.campanas_activas ?? 0,
      subtitle: "En ejecución",
      icon: Play,
      color: "text-crm-primary",
      bgColor: "bg-crm-primary/10",
    },
    {
      title: "Envíos Hoy",
      value: data?.envios_hoy ?? 0,
      subtitle: "Plantillas abiertas",
      icon: Send,
      color: "text-crm-secondary",
      bgColor: "bg-crm-secondary/10",
    },
    {
      title: "Envíos Semana",
      value: data?.envios_semana ?? 0,
      subtitle: "Últimos 7 días",
      icon: MessageSquare,
      color: "text-crm-accent",
      bgColor: "bg-crm-accent/10",
    },
    {
      title: "Confirmados Hoy",
      value: data?.marcados_enviados_hoy ?? 0,
      subtitle: "Vendedor envió",
      icon: CheckCircle2,
      color: "text-crm-success",
      bgColor: "bg-crm-success/10",
    },
    {
      title: "Respuestas Hoy",
      value: data?.marcados_respondidos_hoy ?? 0,
      subtitle: "Cliente respondió",
      icon: Reply,
      color: "text-crm-info",
      bgColor: "bg-crm-info/10",
    },
    {
      title: "Tasa Respuesta",
      value: `${(data?.tasa_respuesta_promedio ?? 0).toFixed(1)}%`,
      subtitle: "Promedio semana",
      icon: TrendingUp,
      color: "text-crm-warning",
      bgColor: "bg-crm-warning/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metricas.map((m) => (
          <div
            key={m.title}
            className="bg-crm-card border border-crm-border rounded-xl p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-crm-text-secondary">
                {m.title}
              </h3>
              <div className={`p-2 rounded-lg ${m.bgColor}`}>
                <m.icon className={`w-4 h-4 ${m.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-crm-text-primary mb-1">
              {m.value}
            </div>
            <p className="text-xs text-crm-text-muted">{m.subtitle}</p>
          </div>
        ))}
      </div>

      <SeccionCharts />
    </div>
  );
}
