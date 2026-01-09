"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Calendar, Download, Filter, TrendingUp, Building, DollarSign, BarChart3, UserCheck, UserCog, MessageSquare, Users } from "lucide-react";
import { useReportes } from "@/hooks/useReportes";
import ReporteVentas from "./components/ReporteVentas";
import ReporteClientes from "./components/ReporteClientes";
import ReportePropiedades from "./components/ReportePropiedades";
import ReporteRendimientoVendedores from "./components/ReporteRendimientoVendedores";
import ReporteGestionClientes from "./components/ReporteGestionClientes";
import ReporteInteracciones from "./components/ReporteInteracciones";
import toast from "react-hot-toast";

// Lazy load de componentes pesados (recharts ~100KB+)
const GraficosTendencias = dynamic(
  () => import("@/components/reportes/GraficosTendencias"),
  {
    ssr: false,
    loading: () => (
      <div className="h-80 flex items-center justify-center">
        <div className="animate-pulse text-crm-text-muted">Cargando gráficos...</div>
      </div>
    )
  }
);

const ComparacionPeriodos = dynamic(
  () => import("@/components/reportes/ComparacionPeriodos"),
  {
    ssr: false,
    loading: () => (
      <div className="h-40 flex items-center justify-center">
        <div className="animate-pulse text-crm-text-muted">Cargando comparación...</div>
      </div>
    )
  }
);

export default function ReportesPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [activeTab, setActiveTab] = useState("gestion");

  const { data, loading, error } = useReportes({
    periodo: selectedPeriod,
    autoLoad: true
  });

  const handlePeriodoChange = (nuevoPeriodo: string) => {
    setSelectedPeriod(nuevoPeriodo);
  };

  const handleExportar = async () => {
    if (!data) {
      toast.error('No hay datos para exportar');
      return;
    }

    try {
      toast.loading('Generando PDF...', { id: 'export' });

      // Lazy load del generador de PDF (jspdf ~200KB+)
      const { abrirReportePDF } = await import("@/lib/pdfGenerator");
      abrirReportePDF(data);

      toast.success('Reporte PDF generado exitosamente', { id: 'export' });
    } catch (err) {
      console.error('Error exportando reporte:', err);
      toast.error('Error generando PDF. Por favor intenta nuevamente.', { id: 'export' });
    }
  };

  const reportTypes = [
    {
      id: "gestion",
      title: "Gestion Clientes",
      description: "Estado de seguimiento de clientes captados",
      icon: Users,
    },
    {
      id: "interacciones",
      title: "Interacciones",
      description: "Actividad de vendedores con clientes",
      icon: MessageSquare,
    },
    {
      id: "propiedades",
      title: "Propiedades",
      description: "Inventario y disponibilidad",
      icon: Building,
    },
    {
      id: "ventas",
      title: "Ventas",
      description: "Análisis detallado de ventas",
      icon: DollarSign,
    },
    {
      id: "clientes",
      title: "Clientes",
      description: "Estadísticas de clientes",
      icon: UserCheck,
    },
    {
      id: "rendimiento",
      title: "Rendimiento",
      description: "Métricas de vendedores",
      icon: UserCog,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-crm-text-primary font-display">Reportes</h1>
          <p className="text-crm-text-secondary mt-1">
            Análisis detallado y métricas del sistema
            {data && (
              <span className="ml-2 text-xs bg-crm-primary/10 text-crm-primary px-2 py-1 rounded-full">
                {data.periodo.dias} días • {new Date(data.periodo.inicio).toLocaleDateString('es-PE')} - {new Date(data.periodo.fin).toLocaleDateString('es-PE')}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-crm-text-muted" />
            <select
              value={selectedPeriod}
              onChange={(e) => handlePeriodoChange(e.target.value)}
              className="px-3 py-2 border border-crm-border rounded-lg text-sm bg-crm-card text-crm-text focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent"
            >
              <option value="7">Últimos 7 días</option>
              <option value="30">Últimos 30 días</option>
              <option value="90">Últimos 90 días</option>
              <option value="365">Último año</option>
            </select>
          </div>
          
          <button 
            onClick={handleExportar}
            disabled={loading || !data}
            className="flex items-center gap-2 px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Gráficos de Tendencias */}
      {data && !loading && !error && (
        <div className="bg-crm-card border border-crm-border rounded-xl p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-crm-text-primary flex items-center gap-2 mb-2">
              <BarChart3 className="w-5 h-5" />
              Análisis Visual
            </h2>
            <p className="text-crm-text-secondary">
              Gráficos interactivos y tendencias de los últimos 6 meses
            </p>
          </div>
          <GraficosTendencias 
            tendencias={data.tendencias} 
            metricas={data.metricas}
          />
        </div>
      )}

      {/* Comparación de Períodos */}
      {data && !loading && !error && (
        <ComparacionPeriodos
          periodoActual={selectedPeriod}
          datosActuales={data}
        />
      )}

      {/* Reports Tabs */}
      <div className="bg-crm-card border border-crm-border rounded-xl p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-crm-text-primary flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5" />
            Reportes Detallados
          </h2>
          <p className="text-crm-text-secondary">
            Selecciona el tipo de reporte que deseas visualizar
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
          {reportTypes.map((report) => (
            <button
              key={report.id}
              onClick={() => setActiveTab(report.id)}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === report.id
                  ? 'bg-crm-primary text-white'
                  : 'bg-crm-card-hover text-crm-text-primary hover:bg-crm-sidebar-hover'
              }`}
            >
              <report.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{report.title}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "gestion" && <ReporteGestionClientes periodo={selectedPeriod} />}
        {activeTab === "interacciones" && <ReporteInteracciones periodo={selectedPeriod} />}
        {activeTab === "propiedades" && <ReportePropiedades periodo={selectedPeriod} />}
        {activeTab === "ventas" && <ReporteVentas periodo={selectedPeriod} />}
        {activeTab === "clientes" && <ReporteClientes periodo={selectedPeriod} />}
        {activeTab === "rendimiento" && <ReporteRendimientoVendedores periodo={selectedPeriod} />}
      </div>

      {/* Quick Actions */}
      <div className="bg-crm-card border border-crm-border rounded-xl p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-crm-text-primary mb-2">Acciones Rápidas</h2>
          <p className="text-crm-text-secondary">
            Herramientas adicionales para análisis y reportes
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button className="h-auto p-4 flex flex-col items-start gap-2 border border-crm-border bg-transparent text-crm-text-primary rounded-lg hover:bg-crm-card-hover transition-colors">
            <Filter className="w-5 h-5" />
            <span className="font-medium">Filtros Avanzados</span>
            <span className="text-sm text-crm-text-muted">Personalizar reportes</span>
          </button>
          
          <button className="h-auto p-4 flex flex-col items-start gap-2 border border-crm-border bg-transparent text-crm-text-primary rounded-lg hover:bg-crm-card-hover transition-colors">
            <Calendar className="w-5 h-5" />
            <span className="font-medium">Comparar Períodos</span>
            <span className="text-sm text-crm-text-muted">Análisis comparativo</span>
          </button>
          
          <button className="h-auto p-4 flex flex-col items-start gap-2 border border-crm-border bg-transparent text-crm-text-primary rounded-lg hover:bg-crm-card-hover transition-colors">
            <TrendingUp className="w-5 h-5" />
            <span className="font-medium">Tendencias</span>
            <span className="text-sm text-crm-text-muted">Análisis de tendencias</span>
          </button>
        </div>
      </div>
    </div>
  );
}
