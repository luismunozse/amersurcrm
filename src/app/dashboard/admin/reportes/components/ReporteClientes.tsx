"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Users, UserPlus, UserCheck, UserX, Loader2 } from "lucide-react";
import { obtenerReporteClientes } from "../_actions";
import toast from "react-hot-toast";

interface ReporteClientesProps {
  periodo: string;
}

export default function ReporteClientes({ periodo }: ReporteClientesProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await obtenerReporteClientes(periodo);

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

  const { clientStats, clientSources, topClients, clientSegments } = data;

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
            <Users className="w-6 h-6" />
            Reporte de Clientes
          </h2>
          <p className="text-crm-text-secondary mt-1">
            Análisis completo de la base de clientes y comportamiento
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {clientStats.map((stat: any, index: number) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-crm-text-secondary">
                {stat.label}
              </CardTitle>
              {index === 0 && <Users className="h-4 w-4 text-crm-text-muted" />}
              {index === 1 && <UserCheck className="h-4 w-4 text-crm-text-muted" />}
              {index === 2 && <UserPlus className="h-4 w-4 text-crm-text-muted" />}
              {index === 3 && <UserX className="h-4 w-4 text-crm-text-muted" />}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-crm-text-primary">{stat.value}</div>
              <p className="text-xs text-crm-text-muted mt-1">
                {stat.change > 0 ? `+${stat.change} nuevos` : 'Período actual'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Client Sources & Segments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Fuentes de Clientes</CardTitle>
            <CardDescription>
              Distribución por canal de adquisición
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clientSources && clientSources.length > 0 ? (
                clientSources.map((source: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-crm-primary rounded-full"></div>
                      <span className="text-crm-text-primary">{source.source}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-crm-text-secondary">{source.count}</span>
                      <span className="text-sm font-medium text-crm-text-primary">
                        {source.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-crm-text-secondary py-4">No hay datos de fuentes disponibles</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Client Segments */}
        <Card>
          <CardHeader>
            <CardTitle>Segmentación de Clientes</CardTitle>
            <CardDescription>
              Clasificación por valor del cliente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clientSegments.map((segment: any, index: number) => {
                const colors = ['bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500'];
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 ${colors[index % colors.length]} rounded-full`}></div>
                      <span className="text-crm-text-primary">{segment.segment}</span>
                    </div>
                    <span className="text-sm font-medium text-crm-text-primary">
                      {segment.count} clientes
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Clients */}
      {topClients && topClients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Clientes de Mayor Valor</CardTitle>
            <CardDescription>
              Ranking de clientes por volumen de negocio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topClients.map((client: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 border border-crm-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-crm-primary text-white rounded-full flex items-center justify-center font-bold">
                      {client.name.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="font-medium text-crm-text-primary">{client.name}</h4>
                      <p className="text-sm text-crm-text-secondary">{client.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-crm-text-primary">{formatCurrency(client.value)}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      client.status === 'activo' ? 'bg-green-100 text-green-800' :
                      client.status === 'prospecto' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {client.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
