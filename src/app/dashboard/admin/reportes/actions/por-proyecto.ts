"use server";

import { getAuthorizedClient, calcularFechas, safeAction } from "./shared";
import { buildCachedReportFetcher } from "./shared-cache";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ProyectoOpcion {
  id: string;
  nombre: string;
}

export interface ReportePorProyectoData {
  proyectos: ProyectoOpcion[];
  proyectoSeleccionado: ProyectoOpcion | null;
  inventario: {
    total: number;
    disponibles: number;
    vendidos: number;
    reservados: number;
    otros: number;
    lotes: number;
    propiedades: number;
    valorDisponible: number;
    valorVendido: number;
    avancePct: string;
  };
  ventas: {
    cantidad: number;
    monto: number;
    ticketPromedio: number;
  };
  leads: {
    totalInteresados: number;
    nuevosPeriodo: number;
    contactadosPeriodo: number;
    conversionPct: string;
  };
  nivelInteres: {
    alto: number;
    medio: number;
    bajo: number;
    sinClasificar: number;
  };
  topVendedores: Array<{
    username: string;
    nombre: string;
    cantidadVentas: number;
    montoVentas: number;
  }>;
  periodo: { inicio: string; fin: string; dias: number };
}

async function _fetchProyectoOpciones(supabase: SupabaseClient<any, "crm">): Promise<ProyectoOpcion[]> {
  const { data } = await supabase
    .schema("crm")
    .from("proyecto")
    .select("id, nombre")
    .eq("estado", "activo")
    .order("nombre", { ascending: true });
  return (data || []) as ProyectoOpcion[];
}

