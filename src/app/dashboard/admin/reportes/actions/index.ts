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
