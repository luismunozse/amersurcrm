"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, Users, MessageSquare, DollarSign, TrendingUp, CheckCircle2 } from "lucide-react";
import { PageLoader } from "@/components/ui/PageLoader";
import { obtenerReportePorProyecto, type ReportePorProyectoData } from "../_actions";
import toast from "react-hot-toast";

interface Props {
  periodo: string;
  fechaInicio?: string;
  fechaFin?: string;
}

function formatearMonedaPEN(valor: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
}

export default function ReportePorProyecto({ periodo, fechaInicio, fechaFin }: Props) {
  const [data, setData] = useState<ReportePorProyectoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proyectoId, setProyectoId] = useState<string>("");

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const r = await obtenerReportePorProyecto(proyectoId || null, periodo, fechaInicio, fechaFin);
    if (r.error) {
      setError(r.error);
      toast.error(r.error);
    } else {
      setData(r.data);
      // Auto-seleccionar primer proyecto si hay opciones y no hay selección
      if (!proyectoId && r.data && r.data.proyectos.length > 0) {
        setProyectoId(r.data.proyectos[0].id);
      }
    }
    setLoading(false);
  }, [proyectoId, periodo, fechaInicio, fechaFin]);

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

  const { proyectos, proyectoSeleccionado, inventario, ventas, leads, nivelInteres, topVendedores } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" data-pdf-ignore>
        <div>
          <h2 className="text-2xl font-bold text-crm-text-primary flex items-center gap-2">
            <Building className="w-6 h-6" />
            Reporte por Proyecto
          </h2>
          <p className="text-crm-text-secondary mt-1">
            KPIs comerciales y de inventario filtrados por proyecto inmobiliario.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-crm-text-secondary">Proyecto:</span>
          <Select value={proyectoId} onValueChange={setProyectoId}>
            <SelectTrigger className="w-[260px] bg-crm-card border-crm-border text-crm-text-primary">
              <SelectValue placeholder="Seleccionar proyecto" />
            </SelectTrigger>
            <SelectContent className="bg-crm-card border-crm-border max-h-[320px]">
              {proyectos.length === 0 && (
                <div className="px-3 py-2 text-sm text-crm-text-muted">
                  No hay proyectos activos
                </div>
              )}
              {proyectos.map((p) => (
                <SelectItem
                  key={p.id}
                  value={p.id}
                  className="text-crm-text-primary hover:bg-crm-card-hover focus:bg-crm-card-hover cursor-pointer"
                >
                  {p.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!proyectoSeleccionado ? (
        <Card>
          <CardContent className="py-12 text-center text-crm-text-muted">
            Seleccione un proyecto para ver el reporte.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              label="Avance comercial"
              value={`${inventario.avancePct}%`}
              hint={`${inventario.vendidos}/${inventario.total} vendidos`}
              icon={CheckCircle2}
            />
            <KPICard
              label="Disponibles"
              value={String(inventario.disponibles)}
              hint={formatearMonedaPEN(inventario.valorDisponible)}
              icon={Building}
            />
            <KPICard
              label="Ventas del período"
              value={String(ventas.cantidad)}
              hint={formatearMonedaPEN(ventas.monto)}
              icon={DollarSign}
            />
            <KPICard
              label="Conversión"
              value={`${leads.conversionPct}%`}
              hint={`${ventas.cantidad} vtas / ${leads.totalInteresados} leads`}
              icon={TrendingUp}
            />
          </div>

          {/* Inventario detalle + Leads */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Inventario</CardTitle>
                <CardDescription>
                  {inventario.lotes} lote(s) + {inventario.propiedades} propiedad(es) en el proyecto.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <FilaResumen label="Total" valor={inventario.total} />
                <FilaResumen label="Disponibles" valor={inventario.disponibles} color="text-emerald-600 dark:text-emerald-400" />
                <FilaResumen label="Vendidos" valor={inventario.vendidos} color="text-blue-600 dark:text-blue-400" />
                <FilaResumen label="Reservados" valor={inventario.reservados} color="text-amber-600 dark:text-amber-400" />
                {inventario.otros > 0 && (
                  <FilaResumen label="Otros estados" valor={inventario.otros} color="text-crm-text-muted" />
                )}
                <div className="pt-2 mt-2 border-t border-crm-border">
                  <div className="w-full bg-crm-card-hover rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${inventario.avancePct}%` }}
                    />
                  </div>
                  <p className="text-xs text-crm-text-muted mt-1">
                    {inventario.avancePct}% vendido · {formatearMonedaPEN(inventario.valorVendido)} acumulado
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Leads del proyecto</CardTitle>
                <CardDescription>
                  Clientes con interés registrado en el proyecto.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <FilaResumen label="Total interesados" valor={leads.totalInteresados} icon={Users} />
                <FilaResumen label="Nuevos en el período" valor={leads.nuevosPeriodo} color="text-emerald-600 dark:text-emerald-400" />
                <FilaResumen label="Contactados en el período" valor={leads.contactadosPeriodo} icon={MessageSquare} />
                <FilaResumen
                  label="Ticket promedio venta"
                  valor={ventas.ticketPromedio > 0 ? formatearMonedaPEN(ventas.ticketPromedio) : "—"}
                />
              </CardContent>
            </Card>
          </div>

          {/* Nivel interés */}
          <Card>
            <CardHeader>
              <CardTitle>Nivel de interés (interesados activos)</CardTitle>
              <CardDescription>
                Mejor prioridad de cada cliente sobre lotes/propiedades del proyecto.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <NivelChip label="Alto" value={nivelInteres.alto} color="bg-emerald-500" total={leads.totalInteresados} />
                <NivelChip label="Medio" value={nivelInteres.medio} color="bg-blue-500" total={leads.totalInteresados} />
                <NivelChip label="Bajo" value={nivelInteres.bajo} color="bg-gray-500" total={leads.totalInteresados} />
                <NivelChip label="Sin clasificar" value={nivelInteres.sinClasificar} color="bg-amber-500" total={leads.totalInteresados} />
              </div>
            </CardContent>
          </Card>

          {/* Top vendedores */}
          <Card>
            <CardHeader>
              <CardTitle>Top vendedores del proyecto</CardTitle>
              <CardDescription>Ventas registradas en el período.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {topVendedores.length === 0 ? (
                <div className="text-center text-crm-text-muted py-8">
                  Sin ventas registradas en el período para este proyecto.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-crm-card-hover">
                      <tr className="text-left text-crm-text-secondary">
                        <th className="px-4 py-2 font-medium">#</th>
                        <th className="px-4 py-2 font-medium">Vendedor</th>
                        <th className="px-4 py-2 font-medium text-right">Ventas</th>
                        <th className="px-4 py-2 font-medium text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topVendedores.map((v, i) => (
                        <tr key={v.username} className="border-t border-crm-border hover:bg-crm-card-hover/40">
                          <td className="px-4 py-2 text-crm-text-muted">{i + 1}</td>
                          <td className="px-4 py-2 text-crm-text-primary font-medium">
                            {v.nombre}
                            <span className="text-xs text-crm-text-muted ml-2">@{v.username}</span>
                          </td>
                          <td className="px-4 py-2 text-right text-crm-text-primary">{v.cantidadVentas}</td>
                          <td className="px-4 py-2 text-right font-semibold text-crm-text-primary tabular-nums">
                            {formatearMonedaPEN(v.montoVentas)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
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
  icon: typeof Building;
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

function FilaResumen({
  label,
  valor,
  color,
  icon: Icon,
}: {
  label: string;
  valor: string | number;
  color?: string;
  icon?: typeof Building;
}) {
  return (
    <div className="flex justify-between items-center p-2.5 bg-crm-card-hover rounded-lg">
      <span className="text-sm text-crm-text-secondary inline-flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-crm-text-muted" />}
        {label}
      </span>
      <span className={`font-bold ${color ?? "text-crm-text-primary"}`}>{valor}</span>
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
