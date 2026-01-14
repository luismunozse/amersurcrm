"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import DatePicker from "@/components/ui/DatePicker";
import { PieChart as PieChartIcon, Loader2, Filter } from "lucide-react";
import { obtenerReporteNivelInteres } from "../_actions";
import toast from "react-hot-toast";

interface ReporteNivelInteresProps {
  periodo: string;
}

export default function ReporteNivelInteres({ periodo }: ReporteNivelInteresProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<string>("todos");
  const [fechaInicio, setFechaInicio] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 15);
    return date.toISOString().split('T')[0];
  });
  const [fechaFin, setFechaFin] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

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
  }, [periodo]);

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
              <select
                value={proyectoSeleccionado}
                onChange={(e) => setProyectoSeleccionado(e.target.value)}
                className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm bg-crm-card text-crm-text focus:outline-none focus:ring-2 focus:ring-crm-primary"
              >
                <option value="todos">- Todos los proyectos -</option>
                {proyectos.map((proyecto: any) => (
                  <option key={proyecto.id} value={proyecto.id}>
                    {proyecto.nombre}
                  </option>
                ))}
              </select>
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-crm-border bg-crm-card-hover">
                  <th className="text-left py-3 px-4 font-medium text-crm-text-secondary">Proyecto</th>
                  <th className="text-center py-3 px-4 font-medium text-crm-text-secondary">Clientes Interesados</th>
                  <th className="text-left py-3 px-4 font-medium text-crm-text-secondary">Distribucion</th>
                </tr>
              </thead>
              <tbody>
                {clientesPorProyecto && clientesPorProyecto.length > 0 ? (
                  clientesPorProyecto.map((item: any, index: number) => (
                    <tr key={index} className="border-b border-crm-border hover:bg-crm-card-hover transition-colors">
                      <td className="py-3 px-4 font-medium text-crm-text-primary">{item.proyecto}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-3 py-1 rounded-full bg-crm-primary/10 text-crm-primary font-bold">
                          {item.clientesInteresados}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-full max-w-xs bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-crm-primary h-2 rounded-full transition-all"
                            style={{
                              width: `${resumen.totalClientesConInteres > 0
                                ? (item.clientesInteresados / resumen.totalClientesConInteres) * 100
                                : 0}%`
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-crm-text-muted">
                      No hay clientes con proyectos de interes asignados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
