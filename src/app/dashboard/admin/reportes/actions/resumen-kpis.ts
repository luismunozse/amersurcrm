"use server";

import { obtenerMetricasReportes } from "./metricas";
import { obtenerReporteFunnel } from "./funnel";
import { obtenerReporteTiempoRespuesta } from "./tiempo-respuesta";
import { calcularFechas } from "./shared";

export interface ResumenKPIs {
  leadsCaptados: number;
  tasaConversion: number;
  tiempoRespuestaPromedio: {
    totalHoras: number;
    etiqueta: string;
  };
  ventasPeriodo: number;
  ventasCerradas: number;
}

export type DeltaKPI = {
  /** Diferencia absoluta actual - anterior (sin signo de "mejor/peor"). */
  absoluto: number;
  /** Cambio porcentual respecto al anterior. null si anterior=0 (no comparable). */
  porcentaje: number | null;
  /** "up" / "down" / "flat" — sentido del cambio numérico. */
  direccion: "up" | "down" | "flat";
  /** "positive" / "negative" / "neutral" — interpretación de negocio (más leads = bueno; menos tiempo = bueno). */
  sentido: "positive" | "negative" | "neutral";
};

export interface ResumenKPIsConDelta {
  actual: ResumenKPIs;
  anterior: ResumenKPIs;
  delta: {
    leadsCaptados: DeltaKPI;
    tasaConversion: DeltaKPI;
    tiempoRespuestaPromedio: DeltaKPI;
    ventasPeriodo: DeltaKPI;
    ventasCerradas: DeltaKPI;
  };
  rangoAnterior: { inicio: string; fin: string };
}

async function calcularResumen(
  periodo: string,
  fechaInicio?: string,
  fechaFin?: string,
): Promise<ResumenKPIs> {
  const [metricasRes, funnelRes, tiempoRes] = await Promise.all([
    obtenerMetricasReportes(periodo, fechaInicio, fechaFin),
    obtenerReporteFunnel(periodo, fechaInicio, fechaFin),
    obtenerReporteTiempoRespuesta(periodo, fechaInicio, fechaFin),
  ]);

  const primerError = metricasRes.error || funnelRes.error || tiempoRes.error;
  if (primerError) throw new Error(primerError);

  const metricas = metricasRes.data;
  const funnel = funnelRes.data;
  const tiempo = tiempoRes.data;

  const promedioHoras = tiempo?.resumen?.promedioGlobalHoras ?? 0;

  return {
    leadsCaptados: metricas?.metricas.clientes.nuevos ?? 0,
    tasaConversion: funnel?.tasaConversionFinal ?? 0,
    tiempoRespuestaPromedio: {
      totalHoras: promedioHoras,
      etiqueta: formatearDuracion(promedioHoras),
    },
    // Usar ventasRegistradasEnPeriodo (filtrado estricto por fecha_venta).
    ventasPeriodo: metricas?.metricas.ventas.ventasRegistradasEnPeriodo ?? 0,
    ventasCerradas: metricas?.metricas.ventas.cantidadVentasEnPeriodo ?? 0,
  };
}

function calcularRangoAnterior(
  periodo: string,
  fechaInicio?: string,
  fechaFin?: string,
): { inicio: string; fin: string; periodo: string } {
  const { startDate, endDate } = calcularFechas(periodo, fechaInicio, fechaFin);
  const durMs = endDate.getTime() - startDate.getTime();

  const finAnterior = new Date(startDate.getTime() - 1);
  const inicioAnterior = new Date(finAnterior.getTime() - durMs);

  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return {
    inicio: fmt(inicioAnterior),
    fin: fmt(finAnterior),
    periodo, // se ignora cuando hay fechas explícitas
  };
}

function deltaPositivoEsBueno(actual: number, anterior: number): DeltaKPI {
  const absoluto = actual - anterior;
  const porcentaje = anterior !== 0 ? (absoluto / anterior) * 100 : null;
  const direccion: DeltaKPI["direccion"] = absoluto > 0 ? "up" : absoluto < 0 ? "down" : "flat";
  const sentido: DeltaKPI["sentido"] =
    absoluto > 0 ? "positive" : absoluto < 0 ? "negative" : "neutral";
  return { absoluto, porcentaje, direccion, sentido };
}

function deltaNegativoEsBueno(actual: number, anterior: number): DeltaKPI {
  const d = deltaPositivoEsBueno(actual, anterior);
  // Invertir interpretación de negocio (menos = mejor)
  const sentido: DeltaKPI["sentido"] =
    d.direccion === "down" ? "positive" : d.direccion === "up" ? "negative" : "neutral";
  return { ...d, sentido };
}

export async function obtenerResumenKPIs(
  periodo: string = "30",
  fechaInicio?: string,
  fechaFin?: string,
): Promise<{ data: ResumenKPIsConDelta | null; error: string | null }> {
  try {
    const rangoAnt = calcularRangoAnterior(periodo, fechaInicio, fechaFin);

    const [actual, anterior] = await Promise.all([
      calcularResumen(periodo, fechaInicio, fechaFin),
      calcularResumen(periodo, rangoAnt.inicio, rangoAnt.fin),
    ]);

    return {
      data: {
        actual,
        anterior,
        delta: {
          leadsCaptados: deltaPositivoEsBueno(actual.leadsCaptados, anterior.leadsCaptados),
          tasaConversion: deltaPositivoEsBueno(actual.tasaConversion, anterior.tasaConversion),
          tiempoRespuestaPromedio: deltaNegativoEsBueno(
            actual.tiempoRespuestaPromedio.totalHoras,
            anterior.tiempoRespuestaPromedio.totalHoras,
          ),
          ventasPeriodo: deltaPositivoEsBueno(actual.ventasPeriodo, anterior.ventasPeriodo),
          ventasCerradas: deltaPositivoEsBueno(actual.ventasCerradas, anterior.ventasCerradas),
        },
        rangoAnterior: { inicio: rangoAnt.inicio, fin: rangoAnt.fin },
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
