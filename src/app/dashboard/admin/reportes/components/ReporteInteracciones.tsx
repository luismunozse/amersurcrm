"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MessageSquare, Phone, Mail, Users, Clock, Loader2 } from "lucide-react";
import { obtenerReporteInteracciones } from "../_actions";
import toast from "react-hot-toast";

interface ReporteInteraccionesProps {
  periodo: string;
}

export default function ReporteInteracciones({ periodo }: ReporteInteraccionesProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      setError(null);

      const result = await obtenerReporteInteracciones(periodo);

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

  const { resumen, rankingVendedores, distribucionTipo, distribucionResultado } = data;

  const getTipoIcon = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'llamada': return <Phone className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      case 'whatsapp': return <MessageSquare className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'llamada': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'email': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300';
      case 'whatsapp': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'visita': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300';
      case 'reunion': return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300';
      default: return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300';
    }
  };

  const getResultadoColor = (resultado: string) => {
    switch (resultado.toLowerCase()) {
      case 'contesto': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'interesado': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300';
      case 'no_contesto': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      case 'no_interesado': return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300';
      case 'reagendo': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'pendiente': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'cerrado': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300';
      default: return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300';
    }
  };

  const formatResultado = (resultado: string) => {
    return resultado.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-crm-text-primary flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            Interacciones por Vendedor
          </h2>
          <p className="text-crm-text-secondary mt-1">
            Analisis de actividad y seguimiento del equipo de ventas
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-crm-text-secondary">
              Total Interacciones
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-crm-text-muted" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-crm-text-primary">{resumen.totalInteracciones}</div>
            <p className="text-xs text-crm-text-muted mt-1">En el periodo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-crm-text-secondary">
              Vendedores Activos
            </CardTitle>
            <Users className="h-4 w-4 text-crm-text-muted" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-crm-text-primary">{resumen.vendedoresActivos}</div>
            <p className="text-xs text-crm-text-muted mt-1">Con interacciones</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-crm-text-secondary">
              Promedio/Vendedor
            </CardTitle>
            <Clock className="h-4 w-4 text-crm-text-muted" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-crm-text-primary">{resumen.promedioPoVendedor}</div>
            <p className="text-xs text-crm-text-muted mt-1">Interacciones</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-crm-text-secondary">
              Clientes Contactados
            </CardTitle>
            <Users className="h-4 w-4 text-crm-text-muted" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-crm-text-primary">{resumen.clientesContactados}</div>
            <p className="text-xs text-crm-text-muted mt-1">Unicos</p>
          </CardContent>
        </Card>
      </div>

      {/* Ranking de Vendedores */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking de Vendedores por Interacciones</CardTitle>
          <CardDescription>
            Actividad de cada vendedor en el periodo seleccionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rankingVendedores.length > 0 ? (
              rankingVendedores.map((vendedor: any, index: number) => (
                <div key={index} className="p-4 border border-crm-border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-400' :
                        'bg-crm-primary'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-medium text-crm-text-primary">{vendedor.nombre}</h4>
                        <p className="text-xs text-crm-text-muted">@{vendedor.username}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-crm-text-primary">{vendedor.totalInteracciones}</div>
                      <p className="text-xs text-crm-text-muted">interacciones</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="p-2 bg-crm-card-hover rounded text-center">
                      <div className="font-bold text-crm-text-primary">{vendedor.clientesAtendidos}</div>
                      <div className="text-xs text-crm-text-muted">Clientes</div>
                    </div>
                    <div className="p-2 bg-crm-card-hover rounded text-center">
                      <div className="font-bold text-crm-text-primary">{vendedor.promedioPorCliente}</div>
                      <div className="text-xs text-crm-text-muted">Promedio/Cliente</div>
                    </div>
                    <div className="p-2 bg-crm-card-hover rounded text-center">
                      <div className="font-bold text-crm-text-primary">{vendedor.duracionTotal}</div>
                      <div className="text-xs text-crm-text-muted">Min. totales</div>
                    </div>
                    <div className="p-2 bg-crm-card-hover rounded text-center">
                      <div className="font-bold text-crm-text-primary">
                        {vendedor.porTipo?.llamada || 0}
                      </div>
                      <div className="text-xs text-crm-text-muted">Llamadas</div>
                    </div>
                  </div>

                  {/* Detalle por tipo */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {Object.entries(vendedor.porTipo || {}).map(([tipo, cantidad]: [string, any]) => (
                      <span
                        key={tipo}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getTipoColor(tipo)}`}
                      >
                        {tipo}: {cantidad}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-crm-text-muted">
                No hay interacciones registradas en este periodo
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Distribucion por Tipo y Resultado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Por Tipo */}
        <Card>
          <CardHeader>
            <CardTitle>Por Tipo de Interaccion</CardTitle>
            <CardDescription>
              Distribucion de canales de comunicacion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {distribucionTipo.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-crm-card-hover rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className={`p-2 rounded-lg ${getTipoColor(item.tipo)}`}>
                      {getTipoIcon(item.tipo)}
                    </span>
                    <span className="font-medium text-crm-text-primary capitalize">{item.tipo}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-crm-primary h-2 rounded-full transition-all"
                        style={{ width: `${item.porcentaje}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-crm-text-primary w-12 text-right">{item.cantidad}</span>
                    <span className="text-xs text-crm-text-muted w-12">({item.porcentaje}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Por Resultado */}
        <Card>
          <CardHeader>
            <CardTitle>Por Resultado</CardTitle>
            <CardDescription>
              Efectividad de las interacciones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {distribucionResultado.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-crm-card-hover rounded-lg">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getResultadoColor(item.resultado)}`}>
                    {formatResultado(item.resultado)}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-crm-primary h-2 rounded-full transition-all"
                        style={{ width: `${item.porcentaje}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-crm-text-primary w-12 text-right">{item.cantidad}</span>
                    <span className="text-xs text-crm-text-muted w-12">({item.porcentaje}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
