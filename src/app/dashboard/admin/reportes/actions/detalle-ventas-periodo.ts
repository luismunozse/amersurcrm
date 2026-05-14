"use server";

import { getAuthorizedClient, calcularFechas, safeAction } from "./shared";

export interface VentaDetalleKPI {
  id: string;
  codigoVenta: string | null;
  precioTotal: number;
  moneda: string | null;
  fechaVenta: string;
  vendedorUsername: string | null;
  vendedorNombre: string | null;
  clienteId: string | null;
  clienteNombre: string | null;
  propiedadLabel: string | null;
  proyectoNombre: string | null;
}

export interface ResultadoDetalleVentas {
  ventas: VentaDetalleKPI[];
  total: number;
  montoTotal: number;
}

const MAX_FILAS = 100;

export async function obtenerDetalleVentasPeriodo(
  periodo: string = "30",
  fechaInicio?: string,
  fechaFin?: string,
): Promise<{ data: ResultadoDetalleVentas | null; error: string | null }> {
  return safeAction(async () => {
    const supabase = await getAuthorizedClient();
    const { startDate, endDate } = calcularFechas(periodo, fechaInicio, fechaFin);
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    const { data: ventasData, error } = await supabase
      .schema("crm")
      .from("venta")
      .select(`
        id,
        codigo_venta,
        precio_total,
        moneda,
        fecha_venta,
        vendedor_username,
        cliente_id,
        cliente:cliente_id ( nombre ),
        propiedad:propiedad_id (
          codigo,
          identificacion_interna,
          proyecto:proyecto_id ( nombre )
        ),
        lote:lote_id (
          codigo,
          proyecto:proyecto_id ( nombre )
        )
      `)
      .gte("fecha_venta", startISO)
      .lte("fecha_venta", endISO)
      .order("fecha_venta", { ascending: false })
      .limit(MAX_FILAS);

    if (error) throw new Error(error.message);

    // Resolver nombre de vendedor
    const usernames = Array.from(
      new Set(
        (ventasData || [])
          .map((v: any) => v.vendedor_username)
          .filter((u): u is string => Boolean(u)),
      ),
    );

    let vendedorMap = new Map<string, string>();
    if (usernames.length > 0) {
      const { data: vendedores } = await supabase
        .schema("crm")
        .from("usuario_perfil")
        .select("username, nombre_completo")
        .in("username", usernames);
      vendedorMap = new Map(
        (vendedores || []).map((v: any) => [v.username, v.nombre_completo || v.username]),
      );
    }

    // Total real (sin truncar)
    const { count } = await supabase
      .schema("crm")
      .from("venta")
      .select("id", { count: "exact", head: true })
      .gte("fecha_venta", startISO)
      .lte("fecha_venta", endISO);

    let montoTotal = 0;
    if ((count ?? 0) > MAX_FILAS) {
      // Si está truncado, traer suma real del período
      const { data: totales } = await supabase
        .schema("crm")
        .from("venta")
        .select("precio_total")
        .gte("fecha_venta", startISO)
        .lte("fecha_venta", endISO);
      montoTotal = (totales || []).reduce(
        (sum, v: any) => sum + (Number(v.precio_total) || 0),
        0,
      );
    } else {
      montoTotal = (ventasData || []).reduce(
        (sum, v: any) => sum + (Number(v.precio_total) || 0),
        0,
      );
    }

    const ventas: VentaDetalleKPI[] = (ventasData || []).map((v: any) => ({
      id: v.id,
      codigoVenta: v.codigo_venta ?? null,
      precioTotal: Number(v.precio_total) || 0,
      moneda: v.moneda ?? null,
      fechaVenta: v.fecha_venta,
      vendedorUsername: v.vendedor_username ?? null,
      vendedorNombre: v.vendedor_username
        ? vendedorMap.get(v.vendedor_username) ?? v.vendedor_username
        : null,
      clienteId: v.cliente_id ?? null,
      clienteNombre: v.cliente?.nombre ?? null,
      propiedadLabel:
        v.propiedad?.identificacion_interna ||
        v.propiedad?.codigo ||
        v.lote?.codigo ||
        null,
      proyectoNombre:
        v.propiedad?.proyecto?.nombre || v.lote?.proyecto?.nombre || null,
    }));

    return {
      ventas,
      total: count ?? ventas.length,
      montoTotal,
    };
  });
}
