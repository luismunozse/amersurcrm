"use client";

import { useState, useEffect } from "react";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Target, 
  CheckCircle,
  Clock,
  BarChart3,
  ArrowUp
} from "lucide-react";

interface ReporteVendedor {
  // Métricas generales
  totalClientes: number;
  clientesNuevos: number;
  clientesActivos: number;
  
  // Ventas
  totalVentas: number;
  montoVentas: number;
  ventasEnProceso: number;
  
  // Reservas
  totalReservas: number;
  reservasActivas: number;
  
  // Metas
  metaMensual: number;
  progreso: number;
  
  // Tendencias (últimos 6 meses)
  ventasPorMes: { mes: string; cantidad: number; monto: number }[];
  clientesPorMes: { mes: string; nuevos: number }[];
}

export default function VendedorReportesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReporteVendedor | null>(null);
  const [periodo, setPeriodo] = useState("mes");

  useEffect(() => {
    const cargarReporte = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/vendedor/reportes?periodo=${periodo}`);
        const result = await response.json();
        
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error || "Error cargando reportes");
        }
      } catch (err) {
        console.error("Error:", err);
        setError("Error al cargar los reportes");
      } finally {
        setLoading(false);
      }
    };

    cargarReporte();
  }, [periodo]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 0
    }).format(value);
  };

  const calcularPorcentaje = (actual: number, meta: number) => {
    if (meta === 0) return 0;
    return Math.round((actual / meta) * 100);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-crm-text-primary">Mis Reportes</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-crm-card border border-crm-border rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-crm-border rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-crm-border rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-crm-text-primary">Mis Reportes</h1>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const porcentajeMeta = data ? calcularPorcentaje(data.montoVentas, data.metaMensual) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-crm-text-primary">Mis Reportes</h1>
          <p className="text-crm-text-secondary">Tu rendimiento y estadísticas</p>
        </div>
        
        {/* Selector de período */}
        <div className="flex gap-2">
          {[
            { value: "semana", label: "Semana" },
            { value: "mes", label: "Mes" },
            { value: "trimestre", label: "Trimestre" },
            { value: "año", label: "Año" },
          ].map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriodo(p.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                periodo === p.value
                  ? "bg-crm-primary text-white"
                  : "bg-crm-card border border-crm-border text-crm-text-primary hover:bg-crm-card-hover"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Progreso de Meta */}
      {data && data.metaMensual > 0 && (
        <div className="bg-gradient-to-r from-crm-primary to-crm-accent rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-lg">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Meta Mensual</h2>
                <p className="text-white/80 text-sm">
                  {formatCurrency(data.montoVentas)} de {formatCurrency(data.metaMensual)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold">{porcentajeMeta}%</span>
              <p className="text-white/80 text-sm">completado</p>
            </div>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3">
            <div 
              className="bg-white rounded-full h-3 transition-all duration-500"
              style={{ width: `${Math.min(porcentajeMeta, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Clientes */}
        <div className="bg-crm-card border border-crm-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-crm-primary/10 rounded-lg">
              <Users className="w-5 h-5 text-crm-primary" />
            </div>
            {data && data.clientesNuevos > 0 && (
              <span className="flex items-center text-sm text-crm-success">
                <ArrowUp className="w-4 h-4 mr-1" />
                +{data.clientesNuevos}
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-crm-text-primary">{data?.totalClientes || 0}</p>
          <p className="text-sm text-crm-text-muted">Clientes asignados</p>
        </div>

        {/* Ventas Completadas */}
        <div className="bg-crm-card border border-crm-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-crm-success/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-crm-success" />
            </div>
          </div>
          <p className="text-2xl font-bold text-crm-text-primary">{data?.totalVentas || 0}</p>
          <p className="text-sm text-crm-text-muted">Ventas completadas</p>
        </div>

        {/* Monto Total */}
        <div className="bg-crm-card border border-crm-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-crm-warning/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-crm-warning" />
            </div>
          </div>
          <p className="text-2xl font-bold text-crm-text-primary">{formatCurrency(data?.montoVentas || 0)}</p>
          <p className="text-sm text-crm-text-muted">Monto en ventas</p>
        </div>

        {/* Reservas Activas */}
        <div className="bg-crm-card border border-crm-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-crm-accent/20 rounded-lg">
              <Clock className="w-5 h-5 text-crm-accent" />
            </div>
          </div>
          <p className="text-2xl font-bold text-crm-text-primary">{data?.reservasActivas || 0}</p>
          <p className="text-sm text-crm-text-muted">Reservas activas</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventas por Mes */}
        <div className="bg-crm-card border border-crm-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-crm-primary/10 rounded-lg">
              <BarChart3 className="w-5 h-5 text-crm-primary" />
            </div>
            <h3 className="text-lg font-semibold text-crm-text-primary">Ventas por Mes</h3>
          </div>
          
          {data?.ventasPorMes && data.ventasPorMes.length > 0 ? (
            <div className="space-y-3">
              {data.ventasPorMes.map((mes, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <span className="w-16 text-sm text-crm-text-muted">{mes.mes}</span>
                  <div className="flex-1 bg-crm-border rounded-full h-6 overflow-hidden">
                    <div 
                      className="bg-crm-primary h-full rounded-full flex items-center justify-end pr-2"
                      style={{ 
                        width: `${Math.max(10, (mes.cantidad / Math.max(...data.ventasPorMes.map(m => m.cantidad || 1))) * 100)}%` 
                      }}
                    >
                      <span className="text-xs text-white font-medium">{mes.cantidad}</span>
                    </div>
                  </div>
                  <span className="w-24 text-right text-sm font-medium text-crm-text-primary">
                    {formatCurrency(mes.monto)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-crm-text-muted py-8">No hay datos de ventas para mostrar</p>
          )}
        </div>

        {/* Clientes por Mes */}
        <div className="bg-crm-card border border-crm-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-crm-secondary/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-crm-secondary" />
            </div>
            <h3 className="text-lg font-semibold text-crm-text-primary">Clientes Nuevos por Mes</h3>
          </div>
          
          {data?.clientesPorMes && data.clientesPorMes.length > 0 ? (
            <div className="space-y-3">
              {data.clientesPorMes.map((mes, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <span className="w-16 text-sm text-crm-text-muted">{mes.mes}</span>
                  <div className="flex-1 bg-crm-border rounded-full h-6 overflow-hidden">
                    <div 
                      className="bg-crm-secondary h-full rounded-full flex items-center justify-end pr-2"
                      style={{ 
                        width: `${Math.max(10, (mes.nuevos / Math.max(...data.clientesPorMes.map(m => m.nuevos || 1))) * 100)}%` 
                      }}
                    >
                      <span className="text-xs text-white font-medium">{mes.nuevos}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-crm-text-muted py-8">No hay datos de clientes para mostrar</p>
          )}
        </div>
      </div>

      {/* Resumen adicional */}
      <div className="bg-crm-card border border-crm-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-crm-text-primary mb-4">Resumen del Período</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-crm-bg-primary dark:bg-crm-sidebar rounded-lg">
            <p className="text-2xl font-bold text-crm-text-primary">{data?.clientesActivos || 0}</p>
            <p className="text-sm text-crm-text-muted">Clientes activos</p>
          </div>
          <div className="text-center p-4 bg-crm-bg-primary dark:bg-crm-sidebar rounded-lg">
            <p className="text-2xl font-bold text-crm-text-primary">{data?.ventasEnProceso || 0}</p>
            <p className="text-sm text-crm-text-muted">Ventas en proceso</p>
          </div>
          <div className="text-center p-4 bg-crm-bg-primary dark:bg-crm-sidebar rounded-lg">
            <p className="text-2xl font-bold text-crm-text-primary">{data?.totalReservas || 0}</p>
            <p className="text-sm text-crm-text-muted">Total reservas</p>
          </div>
          <div className="text-center p-4 bg-crm-bg-primary dark:bg-crm-sidebar rounded-lg">
            <p className="text-2xl font-bold text-crm-primary">{porcentajeMeta}%</p>
            <p className="text-sm text-crm-text-muted">De la meta</p>
          </div>
        </div>
      </div>
    </div>
  );
}

