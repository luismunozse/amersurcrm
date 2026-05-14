"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layers, Users, TrendingUp, Clock } from "lucide-react";
import { PageLoader } from "@/components/ui/PageLoader";
import { obtenerReporteCohortes, type ReporteCohortesData } from "../_actions";
import toast from "react-hot-toast";

const VENTANAS_DISPONIBLES = [3, 6, 9, 12] as const;

function colorPorPorcentaje(pct: number): string {
  if (pct <= 0) return "bg-crm-card-hover/40 text-crm-text-muted";
  if (pct < 5) return "bg-emerald-100/40 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300";
  if (pct < 15) return "bg-emerald-200/60 dark:bg-emerald-800/40 text-emerald-900 dark:text-emerald-200";
  if (pct < 30) return "bg-emerald-300/70 dark:bg-emerald-700/50 text-emerald-900 dark:text-emerald-100";
  if (pct < 50) return "bg-emerald-400/80 dark:bg-emerald-600/60 text-emerald-950 dark:text-white font-semibold";
  return "bg-emerald-500 dark:bg-emerald-500 text-white font-bold";
}

export default function ReporteCohortes() {
  const [data, setData] = useState<ReporteCohortesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ventana, setVentana] = useState<number>(6);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const r = await obtenerReporteCohortes(ventana);
    if (r.error) {
      setError(r.error);
      toast.error(r.error);
    } else {
      setData(r.data);
    }
    setLoading(false);
  }, [ventana]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <PageLoader size="sm" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 dark:text-red-400 mb-4">{error || "Sin datos"}</div>
        <Button onClick={cargar}>Reintentar</Button>
      </div>
    );
  }

  const { cohortes, promediosPorLag, resumen, maxLag } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" data-pdf-ignore>
        <div>
          <h2 className="text-2xl font-bold text-crm-text-primary flex items-center gap-2">
            <Layers className="w-6 h-6" />
            Análisis de Cohortes
          </h2>
          <p className="text-crm-text-secondary mt-1">
            Leads dados de alta cada mes y su conversión a venta en meses posteriores.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-crm-text-secondary">Ventana:</span>
          <Select value={String(ventana)} onValueChange={(v) => setVentana(parseInt(v))}>
            <SelectTrigger className="w-[140px] bg-crm-card border-crm-border text-crm-text-primary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-crm-card border-crm-border">
              {VENTANAS_DISPONIBLES.map((v) => (
                <SelectItem
                  key={v}
                  value={String(v)}
                  className="text-crm-text-primary hover:bg-crm-card-hover focus:bg-crm-card-hover cursor-pointer"
                >
                  {v} meses
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Leads (cohortes)" value={resumen.totalLeadsTodosCohorts.toString()} hint={`${ventana} meses`} icon={Users} />
        <KPICard label="Convertidos" value={resumen.totalConvertidosTodosCohorts.toString()} hint="A venta cerrada" icon={TrendingUp} />
        <KPICard label="Conversión global" value={`${resumen.conversionGlobal}%`} hint="Acumulado al hoy" icon={TrendingUp} />
        <KPICard
          label="Mediana ciclo"
          value={resumen.medianaMesesAVenta === 0 ? "Mismo mes" : `${resumen.medianaMesesAVenta} mes${resumen.medianaMesesAVenta === 1 ? "" : "es"}`}
          hint="Alta → primera venta"
          icon={Clock}
        />
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Matriz de cohortes</CardTitle>
          <CardDescription>
            Filas = mes de alta del cohort. Columnas = lag en meses (M+0 = mismo mes). Valor = % conversión acumulada.
            Color más fuerte = mejor conversión.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {cohortes.length === 0 ? (
            <div className="text-center text-crm-text-muted py-8">
              Sin cohortes en la ventana seleccionada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-crm-card-hover">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-crm-text-secondary sticky left-0 bg-crm-card-hover z-10 min-w-[110px]">
                      Cohort
                    </th>
                    <th className="text-right px-3 py-2 font-semibold text-crm-text-secondary min-w-[70px]">
                      Leads
                    </th>
                    {Array.from({ length: maxLag + 1 }).map((_, lag) => (
                      <th key={lag} className="text-center px-2 py-2 font-semibold text-crm-text-secondary min-w-[70px]">
                        M+{lag}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cohortes.map((c) => (
                    <tr key={c.mesAlta} className="border-t border-crm-border">
                      <td className="px-3 py-2 sticky left-0 bg-crm-card z-10 capitalize text-crm-text-primary font-medium">
                        {c.etiqueta}
                      </td>
                      <td className="px-3 py-2 text-right text-crm-text-primary tabular-nums">
                        {c.totalLeads}
                      </td>
                      {Array.from({ length: maxLag + 1 }).map((_, lag) => {
                        const cell = c.cells[lag];
                        if (!cell) {
                          return (
                            <td key={lag} className="px-2 py-2 text-center text-crm-text-muted">
                              —
                            </td>
                          );
                        }
                        const pct = parseFloat(cell.porcentajeAcumulado);
                        return (
                          <td
                            key={lag}
                            className={`px-2 py-2 text-center tabular-nums ${colorPorPorcentaje(pct)}`}
                            title={`${cell.cantidadAcumulada} de ${c.totalLeads} convertidos al ${cell.mesVenta} (lag ${lag})`}
                          >
                            {c.totalLeads > 0 ? `${cell.porcentajeAcumulado}%` : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-crm-card-hover">
                  <tr className="border-t border-crm-border font-semibold text-crm-text-primary">
                    <td className="px-3 py-2 sticky left-0 bg-crm-card-hover z-10">
                      Promedio
                    </td>
                    <td className="px-3 py-2 text-right">{resumen.totalLeadsTodosCohorts}</td>
                    {promediosPorLag.map(({ lag, promedioPct }) => (
                      <td
                        key={lag}
                        className={`px-2 py-2 text-center tabular-nums ${colorPorPorcentaje(parseFloat(promedioPct))}`}
                      >
                        {promedioPct}%
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cómo leer esta tabla</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-crm-text-secondary space-y-2">
          <p>
            Cada fila es un <strong className="text-crm-text-primary">cohort</strong>: leads dados de alta en ese mes.
            Cada columna mide qué porcentaje de ese cohort había convertido a venta tras N meses (lag).
          </p>
          <p>
            La columna <strong className="text-crm-text-primary">M+0</strong> = leads que compraron en su mismo mes de alta.
            <strong className="text-crm-text-primary"> M+3</strong> = ya convertidos en el cuarto mes posterior, etc.
          </p>
          <p>
            La fila <strong className="text-crm-text-primary">Promedio</strong> al pie indica la conversión típica del cohort
            por lag — útil para proyectar ventas futuras de cohortes recientes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function KPICard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Users;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-crm-text-secondary">{label}</CardTitle>
        <Icon className="h-4 w-4 text-crm-text-muted" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-crm-text-primary">{value}</div>
        <p className="text-xs text-crm-text-muted mt-1">{hint}</p>
      </CardContent>
    </Card>
  );
}
