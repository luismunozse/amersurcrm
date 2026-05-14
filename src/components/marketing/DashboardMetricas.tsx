"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MessageSquare,
  TrendingUp,
  Send,
  CheckCircle2,
  Reply,
  RefreshCw,
  BarChart2,
  Trophy,
  FileText,
} from "lucide-react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  obtenerAnalyticsMarketing,
  type PeriodoMarketing,
} from "@/app/dashboard/admin/marketing/_actions";

type TendenciaDia = { fecha: string; cantidad: number };
type DistEstado = { estado: string; valor: number };
type Totales = {
  envios: number;
  confirmados: number;
  respondidos: number;
  tasa_respuesta: number;
  tasa_confirmacion: number;
};
type RankingVendedor = {
  vendedor_id: string;
  username: string;
  envios: number;
  confirmados: number;
  respondidos: number;
  tasa_respuesta: number;
  tasa_confirmacion: number;
};
type MetricaPlantilla = {
  template_id: string;
  nombre: string;
  envios: number;
  confirmados: number;
  respondidos: number;
  tasa_respuesta: number;
  tasa_confirmacion: number;
};

type Analytics = {
  periodo: PeriodoMarketing;
  desde: string;
  totales: Totales;
  tendenciaMensajes: TendenciaDia[];
  distribucionEstados: DistEstado[];
  rankingVendedores: RankingVendedor[];
  metricasPlantillas: MetricaPlantilla[];
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

const PERIODOS: { value: PeriodoMarketing; label: string }[] = [
  { value: "hoy", label: "Hoy" },
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "90d", label: "90 días" },
];

