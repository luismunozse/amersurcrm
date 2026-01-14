"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Building, Loader2 } from "lucide-react";
import { obtenerReportePropiedades } from "../_actions";
import toast from "react-hot-toast";

interface ReportePropiedadesProps {
  periodo: string;
}

export default function ReportePropiedades({ periodo }: ReportePropiedadesProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      setError(null);

      const result = await obtenerReportePropiedades(periodo);

      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        setData(result.data);
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

  const { propertyStats, distribucionProyectos, distribucionTipo, resumen } = data;

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
            <Building className="w-6 h-6" />
            Reporte de Propiedades
          </h2>
          <p className="text-crm-text-secondary mt-1">
            Inventario completo y análisis de propiedades
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {propertyStats.map((stat: any, index: number) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-crm-text-secondary">
                {stat.label}
              </CardTitle>
              <Building className="h-4 w-4 text-crm-text-muted" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-crm-text-primary">
                {stat.label === "Valor Total" ? formatCurrency(stat.value) : stat.value}
              </div>
              <p className="text-xs text-crm-text-muted mt-1">
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Distribución por Estado */}
      <Card>
        <CardHeader>
          <CardTitle>Distribución por Estado</CardTitle>
          <CardDescription>
            Resumen del inventario de propiedades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-800 rounded-lg text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">{resumen.disponibles}</div>
              <div className="text-sm font-medium text-green-800 dark:text-green-300">Disponibles</div>
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">{formatCurrency(resumen.valorDisponible)}</div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-800 rounded-lg text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{resumen.vendidas}</div>
              <div className="text-sm font-medium text-blue-800 dark:text-blue-300">Vendidas</div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Concretadas</div>
            </div>

            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-800 rounded-lg text-center">
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{resumen.reservadas}</div>
              <div className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Reservadas</div>
              <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">En proceso</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Distribución por Tipo */}
      {distribucionTipo && distribucionTipo.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Tipo</CardTitle>
            <CardDescription>
              Lotes vs Propiedades en el inventario
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {distribucionTipo.map((item: any, index: number) => (
                <div key={index} className="p-4 bg-crm-card-hover border border-crm-border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-crm-text-primary capitalize">{item.tipo}</span>
                    <span className="text-2xl font-bold text-crm-text-primary">{item.cantidad}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-crm-primary h-2 rounded-full transition-all"
                      style={{ width: `${item.porcentaje}%` }}
                    />
                  </div>
                  <div className="text-xs text-crm-text-muted mt-1 text-right">
                    {item.porcentaje.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Distribución por Proyecto */}
      {distribucionProyectos && distribucionProyectos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Proyecto</CardTitle>
            <CardDescription>
              Detalle de propiedades por proyecto
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-crm-border bg-crm-card-hover">
                    <th className="text-left py-3 px-4 font-medium text-crm-text-secondary">Proyecto</th>
                    <th className="text-center py-3 px-4 font-medium text-crm-text-secondary">Total</th>
                    <th className="text-center py-3 px-4 font-medium text-crm-text-secondary">
                      <span className="text-green-600">Disponibles</span>
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-crm-text-secondary">
                      <span className="text-blue-600">Vendidas</span>
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-crm-text-secondary">
                      <span className="text-yellow-600">Reservadas</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {distribucionProyectos.map((proyecto: any, index: number) => (
                    <tr key={index} className="border-b border-crm-border hover:bg-crm-card-hover transition-colors">
                      <td className="py-3 px-4 font-medium text-crm-text-primary">{proyecto.proyecto}</td>
                      <td className="py-3 px-4 text-center font-bold text-crm-text-primary">{proyecto.total}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium">
                          {proyecto.disponibles}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
                          {proyecto.vendidas}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-1 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 font-medium">
                          {proyecto.reservadas}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
