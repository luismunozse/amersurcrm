"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import DatePicker from "@/components/ui/DatePicker";
import { PieChart as PieChartIcon, Loader2, Filter } from "lucide-react";
import { obtenerReporteNivelInteres } from "../_actions";
import toast from "react-hot-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CRMTable, CRMTableHeader, CRMTableHead, CRMTableBody, CRMTableRow, CRMTableCell } from "@/components/ui/crm-table";
import { Progress } from "@/components/ui/progress";
import { CRMBadge } from "@/components/ui/crm-badge";

interface ReporteNivelInteresProps {
  periodo: string;
  fechaInicioDefault?: string;
  fechaFinDefault?: string;
}

export default function ReporteNivelInteres({ periodo, fechaInicioDefault, fechaFinDefault }: ReporteNivelInteresProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros - inicializados con los valores del período global si se proveen
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<string>("todos");
  const [fechaInicio, setFechaInicio] = useState<string>(() => {
    if (fechaInicioDefault) return fechaInicioDefault;
    const date = new Date();
    date.setDate(date.getDate() - 15);
    return date.toISOString().split('T')[0];
  });
  const [fechaFin, setFechaFin] = useState<string>(() => {
    if (fechaFinDefault) return fechaFinDefault;
    return new Date().toISOString().split('T')[0];
  });

  // Sincronizar fechas cuando cambia el período global
  useEffect(() => {
    if (fechaInicioDefault) setFechaInicio(fechaInicioDefault);
    if (fechaFinDefault) setFechaFin(fechaFinDefault);
  }, [fechaInicioDefault, fechaFinDefault]);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await obtenerReporteNivelInteres(
      periodo,
      proyectoSeleccionado !== "todos" ? proyectoSeleccionado : undefined,
      fechaInicio,
      fechaFin
    );

    if (result.error) {
      setError(result.error);
      toast.error(result.error);
    } else {
      setData(result.data);
    }

    setLoading(false);
  }, [periodo, proyectoSeleccionado, fechaInicio, fechaFin]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleFiltrar = () => {
    cargarDatos();
  };

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
        <Button onClick={() => cargarDatos()}>Reintentar</Button>
      </div>
    );
  }

  const { resumen, clientesPorProyecto, proyectos } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-crm-text-primary flex items-center gap-2">
            <PieChartIcon className="w-6 h-6" />
            Interes por Proyecto
          </h2>
          <p className="text-crm-text-secondary mt-1">
            Cantidad de clientes interesados en cada proyecto
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-crm-text-secondary mb-2">
                Proyecto
              </label>
              <Select value={proyectoSeleccionado} onValueChange={setProyectoSeleccionado}>
                <SelectTrigger className="w-full bg-crm-card border-crm-border text-crm-text-primary">
                  <SelectValue placeholder="- Todos los proyectos -" />
                </SelectTrigger>
                <SelectContent className="bg-crm-card border-crm-border max-h-[300px]">
                  <SelectItem value="todos" className="text-crm-text-primary hover:bg-crm-card-hover focus:bg-crm-card-hover cursor-pointer">
                    - Todos los proyectos -
                  </SelectItem>
                  {proyectos.map((proyecto: any) => (
                    <SelectItem
                      key={proyecto.id}
                      value={proyecto.id}
                      className="text-crm-text-primary hover:bg-crm-card-hover focus:bg-crm-card-hover cursor-pointer"
                    >
                      {proyecto.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div>
                <label className="block text-sm font-medium text-crm-text-secondary mb-2">
                  Fecha desde
                </label>
                <DatePicker
                  value={fechaInicio}
                  onChange={setFechaInicio}
                  placeholder="Fecha inicio"
                  maxDate={fechaFin ? new Date(fechaFin) : undefined}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-crm-text-secondary mb-2">
                  Fecha hasta
                </label>
                <DatePicker
                  value={fechaFin}
                  onChange={setFechaFin}
                  placeholder="Fecha fin"
                  minDate={fechaInicio ? new Date(fechaInicio) : undefined}
                />
              </div>
            </div>

            <Button
              onClick={handleFiltrar}
              className="bg-crm-primary text-white hover:bg-crm-primary-hover"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* NUEVO: Clientes Interesados por Proyecto */}
      <Card>
        <CardHeader>
          <CardTitle>Clientes Interesados por Proyecto</CardTitle>
          <CardDescription>
            Cantidad de clientes que tienen cada proyecto como interes
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <CRMTable>
            <CRMTableHeader>
              <CRMTableRow>
                <CRMTableHead>Proyecto</CRMTableHead>
                <CRMTableHead className="text-center">Clientes Interesados</CRMTableHead>
                <CRMTableHead>Distribucion</CRMTableHead>
              </CRMTableRow>
            </CRMTableHeader>
            <CRMTableBody>
              {clientesPorProyecto && clientesPorProyecto.length > 0 ? (
                clientesPorProyecto.map((item: any, index: number) => (
                  <CRMTableRow key={index}>
                    <CRMTableCell className="font-medium">{item.proyecto}</CRMTableCell>
                    <CRMTableCell className="text-center">
                      <CRMBadge variant="primary" className="font-bold">
                        {item.clientesInteresados}
                      </CRMBadge>
                    </CRMTableCell>
                    <CRMTableCell>
                      <Progress
                        value={resumen.totalClientesConInteres > 0
                          ? (item.clientesInteresados / resumen.totalClientesConInteres) * 100
                          : 0}
                        className="w-full max-w-xs h-2"
                      />
                    </CRMTableCell>
                  </CRMTableRow>
                ))
              ) : (
                <CRMTableRow>
                  <CRMTableCell colSpan={3} className="py-8 text-center text-crm-text-muted">
                    No hay clientes con proyectos de interes asignados
                  </CRMTableCell>
                </CRMTableRow>
              )}
            </CRMTableBody>
          </CRMTable>
          {resumen.totalClientesConInteres > 0 && (
            <div className="p-4 border-t border-crm-border bg-crm-card-hover">
              <p className="text-sm text-crm-text-secondary">
                <strong>Total:</strong> {resumen.totalClientesConInteres} clientes unicos con interes en proyectos
              </p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
