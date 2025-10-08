"use client";

import { useState, useEffect } from "react";
import { obtenerMetricasReportes, ReporteMetricas } from "@/app/dashboard/admin/reportes/_actions";

export interface UseReportesOptions {
  periodo?: string;
  fechaInicio?: string;
  fechaFin?: string;
  autoLoad?: boolean;
}

export function useReportes(options: UseReportesOptions = {}) {
  const [data, setData] = useState<ReporteMetricas | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    periodo = '30',
    fechaInicio,
    fechaFin,
    autoLoad = true
  } = options;

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await obtenerMetricasReportes(periodo, fechaInicio, fechaFin);

      if (result.data) {
        setData(result.data);
      } else {
        setError(result.error || 'Error cargando datos');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const recargar = () => {
    cargarDatos();
  };

  useEffect(() => {
    if (autoLoad) {
      cargarDatos();
    }
  }, [periodo, fechaInicio, fechaFin, autoLoad]);

  // Función para formatear números de moneda
  const formatearMoneda = (valor: number): string => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor);
  };

  // Función para formatear porcentajes
  const formatearPorcentaje = (valor: number): string => {
    return `${valor.toFixed(1)}%`;
  };

  // Función para formatear números grandes
  const formatearNumero = (valor: number): string => {
    if (valor >= 1000000) {
      return `${(valor / 1000000).toFixed(1)}M`;
    } else if (valor >= 1000) {
      return `${(valor / 1000).toFixed(1)}K`;
    }
    return valor.toString();
  };

  // Función para calcular cambios porcentuales
  const calcularCambio = (actual: number, anterior: number): { valor: number; tipo: 'positive' | 'negative' } => {
    if (anterior === 0) return { valor: 0, tipo: 'positive' };
    
    const cambio = ((actual - anterior) / anterior) * 100;
    return {
      valor: Math.abs(cambio),
      tipo: cambio >= 0 ? 'positive' : 'negative'
    };
  };

  // Datos procesados para las cards principales
  const cardsData = data ? [
    {
      title: "Ventas Totales",
      value: formatearMoneda(data.metricas.ventas.valorTotal),
      change: data.metricas.ventas.propiedadesVendidas > 0 ? "+12.5%" : "0%",
      changeType: "positive" as const,
      icon: "💰",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Clientes Activos",
      value: formatearNumero(data.metricas.clientes.activos),
      change: data.metricas.clientes.nuevos > 0 ? `+${data.metricas.clientes.nuevos}` : "0",
      changeType: "positive" as const,
      icon: "👥",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Propiedades Vendidas",
      value: data.metricas.propiedades.vendidas.toString(),
      change: data.metricas.propiedades.nuevas > 0 ? `+${data.metricas.propiedades.nuevas}` : "0",
      changeType: "positive" as const,
      icon: "🏠",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Conversión",
      value: formatearPorcentaje(data.metricas.clientes.tasaConversion),
      change: data.metricas.clientes.tasaConversion > 0 ? "+3.1%" : "0%",
      changeType: "positive" as const,
      icon: "📈",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ] : [];

  return {
    data,
    loading,
    error,
    cardsData,
    recargar,
    formatearMoneda,
    formatearPorcentaje,
    formatearNumero,
    calcularCambio
  };
}

