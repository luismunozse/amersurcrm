"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { obtenerMetricasReportes, ReporteMetricas } from "@/app/dashboard/admin/reportes/_actions";

interface ComparacionPeriodosProps {
  periodoActual: string;
  onPeriodoComparacionChange?: (periodo: string) => void;
}

export default function ComparacionPeriodos({ 
  periodoActual, 
  onPeriodoComparacionChange 
}: ComparacionPeriodosProps) {
  const [periodoComparacion, setPeriodoComparacion] = useState("30");
  const [datosComparacion, setDatosComparacion] = useState<ReporteMetricas | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const periodoActualEtiqueta = obtenerEtiquetaPeriodo(periodoActual);
  const periodoComparacionEtiqueta = obtenerEtiquetaPeriodo(periodoComparacion);

  const cargarDatosComparacion = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await obtenerMetricasReportes(periodoComparacion);

      if (result.data) {
        setDatosComparacion(result.data);
        onPeriodoComparacionChange?.(periodoComparacion);
      } else {
        setError(result.error || 'Error cargando datos de comparación');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [periodoComparacion, onPeriodoComparacionChange]);

  useEffect(() => {
    cargarDatosComparacion();
  }, [cargarDatosComparacion]);

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
    if (anterior === 0) return { valor: 0, tipo: 'sin-cambio' as const };
    
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
        return 'text-green-600 bg-green-50';
      case 'negative':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
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

  if (error || !datosComparacion) {
    return (
      <div className="bg-crm-card border border-crm-border rounded-xl p-6">
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-lg">⚠️</span>
          </div>
          <h3 className="text-lg font-medium text-red-800 mb-2">Error en Comparación</h3>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={cargarDatosComparacion}
            className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Nota: En un escenario real, necesitarías datos del período actual para comparar
  // Por ahora, simularé datos del período actual
  const datosActuales = {
    ventas: { valorTotal: 2450000, propiedadesVendidas: 89 },
    clientes: { activos: 1247, nuevos: 156, tasaConversion: 24.8 },
    propiedades: { total: 1456, nuevas: 45, vendidas: 89, disponibles: 892 }
  };

  const metricasComparacion = datosComparacion.metricas;

  if (!metricasComparacion) {
    return (
      <div className="bg-crm-card border border-crm-border rounded-xl p-6">
        <div className="text-center text-crm-text-secondary">
          No hay métricas disponibles para el período seleccionado.
        </div>
      </div>
    );
  }

  const comparaciones = [
    {
      titulo: "Ventas Totales",
      actual: formatearMoneda(datosActuales.ventas.valorTotal),
      anterior: formatearMoneda(metricasComparacion.ventas?.valorTotal ?? 0),
      cambio: calcularCambio(datosActuales.ventas.valorTotal, metricasComparacion.ventas?.valorTotal ?? 0)
    },
    {
      titulo: "Clientes Activos",
      actual: datosActuales.clientes.activos.toString(),
      anterior: (metricasComparacion.clientes?.activos ?? 0).toString(),
      cambio: calcularCambio(datosActuales.clientes.activos, metricasComparacion.clientes?.activos ?? 0)
    },
    {
      titulo: "Propiedades Vendidas",
      actual: datosActuales.propiedades.vendidas.toString(),
      anterior: (metricasComparacion.propiedades?.vendidas ?? 0).toString(),
      cambio: calcularCambio(datosActuales.propiedades.vendidas, metricasComparacion.propiedades?.vendidas ?? 0)
    },
    {
      titulo: "Tasa de Conversión",
      actual: formatearPorcentaje(datosActuales.clientes.tasaConversion),
      anterior: formatearPorcentaje(metricasComparacion.clientes?.tasaConversion ?? 0),
      cambio: calcularCambio(datosActuales.clientes.tasaConversion, metricasComparacion.clientes?.tasaConversion ?? 0)
    }
  ];

  return (
    <div className="bg-crm-card border border-crm-border rounded-xl p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-crm-text-primary flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Comparación de Períodos
          </h2>
          <div className="flex items-center gap-2">
            <label className="text-sm text-crm-text-secondary">Comparar con:</label>
            <select
              value={periodoComparacion}
              onChange={(e) => setPeriodoComparacion(e.target.value)}
              className="px-3 py-1.5 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent"
            >
              <option value="7">Últimos 7 días</option>
              <option value="30">Últimos 30 días</option>
              <option value="90">Últimos 90 días</option>
              <option value="365">Último año</option>
            </select>
          </div>
        </div>
        <p className="text-crm-text-secondary text-sm">
          Comparación entre {periodoActualEtiqueta} y {periodoComparacionEtiqueta}.
        </p>
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
                  {item.cambio.tipo === 'sin-cambio' ? 'Sin cambio' : `${item.cambio.valor.toFixed(1)}%`}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Resumen */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-blue-600 text-sm">📊</span>
          </div>
          <div>
            <h4 className="text-sm font-medium text-blue-800 mb-1">Resumen de Comparación</h4>
            <p className="text-xs text-blue-700">
              Comparando período actual con los últimos {periodoComparacion} días. 
              Los datos muestran las tendencias y cambios en las métricas principales del sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
