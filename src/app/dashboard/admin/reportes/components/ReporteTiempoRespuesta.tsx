"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import DatePicker from "@/components/ui/DatePicker";
import { Clock, Loader2, Filter, AlertTriangle, AlertCircle, Bell, Users, TrendingUp, Phone, Mail } from "lucide-react";
import { obtenerReporteTiempoRespuesta } from "../_actions";
import toast from "react-hot-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from "recharts";

interface ReporteTiempoRespuestaProps {
  periodo: string;
}

export default function ReporteTiempoRespuesta({ periodo }: ReporteTiempoRespuestaProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");
  const [tabActiva, setTabActiva] = useState<'ranking' | 'alertas'>('ranking');

  const cargarDatos = useCallback(async (usarFechas = false) => {
    setLoading(true);
    try {
      const { data: resultado, error } = await obtenerReporteTiempoRespuesta(
        periodo,
        usarFechas && fechaInicio ? fechaInicio : undefined,
        usarFechas && fechaFin ? fechaFin : undefined
      );

      if (error) {
        toast.error(error);
        return;
      }

      setData(resultado);
    } catch {
      toast.error("Error al cargar el reporte");
    } finally {
      setLoading(false);
    }
  }, [periodo, fechaInicio, fechaFin]);

  useEffect(() => {
    cargarDatos(false);
  }, [periodo]);

  const handleFiltrar = () => {
    if (fechaInicio && fechaFin) {
      cargarDatos(true);
    } else {
      toast.error("Selecciona ambas fechas para filtrar");
    }
  };

  const formatearHoras = (horas: number): string => {
    if (horas < 1) {
      return `${Math.round(horas * 60)} min`;
    } else if (horas < 24) {
      return `${horas.toFixed(1)} hrs`;
    } else {
      const dias = Math.floor(horas / 24);
      const horasRestantes = Math.round(horas % 24);
      return `${dias}d ${horasRestantes}h`;
    }
  };

  const getAlertaColor = (nivel: string) => {
    switch (nivel) {
      case 'critico': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'alerta': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'atencion': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      default: return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    }
  };

  const getAlertaTexto = (nivel: string) => {
    switch (nivel) {
      case 'critico': return 'Crítico (+72h)';
      case 'alerta': return 'Alerta (48-72h)';
      case 'atencion': return 'Atención (24-48h)';
      default: return 'Normal (<24h)';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-crm-primary" />
        <span className="ml-3 text-crm-text-secondary">Cargando reporte...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-crm-text-secondary">
        No se pudieron cargar los datos del reporte
      </div>
    );
  }

  const { resumen, rankingVendedores, rangosDistribucion, clientesSinContactar, tendenciaData } = data;

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
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
              Aplicar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Users className="w-6 h-6 mx-auto text-crm-primary mb-2" />
              <p className="text-2xl font-bold text-crm-text-primary">
                {resumen.totalClientes.toLocaleString()}
              </p>
              <p className="text-xs text-crm-text-muted">Total Leads</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Clock className="w-6 h-6 mx-auto text-blue-500 mb-2" />
              <p className="text-2xl font-bold text-crm-text-primary">
                {formatearHoras(resumen.promedioGlobalHoras)}
              </p>
              <p className="text-xs text-crm-text-muted">Tiempo Promedio</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <TrendingUp className="w-6 h-6 mx-auto text-green-500 mb-2" />
              <p className="text-2xl font-bold text-green-600">
                {resumen.clientesContactados.toLocaleString()}
              </p>
              <p className="text-xs text-crm-text-muted">Contactados</p>
            </div>
          </CardContent>
        </Card>

        <Card className={resumen.alertasCriticas > 0 ? "border-red-300 dark:border-red-800" : ""}>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="w-6 h-6 mx-auto text-red-500 mb-2" />
              <p className="text-2xl font-bold text-red-600">
                {resumen.alertasCriticas}
              </p>
              <p className="text-xs text-crm-text-muted">Crítico (+72h)</p>
            </div>
          </CardContent>
        </Card>

        <Card className={resumen.alertasAlerta > 0 ? "border-orange-300 dark:border-orange-800" : ""}>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-6 h-6 mx-auto text-orange-500 mb-2" />
              <p className="text-2xl font-bold text-orange-600">
                {resumen.alertasAlerta}
              </p>
              <p className="text-xs text-crm-text-muted">Alerta (48-72h)</p>
            </div>
          </CardContent>
        </Card>

        <Card className={resumen.alertasAtencion > 0 ? "border-yellow-300 dark:border-yellow-800" : ""}>
          <CardContent className="pt-6">
            <div className="text-center">
              <Bell className="w-6 h-6 mx-auto text-yellow-500 mb-2" />
              <p className="text-2xl font-bold text-yellow-600">
                {resumen.alertasAtencion}
              </p>
              <p className="text-xs text-crm-text-muted">Atención (24-48h)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución por Rango de Tiempo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Distribución de Tiempos
            </CardTitle>
            <CardDescription>
              Clientes agrupados por tiempo de respuesta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ minHeight: "300px" }}>
              {rangosDistribucion.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={rangosDistribucion} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis
                      type="category"
                      dataKey="rango"
                      width={100}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value: any) => [value, "Clientes"]}
                    />
                    <Bar dataKey="cantidad" name="Clientes">
                      {rangosDistribucion.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-crm-text-muted">
                  No hay datos de tiempos de respuesta
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tendencia de Tiempo de Respuesta */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Tendencia de Respuesta
            </CardTitle>
            <CardDescription>
              Promedio de tiempo de respuesta por día
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ minHeight: "300px" }}>
              {tendenciaData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={tendenciaData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="fecha"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getDate()}/${date.getMonth() + 1}`;
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => `${value}h`}
                    />
                    <Tooltip
                      formatter={(value: any) => [`${value} horas`, "Promedio"]}
                      labelFormatter={(label) => {
                        const date = new Date(label);
                        return date.toLocaleDateString('es-PE');
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="promedioHoras"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={{ fill: '#3B82F6', r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-crm-text-muted">
                  No hay datos de tendencia
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs para Ranking y Alertas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Detalle</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={tabActiva === 'ranking' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setTabActiva('ranking')}
                className={tabActiva === 'ranking' ? 'bg-crm-primary text-white' : ''}
              >
                <Users className="w-4 h-4 mr-1" />
                Ranking Vendedores
              </Button>
              <Button
                variant={tabActiva === 'alertas' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setTabActiva('alertas')}
                className={tabActiva === 'alertas' ? 'bg-crm-primary text-white' : ''}
              >
                <AlertTriangle className="w-4 h-4 mr-1" />
                Alertas ({clientesSinContactar.length})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {tabActiva === 'ranking' ? (
            /* Ranking de Vendedores */
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-crm-border">
                    <th className="text-left py-3 px-2 font-medium text-crm-text-secondary">#</th>
                    <th className="text-left py-3 px-2 font-medium text-crm-text-secondary">Vendedor</th>
                    <th className="text-center py-3 px-2 font-medium text-crm-text-secondary">Clientes</th>
                    <th className="text-center py-3 px-2 font-medium text-crm-text-secondary">Contactados</th>
                    <th className="text-center py-3 px-2 font-medium text-crm-text-secondary">Sin Contactar</th>
                    <th className="text-center py-3 px-2 font-medium text-crm-text-secondary">Promedio</th>
                    <th className="text-center py-3 px-2 font-medium text-crm-text-secondary">Mejor</th>
                    <th className="text-center py-3 px-2 font-medium text-crm-text-secondary">Peor</th>
                    <th className="text-center py-3 px-2 font-medium text-crm-text-secondary">% Contacto</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingVendedores.map((vendedor: any, index: number) => (
                    <tr key={vendedor.username} className="border-b border-crm-border hover:bg-crm-card-hover">
                      <td className="py-3 px-2">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-800' :
                          index === 1 ? 'bg-gray-100 text-gray-800' :
                          index === 2 ? 'bg-orange-100 text-orange-800' :
                          'bg-crm-card-hover text-crm-text-secondary'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-medium text-crm-text-primary">{vendedor.nombre}</p>
                          <p className="text-xs text-crm-text-muted">@{vendedor.username}</p>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center font-medium">{vendedor.totalClientes}</td>
                      <td className="py-3 px-2 text-center text-green-600">{vendedor.clientesAtendidos}</td>
                      <td className="py-3 px-2 text-center text-red-600">{vendedor.clientesSinContactar}</td>
                      <td className="py-3 px-2 text-center">
                        <span className={`font-medium ${
                          vendedor.promedioHoras < 4 ? 'text-green-600' :
                          vendedor.promedioHoras < 24 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {formatearHoras(vendedor.promedioHoras)}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center text-green-600">
                        {formatearHoras(vendedor.minimoHoras)}
                      </td>
                      <td className="py-3 px-2 text-center text-red-600">
                        {formatearHoras(vendedor.maximoHoras)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          parseFloat(vendedor.tasaContacto) >= 80 ? 'bg-green-100 text-green-800' :
                          parseFloat(vendedor.tasaContacto) >= 50 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {vendedor.tasaContacto}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rankingVendedores.length === 0 && (
                <div className="text-center py-8 text-crm-text-muted">
                  No hay datos de vendedores para el período seleccionado
                </div>
              )}
            </div>
          ) : (
            /* Lista de Alertas - Clientes sin contactar */
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-crm-border">
                    <th className="text-left py-3 px-2 font-medium text-crm-text-secondary">Alerta</th>
                    <th className="text-left py-3 px-2 font-medium text-crm-text-secondary">Cliente</th>
                    <th className="text-left py-3 px-2 font-medium text-crm-text-secondary">Contacto</th>
                    <th className="text-left py-3 px-2 font-medium text-crm-text-secondary">Vendedor</th>
                    <th className="text-center py-3 px-2 font-medium text-crm-text-secondary">Tiempo Sin Contacto</th>
                    <th className="text-left py-3 px-2 font-medium text-crm-text-secondary">Fecha Alta</th>
                  </tr>
                </thead>
                <tbody>
                  {clientesSinContactar.map((cliente: any) => (
                    <tr key={cliente.id} className="border-b border-crm-border hover:bg-crm-card-hover">
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAlertaColor(cliente.nivelAlerta)}`}>
                          {getAlertaTexto(cliente.nivelAlerta)}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <p className="font-medium text-crm-text-primary">{cliente.nombre}</p>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex flex-col gap-1">
                          {cliente.telefono && (
                            <a href={`tel:${cliente.telefono}`} className="flex items-center gap-1 text-crm-primary hover:underline">
                              <Phone className="w-3 h-3" />
                              {cliente.telefono}
                            </a>
                          )}
                          {cliente.email && (
                            <a href={`mailto:${cliente.email}`} className="flex items-center gap-1 text-crm-primary hover:underline">
                              <Mail className="w-3 h-3" />
                              {cliente.email}
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <p className="text-crm-text-primary">{cliente.vendedorNombre}</p>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`font-bold ${
                          cliente.horasSinContacto >= 72 ? 'text-red-600' :
                          cliente.horasSinContacto >= 48 ? 'text-orange-600' :
                          cliente.horasSinContacto >= 24 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {formatearHoras(cliente.horasSinContacto)}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-crm-text-secondary">
                        {new Date(cliente.fechaAlta).toLocaleDateString('es-PE', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {clientesSinContactar.length === 0 && (
                <div className="text-center py-8 text-green-600">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="font-medium">¡Excelente!</p>
                  <p className="text-sm text-crm-text-muted">Todos los leads han sido contactados</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
