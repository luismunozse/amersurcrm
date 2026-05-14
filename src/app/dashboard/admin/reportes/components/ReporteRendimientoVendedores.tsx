"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Users, TrendingUp, Target, Award, ArrowUp, ArrowDown } from "lucide-react";
import { PageLoader } from "@/components/ui/PageLoader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { obtenerReporteRendimiento, type ReporteRendimientoData, type TopPerformer } from "../_actions";
import { useTableSort } from "@/components/reportes/useTableSort";
import toast from "react-hot-toast";

type PerformerSortKey = "name" | "sales" | "deals" | "conversion" | "cumplimiento";

interface ReporteRendimientoVendedoresProps {
  periodo: string;
  fechaInicio?: string;
  fechaFin?: string;
}

export default function ReporteRendimientoVendedores({ periodo, fechaInicio, fechaFin }: ReporteRendimientoVendedoresProps) {
  const [data, setData] = useState<ReporteRendimientoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await obtenerReporteRendimiento(periodo, fechaInicio, fechaFin);

    if (result.error) {
      setError(result.error);
      toast.error(result.error);
    } else {
      setData(result.data);
    }

    setLoading(false);
  }, [periodo, fechaInicio, fechaFin]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

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
        <div className="text-red-600 dark:text-red-400 mb-4">{error || 'Error cargando datos'}</div>
        <Button onClick={cargarDatos}>Reintentar</Button>
      </div>
    );
  }

  const { performanceStats, topPerformers, resumen } = data;

  const sortPerformers = useTableSort<TopPerformer, PerformerSortKey>(
    topPerformers || [],
    {
      name:         (p) => p.name,
      sales:        (p) => p.sales,
      deals:        (p) => p.deals,
      conversion:   (p) => parseFloat(String(p.conversion).replace("%", "")) || 0,
      cumplimiento: (p) => parseFloat(p.cumplimiento ?? "0") || 0,
    },
    { defaultKey: "sales", defaultDir: "desc", ascByDefault: ["name"] },
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" data-pdf-ignore>
        <div>
          <h2 className="text-2xl font-bold text-crm-text-primary flex items-center gap-2">
            <Users className="w-6 h-6" />
            Rendimiento de Vendedores
          </h2>
          <p className="text-crm-text-secondary mt-1">
            Análisis de productividad y métricas del equipo de ventas
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {performanceStats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-crm-text-secondary">
                {stat.label}
              </CardTitle>
              {index === 0 && <Users className="h-4 w-4 text-crm-text-muted" />}
              {index === 1 && <TrendingUp className="h-4 w-4 text-crm-text-muted" />}
              {index === 2 && <Target className="h-4 w-4 text-crm-text-muted" />}
              {index === 3 && <Award className="h-4 w-4 text-crm-text-muted" />}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-crm-text-primary">
                {stat.label === "Ventas Totales" || stat.label === "Promedio por Vendedor"
                  ? formatCurrency(stat.value)
                  : stat.value}
              </div>
              <p className="text-xs text-crm-text-muted mt-1">
                Período actual
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top Performers */}
      {topPerformers && topPerformers.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle>Top Performers</CardTitle>
                <CardDescription>
                  Vendedores con mejor rendimiento del período
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-crm-text-secondary">Ordenar:</span>
                <Select
                  value={sortPerformers.sortKey}
                  onValueChange={(v) => {
                    if (v !== sortPerformers.sortKey) sortPerformers.handleSort(v as PerformerSortKey);
                  }}
                >
                  <SelectTrigger className="w-[170px] h-8 bg-crm-card border-crm-border text-crm-text-primary text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-crm-card border-crm-border">
                    <SelectItem value="sales" className="text-crm-text-primary hover:bg-crm-card-hover focus:bg-crm-card-hover cursor-pointer">Ventas (monto)</SelectItem>
                    <SelectItem value="deals" className="text-crm-text-primary hover:bg-crm-card-hover focus:bg-crm-card-hover cursor-pointer">Propiedades</SelectItem>
                    <SelectItem value="conversion" className="text-crm-text-primary hover:bg-crm-card-hover focus:bg-crm-card-hover cursor-pointer">Conversión</SelectItem>
                    <SelectItem value="cumplimiento" className="text-crm-text-primary hover:bg-crm-card-hover focus:bg-crm-card-hover cursor-pointer">% Meta</SelectItem>
                    <SelectItem value="name" className="text-crm-text-primary hover:bg-crm-card-hover focus:bg-crm-card-hover cursor-pointer">Nombre</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => sortPerformers.handleSort(sortPerformers.sortKey)}
                  title={sortPerformers.sortDir === "asc" ? "Ascendente" : "Descendente"}
                  className="h-8 px-2"
                >
                  {sortPerformers.sortDir === "asc" ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortPerformers.sortedData.map((performer, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-crm-border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-crm-primary text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {performer.avatar || performer.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-medium text-crm-text-primary">{performer.name}</h4>
                      <p className="text-sm text-crm-text-secondary">{performer.deals} ventas realizadas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-crm-text-primary">{formatCurrency(performer.sales)}</p>
                    <div className="flex gap-2 items-center text-xs">
                      <span className="text-crm-text-secondary">Conversión: {performer.conversion}</span>
                      {performer.cumplimiento && (
                        <span className={`px-2 py-0.5 rounded-full ${
                          Number(performer.cumplimiento) >= 100
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : Number(performer.cumplimiento) >= 80
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        }`}>
                          {performer.cumplimiento}% meta
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Métricas de Equipo</CardTitle>
            <CardDescription>
              Indicadores de rendimiento general
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-crm-card-hover rounded-lg">
              <span className="text-crm-text-secondary">Total Vendedores</span>
              <span className="font-bold text-crm-text-primary">{resumen.totalVendedores}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-crm-card-hover rounded-lg">
              <span className="text-crm-text-secondary">Vendedores Activos</span>
              <span className="font-bold text-green-600 dark:text-green-400">{resumen.vendedoresActivos}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-crm-card-hover rounded-lg">
              <span className="text-crm-text-secondary">Ventas Totales</span>
              <span className="font-bold text-crm-text-primary">{formatCurrency(resumen.ventasTotales)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-crm-card-hover rounded-lg">
              <span className="text-crm-text-secondary">Propiedades Vendidas</span>
              <span className="font-bold text-crm-text-primary">{resumen.propiedadesTotales}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cumplimiento de Metas</CardTitle>
            <CardDescription>
              Progreso hacia objetivos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-crm-text-secondary">Vendedores que Superaron Meta</span>
                <span className="text-sm text-crm-text-muted">
                  {resumen.vendedoresQueSuperaronMeta} / {resumen.totalVendedores}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all"
                  style={{
                    width: `${resumen.totalVendedores > 0 ? (resumen.vendedoresQueSuperaronMeta / resumen.totalVendedores) * 100 : 0}%`
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-crm-text-secondary">Promedio por Vendedor</span>
                <span className="text-sm font-bold text-crm-text-primary">
                  {formatCurrency(resumen.promedioPorVendedor)}
                </span>
              </div>
              <p className="text-xs text-crm-text-muted">
                Ventas promedio por vendedor activo en el período
              </p>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Award className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {resumen.vendedoresQueSuperaronMeta > 0
                    ? `${resumen.vendedoresQueSuperaronMeta} vendedor${resumen.vendedoresQueSuperaronMeta > 1 ? 'es' : ''} superaron su meta`
                    : 'Ningún vendedor superó su meta en este período'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
