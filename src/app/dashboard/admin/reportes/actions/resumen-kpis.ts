"use server";

import { obtenerMetricasReportes } from "./metricas";
import { obtenerReporteFunnel } from "./funnel";
import { obtenerReporteTiempoRespuesta } from "./tiempo-respuesta";

export interface ResumenKPIs {
  leadsCaptados: number;
  tasaConversion: number;
  tiempoRespuestaPromedio: {
    totalHoras: number;
    etiqueta: string;
  };
  ventasPeriodo: number;
  clientesActivos: number;
}

export async function obtenerResumenKPIs(
  periodo: string = "30",
  fechaInicio?: string,
  fechaFin?: string,
): Promise<{ data: ResumenKPIs | null; error: string | null }> {
  try {
    const [metricasRes, funnelRes, tiempoRes] = await Promise.all([
      obtenerMetricasReportes(periodo, fechaInicio, fechaFin),
      obtenerReporteFunnel(periodo, fechaInicio, fechaFin),
      obtenerReporteTiempoRespuesta(periodo, fechaInicio, fechaFin),
    ]);

    const primerError = metricasRes.error || funnelRes.error || tiempoRes.error;
    if (primerError) {
      return { data: null, error: primerError };
    }

    const metricas = metricasRes.data;
    const funnel = funnelRes.data;
    const tiempo = tiempoRes.data;

    const leadsCaptados = metricas?.metricas.clientes.nuevos ?? 0;
    const clientesActivos = metricas?.metricas.clientes.activos ?? 0;
    const ventasPeriodo = metricas?.metricas.ventas.valorTotal ?? 0;
    const tasaConversion = funnel?.tasaConversionFinal ?? 0;
    const promedioHoras = tiempo?.resumen?.promedioGlobalHoras ?? 0;

    return {
      data: {
        leadsCaptados,
        tasaConversion,
        tiempoRespuestaPromedio: {
          totalHoras: promedioHoras,
          etiqueta: formatearDuracion(promedioHoras),
        },
        ventasPeriodo,
        clientesActivos,
      },
      error: null,
    };
  } catch (error) {
    console.error("Error en obtenerResumenKPIs:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

function formatearDuracion(totalHoras: number): string {
  if (!totalHoras || totalHoras <= 0) return "—";
  const horasEnteras = Math.round(totalHoras);
  const dias = Math.floor(horasEnteras / 24);
  const horas = horasEnteras % 24;
  if (dias > 0) return `${dias}d ${horas}h`;
  return `${horas}h`;
}
