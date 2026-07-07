/**
 * Helpers internos para `metricas.ts` — sin "use server".
 *
 * Mantienen la lógica de fetching y agregación dividida por dominio
 * (clientes, inventario, ventas, tendencias, vendedores) para que el
 * orquestador principal (`obtenerMetricasReportes`) sea legible.
 *
 * Cada helper recibe el SupabaseClient (ya autorizado) + parámetros
 * primitivos. No declara "use server"; vive como módulo regular.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { esEstadoConvertido } from "@/lib/reportes/estados";

const MESES_TENDENCIA = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// ─────────────────────────────────────────────────────────────────────
// Tipos de salida intermedios
// ─────────────────────────────────────────────────────────────────────

export interface MetricasClientesPiezas {
  nuevos: number;
  activos: number;
  totalHistorico: number;
  /** Conversion: clientes con estado_cliente='propietario' (ESTADOS_CONVERTIDOS) / leads del período. */
  tasaConversion: number;
}

export interface MetricasInventarioPiezas {
  totalPropiedades: number;
  propiedadesNuevas: number;
  totalVendidas: number;
  totalDisponibles: number;
}

export interface MetricasVentasPiezas {
  valorVentasRegistradas: number;
  cantidadVentas: number;
  /** Mapa username → { ventas (monto), propiedades (cantidad) } */
  ventasPorVendedor: Map<string, { ventas: number; propiedades: number }>;
}

export interface VendedorTopPieza {
  username: string;
  nombre: string;
  ventas: number;
  propiedades: number;
  meta: number;
}

export interface MetricasTendenciaItem {
  mes: string;
  ventas: number;
  propiedades: number;
  clientes: number;
}

// ─────────────────────────────────────────────────────────────────────
// Fetch + agregación: CLIENTES
// ─────────────────────────────────────────────────────────────────────

