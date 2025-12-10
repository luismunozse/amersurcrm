"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DollarSign, TrendingUp, Calendar, Download, Loader2 } from "lucide-react";
import { obtenerReporteVentas, obtenerMetricasRendimiento, obtenerObjetivosVsRealidad } from "../_actions";
import toast from "react-hot-toast";

interface ReporteVentasProps {
  periodo: string;
}

export default function ReporteVentas({ periodo }: ReporteVentasProps) {
  const [data, setData] = useState<any>(null);
  const [metricas, setMetricas] = useState<any>(null);
  const [objetivos, setObjetivos] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      setError(null);

      // Cargar todos los datos en paralelo
      const [resultVentas, resultMetricas, resultObjetivos] = await Promise.all([
        obtenerReporteVentas(periodo),
        obtenerMetricasRendimiento(periodo),
        obtenerObjetivosVsRealidad(periodo)
      ]);

      if (resultVentas.error) {
        setError(resultVentas.error);
        toast.error(resultVentas.error);
      } else {
        setData(resultVentas.data);
      }

      if (resultMetricas.data) {
        setMetricas(resultMetricas.data);
      }

      if (resultObjetivos.data) {
        setObjetivos(resultObjetivos.data);
      }

      setLoading(false);
    };

    cargarDatos();
  }, [periodo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-crm-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 dark:text-red-400 mb-4">{error || 'Error cargando datos'}</div>
        <Button onClick={() => window.location.reload()}>Reintentar</Button>
      </div>
    );
  }

  const { resumen, salesData, topProjects, formasPago: _formasPago } = data;

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-crm-text-primary flex items-center gap-2">
            <DollarSign className="w-6 h-6" />
            Reporte de Ventas
          </h2>
          <p className="text-crm-text-secondary mt-1">
            Análisis detallado de ventas y rendimiento comercial
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Seleccionar Período
          </Button>
          <Button className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-crm-text-secondary">
              Ventas Totales
            </CardTitle>
            <DollarSign className="h-4 w-4 text-crm-text-muted" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-crm-text-primary">{formatCurrency(resumen.valorTotal)}</div>
            <p className="text-xs text-crm-text-muted mt-1">
              Período seleccionado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-crm-text-secondary">
              Propiedades Vendidas
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-crm-text-muted" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-crm-text-primary">{resumen.propiedadesVendidas}</div>
            <p className="text-xs text-crm-text-muted mt-1">
              Unidades vendidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-crm-text-secondary">
              Ticket Promedio
            </CardTitle>
            <DollarSign className="h-4 w-4 text-crm-text-muted" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-crm-text-primary">{formatCurrency(resumen.promedioVenta)}</div>
            <p className="text-xs text-crm-text-muted mt-1">
              Por unidad
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Chart */}
      {salesData && salesData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Evolución de Ventas</CardTitle>
            <CardDescription>
              Ventas mensuales del período
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {salesData.map((item: any, index: number) => {
                const maxSales = Math.max(...salesData.map((d: any) => d.sales));
                return (
                  <div key={index} className="flex items-center justify-between p-4 border border-crm-border rounded-lg">
                    <div>
                      <h4 className="font-medium text-crm-text-primary">{item.month}</h4>
                      <p className="text-sm text-crm-text-secondary">{item.properties} propiedades</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-crm-text-primary">
                        {formatCurrency(item.sales)}
                      </p>
                      <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className="bg-crm-primary h-2 rounded-full"
                          style={{ width: `${maxSales > 0 ? (item.sales / maxSales) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Projects */}
      {topProjects && topProjects.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Proyectos Más Vendidos</CardTitle>
            <CardDescription>
              Ranking de proyectos por volumen de ventas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProjects.map((project: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 border border-crm-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-crm-primary text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium text-crm-text-primary">{project.name}</h4>
                      <p className="text-sm text-crm-text-secondary">{project.units} unidades</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-crm-text-primary">
                      {formatCurrency(project.sales)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-crm-text-secondary">
            No hay datos de proyectos disponibles para este período
          </CardContent>
        </Card>
      )}

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Métricas de Rendimiento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {metricas ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-crm-text-secondary">Tasa de Conversión</span>
                  <span className="font-bold text-crm-text-primary">{metricas.tasaConversion}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-crm-text-secondary">Tiempo Promedio de Venta</span>
                  <span className="font-bold text-crm-text-primary">{metricas.tiempoPromedioVenta} días</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-crm-text-secondary">Total Leads</span>
                  <span className="font-bold text-crm-text-primary">{metricas.totalLeads}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-crm-text-secondary">Clientes Convertidos</span>
                  <span className="font-bold text-crm-text-primary">{metricas.clientesConvertidos}</span>
                </div>
              </>
            ) : (
              <div className="text-center text-crm-text-secondary py-4">
                Cargando métricas...
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Objetivos vs Realidad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {objetivos ? (
              <>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-crm-text-secondary">Ventas Mensuales</span>
                    <span className="text-sm text-crm-text-muted">
                      {formatCurrency(objetivos.ventasMensuales.realizado)} / {formatCurrency(objetivos.ventasMensuales.meta)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${objetivos.ventasMensuales.porcentaje >= 90 ? 'bg-green-500' : objetivos.ventasMensuales.porcentaje >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(objetivos.ventasMensuales.porcentaje, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-crm-text-secondary">Propiedades</span>
                    <span className="text-sm text-crm-text-muted">
                      {objetivos.propiedades.realizado} / {objetivos.propiedades.meta}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${objetivos.propiedades.porcentaje >= 90 ? 'bg-green-500' : objetivos.propiedades.porcentaje >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(objetivos.propiedades.porcentaje, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-crm-text-secondary">Clientes Nuevos</span>
                    <span className="text-sm text-crm-text-muted">
                      {objetivos.clientesNuevos.realizado} / {objetivos.clientesNuevos.meta}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${objetivos.clientesNuevos.porcentaje >= 90 ? 'bg-green-500' : objetivos.clientesNuevos.porcentaje >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(objetivos.clientesNuevos.porcentaje, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-crm-text-secondary py-4">
                Cargando objetivos...
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}