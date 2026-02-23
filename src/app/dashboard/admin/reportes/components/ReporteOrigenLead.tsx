"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import DatePicker from "@/components/ui/DatePicker";
import { Users, Loader2, Filter, TrendingUp } from "lucide-react";
import { obtenerReporteOrigenLead } from "../_actions";
import toast from "react-hot-toast";
import { CRMTable, CRMTableHeader, CRMTableHead, CRMTableBody, CRMTableRow, CRMTableCell } from "@/components/ui/crm-table";
import { Progress } from "@/components/ui/progress";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from "recharts";

interface ReporteOrigenLeadProps {
  periodo: string;
  fechaInicioDefault?: string;
  fechaFinDefault?: string;
}

export default function ReporteOrigenLead({ periodo, fechaInicioDefault, fechaFinDefault }: ReporteOrigenLeadProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros - inicializados con los valores del período global si se proveen
  const [fechaInicio, setFechaInicio] = useState<string>(() => {
    if (fechaInicioDefault) return fechaInicioDefault;
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split("T")[0];
  });
  const [fechaFin, setFechaFin] = useState<string>(() => {
    if (fechaFinDefault) return fechaFinDefault;
    return new Date().toISOString().split("T")[0];
  });

  // Sincronizar fechas cuando cambia el período global
  useEffect(() => {
    if (fechaInicioDefault) setFechaInicio(fechaInicioDefault);
    if (fechaFinDefault) setFechaFin(fechaFinDefault);
  }, [fechaInicioDefault, fechaFinDefault]);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await obtenerReporteOrigenLead(periodo, fechaInicio, fechaFin);

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
        <div className="text-red-600 dark:text-red-400 mb-4">
          {error || "Error cargando datos"}
        </div>
        <Button onClick={() => cargarDatos()}>Reintentar</Button>
      </div>
    );
  }

  const { resumen, distribucionOrigen, tendenciaData, tasaConversionPorOrigen } = data;

  // Preparar datos para el pie chart
  const pieData = distribucionOrigen.map((item: any) => ({
    name: item.etiqueta,
    value: item.cantidad,
    porcentaje: item.porcentaje,
    fill: item.color,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const tooltipData = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium text-crm-text-primary">{tooltipData.name}</p>
          <p className="text-sm text-crm-text-secondary">
            {tooltipData.value} clientes ({tooltipData.porcentaje}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const RADIAN = Math.PI / 180;
  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    outerRadius,
    value,
    name,
    porcentaje,
  }: any) => {
    const radius = outerRadius * 1.2;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (parseFloat(porcentaje) < 5) return null;

    return (
      <text
        x={x}
        y={y}
        fill="#666"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        className="text-xs"
      >
        {`${name}: ${value}`}
      </text>
    );
  };

  // Colores para el gráfico de líneas (tendencia)
  const coloresLinea = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#8B5CF6",
    "#EC4899",
    "#EF4444",
    "#14B8A6",
    "#6366F1",
    "#6B7280",
  ];

  // Obtener todas las keys de origen únicas para el gráfico de líneas
  const origenesUnicos = new Set<string>();
  tendenciaData.forEach((mes: any) => {
    Object.keys(mes).forEach((key) => {
      if (key !== "mes" && key !== "total") {
        origenesUnicos.add(key);
      }
    });
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-crm-text-primary flex items-center gap-2">
            <Users className="w-6 h-6" />
            Clientes Captados por Origen de Lead
          </h2>
          <p className="text-crm-text-secondary mt-1">
            Analiza de dónde provienen tus clientes y cuáles canales tienen mejor
            conversión
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-end gap-4">
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

      {/* Resumen en tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-crm-text-secondary">
                Nuevos en Período
              </p>
              <p className="text-3xl font-bold text-crm-primary mt-2">
                {resumen.totalPeriodo.toLocaleString()}
              </p>
              <p className="text-xs text-crm-text-muted mt-1">
                Clientes captados en fechas seleccionadas
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-crm-text-secondary">
                Total en Sistema
              </p>
              <p className="text-3xl font-bold text-crm-text-primary mt-2">
                {resumen.totalHistorico.toLocaleString()}
              </p>
              <p className="text-xs text-crm-text-muted mt-1">
                Base total de clientes
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-crm-text-secondary">
                Canal Principal
              </p>
              <p className="text-xl font-bold text-crm-text-primary mt-2">
                {resumen.origenPrincipal}
              </p>
              <p className="text-xs text-crm-text-muted mt-1">
                Mayor fuente de captación
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-crm-text-secondary">
                Mayor Efectividad
              </p>
              <p className="text-xl font-bold text-green-600 mt-2">
                {resumen.mejorConversion}
              </p>
              <p className="text-xs text-crm-text-muted mt-1">
                Canal con mejor avance de leads
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Pastel */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Origen</CardTitle>
            <CardDescription>
              Porcentaje de clientes captados por cada canal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-6">
              <div className="w-full" style={{ minHeight: "300px" }}>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={renderCustomLabel}
                        outerRadius={100}
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

              {/* Leyenda */}
              <div className="flex flex-wrap justify-center gap-3">
                {pieData.map((item: any, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.fill }}
                    />
                    <span className="text-xs text-crm-text-primary">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Barras - Efectividad por Canal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Efectividad por Canal
            </CardTitle>
            <CardDescription>
              % de leads que avanzaron en el proceso (contactado, interesado, reserva, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ minHeight: "300px" }}>
              {tasaConversionPorOrigen.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={tasaConversionPorOrigen.slice(0, 8)}
                    layout="vertical"
                    margin={{ left: 20, right: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" unit="%" />
                    <YAxis
                      type="category"
                      dataKey="etiqueta"
                      width={120}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value: any) => [`${value}%`, "Efectividad"]}
                    />
                    <Bar dataKey="tasaConversion" name="Tasa de Conversión">
                      {tasaConversionPorOrigen
                        .slice(0, 8)
                        .map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-crm-text-muted">
                  No hay datos para mostrar
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tendencia mensual */}
      <Card>
        <CardHeader>
          <CardTitle>Tendencia de Captación (Últimos 6 meses)</CardTitle>
          <CardDescription>
            Evolución de clientes captados por mes según origen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ minHeight: "350px" }}>
            {tendenciaData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={tendenciaData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Total"
                    stroke="#000"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  {Array.from(origenesUnicos)
                    .slice(0, 5)
                    .map((origen, index) => (
                      <Line
                        key={origen}
                        type="monotone"
                        dataKey={origen}
                        name={origen === "No especificado" ? "Sin origen" : origen}
                        stroke={coloresLinea[index % coloresLinea.length]}
                        strokeWidth={1.5}
                        dot={{ r: 3 }}
                      />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-crm-text-muted">
                No hay datos para mostrar
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Distribución Detallada */}
      <Card>
        <CardHeader>
          <CardTitle>Distribución Detallada por Origen</CardTitle>
          <CardDescription>Cantidad y porcentaje por cada canal de captación</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <CRMTable>
            <CRMTableHeader>
              <CRMTableRow>
                <CRMTableHead>Origen del Lead</CRMTableHead>
                <CRMTableHead className="text-right">Cantidad</CRMTableHead>
                <CRMTableHead className="text-right">Porcentaje</CRMTableHead>
                <CRMTableHead>Distribución</CRMTableHead>
              </CRMTableRow>
            </CRMTableHeader>
            <CRMTableBody>
              {distribucionOrigen.map((item: any, index: number) => (
                <CRMTableRow key={index}>
                  <CRMTableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{item.etiqueta}</span>
                    </div>
                  </CRMTableCell>
                  <CRMTableCell className="text-right font-medium">
                    {item.cantidad.toLocaleString()}
                  </CRMTableCell>
                  <CRMTableCell className="text-right text-crm-text-secondary">
                    {item.porcentaje}%
                  </CRMTableCell>
                  <CRMTableCell>
                    <Progress
                      value={item.porcentaje}
                      className="w-full max-w-xs h-2"
                      style={{ ["--progress-color" as string]: item.color }}
                    />
                  </CRMTableCell>
                </CRMTableRow>
              ))}
            </CRMTableBody>
          </CRMTable>
        </CardContent>
      </Card>
    </div>
  );
}