export async function fetchMetricasClientes(
  supabase: SupabaseClient<any, "crm">,
  startISO: string,
  endISO: string,
): Promise<MetricasClientesPiezas & { leadsRaw: Array<{ id: string; estado_cliente: string | null }> }> {
  const [nuevosRes, totalRes, interaccionRes, ventaRes] = await Promise.all([
    supabase.schema("crm").from("cliente")
      .select("id, estado_cliente, fecha_alta, vendedor_asignado")
      .gte("fecha_alta", startISO).lte("fecha_alta", endISO),
    supabase.schema("crm").from("cliente")
      .select("id", { count: "exact", head: true })
      .lte("fecha_alta", endISO),
    supabase.schema("crm").from("cliente_interaccion")
      .select("cliente_id")
      .gte("fecha_interaccion", startISO).lte("fecha_interaccion", endISO),
    supabase.schema("crm").from("venta")
      .select("cliente_id")
      .gte("fecha_venta", startISO).lte("fecha_venta", endISO)
      .not("cliente_id", "is", null),
  ]);

  const leadsRaw = (nuevosRes.data || []) as Array<{
    id: string;
    estado_cliente: string | null;
  }>;
  const nuevos = leadsRaw.length;
  const totalHistorico = totalRes.count ?? 0;

  const activosSet = new Set<string>();
  (interaccionRes.data || []).forEach((i: any) => i.cliente_id && activosSet.add(i.cliente_id));
  (ventaRes.data || []).forEach((v: any) => v.cliente_id && activosSet.add(v.cliente_id));

  const convertidos = leadsRaw.filter((c) => esEstadoConvertido(c.estado_cliente ?? "")).length;
  const tasaConversion = nuevos > 0 ? (convertidos / nuevos) * 100 : 0;

  return {
    nuevos,
    activos: activosSet.size,
    totalHistorico,
    tasaConversion: Math.round(tasaConversion * 100) / 100,
    leadsRaw,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Fetch + agregación: INVENTARIO (lotes + propiedades)
// ─────────────────────────────────────────────────────────────────────

export async function fetchMetricasInventario(
  supabase: SupabaseClient<any, "crm">,
  startISO: string,
  endISO: string,
): Promise<MetricasInventarioPiezas> {
  const [lotesNuevosRes, lotesEstadosRes, propsNuevasRes, propsEstadosRes] = await Promise.all([
    supabase.schema("crm").from("lote")
      .select("id, estado, precio, created_at")
      .gte("created_at", startISO).lte("created_at", endISO),
    supabase.schema("crm").from("lote")
      .select("id, estado, precio")
      .lte("created_at", endISO),
    supabase.schema("crm").from("propiedad")
      .select("id, estado_comercial, precio, created_at")
      .gte("created_at", startISO).lte("created_at", endISO),
    supabase.schema("crm").from("propiedad")
      .select("id, estado_comercial, precio")
      .lte("created_at", endISO),
  ]);

  const lotesEstados = lotesEstadosRes.data || [];
  const propsEstados = propsEstadosRes.data || [];

  const propiedadesNuevas = (lotesNuevosRes.data?.length || 0) + (propsNuevasRes.data?.length || 0);

  const lotesVendidos = lotesEstados.filter((l: any) => l.estado === "vendido").length;
  const propsVendidas = propsEstados.filter((p: any) => p.estado_comercial === "vendido").length;
  const totalVendidas = lotesVendidos + propsVendidas;

  const lotesDisponibles = lotesEstados.filter((l: any) => l.estado === "disponible").length;
  const propsDisponibles = propsEstados.filter((p: any) => p.estado_comercial === "disponible").length;
  const totalDisponibles = lotesDisponibles + propsDisponibles;

  const totalPropiedades = lotesEstados.length + propsEstados.length;

  return { totalPropiedades, propiedadesNuevas, totalVendidas, totalDisponibles };
}

// ─────────────────────────────────────────────────────────────────────
// Fetch + agregación: VENTAS DEL PERÍODO + reparto por vendedor
// ─────────────────────────────────────────────────────────────────────

export async function fetchMetricasVentas(
  supabase: SupabaseClient<any, "crm">,
  startISO: string,
  endISO: string,
): Promise<MetricasVentasPiezas> {
  const [montosRes, vendedoresRes] = await Promise.all([
    supabase.schema("crm").from("venta")
      .select("id, precio_total")
      .gte("fecha_venta", startISO).lte("fecha_venta", endISO),
    supabase.schema("crm").from("venta")
      .select("vendedor_username, precio_total")
      .gte("fecha_venta", startISO).lte("fecha_venta", endISO),
  ]);

  const valorVentasRegistradas = (montosRes.data || []).reduce(
    (sum: number, v: any) => sum + (Number(v.precio_total) || 0),
    0,
  );
  const cantidadVentas = montosRes.data?.length || 0;

  const ventasPorVendedor = new Map<string, { ventas: number; propiedades: number }>();
  (vendedoresRes.data || []).forEach((v: any) => {
    if (!v.vendedor_username) return;
    const actual = ventasPorVendedor.get(v.vendedor_username) || { ventas: 0, propiedades: 0 };
    ventasPorVendedor.set(v.vendedor_username, {
      ventas: actual.ventas + (Number(v.precio_total) || 0),
      propiedades: actual.propiedades + 1,
    });
  });

  return { valorVentasRegistradas, cantidadVentas, ventasPorVendedor };
}

// ─────────────────────────────────────────────────────────────────────
// Fetch: VENDEDORES (catálogo) + ensamble TOP
// ─────────────────────────────────────────────────────────────────────

export interface VendedorPerfil {
  id: string;
  username: string;
  nombre_completo: string | null;
  meta_mensual_ventas: number | null;
}

export async function fetchVendedoresActivos(
  supabase: SupabaseClient<any, "crm">,
): Promise<VendedorPerfil[]> {
  const { data } = await supabase.schema("crm").from("usuario_perfil")
    .select("id, username, nombre_completo, activo, rol_id, meta_mensual_ventas, comision_porcentaje")
    .eq("activo", true);
  return (data || []) as VendedorPerfil[];
}

export function buildTopVendedores(
  vendedores: VendedorPerfil[],
  ventasPorVendedor: Map<string, { ventas: number; propiedades: number }>,
  topN = 5,
): VendedorTopPieza[] {
  return vendedores
    .map((v) => ({
      username: v.username,
      nombre: v.nombre_completo || v.username,
      ventas: ventasPorVendedor.get(v.username)?.ventas || 0,
      propiedades: ventasPorVendedor.get(v.username)?.propiedades || 0,
      meta: v.meta_mensual_ventas || 0,
    }))
    .sort((a, b) => b.ventas - a.ventas)
    .slice(0, topN);
}

// ─────────────────────────────────────────────────────────────────────
// Fetch + procesado: TENDENCIAS rolling 6 meses
// ─────────────────────────────────────────────────────────────────────

export async function fetchTendenciasRolling6m(
  supabase: SupabaseClient<any, "crm">,
): Promise<MetricasTendenciaItem[]> {
  const seisMesesAtras = new Date();
  seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
  const desdeISO = seisMesesAtras.toISOString();

  const [ventasRes, lotesRes, propsRes] = await Promise.all([
    supabase.schema("crm").from("venta")
      .select("fecha_venta, precio_total, cliente_id")
      .gte("fecha_venta", desdeISO)
      .order("fecha_venta", { ascending: true }),
    supabase.schema("crm").from("lote")
      .select("created_at")
      .gte("created_at", desdeISO),
    supabase.schema("crm").from("propiedad")
      .select("created_at")
      .gte("created_at", desdeISO),
  ]);

  return procesarTendencias(
    (ventasRes.data || []) as any[],
    (lotesRes.data || []) as any[],
    (propsRes.data || []) as any[],
  );
}

function procesarTendencias(
  ventas: any[],
  lotes: any[],
  propiedades: any[],
): MetricasTendenciaItem[] {
  const tendencias: Record<string, { ventas: number; propiedades: number; clientes: Set<string> }> = {};

  const hoy = new Date();
  for (let i = 5; i >= 0; i--) {
    const fecha = new Date(hoy);
    fecha.setMonth(hoy.getMonth() - i);
    const mesKey = `${MESES_TENDENCIA[fecha.getMonth()]} ${fecha.getFullYear()}`;
    tendencias[mesKey] = { ventas: 0, propiedades: 0, clientes: new Set() };
  }

  ventas.forEach((item) => {
    const fecha = new Date(item.fecha_venta);
    const mesKey = `${MESES_TENDENCIA[fecha.getMonth()]} ${fecha.getFullYear()}`;
    const bucket = tendencias[mesKey];
    if (!bucket) return;
    bucket.ventas += Number(item.precio_total) || 0;
    if (item.cliente_id) bucket.clientes.add(item.cliente_id);
  });

  lotes.forEach((item) => {
    const fecha = new Date(item.created_at);
    const mesKey = `${MESES_TENDENCIA[fecha.getMonth()]} ${fecha.getFullYear()}`;
    if (tendencias[mesKey]) tendencias[mesKey].propiedades += 1;
  });

  propiedades.forEach((item) => {
    const fecha = new Date(item.created_at);
    const mesKey = `${MESES_TENDENCIA[fecha.getMonth()]} ${fecha.getFullYear()}`;
    if (tendencias[mesKey]) tendencias[mesKey].propiedades += 1;
  });

  return Object.entries(tendencias).map(([mes, data]) => ({
    mes,
    ventas: data.ventas,
    propiedades: data.propiedades,
    clientes: data.clientes.size,
  }));
}

// ─────────────────────────────────────────────────────────────────────
// Fetch: PROYECTOS nuevos del período
// ─────────────────────────────────────────────────────────────────────

export async function fetchProyectosNuevos(
  supabase: SupabaseClient<any, "crm">,
  startISO: string,
  endISO: string,
): Promise<{ nuevos: number; totalEnPeriodo: number }> {
  const { data } = await supabase.schema("crm").from("proyecto")
    .select("id, nombre, estado, created_at")
    .gte("created_at", startISO).lte("created_at", endISO);
  const arr = data || [];
  return { nuevos: arr.length, totalEnPeriodo: arr.length };
}
