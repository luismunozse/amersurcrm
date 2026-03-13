/**
 * Backward-compatible re-export barrel.
 * All implementations have been split into /actions/*.ts for maintainability.
 * Note: "use server" is declared in each individual action file, not here,
 * because barrel files with re-exports cannot use "use server" in Next.js 15.
 */

export { obtenerMetricasReportes } from "./actions/metricas";
export type { ReporteMetricas } from "./actions/metricas";

export { obtenerReporteVentas, obtenerMetricasRendimiento, obtenerObjetivosVsRealidad } from "./actions/ventas";

export { obtenerReporteClientes, obtenerReporteGestionClientes } from "./actions/clientes";

export { obtenerReportePropiedades } from "./actions/propiedades";

export { obtenerReporteRendimiento } from "./actions/rendimiento";

export { obtenerReporteInteracciones } from "./actions/interacciones";

export { obtenerReporteNivelInteres } from "./actions/nivel-interes";

export { obtenerReporteOrigenLead } from "./actions/origen-lead";

export { obtenerReporteTiempoRespuesta } from "./actions/tiempo-respuesta";

export { obtenerReporteFunnel } from "./actions/funnel";
