/**
 * Barrel export for all report actions.
 * Each domain has its own file for maintainability.
 */

// Shared utilities
export { getAuthorizedClient, calcularFechas, safeAction } from "./shared";

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

// Interacciones
export { obtenerReporteInteracciones } from "./interacciones";

// Nivel de interés
export { obtenerReporteNivelInteres } from "./nivel-interes";

// Origen de leads
export { obtenerReporteOrigenLead } from "./origen-lead";

// Tiempo de respuesta
export { obtenerReporteTiempoRespuesta } from "./tiempo-respuesta";

// Funnel de conversión
export { obtenerReporteFunnel } from "./funnel";

// Resumen KPIs (cards superiores del módulo)
export { obtenerResumenKPIs } from "./resumen-kpis";
export type { ResumenKPIs } from "./resumen-kpis";

// Drill-down del funnel: clientes por etapa
export { obtenerClientesPorEtapaFunnel } from "./clientes-etapa-funnel";
export type {
  EtapaFunnel,
  ClienteEtapaFunnel,
  ResultadoEtapaFunnel,
} from "./clientes-etapa-funnel";

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
