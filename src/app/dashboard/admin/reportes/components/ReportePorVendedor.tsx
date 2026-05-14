"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCog, Users, MessageSquare, DollarSign, TrendingUp, Download } from "lucide-react";
import { PageLoader } from "@/components/ui/PageLoader";
import { obtenerReportePorVendedor, type ReportePorVendedorData, type ReportePorVendedorDia } from "../_actions";
import { downloadCSV, type CSVColumn } from "@/lib/export/reportesCSV";
import { useTableSort, SortableHeader } from "@/components/reportes/useTableSort";
import toast from "react-hot-toast";

interface Props {
  periodo: string;
  fechaInicio?: string;
  fechaFin?: string;
}

type SortKey =
  | "fecha"
  | "leadsAsignados"
  | "contactados"
  | "ventas"
  | "conversionPct"
  | "alto"
  | "medio"
  | "bajo"
  | "sinClasificar";

export default function ReportePorVendedor({ periodo, fechaInicio, fechaFin }: Props) {
  const [data, setData] = useState<ReportePorVendedorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vendedor, setVendedor] = useState<string>("todos");

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const r = await obtenerReportePorVendedor(periodo, fechaInicio, fechaFin, vendedor);
    if (r.error) {
      setError(r.error);
      toast.error(r.error);
    } else {
      setData(r.data);
    }
    setLoading(false);
  }, [periodo, fechaInicio, fechaFin, vendedor]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (loading) {
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

  const fmtFecha = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
      weekday: "short",
    });

  const diasConActividad = data.diario.filter(
    (d) => d.leadsAsignados > 0 || d.contactados > 0 || d.ventas > 0
  );

  const sort = useTableSort<ReportePorVendedorDia, SortKey>(
    diasConActividad,
    {
      fecha:          (d) => d.fecha,
      leadsAsignados: (d) => d.leadsAsignados,
      contactados:    (d) => d.contactados,
      ventas:         (d) => d.ventas,
      conversionPct:  (d) => parseFloat(d.conversionPct) || 0,
      alto:           (d) => d.nivelInteres.alto,
      medio:          (d) => d.nivelInteres.medio,
      bajo:           (d) => d.nivelInteres.bajo,
      sinClasificar:  (d) => d.nivelInteres.sinClasificar,
    },
    { defaultKey: "fecha", defaultDir: "asc", ascByDefault: ["fecha"] },
  );

  const diasOrdenados = sort.sortedData;

  const exportarCSV = () => {
    const cols: CSVColumn<ReportePorVendedorDia>[] = [
      { header: "Fecha", accessor: (r) => r.fecha },
      { header: "Leads asignados", accessor: (r) => r.leadsAsignados },
      { header: "Contactados", accessor: (r) => r.contactados },
      { header: "Ventas", accessor: (r) => r.ventas },
      { header: "Conversión %", accessor: (r) => r.conversionPct },
      { header: "Nivel Alto", accessor: (r) => r.nivelInteres.alto },
      { header: "Nivel Medio", accessor: (r) => r.nivelInteres.medio },
      { header: "Nivel Bajo", accessor: (r) => r.nivelInteres.bajo },
      { header: "Sin clasificar", accessor: (r) => r.nivelInteres.sinClasificar },
    ];
    const tag = data.vendedorSeleccionado ?? "todos";
    const hoy = new Date().toISOString().split("T")[0];
    downloadCSV(diasConActividad, cols, `reporte-por-vendedor-${tag}-${hoy}.csv`);
    toast.success("CSV descargado");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" data-pdf-ignore>
        <div>
          <h2 className="text-2xl font-bold text-crm-text-primary flex items-center gap-2">
            <UserCog className="w-6 h-6" />
            Reporte por Vendedor
          </h2>
          <p className="text-crm-text-secondary mt-1">
            Desglose diario: leads asignados, contactados, ventas, conversión y nivel de interés.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-crm-text-secondary">Vendedor:</span>
          <Select value={vendedor} onValueChange={setVendedor}>
            <SelectTrigger className="w-[220px] bg-crm-card border-crm-border text-crm-text-primary">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent className="bg-crm-card border-crm-border max-h-[320px]">
              <SelectItem value="todos" className="text-crm-text-primary hover:bg-crm-card-hover focus:bg-crm-card-hover cursor-pointer">
                Todos los vendedores
              </SelectItem>
              {data.vendedores.map((v) => (
                <SelectItem
                  key={v.username}
                  value={v.username}
                  className="text-crm-text-primary hover:bg-crm-card-hover focus:bg-crm-card-hover cursor-pointer"
                >
                  {v.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={exportarCSV}
            disabled={diasConActividad.length === 0}
            title="Descargar tabla diaria como CSV"
          >
            <Download className="w-4 h-4 mr-1.5" />
            CSV
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-crm-text-secondary">Leads asignados</CardTitle>
            <Users className="h-4 w-4 text-crm-text-muted" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-crm-text-primary">{data.resumen.totalLeads}</div>
            <p className="text-xs text-crm-text-muted mt-1">Período seleccionado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-crm-text-secondary">Contactados</CardTitle>
            <MessageSquare className="h-4 w-4 text-crm-text-muted" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-crm-text-primary">{data.resumen.totalContactados}</div>
            <p className="text-xs text-crm-text-muted mt-1">{data.resumen.ratioContacto}% de los leads</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-crm-text-secondary">Ventas</CardTitle>
            <DollarSign className="h-4 w-4 text-crm-text-muted" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-crm-text-primary">{data.resumen.totalVentas}</div>
            <p className="text-xs text-crm-text-muted mt-1">Cerradas en el período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-crm-text-secondary">Conversión</CardTitle>
            <TrendingUp className="h-4 w-4 text-crm-text-muted" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-crm-text-primary">{data.resumen.conversionGlobal}%</div>
            <p className="text-xs text-crm-text-muted mt-1">Ventas / leads del período</p>
          </CardContent>
        </Card>
      </div>

      {/* Distribución nivel de interés */}
      <Card>
        <CardHeader>
          <CardTitle>Nivel de interés (leads del período)</CardTitle>
          <CardDescription>Mejor prioridad asignada en cliente_propiedad_interes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <NivelChip label="Alto" value={data.resumen.nivelInteres.alto} color="bg-emerald-500" total={data.resumen.totalLeads} />
            <NivelChip label="Medio" value={data.resumen.nivelInteres.medio} color="bg-blue-500" total={data.resumen.totalLeads} />
            <NivelChip label="Bajo" value={data.resumen.nivelInteres.bajo} color="bg-gray-500" total={data.resumen.totalLeads} />
            <NivelChip label="Sin clasificar" value={data.resumen.nivelInteres.sinClasificar} color="bg-amber-500" total={data.resumen.totalLeads} />
          </div>
        </CardContent>
      </Card>

      {/* Tabla diaria */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle diario</CardTitle>
          <CardDescription>
            {diasConActividad.length} día(s) con actividad sobre {data.diario.length} día(s) del período.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-crm-card-hover">
                <tr className="text-left text-crm-text-secondary">
                  <SortableHeader label="Fecha" sortKey="fecha" align="left" current={sort.sortKey} dir={sort.sortDir} onSort={sort.handleSort} />
                  <SortableHeader label="Leads" sortKey="leadsAsignados" current={sort.sortKey} dir={sort.sortDir} onSort={sort.handleSort} />
                  <SortableHeader label="Contactados" sortKey="contactados" current={sort.sortKey} dir={sort.sortDir} onSort={sort.handleSort} />
                  <SortableHeader label="Ventas" sortKey="ventas" current={sort.sortKey} dir={sort.sortDir} onSort={sort.handleSort} />
                  <SortableHeader label="Conv." sortKey="conversionPct" current={sort.sortKey} dir={sort.sortDir} onSort={sort.handleSort} />
                  <SortableHeader label="Alto" sortKey="alto" current={sort.sortKey} dir={sort.sortDir} onSort={sort.handleSort} />
                  <SortableHeader label="Medio" sortKey="medio" current={sort.sortKey} dir={sort.sortDir} onSort={sort.handleSort} />
                  <SortableHeader label="Bajo" sortKey="bajo" current={sort.sortKey} dir={sort.sortDir} onSort={sort.handleSort} />
                  <SortableHeader label="Sin clasif." sortKey="sinClasificar" current={sort.sortKey} dir={sort.sortDir} onSort={sort.handleSort} />
                </tr>
              </thead>
              <tbody>
                {diasOrdenados.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center text-crm-text-muted py-8">
                      Sin actividad en el período seleccionado.
                    </td>
                  </tr>
                )}
                {diasOrdenados.map((d) => (
                  <tr key={d.fecha} className="border-t border-crm-border hover:bg-crm-card-hover/40">
                    <td className="px-4 py-2 text-crm-text-primary capitalize">{fmtFecha(d.fecha)}</td>
                    <td className="px-4 py-2 text-right font-medium text-crm-text-primary">{d.leadsAsignados}</td>
                    <td className="px-4 py-2 text-right text-crm-text-primary">{d.contactados}</td>
                    <td className="px-4 py-2 text-right font-medium text-emerald-700 dark:text-emerald-300">{d.ventas}</td>
                    <td className="px-4 py-2 text-right text-crm-text-secondary">{d.conversionPct}%</td>
                    <td className="px-4 py-2 text-right text-emerald-600 dark:text-emerald-400">{d.nivelInteres.alto}</td>
                    <td className="px-4 py-2 text-right text-blue-600 dark:text-blue-400">{d.nivelInteres.medio}</td>
                    <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">{d.nivelInteres.bajo}</td>
                    <td className="px-4 py-2 text-right text-amber-600 dark:text-amber-400">{d.nivelInteres.sinClasificar}</td>
                  </tr>
                ))}
              </tbody>
              {diasOrdenados.length > 0 && (
                <tfoot className="bg-crm-card-hover">
                  <tr className="border-t border-crm-border font-semibold text-crm-text-primary">
                    <td className="px-4 py-2">Total</td>
                    <td className="px-4 py-2 text-right">{data.resumen.totalLeads}</td>
                    <td className="px-4 py-2 text-right">{data.resumen.totalContactados}</td>
                    <td className="px-4 py-2 text-right">{data.resumen.totalVentas}</td>
                    <td className="px-4 py-2 text-right">{data.resumen.conversionGlobal}%</td>
                    <td className="px-4 py-2 text-right">{data.resumen.nivelInteres.alto}</td>
                    <td className="px-4 py-2 text-right">{data.resumen.nivelInteres.medio}</td>
                    <td className="px-4 py-2 text-right">{data.resumen.nivelInteres.bajo}</td>
                    <td className="px-4 py-2 text-right">{data.resumen.nivelInteres.sinClasificar}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NivelChip({
  label,
  value,
  color,
  total,
}: {
  label: string;
  value: number;
  color: string;
  total: number;
}) {
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
  return (
    <div className="border border-crm-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-crm-text-secondary">{label}</span>
        <span className="text-lg font-bold text-crm-text-primary">{value}</span>
      </div>
      <div className="w-full bg-crm-card-hover rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-crm-text-muted mt-1">{pct}% del total</p>
    </div>
  );
}
