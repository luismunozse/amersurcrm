"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Users, UserX, UserCheck, Clock, AlertCircle, Filter } from "lucide-react";
import { PageLoader } from "@/components/ui/PageLoader";
import { obtenerReporteGestionClientes } from "../_actions";
import toast from "react-hot-toast";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { CRMBadge } from "@/components/ui/crm-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ReporteGestionClientesProps {
  periodo: string;
}

export default function ReporteGestionClientes({ periodo }: ReporteGestionClientesProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState<string>("todos");

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await obtenerReporteGestionClientes(periodo);

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
  }, [periodo, cargarDatos]);

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
        <Button onClick={() => cargarDatos()}>Reintentar</Button>
      </div>
    );
  }

  const { resumen, distribucionSeguimiento, distribucionEstados, distribucionPorVendedor } = data;

  // Filtrar datos por vendedor seleccionado
  const datosFiltrados = vendedorSeleccionado === "todos"
    ? distribucionSeguimiento
    : (() => {
        const vendedor = distribucionPorVendedor.find((v: any) => v.vendedor === vendedorSeleccionado);
        if (!vendedor) return distribucionSeguimiento;
        return [
          { estado: 'Sin contactar', cantidad: vendedor.sinContactar, color: 'red' },
          { estado: 'Contactados', cantidad: vendedor.contactados, color: 'green' },
        ];
      })();

  const resumenFiltrado = vendedorSeleccionado === "todos"
    ? resumen
    : (() => {
        const vendedor = distribucionPorVendedor.find((v: any) => v.vendedor === vendedorSeleccionado);
        if (!vendedor) return resumen;
        return {
          totalClientes: vendedor.total,
          sinContactar: vendedor.sinContactar,
          contactadosReciente: vendedor.contactados,
          contactadosMedio: 0,
          sinSeguimiento: 0,
          conAccionPendiente: 0
        };
      })();

  // Colores para el gráfico de torta
  const COLORS_SEGUIMIENTO: Record<string, string> = {
    'Sin contactar': '#EF4444',
    'Contactado (<7 días)': '#22C55E',
    'Contactado (7-30 días)': '#EAB308',
    'Sin seguimiento (>30 días)': '#F97316',
    'Contactados': '#22C55E',
  };

  // Preparar datos para el pie chart de seguimiento
  const pieDataSeguimiento = datosFiltrados
    .filter((item: any) => item.cantidad > 0)
    .map((item: any) => ({
      name: item.estado,
      value: item.cantidad,
      fill: COLORS_SEGUIMIENTO[item.estado] || '#6B7280'
    }));

  // Preparar datos para el gráfico de barras por vendedor (todos los vendedores)
  const barDataVendedores = distribucionPorVendedor.map((item: any) => ({
    name: item.vendedor.length > 15 ? item.vendedor.substring(0, 15) + '...' : item.vendedor,
    fullName: item.vendedor,
    contactados: item.contactados,
    sinContactar: item.sinContactar,
    total: item.total
  }));

  // Calcular altura dinámica del gráfico basado en número de vendedores
  const chartHeight = Math.max(400, barDataVendedores.length * 45);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const tooltipData = payload[0].payload;
      const total = pieDataSeguimiento.reduce((sum: number, item: any) => sum + item.value, 0);
      const porcentaje = total > 0 ? ((tooltipData.value / total) * 100).toFixed(1) : '0';
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium text-crm-text-primary">{tooltipData.name}</p>
          <p className="text-sm text-crm-text-secondary">
            {tooltipData.value} ({porcentaje}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const BarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium text-crm-text-primary mb-2">{data.fullName}</p>
          <p className="text-sm text-green-600">Contactados: {data.contactados}</p>
          <p className="text-sm text-red-600">Sin contactar: {data.sinContactar}</p>
          <p className="text-sm text-crm-text-secondary font-medium mt-1">Total: {data.total}</p>
        </div>
      );
    }
    return null;
  };

  const RADIAN = Math.PI / 180;
  const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, value, name }: any) => {
    const total = pieDataSeguimiento.reduce((sum: number, item: any) => sum + item.value, 0);
    const porcentaje = total > 0 ? ((value / total) * 100).toFixed(1) : '0';

    if (parseFloat(porcentaje) < 5) return null;

    const radius = outerRadius * 1.2;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#666"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs"
      >
        {`${name}: ${value} (${porcentaje}%)`}
      </text>
    );
  };

  const getEstadoVariant = (estado: string): "success" | "info" | "purple" | "default" | "warning" | "danger" => {
    switch (estado.toLowerCase()) {
      case 'activo': return 'success';
      case 'prospecto': return 'info';
      case 'lead': return 'purple';
      case 'inactivo': return 'default';
      case 'por_contactar': return 'warning';
      case 'contactado': return 'success';
      case 'transferido': return 'info';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-crm-text-primary flex items-center gap-2">
            <Users className="w-6 h-6" />
            Gestion de Clientes Captados
          </h2>
          <p className="text-crm-text-secondary mt-1">
            Estado de seguimiento y contacto de clientes nuevos
          </p>
        </div>
      </div>

      {/* Filtro por Vendedor */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-crm-text-secondary mb-2">
                Filtrar por Vendedor
              </label>
              <Select value={vendedorSeleccionado} onValueChange={setVendedorSeleccionado}>
                <SelectTrigger className="w-full bg-crm-card border-crm-border text-crm-text-primary">
                  <SelectValue placeholder="- Todos los vendedores -" />
                </SelectTrigger>
                <SelectContent className="bg-crm-card border-crm-border max-h-[300px]">
                  <SelectItem value="todos" className="text-crm-text-primary hover:bg-crm-card-hover focus:bg-crm-card-hover cursor-pointer">
                    - Todos los vendedores -
                  </SelectItem>
                  {distribucionPorVendedor.map((vendedor: any) => (
                    <SelectItem
                      key={vendedor.vendedor}
                      value={vendedor.vendedor}
                      className="text-crm-text-primary hover:bg-crm-card-hover focus:bg-crm-card-hover cursor-pointer"
                    >
                      {vendedor.vendedor} ({vendedor.total} clientes)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => setVendedorSeleccionado("todos")}
              variant="outline"
              className="border-crm-border"
            >
              <Filter className="w-4 h-4 mr-2" />
              Limpiar Filtro
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-crm-text-secondary">
              Total Captados
            </CardTitle>
            <Users className="h-4 w-4 text-crm-text-muted" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-crm-text-primary">{resumenFiltrado.totalClientes}</div>
            <p className="text-xs text-crm-text-muted mt-1">
              {vendedorSeleccionado !== "todos" ? vendedorSeleccionado : "En el periodo"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-crm-text-secondary">
              Sin Contactar
            </CardTitle>
            <UserX className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{resumenFiltrado.sinContactar}</div>
            <p className="text-xs text-crm-text-muted mt-1">Requieren atencion</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-crm-text-secondary">
              Contactados
            </CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{resumenFiltrado.contactadosReciente}</div>
            <p className="text-xs text-crm-text-muted mt-1">Con seguimiento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-crm-text-secondary">
              Accion Pendiente
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{resumen.conAccionPendiente}</div>
            <p className="text-xs text-crm-text-muted mt-1">Seguimientos programados</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Torta - Estado de Seguimiento */}
      <Card>
        <CardHeader>
          <CardTitle>Estado de Seguimiento</CardTitle>
          <CardDescription>
            Clasificacion de clientes segun su ultimo contacto
            {vendedorSeleccionado !== "todos" && (
              <span className="ml-2 text-crm-primary font-medium">
                (Filtrado: {vendedorSeleccionado})
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* Contador Total */}
            <div className="text-center lg:text-left">
              <p className="text-lg font-medium text-crm-text-secondary">Total:</p>
              <p className="text-3xl font-bold text-crm-text-primary">
                {resumenFiltrado.totalClientes}
                <span className="text-base font-normal text-crm-text-muted ml-1">(clientes)</span>
              </p>
            </div>

            {/* Pie Chart */}
            <div className="flex-1 w-full" style={{ minHeight: '350px' }}>
              {pieDataSeguimiento.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={pieDataSeguimiento}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={renderCustomLabel}
                      outerRadius={120}
                      dataKey="value"
                    >
                      {pieDataSeguimiento.map((entry: any, index: number) => (
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
            {pieDataSeguimiento.map((item: any, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: item.fill }}
                />
                <span className="text-sm text-crm-text-primary">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Barras - Por Vendedor */}
      {vendedorSeleccionado === "todos" && barDataVendedores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Clientes por Vendedor ({barDataVendedores.length} vendedores)</CardTitle>
            <CardDescription>
              Comparativa de contactados vs sin contactar por vendedor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <div style={{ height: `${chartHeight}px` }}>
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <BarChart data={barDataVendedores} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip content={<BarTooltip />} />
                    <Legend />
                    <Bar dataKey="contactados" name="Contactados" fill="#22C55E" stackId="a" />
                    <Bar dataKey="sinContactar" name="Sin Contactar" fill="#EF4444" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Distribucion por Estado del Cliente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Por Estado */}
        <Card>
          <CardHeader>
            <CardTitle>Por Estado del Cliente</CardTitle>
            <CardDescription>
              Clasificacion por etapa en el embudo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {distribucionEstados.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-crm-card-hover rounded-lg">
                  <div className="flex items-center gap-3">
                    <CRMBadge variant={getEstadoVariant(item.estado)}>
                      {item.estado}
                    </CRMBadge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={item.porcentaje} className="w-24 h-2" />
                    <span className="text-lg font-bold text-crm-text-primary">{item.cantidad}</span>
                    <span className="text-sm text-crm-text-muted">({item.porcentaje}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Detalle Por Vendedor */}
        <Card>
          <CardHeader>
            <CardTitle>Detalle por Vendedor</CardTitle>
            <CardDescription>
              Click en un vendedor para filtrar los datos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {distribucionPorVendedor.map((item: any, index: number) => (
                <div
                  key={index}
                  className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                    vendedorSeleccionado === item.vendedor
                      ? 'border-crm-primary bg-crm-primary/5'
                      : 'border-crm-border hover:border-crm-primary/50'
                  }`}
                  onClick={() => setVendedorSeleccionado(
                    vendedorSeleccionado === item.vendedor ? "todos" : item.vendedor
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-crm-text-primary">{item.vendedor}</span>
                    <span className="text-sm font-bold text-crm-text-primary">{item.total} clientes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={item.porcentajeContactados} className="flex-1 h-2 [&>div]:bg-green-500" />
                    <span className="text-xs text-crm-text-muted">{item.porcentajeContactados}%</span>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs">
                    <span className="text-green-600 dark:text-green-400">
                      {item.contactados} contactados
                    </span>
                    <span className="text-red-600 dark:text-red-400">
                      {item.sinContactar} sin contactar
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerta de clientes sin contactar */}
      {resumenFiltrado.sinContactar > 0 && (
        <Alert variant="destructive" className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>
            Atencion: {resumenFiltrado.sinContactar} clientes sin contactar
            {vendedorSeleccionado !== "todos" && ` (${vendedorSeleccionado})`}
          </AlertTitle>
          <AlertDescription>
            Estos clientes fueron captados pero aun no han recibido ningun contacto.
            Se recomienda asignar seguimiento inmediato.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
