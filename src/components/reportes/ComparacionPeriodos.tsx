"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { obtenerMetricasReportes, ReporteMetricas } from "@/app/dashboard/admin/reportes/_actions";

interface ComparacionPeriodosProps {
  periodoActual: string;
  datosActuales: ReporteMetricas;
  onPeriodoComparacionChange?: (periodo: string) => void;
}

export default function ComparacionPeriodos({
  periodoActual,
  datosActuales,
  onPeriodoComparacionChange
}: ComparacionPeriodosProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [datosAnteriores, setDatosAnteriores] = useState<ReporteMetricas | null>(null);

  const obtenerEtiquetaPeriodo = (periodo: string): string => {
    switch (periodo) {
      case "7":
        return "los últimos 7 días";
      case "30":
        return "los últimos 30 días";
      case "90":
        return "los últimos 90 días";
      case "365":
        return "el último año";
      default:
        return `los últimos ${periodo} días`;
    }
  };

  const cargarDatosPeriodoAnterior = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Calcular fechas del período anterior
      const dias = parseInt(periodoActual);
      const fechaFinAnterior = new Date(datosActuales.periodo.inicio);
      const fechaInicioAnterior = new Date(fechaFinAnterior);
      fechaInicioAnterior.setDate(fechaInicioAnterior.getDate() - dias);

      // Obtener métricas del período anterior
      const result = await obtenerMetricasReportes(
        periodoActual,
        fechaInicioAnterior.toISOString(),
        fechaFinAnterior.toISOString()
      );

      if (result.data) {
        setDatosAnteriores(result.data);
        onPeriodoComparacionChange?.(periodoActual);
      } else {
        setError(result.error || 'Error cargando datos del período anterior');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [periodoActual, datosActuales.periodo.inicio, onPeriodoComparacionChange]);

  useEffect(() => {
    cargarDatosPeriodoAnterior();
  }, [cargarDatosPeriodoAnterior]);

  const formatearMoneda = (valor: number): string => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor);
  };

  const formatearPorcentaje = (valor: number): string => {
    return `${valor.toFixed(1)}%`;
  };

  const calcularCambio = (actual: number, anterior: number) => {
    if (anterior === 0) {
      if (actual === 0) return { valor: 0, tipo: 'sin-cambio' as const };
      return { valor: 100, tipo: 'positive' as const };
    }

    const cambio = ((actual - anterior) / anterior) * 100;
    return {
      valor: Math.abs(cambio),
      tipo: cambio > 0 ? 'positive' as const : cambio < 0 ? 'negative' as const : 'sin-cambio' as const
    };
  };

  const getIconoCambio = (tipo: string) => {
    switch (tipo) {
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'negative':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getColorCambio = (tipo: string) => {
    switch (tipo) {
      case 'positive':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'negative':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  if (loading) {
    return (
      <div className="bg-crm-card border border-crm-border rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-crm-border rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-20 bg-crm-border rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !datosAnteriores) {
    return (
      <div className="bg-crm-card border border-crm-border rounded-xl p-6">
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-lg">⚠️</span>
          </div>
          <h3 className="text-lg font-medium text-red-800 dark:text-red-400 mb-2">Error en Comparación</h3>
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error || 'No se pudieron cargar los datos'}</p>
          <button
            onClick={cargarDatosPeriodoAnterior}
            className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Usar datos reales del período actual y anterior
  const comparaciones = [
    {
      titulo: "Ventas Totales",
      actual: formatearMoneda(datosActuales.metricas.ventas.valorTotal),
      anterior: formatearMoneda(datosAnteriores.metricas.ventas.valorTotal),
      cambio: calcularCambio(
        datosActuales.metricas.ventas.valorTotal,
        datosAnteriores.metricas.ventas.valorTotal
      )
    },
    {
      titulo: "Clientes Activos",
      actual: datosActuales.metricas.clientes.activos.toString(),
      anterior: datosAnteriores.metricas.clientes.activos.toString(),
      cambio: calcularCambio(
        datosActuales.metricas.clientes.activos,
        datosAnteriores.metricas.clientes.activos
      )
    },
    {
      titulo: "Propiedades Vendidas",
      actual: datosActuales.metricas.ventas.propiedadesVendidas.toString(),
      anterior: datosAnteriores.metricas.ventas.propiedadesVendidas.toString(),
      cambio: calcularCambio(
        datosActuales.metricas.ventas.propiedadesVendidas,
        datosAnteriores.metricas.ventas.propiedadesVendidas
      )
    },
    {
      titulo: "Tasa de Conversión",
      actual: formatearPorcentaje(datosActuales.metricas.clientes.tasaConversion),
      anterior: formatearPorcentaje(datosAnteriores.metricas.clientes.tasaConversion),
      cambio: calcularCambio(
        datosActuales.metricas.clientes.tasaConversion,
        datosAnteriores.metricas.clientes.tasaConversion
      )
    }
  ];

  const fechaInicioActual = new Date(datosActuales.periodo.inicio).toLocaleDateString('es-PE');
  const fechaFinActual = new Date(datosActuales.periodo.fin).toLocaleDateString('es-PE');
  const fechaInicioAnterior = new Date(datosAnteriores.periodo.inicio).toLocaleDateString('es-PE');
  const fechaFinAnterior = new Date(datosAnteriores.periodo.fin).toLocaleDateString('es-PE');

  return (
    <div className="bg-crm-card border border-crm-border rounded-xl p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-crm-text-primary flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Comparación de Períodos
          </h2>
        </div>
        <div className="space-y-2 text-sm text-crm-text-secondary">
          <p>
            <span className="font-medium text-crm-text-primary">Período Actual:</span>{' '}
            {fechaInicioActual} - {fechaFinActual} ({datosActuales.periodo.dias} días)
          </p>
          <p>
            <span className="font-medium text-crm-text-primary">Período Anterior:</span>{' '}
            {fechaInicioAnterior} - {fechaFinAnterior} ({datosAnteriores.periodo.dias} días)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {comparaciones.map((item, index) => (
          <div key={index} className="bg-crm-bg-primary border border-crm-border rounded-lg p-4">
            <h3 className="text-sm font-medium text-crm-text-secondary mb-3">
              {item.titulo}
            </h3>

            <div className="space-y-2">
              {/* Período Actual */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-crm-text-muted">Período Actual:</span>
                <span className="font-semibold text-crm-text-primary">{item.actual}</span>
              </div>

              {/* Período Anterior */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-crm-text-muted">Período Anterior:</span>
                <span className="font-medium text-crm-text-secondary">{item.anterior}</span>
              </div>

              {/* Cambio */}
              <div className="flex items-center justify-between pt-2 border-t border-crm-border">
                <span className="text-xs text-crm-text-muted">Cambio:</span>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getColorCambio(item.cambio.tipo)}`}>
                  {getIconoCambio(item.cambio.tipo)}
                  {item.cambio.tipo === 'sin-cambio'
                    ? 'Sin cambio'
                    : `${item.cambio.tipo === 'positive' ? '+' : '-'}${item.cambio.valor.toFixed(1)}%`}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Resumen */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-blue-600 dark:text-blue-400 text-sm">📊</span>
          </div>
          <div>
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Análisis de Tendencia</h4>
            <p className="text-xs text-blue-700 dark:text-blue-400">
              Comparación entre el período actual ({obtenerEtiquetaPeriodo(periodoActual)}) y el período
              inmediatamente anterior de igual duración. Los porcentajes muestran el crecimiento o
              decrecimiento en cada métrica clave.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
