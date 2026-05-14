"use server";

import { getAuthorizedClient, calcularFechas, safeAction } from "./shared";
import { buildCachedReportFetcher } from "./shared-cache";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface VendedorComparable {
  username: string;
  nombre: string;
}

export interface VendedorComparacionStats {
  username: string;
  nombre: string;
  leadsAsignados: number;
  contactados: number;
  interaccionesTotales: number;
  ventasCantidad: number;
  ventasMonto: number;
  ticketPromedio: number;
  conversionPct: string;
  contactoPct: string;
  promedioInteraccionesPorLead: string;
  meta: number;
  cumplimientoPct: string;
  nivelInteres: {
    alto: number;
    medio: number;
    bajo: number;
    sinClasificar: number;
  };
  /** Posición en el ranking (1 = mejor) por monto de ventas. */
  rankingVentas: number;
}

export interface ReporteComparacionData {
  vendedoresDisponibles: VendedorComparable[];
  comparacion: VendedorComparacionStats[];
  periodo: { inicio: string; fin: string; dias: number };
}

async function _fetchComparacionVendedores(
  supabase: SupabaseClient<any, "crm">,
  usernamesCSV: string,
  startISO: string,
  endISO: string,
  days: number,
): Promise<ReporteComparacionData> {
  const usernames = usernamesCSV ? usernamesCSV.split(",").filter(Boolean) : [];

  // Catálogo de vendedores activos (siempre)
  const { data: vendedoresActivos } = await supabase
    .schema("crm")
    .from("usuario_perfil")
    .select("username, nombre_completo, meta_mensual_ventas")
    .eq("activo", true)
    .not("username", "is", null)
    .order("nombre_completo", { ascending: true });

  const vendedoresDisponibles: VendedorComparable[] = (vendedoresActivos || [])
    .filter((v) => v.username)
    .map((v) => ({
      username: v.username as string,
      nombre: v.nombre_completo || (v.username as string),
    }));

  if (usernames.length === 0) {
    return {
      vendedoresDisponibles,
      comparacion: [],
      periodo: { inicio: startISO, fin: endISO, dias: days },
    };
  }

  // Filtrar al subconjunto de vendedores activos
  const perfilMap = new Map(
    (vendedoresActivos || []).map((v) => [
      v.username as string,
      {
        nombre: v.nombre_completo || (v.username as string),
        meta: v.meta_mensual_ventas || 0,
      },
    ]),
  );

  const usernamesValidos = usernames.filter((u) => perfilMap.has(u));

  if (usernamesValidos.length === 0) {
    return {
      vendedoresDisponibles,
      comparacion: [],
      periodo: { inicio: startISO, fin: endISO, dias: days },
    };
  }

  // 1 query por tabla, scope al set de usernames seleccionados
  const [leadsRes, interaccionesRes, ventasRes] = await Promise.all([
    supabase
      .schema("crm")
      .from("cliente")
      .select("id, vendedor_username")
      .in("vendedor_username", usernamesValidos)
      .gte("fecha_alta", startISO)
      .lte("fecha_alta", endISO),
    supabase
      .schema("crm")
      .from("cliente_interaccion")
      .select("cliente_id, vendedor_username")
      .in("vendedor_username", usernamesValidos)
      .gte("fecha_interaccion", startISO)
      .lte("fecha_interaccion", endISO),
    supabase
      .schema("crm")
      .from("venta")
      .select("vendedor_username, precio_total")
      .in("vendedor_username", usernamesValidos)
      .gte("fecha_venta", startISO)
      .lte("fecha_venta", endISO),
  ]);

  const leads = leadsRes.data || [];
  const interacciones = interaccionesRes.data || [];
  const ventas = ventasRes.data || [];

  // Intereses scope a leads del período
  let intereses: Array<{ cliente_id: string; prioridad: number | null }> = [];
  if (leads.length > 0) {
    const { data: interesData } = await supabase
      .schema("crm")
      .from("cliente_propiedad_interes")
      .select("cliente_id, prioridad")
      .in("cliente_id", leads.map((l: any) => l.id));
    intereses = (interesData || []) as typeof intereses;
  }

  // Mejor prioridad por cliente
  const prioridadCliente = new Map<string, number>();
  intereses.forEach((i: any) => {
    const actual = prioridadCliente.get(i.cliente_id);
    const nueva = i.prioridad ?? 2;
    if (actual === undefined || nueva < actual) prioridadCliente.set(i.cliente_id, nueva);
  });

  // Agregaciones por vendedor
  const stats = new Map<string, {
    leads: any[];
    contactadosSet: Set<string>;
    interaccionesTotal: number;
    ventas: { precio: number }[];
  }>();
  usernamesValidos.forEach((u) => {
    stats.set(u, { leads: [], contactadosSet: new Set(), interaccionesTotal: 0, ventas: [] });
  });

  leads.forEach((l: any) => {
    stats.get(l.vendedor_username)?.leads.push(l);
  });
  interacciones.forEach((i: any) => {
    const s = stats.get(i.vendedor_username);
    if (!s) return;
    s.interaccionesTotal += 1;
    if (i.cliente_id) s.contactadosSet.add(i.cliente_id);
  });
  ventas.forEach((v: any) => {
    stats.get(v.vendedor_username)?.ventas.push({ precio: Number(v.precio_total) || 0 });
  });

  // Build comparación array
  const comparacionRaw: VendedorComparacionStats[] = usernamesValidos.map((username) => {
    const s = stats.get(username)!;
    const perfil = perfilMap.get(username)!;
    const leadsAsignados = s.leads.length;
    const contactados = s.contactadosSet.size;
    const ventasCantidad = s.ventas.length;
    const ventasMonto = s.ventas.reduce((sum, v) => sum + v.precio, 0);
    const ticketPromedio = ventasCantidad > 0 ? ventasMonto / ventasCantidad : 0;

    const nivelInteres = { alto: 0, medio: 0, bajo: 0, sinClasificar: 0 };
    s.leads.forEach((l: any) => {
      const p = prioridadCliente.get(l.id);
      if (p === 1) nivelInteres.alto += 1;
      else if (p === 2) nivelInteres.medio += 1;
      else if (p === 3) nivelInteres.bajo += 1;
      else nivelInteres.sinClasificar += 1;
    });

    return {
      username,
      nombre: perfil.nombre,
      leadsAsignados,
      contactados,
      interaccionesTotales: s.interaccionesTotal,
      ventasCantidad,
      ventasMonto,
      ticketPromedio,
      conversionPct: leadsAsignados > 0
        ? ((ventasCantidad / leadsAsignados) * 100).toFixed(1)
        : "0",
      contactoPct: leadsAsignados > 0
        ? ((contactados / leadsAsignados) * 100).toFixed(1)
        : "0",
      promedioInteraccionesPorLead: leadsAsignados > 0
        ? (s.interaccionesTotal / leadsAsignados).toFixed(1)
        : "0",
      meta: perfil.meta,
      cumplimientoPct: perfil.meta > 0
        ? ((ventasMonto / perfil.meta) * 100).toFixed(1)
        : "0",
      nivelInteres,
      rankingVentas: 0, // se completa abajo
    };
  });

  // Asignar ranking por ventasMonto desc
  const ordenadosPorVentas = [...comparacionRaw].sort((a, b) => b.ventasMonto - a.ventasMonto);
  const rankingMap = new Map(
    ordenadosPorVentas.map((v, i) => [v.username, i + 1]),
  );
  const comparacion = comparacionRaw.map((v) => ({
    ...v,
    rankingVentas: rankingMap.get(v.username) || 0,
  }));

  return {
    vendedoresDisponibles,
    comparacion,
    periodo: { inicio: startISO, fin: endISO, dias: days },
  };
}

const fetchComparacionCached = buildCachedReportFetcher(
  _fetchComparacionVendedores,
  ["reporte-comparacion-vendedores"],
  60,
);

export async function obtenerComparacionVendedores(
  usernames: string[],
  periodo: string = "30",
  fechaInicio?: string,
  fechaFin?: string,
): Promise<{ data: ReporteComparacionData | null; error: string | null }> {
  return safeAction(async () => {
    await getAuthorizedClient();
    const { startDate, endDate, days } = calcularFechas(periodo, fechaInicio, fechaFin);
    // Sort para que cache key sea estable independiente del orden de selección
    const csv = [...usernames].filter(Boolean).sort().join(",");
    return fetchComparacionCached(
      csv,
      startDate.toISOString(),
      endDate.toISOString(),
      days,
    );
  });
}
