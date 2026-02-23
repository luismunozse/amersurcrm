"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Building, Loader2 } from "lucide-react";
import { obtenerReportePropiedades } from "../_actions";
import toast from "react-hot-toast";
import { CRMTable, CRMTableHeader, CRMTableHead, CRMTableBody, CRMTableRow, CRMTableCell } from "@/components/ui/crm-table";
import { Progress } from "@/components/ui/progress";
import { CRMBadge } from "@/components/ui/crm-badge";

interface ReportePropiedadesProps {
  periodo: string;
}

export default function ReportePropiedades({ periodo }: ReportePropiedadesProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
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
  }, [periodo]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

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
        <Button onClick={cargarDatos}>Reintentar</Button>
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
                  <Progress value={item.porcentaje} className="w-full h-2" />
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
            <CRMTable>
              <CRMTableHeader>
                <CRMTableRow>
                  <CRMTableHead>Proyecto</CRMTableHead>
                  <CRMTableHead className="text-center">Total</CRMTableHead>
                  <CRMTableHead className="text-center text-green-600">Disponibles</CRMTableHead>
                  <CRMTableHead className="text-center text-blue-600">Vendidas</CRMTableHead>
                  <CRMTableHead className="text-center text-yellow-600">Reservadas</CRMTableHead>
                </CRMTableRow>
              </CRMTableHeader>
              <CRMTableBody>
                {distribucionProyectos.map((proyecto: any, index: number) => (
                  <CRMTableRow key={index}>
                    <CRMTableCell className="font-medium">{proyecto.proyecto}</CRMTableCell>
                    <CRMTableCell className="text-center font-bold">{proyecto.total}</CRMTableCell>
                    <CRMTableCell className="text-center">
                      <CRMBadge variant="success">{proyecto.disponibles}</CRMBadge>
                    </CRMTableCell>
                    <CRMTableCell className="text-center">
                      <CRMBadge variant="info">{proyecto.vendidas}</CRMBadge>
                    </CRMTableCell>
                    <CRMTableCell className="text-center">
                      <CRMBadge variant="warning">{proyecto.reservadas}</CRMBadge>
                    </CRMTableCell>
                  </CRMTableRow>
                ))}
              </CRMTableBody>
            </CRMTable>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
