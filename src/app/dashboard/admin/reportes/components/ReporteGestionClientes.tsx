"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Users, UserX, UserCheck, Clock, AlertCircle, Loader2 } from "lucide-react";
import { obtenerReporteGestionClientes } from "../_actions";
import toast from "react-hot-toast";

interface ReporteGestionClientesProps {
  periodo: string;
}

export default function ReporteGestionClientes({ periodo }: ReporteGestionClientesProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargarDatos = async () => {
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

  const { resumen, distribucionSeguimiento, distribucionEstados, distribucionPorVendedor } = data;

  const getColorClass = (color: string) => {
    switch (color) {
      case 'red': return 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400';
      case 'green': return 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-800 text-green-600 dark:text-green-400';
      case 'yellow': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-800 text-yellow-600 dark:text-yellow-400';
      case 'orange': return 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-800 text-orange-600 dark:text-orange-400';
      default: return 'bg-gray-50 dark:bg-gray-900/20 border-gray-300 dark:border-gray-800 text-gray-600 dark:text-gray-400';
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'activo': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'prospecto': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'lead': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300';
      case 'inactivo': return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300';
      default: return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300';
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
            <div className="text-2xl font-bold text-crm-text-primary">{resumen.totalClientes}</div>
            <p className="text-xs text-crm-text-muted mt-1">En el periodo</p>
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
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{resumen.sinContactar}</div>
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
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{resumen.contactadosReciente}</div>
            <p className="text-xs text-crm-text-muted mt-1">Ultimos 7 dias</p>
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

      {/* Distribucion por Estado de Seguimiento */}
      <Card>
        <CardHeader>
          <CardTitle>Estado de Seguimiento</CardTitle>
          <CardDescription>
            Clasificacion de clientes segun su ultimo contacto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {distribucionSeguimiento.map((item: any, index: number) => (
              <div
                key={index}
                className={`p-4 border-2 rounded-lg text-center ${getColorClass(item.color)}`}
              >
                <div className="text-3xl font-bold">{item.cantidad}</div>
                <div className="text-sm font-medium mt-1">{item.estado}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Distribucion por Estado del Cliente y Por Vendedor */}
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
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(item.estado)}`}>
                      {item.estado}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-crm-text-primary">{item.cantidad}</span>
                    <span className="text-sm text-crm-text-muted">({item.porcentaje}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Por Vendedor */}
        <Card>
          <CardHeader>
            <CardTitle>Clientes por Vendedor</CardTitle>
            <CardDescription>
              Distribucion y estado de contacto por vendedor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {distribucionPorVendedor.slice(0, 10).map((item: any, index: number) => (
                <div key={index} className="p-3 border border-crm-border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-crm-text-primary">{item.vendedor}</span>
                    <span className="text-sm font-bold text-crm-text-primary">{item.total} clientes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${item.porcentajeContactados}%` }}
                      />
                    </div>
                    <span className="text-xs text-crm-text-muted">{item.porcentajeContactados}% contactados</span>
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
      {resumen.sinContactar > 0 && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-red-800 dark:text-red-200">
                  Atencion: {resumen.sinContactar} clientes sin contactar
                </h3>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  Estos clientes fueron captados pero aun no han recibido ningun contacto.
                  Se recomienda asignar seguimiento inmediato.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
