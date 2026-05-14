/**
 * Barrel export for all report actions.
 * Each domain has its own file for maintainability.
 *
 * IMPORTANTE: NO re-exportar nada de `./shared` desde aquí. `shared.ts`
 * importa `revalidateTag`/`unstable_cache` de `next/cache` (server-only).
 * Si alguien re-expone esos símbolos vía este barrel, los client components
 * que importen tipos del barrel arrastran el módulo y rompen el build con:
 *   "You're importing a component that needs revalidateTag. That only
 *    works in a Server Component..."
 *
 * Server actions que necesiten helpers de shared deben importar directo
 * desde "./shared" (siempre en archivo con "use server").
 */

// Métricas principales (dashboard overview)
export { obtenerMetricasReportes } from "./metricas";
export type { ReporteMetricas } from "./metricas";

// Ventas
export { obtenerReporteVentas, obtenerMetricasRendimiento, obtenerObjetivosVsRealidad } from "./ventas";

// Clientes
export { obtenerReporteClientes, obtenerReporteGestionClientes } from "./clientes";

// Propiedades
export { obtenerReportePropiedades } from "./propiedades";

// Rendimiento de vendedores
export { obtenerReporteRendimiento } from "./rendimiento";
export type { ReporteRendimientoData, PerformanceStat, TopPerformer } from "./rendimiento";

// Reporte por vendedor (desglose diario)
export { obtenerReportePorVendedor } from "./por-vendedor";
export type {
  ReportePorVendedorData,
  ReportePorVendedorDia,
  ReportePorVendedorVendedor,
  ReportePorVendedorResumen,
} from "./por-vendedor";

// Reporte por proyecto inmobiliario
export { obtenerReportePorProyecto } from "./por-proyecto";
export type { ReportePorProyectoData, ProyectoOpcion } from "./por-proyecto";

// Comparación entre vendedores side-by-side
export { obtenerComparacionVendedores } from "./comparacion-vendedores";
export type {
  ReporteComparacionData,
  VendedorComparacionStats,
  VendedorComparable,
} from "./comparacion-vendedores";

// Análisis de cohortes (lead → venta por mes)
export { obtenerReporteCohortes } from "./cohortes";
export type {
  ReporteCohortesData,
  CohortRow,
  CohortLagCell,
} from "./cohortes";

// Centro de alertas in-app
export {
  listarAlertaReglas,
  toggleAlertaRegla,
  listarAlertaDisparos,
} from "./alertas";
export type { AlertaRegla, AlertaDisparo } from "./alertas";

// Interacciones
export { obtenerReporteInteracciones } from "./interacciones";
export type {
  ReporteInteraccionesData,
  RankingVendedor,
  TendenciaDiaria,
} from "./interacciones";

// Nivel de interés
export { obtenerReporteNivelInteres } from "./nivel-interes";
export type {
  ReporteNivelInteresData,
  NivelInteresDistribucion,
  NivelInteresPorProyecto,
  NivelInteresPorVendedor,
  ClientesPorProyectoEntry,
} from "./nivel-interes";

// Origen de leads
export { obtenerReporteOrigenLead } from "./origen-lead";

// Tiempo de respuesta
export { obtenerReporteTiempoRespuesta } from "./tiempo-respuesta";

// Funnel de conversión
export { obtenerReporteFunnel } from "./funnel";
export type { ReporteFunnelData, EtapaFunnelStat, ConversionEntreEtapas } from "./funnel";

// Resumen KPIs (cards superiores del módulo)
export { obtenerResumenKPIs } from "./resumen-kpis";
export type { ResumenKPIs, ResumenKPIsConDelta, DeltaKPI } from "./resumen-kpis";

// Drill-down del funnel: clientes por etapa
export { obtenerClientesPorEtapaFunnel } from "./clientes-etapa-funnel";
export type {
  EtapaFunnel,
  ClienteEtapaFunnel,
  ResultadoEtapaFunnel,
} from "./clientes-etapa-funnel";

// Drill-down de KPI: detalle de ventas del período
export { obtenerDetalleVentasPeriodo } from "./detalle-ventas-periodo";
export type {
  VentaDetalleKPI,
  ResultadoDetalleVentas,
} from "./detalle-ventas-periodo";

// Cobranza (cross-data: cuotas + pagos)
export { obtenerReporteCobranza } from "./cobranza";
export type {
  ReporteCobranza,
  ReporteCobranzaResumen,
  RecaudacionMensual,
  TopDeudor,
} from "./cobranza";

// Comisiones (cross-data: comision + venta + perfil)
export { obtenerReporteComisiones } from "./comisiones";
export type {
  ReporteComisiones,
  ResumenComisionesReporte,
  ComisionPorVendedor,
  ComisionMensual,
} from "./comisiones";