export default function DashboardMetricas() {
  const [periodo, setPeriodo] = useState<PeriodoMarketing>("30d");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await obtenerAnalyticsMarketing(periodo);
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setAnalytics(result.data as Analytics);
    }
    setLoading(false);
  }, [periodo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (loading && !analytics) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-crm-card border border-crm-border rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-crm-card border border-crm-border rounded-xl p-6 animate-pulse h-32"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-6 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-red-700 dark:text-red-300">
            Error cargando métricas
          </h3>
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
        <button
          onClick={cargar}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30"
        >
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </button>
      </div>
    );
  }

  const t = analytics?.totales;
  const metricas = [
    {
      title: "Envíos",
      value: t?.envios ?? 0,
      subtitle: "Plantillas abiertas",
      icon: Send,
      color: "text-crm-secondary",
      bgColor: "bg-crm-secondary/10",
    },
    {
      title: "Confirmados",
      value: t?.confirmados ?? 0,
      subtitle: `${(t?.tasa_confirmacion ?? 0).toFixed(1)}% de envíos`,
      icon: CheckCircle2,
      color: "text-crm-success",
      bgColor: "bg-crm-success/10",
    },
    {
      title: "Respuestas",
      value: t?.respondidos ?? 0,
      subtitle: "Cliente respondió",
      icon: Reply,
      color: "text-crm-info",
      bgColor: "bg-crm-info/10",
    },
    {
      title: "Tasa Respuesta",
      value: `${(t?.tasa_respuesta ?? 0).toFixed(1)}%`,
      subtitle: "Respondidos / envíos",
      icon: TrendingUp,
      color: "text-crm-warning",
      bgColor: "bg-crm-warning/10",
    },
  ];

  const tieneTendencia = (analytics?.tendenciaMensajes.length ?? 0) > 0;
  const tieneEstados = (analytics?.distribucionEstados.length ?? 0) > 0;
  const tieneVendedores = (analytics?.rankingVendedores.length ?? 0) > 0;
  const tienePlantillas = (analytics?.metricasPlantillas.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 bg-crm-card border border-crm-border rounded-lg p-1">
          {PERIODOS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriodo(p.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                periodo === p.value
                  ? "bg-crm-primary text-white shadow-sm"
                  : "text-crm-text-secondary hover:bg-crm-card-hover"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          onClick={cargar}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-crm-border rounded-lg hover:bg-crm-card-hover disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-crm-card border border-crm-border rounded-xl p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-crm-text-primary mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-crm-primary" />
            Tendencia de envíos
          </h3>
          {tieneTendencia ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={analytics!.tendenciaMensajes}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--crm-border, #e5e7eb)" />
                <XAxis
                  dataKey="fecha"
                  tick={{ fontSize: 10, fill: "var(--crm-text-muted, #6b7280)" }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 10, fill: "var(--crm-text-muted, #6b7280)" }} />
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
            <EmptyChart label="Sin envíos en este período" />
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
                  formatter={(value, name) => [value, LABEL_ESTADO[name as string] ?? name]}
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
            <EmptyChart label="Sin datos" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RankingTable
          title="Ranking de vendedores"
          icon={Trophy}
          empty="Sin envíos de vendedores en este período"
          headers={["Vendedor", "Envíos", "Resp.", "Tasa"]}
          rows={
            tieneVendedores
              ? analytics!.rankingVendedores.slice(0, 10).map((v) => ({
                  key: v.vendedor_id,
                  cells: [
                    v.username,
                    v.envios.toString(),
                    v.respondidos.toString(),
                    `${v.tasa_respuesta.toFixed(1)}%`,
                  ],
                  highlight: v.tasa_respuesta >= 30,
                }))
              : []
          }
        />

        <RankingTable
          title="Plantillas más efectivas"
          icon={FileText}
          empty="Sin uso de plantillas en este período"
          headers={["Plantilla", "Envíos", "Resp.", "Tasa"]}
          rows={
            tienePlantillas
              ? analytics!.metricasPlantillas
                  .filter((p) => p.envios >= 3) // ruido fuera
                  .slice(0, 10)
                  .map((p) => ({
                    key: p.template_id,
                    cells: [
                      p.nombre,
                      p.envios.toString(),
                      p.respondidos.toString(),
                      `${p.tasa_respuesta.toFixed(1)}%`,
                    ],
                    highlight: p.tasa_respuesta >= 30,
                  }))
              : []
          }
        />
      </div>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-center">
      <BarChart2 className="w-8 h-8 text-crm-text-muted mb-2" />
      <p className="text-sm text-crm-text-muted">{label}</p>
    </div>
  );
}

interface RankingRow {
  key: string;
  cells: string[];
  highlight?: boolean;
}

function RankingTable({
  title,
  icon: Icon,
  headers,
  rows,
  empty,
}: {
  title: string;
  icon: typeof Trophy;
  headers: string[];
  rows: RankingRow[];
  empty: string;
}) {
  return (
    <div className="bg-crm-card border border-crm-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-crm-text-primary mb-3 flex items-center gap-2">
        <Icon className="w-4 h-4 text-crm-primary" />
        {title}
      </h3>
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-center">
          <Icon className="w-8 h-8 text-crm-text-muted mb-2" />
          <p className="text-xs text-crm-text-muted">{empty}</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-crm-text-muted">
                {headers.map((h, idx) => (
                  <th
                    key={h}
                    className={`px-2 py-1.5 font-medium ${idx === 0 ? "text-left" : "text-right"}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-crm-border">
              {rows.map((r, idx) => (
                <tr key={r.key} className="hover:bg-crm-card-hover">
                  {r.cells.map((c, cidx) => (
                    <td
                      key={cidx}
                      className={`px-2 py-1.5 ${cidx === 0 ? "text-left text-crm-text-primary" : "text-right text-crm-text-secondary tabular-nums"} ${
                        cidx === r.cells.length - 1 && r.highlight
                          ? "font-semibold text-crm-success"
                          : ""
                      }`}
                    >
                      {cidx === 0 && idx < 3 ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={`w-5 h-5 inline-flex items-center justify-center rounded-full text-[10px] font-bold ${
                              idx === 0
                                ? "bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100"
                                : idx === 1
                                  ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                  : "bg-orange-200 dark:bg-orange-900 text-orange-900 dark:text-orange-100"
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span className="truncate max-w-[180px]">{c}</span>
                        </span>
                      ) : cidx === 0 ? (
                        <span className="truncate max-w-[200px] block">{c}</span>
                      ) : (
                        c
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
