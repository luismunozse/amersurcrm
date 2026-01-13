"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import DatePicker from "@/components/ui/DatePicker";
import { PieChart as PieChartIcon, Loader2, Filter } from "lucide-react";
import { obtenerReporteNivelInteres } from "../_actions";
import toast from "react-hot-toast";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

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

  const { resumen, distribucionNiveles, proyectos } = data;

  // Preparar datos para el pie chart con fill incluido
  const pieData = distribucionNiveles.map((item: any) => ({
    name: item.nivel,
    value: item.cantidad,
    porcentaje: item.porcentaje,
    fill: item.color
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const tooltipData = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium text-crm-text-primary">{tooltipData.name}</p>
          <p className="text-sm text-crm-text-secondary">
            {tooltipData.value} ({tooltipData.porcentaje}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const RADIAN = Math.PI / 180;
  const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, value, name, porcentaje }: any) => {
    const radius = outerRadius * 1.2;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (parseFloat(porcentaje) < 3) return null;

    return (
      <text
        x={x}
        y={y}
        fill="#666"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs"
      >
        {`${name}: ${value}(${porcentaje}%)`}
      </text>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-crm-text-primary flex items-center gap-2">
            <PieChartIcon className="w-6 h-6" />
            Nivel de Interes Actual de Lead por Proyecto
          </h2>
          <p className="text-crm-text-secondary mt-1">
            El reporte muestra el ultimo nivel de interes de todos los leads relacionados a un proyecto
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

      {/* Grafico de Pastel */}
      <Card>
        <CardHeader>
          <CardTitle>Nivel de interes actual de lead por proyecto</CardTitle>
          <CardDescription>
            Distribucion segun la ultima interaccion de contacto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* Contador Total */}
            <div className="text-center lg:text-left">
              <p className="text-lg font-medium text-crm-text-secondary">Total:</p>
              <p className="text-3xl font-bold text-crm-text-primary">
                {resumen.totalRegistros.toLocaleString()}
                <span className="text-base font-normal text-crm-text-muted ml-1">(registros)</span>
              </p>
            </div>

            {/* Pie Chart */}
            <div className="flex-1 w-full" style={{ minHeight: '400px' }}>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={renderCustomLabel}
                      outerRadius={140}
                      dataKey="value"
                    >
                      {pieData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-crm-text-muted">
                  No hay datos para mostrar
                </div>
              )}
            </div>
          </div>

          {/* Leyenda */}
          <div className="flex flex-wrap justify-center gap-4 mt-6 pt-6 border-t border-crm-border">
            {pieData.map((item: any, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: item.fill }}
                />
                <span className="text-sm text-crm-text-primary">{item.name}</span>
              </div>
            ))}
          </div>

          {/* Descripcion */}
          <div className="mt-6 p-4 bg-crm-card-hover rounded-lg">
            <p className="text-sm text-crm-text-secondary">
              El reporte muestra el ultimo nivel de interes de todos los leads relacionados a un proyecto,
              de acuerdo a su ultima interaccion de contacto en un determinado rango de tiempo (diario).
              Se puede filtrar por proyecto y por segmento.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Distribucion */}
      <Card>
        <CardHeader>
          <CardTitle>Distribucion Detallada</CardTitle>
          <CardDescription>
            Cantidad y porcentaje por nivel de interes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-crm-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-crm-text-secondary">Nivel de Interes</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-crm-text-secondary">Cantidad</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-crm-text-secondary">Porcentaje</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-crm-text-secondary">Distribucion</th>
                </tr>
              </thead>
              <tbody>
                {distribucionNiveles.map((item: any, index: number) => (
                  <tr key={index} className="border-b border-crm-border last:border-0">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-crm-text-primary">{item.nivel}</span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 font-medium text-crm-text-primary">
                      {item.cantidad.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4 text-crm-text-secondary">
                      {item.porcentaje}%
                    </td>
                    <td className="py-3 px-4">
                      <div className="w-full max-w-xs bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${item.porcentaje}%`,
                            backgroundColor: item.color
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
