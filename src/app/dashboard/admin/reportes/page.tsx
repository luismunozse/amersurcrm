"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Calendar, Download, BarChart3, UserCheck, UserCog, MessageSquare,
  Users, PieChart, Target, Clock, AlertCircle, Building, DollarSign,
  TrendingUp, GitCompare, FileDown,
} from "lucide-react";
import { useReportes } from "@/hooks/useReportes";
import ReporteVentas from "./components/ReporteVentas";
import ReporteClientes from "./components/ReporteClientes";
import ReportePropiedades from "./components/ReportePropiedades";
import ReporteRendimientoVendedores from "./components/ReporteRendimientoVendedores";
import ReporteGestionClientes from "./components/ReporteGestionClientes";
import ReporteInteracciones from "./components/ReporteInteracciones";
import ReporteNivelInteres from "./components/ReporteNivelInteres";
import ReporteOrigenLead from "./components/ReporteOrigenLead";
import ReporteTiempoRespuesta from "./components/ReporteTiempoRespuesta";
import ComparacionPeriodos from "@/components/reportes/ComparacionPeriodos";
import DatePicker from "@/components/ui/DatePicker";
import toast from "react-hot-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageLoader } from "@/components/ui/PageLoader";

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

const ReporteFunnel = dynamic(
  () => import("./components/ReporteFunnel"),
  {
    ssr: false,
    loading: () => (
      <PageLoader size="sm" />
    )
  }
);

function calcularFechasPeriodo(periodo: string): { fechaInicio: string; fechaFin: string } {
  const hoy = new Date();
  const fin = new Date(hoy);
  fin.setHours(23, 59, 59, 999);
  const inicio = new Date(hoy);
  inicio.setDate(inicio.getDate() - parseInt(periodo));
  inicio.setHours(0, 0, 0, 0);
  return {
    fechaInicio: inicio.toISOString().split("T")[0],
    fechaFin: fin.toISOString().split("T")[0],
  };
}

const ALL_TABS = [
  { id: "analisis",        title: "Análisis",        icon: BarChart3 },
  { id: "comparacion",     title: "Comparación",      icon: GitCompare },
  { id: "funnel",          title: "Funnel",           icon: TrendingUp },
  { id: "nivel-interes",   title: "Nivel Interés",    icon: PieChart },
  { id: "origen-lead",     title: "Origen Lead",      icon: Target },
  { id: "tiempo-respuesta",title: "Tiempo Respuesta", icon: Clock },
  { id: "gestion",         title: "Gestión",          icon: Users },
  { id: "interacciones",   title: "Interacciones",    icon: MessageSquare },
  { id: "propiedades",     title: "Propiedades",      icon: Building },
  { id: "ventas",          title: "Ventas",           icon: DollarSign },
  { id: "clientes",        title: "Clientes",         icon: UserCheck },
  { id: "rendimiento",     title: "Rendimiento",      icon: UserCog },
];

