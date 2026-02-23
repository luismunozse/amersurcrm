"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MessageSquare, Phone, Mail, Users, Clock, Loader2 } from "lucide-react";
import { obtenerReporteInteracciones } from "../_actions";
import toast from "react-hot-toast";
import { CRMTable, CRMTableHeader, CRMTableHead, CRMTableBody, CRMTableRow, CRMTableCell } from "@/components/ui/crm-table";
import { Progress } from "@/components/ui/progress";
import { CRMBadge } from "@/components/ui/crm-badge";

interface ReporteInteraccionesProps {
  periodo: string;
}

export default function ReporteInteracciones({ periodo }: ReporteInteraccionesProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
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

  const { resumen, rankingVendedores, distribucionTipo, distribucionResultado } = data;

  const getTipoIcon = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'llamada': return <Phone className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      case 'whatsapp': return <MessageSquare className="w-4 h-4" />;
      case 'mensaje': return <MessageSquare className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getTipoVariant = (tipo: string): "info" | "purple" | "success" | "orange" | "default" => {
    switch (tipo.toLowerCase()) {
      case 'llamada': return 'info';
      case 'email': return 'purple';
      case 'whatsapp': return 'success';
      case 'visita': return 'orange';
      case 'reunion': return 'info';
      case 'mensaje': return 'info';
      default: return 'default';
    }
  };

  const getResultadoVariant = (resultado: string): "success" | "danger" | "default" | "warning" | "info" | "purple" => {
    switch (resultado.toLowerCase()) {
      case 'contesto': return 'success';
      case 'interesado': return 'success';
      case 'no_contesto': return 'danger';
      case 'no_interesado': return 'default';
      case 'reagendo': return 'warning';
      case 'pendiente': return 'info';
      case 'cerrado': return 'purple';
      default: return 'default';
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
            <div className="text-2xl font-bold text-crm-text-primary">{resumen.promedioPorVendedor}</div>
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
        <CardContent className="p-0">
          {rankingVendedores.length > 0 ? (
            <CRMTable>
              <CRMTableHeader>
                <CRMTableRow>
                  <CRMTableHead>#</CRMTableHead>
                  <CRMTableHead>Vendedor</CRMTableHead>
                  <CRMTableHead className="text-center">Total</CRMTableHead>
                  <CRMTableHead className="text-center">Clientes</CRMTableHead>
                  <CRMTableHead className="text-center">Prom/Cliente</CRMTableHead>
                  <CRMTableHead className="text-center">Min.</CRMTableHead>
                  <CRMTableHead>Por Tipo</CRMTableHead>
                </CRMTableRow>
              </CRMTableHeader>
              <CRMTableBody>
                {rankingVendedores.map((vendedor: any, index: number) => (
                  <CRMTableRow key={index}>
                    <CRMTableCell>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-xs ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-400' :
                        'bg-crm-primary'
                      }`}>
                        {index + 1}
                      </div>
                    </CRMTableCell>
                    <CRMTableCell>
                      <div className="font-medium">{vendedor.nombre}</div>
                      <div className="text-xs text-crm-text-muted">@{vendedor.username}</div>
                    </CRMTableCell>
                    <CRMTableCell className="text-center">
                      <span className="font-bold text-lg">{vendedor.totalInteracciones}</span>
                    </CRMTableCell>
                    <CRMTableCell className="text-center">{vendedor.clientesAtendidos}</CRMTableCell>
                    <CRMTableCell className="text-center">{vendedor.promedioPorCliente}</CRMTableCell>
                    <CRMTableCell className="text-center text-crm-text-muted">{vendedor.duracionTotal}</CRMTableCell>
                    <CRMTableCell>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(vendedor.porTipo || {}).map(([tipo, cantidad]: [string, any]) => (
                          <CRMBadge key={tipo} variant={getTipoVariant(tipo)}>
                            {tipo.charAt(0).toUpperCase() + tipo.slice(1)}: {cantidad}
                          </CRMBadge>
                        ))}
                      </div>
                    </CRMTableCell>
                  </CRMTableRow>
                ))}
              </CRMTableBody>
            </CRMTable>
          ) : (
            <div className="text-center py-8 text-crm-text-muted">
              No hay interacciones registradas en este periodo
            </div>
          )}
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
                    <CRMBadge variant={getTipoVariant(item.tipo)} className="p-2">
                      {getTipoIcon(item.tipo)}
                    </CRMBadge>
                    <span className="font-medium text-crm-text-primary capitalize">{item.tipo}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={item.porcentaje} className="w-24 h-2" />
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
                  <CRMBadge variant={getResultadoVariant(item.resultado)}>
                    {formatResultado(item.resultado)}
                  </CRMBadge>
                  <div className="flex items-center gap-2">
                    <Progress value={item.porcentaje} className="w-24 h-2" />
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