async function _fetchPorProyecto(
  supabase: SupabaseClient<any, "crm">,
  proyectoId: string | null,
  startISO: string,
  endISO: string,
  days: number,
): Promise<ReportePorProyectoData> {
  const proyectos = await _fetchProyectoOpciones(supabase);

  const empty: ReportePorProyectoData = {
    proyectos,
    proyectoSeleccionado: null,
    inventario: {
      total: 0, disponibles: 0, vendidos: 0, reservados: 0, otros: 0,
      lotes: 0, propiedades: 0, valorDisponible: 0, valorVendido: 0, avancePct: "0",
    },
    ventas: { cantidad: 0, monto: 0, ticketPromedio: 0 },
    leads: { totalInteresados: 0, nuevosPeriodo: 0, contactadosPeriodo: 0, conversionPct: "0" },
    nivelInteres: { alto: 0, medio: 0, bajo: 0, sinClasificar: 0 },
    topVendedores: [],
    periodo: { inicio: startISO, fin: endISO, dias: days },
  };

  if (!proyectoId) return empty;

  const proyectoSeleccionado = proyectos.find((p) => p.id === proyectoId) || null;
  if (!proyectoSeleccionado) return empty;

  // Inventario + ventas + intereses en paralelo
  const [lotesRes, propiedadesRes, ventasRes, interesesRes] = await Promise.all([
    supabase
      .schema("crm")
      .from("lote")
      .select("id, codigo, estado, precio")
      .eq("proyecto_id", proyectoId),
    supabase
      .schema("crm")
      .from("propiedad")
      .select("id, codigo, estado_comercial, precio")
      .eq("proyecto_id", proyectoId),
    supabase
      .schema("crm")
      .from("venta")
      .select(`
        id, precio_total, vendedor_username, cliente_id,
        propiedad:propiedad_id ( proyecto_id ),
        lote:lote_id ( proyecto_id )
      `)
      .gte("fecha_venta", startISO)
      .lte("fecha_venta", endISO),
    supabase
      .schema("crm")
      .from("cliente_propiedad_interes")
      .select(`
        cliente_id, prioridad, proyecto_id,
        lote:lote_id ( proyecto_id ),
        propiedad:propiedad_id ( proyecto_id )
      `),
  ]);

  // ── Inventario
  const lotes = lotesRes.data || [];
  const propiedades = propiedadesRes.data || [];

  const cuenta = (estado: string, source: any[]) =>
    source.filter((p: any) => (p.estado ?? p.estado_comercial) === estado).length;
  const sumar = (estado: string, source: any[]) =>
    source
      .filter((p: any) => (p.estado ?? p.estado_comercial) === estado)
      .reduce((sum, p: any) => sum + (Number(p.precio) || 0), 0);

  const total = lotes.length + propiedades.length;
  const disponibles = cuenta("disponible", lotes) + cuenta("disponible", propiedades);
  const vendidos = cuenta("vendido", lotes) + cuenta("vendido", propiedades);
  const reservados = cuenta("reservado", lotes) + cuenta("reservado", propiedades);
  const otros = total - disponibles - vendidos - reservados;
  const valorDisponible = sumar("disponible", lotes) + sumar("disponible", propiedades);
  const valorVendido = sumar("vendido", lotes) + sumar("vendido", propiedades);

  // ── Ventas del período (filtrar por proyecto vía propiedad o lote)
  const ventasProyecto = (ventasRes.data || []).filter((v: any) => {
    const pid = v.propiedad?.proyecto_id || v.lote?.proyecto_id;
    return pid === proyectoId;
  });
  const cantidadVentas = ventasProyecto.length;
  const montoVentas = ventasProyecto.reduce(
    (sum: number, v: any) => sum + (Number(v.precio_total) || 0),
    0,
  );
  const ticketPromedio = cantidadVentas > 0 ? montoVentas / cantidadVentas : 0;

  // ── Intereses filtrados por proyecto
  const interesesProyecto = (interesesRes.data || []).filter((i: any) => {
    const pid = i.proyecto_id || i.lote?.proyecto_id || i.propiedad?.proyecto_id;
    return pid === proyectoId;
  });

  // Mejor prioridad por cliente
  const prioridadCliente = new Map<string, number>();
  interesesProyecto.forEach((i: any) => {
    const actual = prioridadCliente.get(i.cliente_id);
    const nueva = i.prioridad ?? 2;
    if (actual === undefined || nueva < actual) {
      prioridadCliente.set(i.cliente_id, nueva);
    }
  });

  const clientesInteresados = Array.from(prioridadCliente.keys());
  const totalInteresados = clientesInteresados.length;

  const nivelInteres = { alto: 0, medio: 0, bajo: 0, sinClasificar: 0 };
  prioridadCliente.forEach((p) => {
    if (p === 1) nivelInteres.alto += 1;
    else if (p === 2) nivelInteres.medio += 1;
    else if (p === 3) nivelInteres.bajo += 1;
    else nivelInteres.sinClasificar += 1;
  });

  // ── Leads nuevos del período entre interesados
  let nuevosPeriodo = 0;
  let contactadosPeriodo = 0;
  if (clientesInteresados.length > 0) {
    const [nuevosRes, interaccionesRes] = await Promise.all([
      supabase
        .schema("crm")
        .from("cliente")
        .select("id", { count: "exact", head: true })
        .in("id", clientesInteresados)
        .gte("fecha_alta", startISO)
        .lte("fecha_alta", endISO),
      supabase
        .schema("crm")
        .from("cliente_interaccion")
        .select("cliente_id")
        .in("cliente_id", clientesInteresados)
        .gte("fecha_interaccion", startISO)
        .lte("fecha_interaccion", endISO),
    ]);
    nuevosPeriodo = nuevosRes.count ?? 0;
    contactadosPeriodo = new Set(
      (interaccionesRes.data || []).map((i: any) => i.cliente_id),
    ).size;
  }

  const conversionPct = totalInteresados > 0
    ? ((cantidadVentas / totalInteresados) * 100).toFixed(1)
    : "0";

  // ── Top vendedores del proyecto en el período
  const ventasPorVendedor = new Map<string, { cantidad: number; monto: number }>();
  ventasProyecto.forEach((v: any) => {
    const username = v.vendedor_username;
    if (!username) return;
    const actual = ventasPorVendedor.get(username) || { cantidad: 0, monto: 0 };
    actual.cantidad += 1;
    actual.monto += Number(v.precio_total) || 0;
    ventasPorVendedor.set(username, actual);
  });

  let topVendedores: ReportePorProyectoData["topVendedores"] = [];
  if (ventasPorVendedor.size > 0) {
    const usernames = Array.from(ventasPorVendedor.keys());
    const { data: perfiles } = await supabase
      .schema("crm")
      .from("usuario_perfil")
      .select("username, nombre_completo")
      .in("username", usernames);
    const nombreMap = new Map(
      (perfiles || []).map((p: any) => [p.username, p.nombre_completo || p.username]),
    );
    topVendedores = Array.from(ventasPorVendedor.entries())
      .map(([username, stats]) => ({
        username,
        nombre: nombreMap.get(username) || username,
        cantidadVentas: stats.cantidad,
        montoVentas: stats.monto,
      }))
      .sort((a, b) => b.montoVentas - a.montoVentas)
      .slice(0, 5);
  }

  const avancePct = total > 0 ? ((vendidos / total) * 100).toFixed(1) : "0";

  return {
    proyectos,
    proyectoSeleccionado,
    inventario: {
      total, disponibles, vendidos, reservados, otros,
      lotes: lotes.length, propiedades: propiedades.length,
      valorDisponible, valorVendido, avancePct,
    },
    ventas: { cantidad: cantidadVentas, monto: montoVentas, ticketPromedio },
    leads: { totalInteresados, nuevosPeriodo, contactadosPeriodo, conversionPct },
    nivelInteres,
    topVendedores,
    periodo: { inicio: startISO, fin: endISO, dias: days },
  };
}

const fetchPorProyectoCached = buildCachedReportFetcher(
  _fetchPorProyecto,
  ["reporte-por-proyecto"],
  60,
);

export async function obtenerReportePorProyecto(
  proyectoId: string | null = null,
  periodo: string = "30",
  fechaInicio?: string,
  fechaFin?: string,
): Promise<{ data: ReportePorProyectoData | null; error: string | null }> {
  return safeAction(async () => {
    await getAuthorizedClient();
    const { startDate, endDate, days } = calcularFechas(periodo, fechaInicio, fechaFin);
    return fetchPorProyectoCached(
      proyectoId,
      startDate.toISOString(),
      endDate.toISOString(),
      days,
    );
  });
}
