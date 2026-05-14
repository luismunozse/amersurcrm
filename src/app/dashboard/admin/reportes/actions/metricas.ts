"use server";

import { getAuthorizedClient, calcularFechas, safeAction } from "./shared";
import {
  fetchMetricasClientes,
  fetchMetricasInventario,
  fetchMetricasVentas,
  fetchVendedoresActivos,
  buildTopVendedores,
  fetchTendenciasRolling6m,
  fetchProyectosNuevos,
} from "./metricas-fetchers";

export interface ReporteMetricas {
  periodo: {
    inicio: string;
    fin: string;
    dias: number;
  };
  metricas: {
    ventas: {
      valorTotal: number;
      propiedadesVendidas: number;
      promedioVenta: number;
      /** Ventas registradas en tabla venta dentro del período (valor confiable para comparaciones) */
      ventasRegistradasEnPeriodo: number;
      /** Cantidad de ventas registradas en tabla venta dentro del período */
      cantidadVentasEnPeriodo: number;
    };
    clientes: {
      nuevos: number;
      /** Clientes con interacción o venta dentro del período (señal real de actividad). */
      activos: number;
      /** Total acumulado histórico de clientes hasta el fin del período (no responde a período). */
      totalHistorico: number;
      tasaConversion: number;
    };
    propiedades: {
      total: number;
      nuevas: number;
      vendidas: number;
      disponibles: number;
      valorTotal: number;
    };
    proyectos: {
      nuevos: number;
      total: number;
    };
    vendedores: {
      activos: number;
      topVendedores: Array<{
        username: string;
        nombre: string;
        ventas: number;
        propiedades: number;
        meta: number;
      }>;
    };
  };
  tendencias: Array<{
    mes: string;
    ventas: number;
    propiedades: number;
    clientes: number;
  }>;
}

/**
 * Obtiene métricas principales de reportes.
 *
 * Orquesta 6 fetchers paralelos (ver `metricas-fetchers.ts`) y ensambla
 * el shape público `ReporteMetricas`. Lógica de cada dominio (clientes,
 * inventario, ventas, tendencias, vendedores, proyectos) vive en el
 * archivo de fetchers.
 */
export async function obtenerMetricasReportes(
  periodo: string = "30",
  fechaInicio?: string,
  fechaFin?: string,
): Promise<{ data: ReporteMetricas | null; error: string | null }> {
  return safeAction(async () => {
    const supabase = await getAuthorizedClient();
    const { startDate, endDate, days } = calcularFechas(periodo, fechaInicio, fechaFin);
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    const [
      clientesPiezas,
      inventarioPiezas,
      ventasPiezas,
      vendedoresPerfiles,
      tendencias,
      proyectosPiezas,
    ] = await Promise.all([
      fetchMetricasClientes(supabase, startISO, endISO),
      fetchMetricasInventario(supabase, startISO, endISO),
      fetchMetricasVentas(supabase, startISO, endISO),
      fetchVendedoresActivos(supabase),
      fetchTendenciasRolling6m(supabase),
      fetchProyectosNuevos(supabase, startISO, endISO),
    ]);

    const topVendedores = buildTopVendedores(vendedoresPerfiles, ventasPiezas.ventasPorVendedor, 5);

    const valorTotalVentas = ventasPiezas.valorVentasRegistradas;
    const totalVendidas = inventarioPiezas.totalVendidas;

    return {
      periodo: { inicio: startISO, fin: endISO, dias: days },
      metricas: {
        ventas: {
          valorTotal: valorTotalVentas,
          propiedadesVendidas: totalVendidas,
          promedioVenta: totalVendidas > 0 ? valorTotalVentas / totalVendidas : 0,
          ventasRegistradasEnPeriodo: ventasPiezas.valorVentasRegistradas,
          cantidadVentasEnPeriodo: ventasPiezas.cantidadVentas,
        },
        clientes: {
          nuevos: clientesPiezas.nuevos,
          activos: clientesPiezas.activos,
          totalHistorico: clientesPiezas.totalHistorico,
          tasaConversion: clientesPiezas.tasaConversion,
        },
        propiedades: {
          total: inventarioPiezas.totalPropiedades,
          nuevas: inventarioPiezas.propiedadesNuevas,
          vendidas: totalVendidas,
          disponibles: inventarioPiezas.totalDisponibles,
          valorTotal: valorTotalVentas,
        },
        proyectos: {
          nuevos: proyectosPiezas.nuevos,
          total: proyectosPiezas.totalEnPeriodo,
        },
        vendedores: {
          activos: vendedoresPerfiles.length,
          topVendedores,
        },
      },
      tendencias,
    };
  });
}