export default function ReportesPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [activeTab, setActiveTab] = useState("analisis");
  // Registra qué tabs ya se visitaron (carga lazy + caché sin re-fetch)
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(
    () => new Set(["analisis"])
  );

  // Ref al contenedor de tabs para captura visual PDF
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Fechas personalizadas
  const fechasPreset = calcularFechasPeriodo(selectedPeriod);
  const [fechaInicio, setFechaInicio] = useState(fechasPreset.fechaInicio);
  const [fechaFin, setFechaFin] = useState(fechasPreset.fechaFin);
  const [modoPersonalizado, setModoPersonalizado] = useState(false);

  // Fechas efectivas: si es personalizado, usar las del state; si no, calcular del preset
  const fechasEfectivas = modoPersonalizado
    ? { fechaInicio, fechaFin }
    : calcularFechasPeriodo(selectedPeriod);

  const { data, loading, error } = useReportes({
    periodo: selectedPeriod,
    fechaInicio: modoPersonalizado ? fechaInicio : undefined,
    fechaFin: modoPersonalizado ? fechaFin : undefined,
    autoLoad: true
  });

  const handlePeriodoChange = (nuevoPeriodo: string) => {
    if (nuevoPeriodo === "custom") {
      setModoPersonalizado(true);
      return;
    }
    setModoPersonalizado(false);
    setSelectedPeriod(nuevoPeriodo);
    const nuevasFechas = calcularFechasPeriodo(nuevoPeriodo);
    setFechaInicio(nuevasFechas.fechaInicio);
    setFechaFin(nuevasFechas.fechaFin);
    // Al cambiar período, reiniciar para forzar re-fetch en todos los tabs
    setVisitedTabs(new Set([activeTab]));
  };

  const handleFechaInicioChange = (fecha: string) => {
    setFechaInicio(fecha);
    setVisitedTabs(new Set([activeTab]));
  };

  const handleFechaFinChange = (fecha: string) => {
    setFechaFin(fecha);
    setVisitedTabs(new Set([activeTab]));
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setVisitedTabs(prev => new Set([...prev, tab]));
  };

  const handleExportarCompleto = async () => {
    if (!data) {
      toast.error('No hay datos para exportar');
      return;
    }
    try {
      toast.loading('Generando PDF completo...', { id: 'export' });
      const { abrirReportePDF } = await import("@/lib/pdfGenerator");
      abrirReportePDF(data);
      toast.success('Reporte PDF generado exitosamente', { id: 'export' });
    } catch (err) {
      console.error('Error exportando reporte:', err);
      toast.error('Error generando PDF. Por favor intenta nuevamente.', { id: 'export' });
    }
  };

  const handleExportarBloque = async () => {
    const tabActual = ALL_TABS.find(t => t.id === activeTab);
    if (!tabActual) return;

    // Buscar el contenido visible del tab activo dentro del contenedor
    const container = tabsContainerRef.current;
    if (!container) return;

    const activeContent = container.querySelector<HTMLElement>(
      `[data-state="active"][role="tabpanel"]`
    );
    if (!activeContent || activeContent.children.length === 0) {
      toast.error('No hay contenido visible para exportar', { id: 'export-bloque' });
      return;
    }

    try {
      toast.loading(`Capturando ${tabActual.title} con gráficos...`, { id: 'export-bloque' });
      const { exportarSeccionVisualPDF } = await import("@/lib/pdfGenerator");
      await exportarSeccionVisualPDF(
        activeContent,
        tabActual.title,
        { inicio: fechasEfectivas.fechaInicio, fin: fechasEfectivas.fechaFin }
      );
      toast.success(`${tabActual.title} exportado exitosamente`, { id: 'export-bloque' });
    } catch (err) {
      console.error('Error exportando bloque:', err);
      toast.error('Error generando PDF de sección', { id: 'export-bloque' });
    }
  };

  // Estado de carga para las tabs que dependen de useReportes
  // Recibe una factory fn para evitar evaluar data! cuando data es null
  const renderOverviewContent = (factory: () => React.ReactNode) => {
    if (loading) {
      return (
        <PageLoader size="sm" />
      );
    }
    if (error) {
      return (
        <div className="text-center py-12 text-red-600 dark:text-red-400">{error}</div>
      );
    }
    if (!data) return null;
    return factory();
  };

  // Etiqueta descriptiva del período actual
  const periodoLabel = modoPersonalizado
    ? `${new Date(fechaInicio).toLocaleDateString('es-PE')} - ${new Date(fechaFin).toLocaleDateString('es-PE')}`
    : data
      ? `${data.periodo.dias} días • ${new Date(data.periodo.inicio).toLocaleDateString('es-PE')} - ${new Date(data.periodo.fin).toLocaleDateString('es-PE')}`
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-crm-text-primary font-display">Reportes</h1>
          <p className="text-crm-text-secondary mt-1">
            Análisis detallado y métricas del sistema
            {periodoLabel && (
              <span className="ml-2 text-xs bg-crm-primary/10 text-crm-primary px-2 py-1 rounded-full">
                {periodoLabel}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Selector de período */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-crm-text-muted" />
            <Select
              value={modoPersonalizado ? "custom" : selectedPeriod}
              onValueChange={handlePeriodoChange}
            >
              <SelectTrigger className="w-[180px] bg-crm-card border-crm-border text-crm-text-primary">
                <SelectValue placeholder="Seleccionar período" />
              </SelectTrigger>
              <SelectContent className="bg-crm-card border-crm-border">
                <SelectItem value="7"   className="text-crm-text-primary hover:bg-crm-card-hover focus:bg-crm-card-hover cursor-pointer">Últimos 7 días</SelectItem>
                <SelectItem value="30"  className="text-crm-text-primary hover:bg-crm-card-hover focus:bg-crm-card-hover cursor-pointer">Últimos 30 días</SelectItem>
                <SelectItem value="90"  className="text-crm-text-primary hover:bg-crm-card-hover focus:bg-crm-card-hover cursor-pointer">Últimos 90 días</SelectItem>
                <SelectItem value="365" className="text-crm-text-primary hover:bg-crm-card-hover focus:bg-crm-card-hover cursor-pointer">Último año</SelectItem>
                <SelectItem value="custom" className="text-crm-text-primary hover:bg-crm-card-hover focus:bg-crm-card-hover cursor-pointer">
                  Personalizado
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Botón exportar completo */}
          <button
            onClick={handleExportarCompleto}
            disabled={loading || !data}
            className="flex items-center gap-2 px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* Filtro de fechas personalizado */}
      {modoPersonalizado && (
        <div className="bg-crm-card border border-crm-border rounded-xl p-4">
          <div className="flex flex-col sm:flex-row items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-crm-text-secondary mb-2">
                Fecha desde
              </label>
              <DatePicker
                value={fechaInicio}
                onChange={handleFechaInicioChange}
                placeholder="Fecha inicio"
                maxDate={fechaFin ? new Date(fechaFin) : undefined}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-crm-text-secondary mb-2">
                Fecha hasta
              </label>
              <DatePicker
                value={fechaFin}
                onChange={handleFechaFinChange}
                placeholder="Fecha fin"
                minDate={fechaInicio ? new Date(fechaInicio) : undefined}
              />
            </div>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Sección unificada de reportes */}
      <div className="bg-crm-card border border-crm-border rounded-xl p-6">
        <Tabs ref={tabsContainerRef} value={activeTab} onValueChange={handleTabChange} className="w-full">

          {/* Tab Navigation - scrolleable en móvil */}
          <div className="flex items-center justify-between mb-6" data-pdf-ignore>
            <div className="overflow-x-auto -mx-1 px-1 flex-1">
              <TabsList className="flex flex-nowrap w-max min-w-full bg-transparent p-0 gap-1 h-auto">
                {ALL_TABS.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors bg-crm-card-hover text-crm-text-primary hover:bg-crm-sidebar-hover data-[state=active]:bg-crm-primary data-[state=active]:text-white whitespace-nowrap"
                  >
                    <tab.icon className="w-4 h-4 flex-shrink-0" />
                    <span>{tab.title}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Botón exportar bloque actual */}
            <button
              onClick={handleExportarBloque}
              title={`Exportar "${ALL_TABS.find(t => t.id === activeTab)?.title}" como PDF con gráficos`}
              className="flex-shrink-0 ml-3 flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-crm-primary bg-crm-primary/10 hover:bg-crm-primary/20 rounded-lg transition-colors"
            >
              <FileDown className="w-4 h-4" />
              <span className="hidden sm:inline">PDF Sección</span>
            </button>
          </div>

          {/* ── Tabs que usan datos de useReportes ── */}
          <TabsContent value="analisis" forceMount className="mt-0 data-[state=inactive]:hidden">
            {visitedTabs.has("analisis") && renderOverviewContent(
              () => <GraficosTendencias tendencias={data!.tendencias} metricas={data!.metricas} />
            )}
          </TabsContent>

          <TabsContent value="comparacion" forceMount className="mt-0 data-[state=inactive]:hidden">
            {visitedTabs.has("comparacion") && renderOverviewContent(
              () => <ComparacionPeriodos periodoActual={selectedPeriod} datosActuales={data!} />
            )}
          </TabsContent>

          {/* ── Tabs con sus propias server actions ── */}
          <TabsContent value="funnel" forceMount className="mt-0 data-[state=inactive]:hidden">
            {visitedTabs.has("funnel") && (
              <ReporteFunnel
                periodo={selectedPeriod}
                fechaInicio={fechasEfectivas.fechaInicio}
                fechaFin={fechasEfectivas.fechaFin}
              />
            )}
          </TabsContent>

          <TabsContent value="nivel-interes" forceMount className="mt-0 data-[state=inactive]:hidden">
            {visitedTabs.has("nivel-interes") && (
              <ReporteNivelInteres
                periodo={selectedPeriod}
                fechaInicioDefault={fechasEfectivas.fechaInicio}
                fechaFinDefault={fechasEfectivas.fechaFin}
              />
            )}
          </TabsContent>

          <TabsContent value="origen-lead" forceMount className="mt-0 data-[state=inactive]:hidden">
            {visitedTabs.has("origen-lead") && (
              <ReporteOrigenLead
                periodo={selectedPeriod}
                fechaInicioDefault={fechasEfectivas.fechaInicio}
                fechaFinDefault={fechasEfectivas.fechaFin}
              />
            )}
          </TabsContent>

          <TabsContent value="tiempo-respuesta" forceMount className="mt-0 data-[state=inactive]:hidden">
            {visitedTabs.has("tiempo-respuesta") && (
              <ReporteTiempoRespuesta
                periodo={selectedPeriod}
                fechaInicioDefault={fechasEfectivas.fechaInicio}
                fechaFinDefault={fechasEfectivas.fechaFin}
              />
            )}
          </TabsContent>

          <TabsContent value="gestion" forceMount className="mt-0 data-[state=inactive]:hidden">
            {visitedTabs.has("gestion") && (
              <ReporteGestionClientes
                periodo={selectedPeriod}
                fechaInicio={fechasEfectivas.fechaInicio}
                fechaFin={fechasEfectivas.fechaFin}
              />
            )}
          </TabsContent>

          <TabsContent value="interacciones" forceMount className="mt-0 data-[state=inactive]:hidden">
            {visitedTabs.has("interacciones") && (
              <ReporteInteracciones
                periodo={selectedPeriod}
                fechaInicio={fechasEfectivas.fechaInicio}
                fechaFin={fechasEfectivas.fechaFin}
              />
            )}
          </TabsContent>

          <TabsContent value="propiedades" forceMount className="mt-0 data-[state=inactive]:hidden">
            {visitedTabs.has("propiedades") && (
              <ReportePropiedades
                periodo={selectedPeriod}
                fechaInicio={fechasEfectivas.fechaInicio}
                fechaFin={fechasEfectivas.fechaFin}
              />
            )}
          </TabsContent>

          <TabsContent value="ventas" forceMount className="mt-0 data-[state=inactive]:hidden">
            {visitedTabs.has("ventas") && (
              <ReporteVentas
                periodo={selectedPeriod}
                fechaInicio={fechasEfectivas.fechaInicio}
                fechaFin={fechasEfectivas.fechaFin}
              />
            )}
          </TabsContent>

          <TabsContent value="clientes" forceMount className="mt-0 data-[state=inactive]:hidden">
            {visitedTabs.has("clientes") && (
              <ReporteClientes
                periodo={selectedPeriod}
                fechaInicio={fechasEfectivas.fechaInicio}
                fechaFin={fechasEfectivas.fechaFin}
              />
            )}
          </TabsContent>

          <TabsContent value="rendimiento" forceMount className="mt-0 data-[state=inactive]:hidden">
            {visitedTabs.has("rendimiento") && (
              <ReporteRendimientoVendedores
                periodo={selectedPeriod}
                fechaInicio={fechasEfectivas.fechaInicio}
                fechaFin={fechasEfectivas.fechaFin}
              />
            )}
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
