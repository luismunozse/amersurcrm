"use server";

import { revalidatePath } from "next/cache";
import { createServerActionClient } from "@/lib/supabase.server-actions";
import { PERMISOS } from "@/lib/permissions";
import { requierePermiso, obtenerPermisosUsuario } from "@/lib/permissions/server";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FORMAS_PAGO = ["contado", "financiado", "credito_bancario", "mixto"] as const;
type FormaPago = (typeof FORMAS_PAGO)[number];

export type ConvertirVentaInput = {
  loteId: string;
  reservaId?: string;
  formaPago: FormaPago;
  precioTotal: number;
  montoInicial: number;
  numeroCuotas?: number | null;
  fechaEntrega?: string | null;
  comisionVendedor?: number | null;
  notas?: string | null;
};

export type ConvertirVentaResult = {
  data: {
    id: string;
    codigo_venta: string;
    codigo_lote: string;
  } | null;
  error: string | null;
};

async function generarCodigoVenta(): Promise<string> {
  const supabase = await createServerActionClient();

  const fecha = new Date();
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  const fechaStr = `${año}${mes}${dia}`;

  const { data: ultima } = await supabase
    .schema("crm")
    .from("venta")
    .select("codigo_venta")
    .like("codigo_venta", `VTA-${fechaStr}%`)
    .order("codigo_venta", { ascending: false })
    .limit(1)
    .maybeSingle();

  let secuencia = 1;
  if (ultima?.codigo_venta) {
    const partes = (ultima.codigo_venta as string).split("-");
    secuencia = parseInt(partes[2] || "0", 10) + 1;
  }

  return `VTA-${fechaStr}-${String(secuencia).padStart(3, "0")}`;
}

export async function convertirReservaAVenta(
  datos: ConvertirVentaInput,
): Promise<ConvertirVentaResult> {
  if (!datos.loteId || !UUID_REGEX.test(datos.loteId)) {
    return { data: null, error: "ID de lote inválido" };
  }

  if (!FORMAS_PAGO.includes(datos.formaPago)) {
    return { data: null, error: "Forma de pago inválida" };
  }

  if (!datos.precioTotal || datos.precioTotal <= 0) {
    return { data: null, error: "Precio total debe ser mayor a 0" };
  }

  if (datos.montoInicial < 0 || datos.montoInicial > datos.precioTotal) {
    return { data: null, error: "Monto inicial fuera de rango" };
  }

  if (datos.formaPago === "contado" && datos.montoInicial !== datos.precioTotal) {
    return {
      data: null,
      error: "En venta al contado el monto inicial debe igualar al precio total",
    };
  }

  if (datos.formaPago !== "contado") {
    if (!datos.numeroCuotas || datos.numeroCuotas <= 0) {
      return { data: null, error: "Número de cuotas requerido para venta financiada" };
    }
  }

  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "No autenticado" };

    await requierePermiso(PERMISOS.VENTAS.CREAR);

    const usuario = await obtenerPermisosUsuario();
    if (!usuario || !usuario.username) {
      return { data: null, error: "No se pudo obtener el perfil del vendedor" };
    }

    const { data: lote, error: loteError } = await supabase
      .schema("crm")
      .from("lote")
      .select("id, codigo, estado, proyecto_id")
      .eq("id", datos.loteId)
      .single();

    if (loteError || !lote) {
      return { data: null, error: "Lote no encontrado" };
    }

    if (lote.estado !== "reservado") {
      return {
        data: null,
        error: `Solo se puede convertir un lote reservado. Estado actual: ${lote.estado}`,
      };
    }

    let reservaActiva: { id: string; cliente_id: string; vendedor_username: string } | null = null;

    if (datos.reservaId) {
      const { data, error } = await supabase
        .schema("crm")
        .from("reserva")
        .select("id, cliente_id, vendedor_username, estado")
        .eq("id", datos.reservaId)
        .eq("lote_id", datos.loteId)
        .single();

      if (error || !data) {
        return { data: null, error: "Reserva no encontrada" };
      }

      if (data.estado !== "activa") {
        return { data: null, error: `La reserva no está activa (estado: ${data.estado})` };
      }

      reservaActiva = data;
    } else {
      const { data, error } = await supabase
        .schema("crm")
        .from("reserva")
        .select("id, cliente_id, vendedor_username")
        .eq("lote_id", datos.loteId)
        .eq("estado", "activa")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        return { data: null, error: "No hay reserva activa para este lote" };
      }

      reservaActiva = data;
    }

    const codigoVenta = await generarCodigoVenta();
    const saldoPendiente = datos.precioTotal - datos.montoInicial;

    const { data: nuevaVenta, error: ventaError } = await supabase
      .schema("crm")
      .from("venta")
      .insert({
        codigo_venta: codigoVenta,
        reserva_id: reservaActiva.id,
        cliente_id: reservaActiva.cliente_id,
        lote_id: datos.loteId,
        vendedor_username: reservaActiva.vendedor_username,
        precio_total: datos.precioTotal,
        moneda: "PEN",
        forma_pago: datos.formaPago,
        monto_inicial: datos.montoInicial,
        saldo_pendiente: saldoPendiente,
        numero_cuotas: datos.numeroCuotas ?? null,
        fecha_entrega: datos.fechaEntrega ?? null,
        estado: datos.formaPago === "contado" ? "finalizada" : "en_proceso",
        comision_vendedor: datos.comisionVendedor ?? null,
        notas: datos.notas ?? null,
      })
      .select("id, codigo_venta")
      .single();

    if (ventaError || !nuevaVenta) {
      return {
        data: null,
        error: `Error creando venta: ${ventaError?.message ?? "desconocido"}`,
      };
    }

    const { error: loteUpdateError } = await supabase
      .schema("crm")
      .from("lote")
      .update({ estado: "vendido" })
      .eq("id", datos.loteId);

    if (loteUpdateError) {
      await supabase.schema("crm").from("venta").delete().eq("id", nuevaVenta.id);
      return {
        data: null,
        error: `Error actualizando lote: ${loteUpdateError.message}`,
      };
    }

    const { error: reservaUpdateError } = await supabase
      .schema("crm")
      .from("reserva")
      .update({ estado: "convertida_venta" })
      .eq("id", reservaActiva.id);

    if (reservaUpdateError) {
      console.warn("Venta creada pero falló actualizar reserva:", reservaUpdateError);
    }

    try {
      const { notificarUsuariosPorRoles } = await import("@/app/_actionsNotifications");
      await notificarUsuariosPorRoles(
        ["ROL_ADMIN", "ROL_COORDINADOR_VENTAS"],
        "venta",
        `Nueva venta: lote ${lote.codigo}`,
        `${usuario.nombre_completo || usuario.email} convirtió la reserva en venta (${codigoVenta}) por ${datos.precioTotal}`,
        {
          loteId: datos.loteId,
          proyectoId: lote.proyecto_id,
          ventaId: nuevaVenta.id,
          codigoVenta,
          url: `/dashboard/proyectos/${lote.proyecto_id}`,
        },
        usuario.id,
      );
    } catch (notifError) {
      console.warn("Error notificando venta:", notifError);
    }

    revalidatePath(`/dashboard/proyectos/${lote.proyecto_id}`);
    revalidatePath("/dashboard/clientes");

    return {
      data: {
        id: nuevaVenta.id as string,
        codigo_venta: nuevaVenta.codigo_venta as string,
        codigo_lote: lote.codigo as string,
      },
      error: null,
    };
  } catch (error) {
    console.error("Error en convertirReservaAVenta:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Error convirtiendo reserva a venta",
    };
  }
}
