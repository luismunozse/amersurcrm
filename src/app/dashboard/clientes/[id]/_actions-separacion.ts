"use server";

/**
 * Server actions para el flujo de Separacion (Etapa 1 Sperant).
 * Convencion de errores: retorna { success: boolean, error?: string, data?: T }.
 */

import { createServerActionClient } from "@/lib/supabase.server-actions";
import { revalidatePath } from "next/cache";
import { esAdminOCoordinador } from "@/lib/permissions/server";
import { parseOptionalNumber } from "@/lib/utils/numeric";

const FORMAS_PAGO_VALIDAS = [
  "contado",
  "transferencia",
  "deposito",
  "credito_hipotecario",
  "credito_directo",
] as const;

type FormaPago = (typeof FORMAS_PAGO_VALIDAS)[number];

interface RegistrarSeparacionInput {
  clienteId: string;
  loteId: string;
  montoSeparacion: number;
  moneda?: "PEN" | "USD";
  formaPago: FormaPago;
  metodoPago?: string;
  fechaVencimiento?: string;
  tipoSeparacion?: "separacion_simple" | "arras_confirmatorias" | "arras_retractacion";
  notas?: string;
}

interface LoteDisponible {
  id: string;
  codigo: string;
  precio: number | null;
  moneda: string | null;
  sup_m2: number | null;
  estado: string;
  proyecto_id: string;
  proyecto_nombre: string | null;
  es_interes: boolean;
}

/**
 * Autoriza a registrar separacion si:
 *  - el usuario es admin/coordinador/gerente, o
 *  - el usuario es el vendedor asignado al cliente.
 */
async function autorizarSeparacion(supabase: Awaited<ReturnType<typeof createServerActionClient>>, clienteId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "No autenticado" };
  }

  const [{ data: perfil }, privilegiado] = await Promise.all([
    supabase
      .schema("crm")
      .from("usuario_perfil")
      .select("username")
      .eq("id", user.id)
      .maybeSingle(),
    esAdminOCoordinador(),
  ]);

  if (!perfil?.username) {
    return { ok: false as const, error: "Usuario sin username configurado" };
  }

  if (privilegiado) {
    return { ok: true as const, userId: user.id, username: perfil.username };
  }

  const { data: cliente } = await supabase
    .from("cliente")
    .select("vendedor_username, vendedor_asignado")
    .eq("id", clienteId)
    .maybeSingle();

  const esVendedorAsignado =
    cliente?.vendedor_username === perfil.username ||
    cliente?.vendedor_asignado === user.id;

  if (!esVendedorAsignado) {
    return { ok: false as const, error: "No tienes permisos para registrar la separacion de este cliente" };
  }

  return { ok: true as const, userId: user.id, username: perfil.username };
}

/**
 * Lista lotes elegibles para separacion, priorizando los que el cliente
 * marco como interes. Incluye tambien otros disponibles del mismo proyecto
 * y, opcionalmente, de todos los proyectos.
 */
export async function obtenerLotesParaSeparacion(clienteId: string): Promise<{
  success: boolean;
  error?: string;
  data?: LoteDisponible[];
}> {
  const supabase = await createServerActionClient();

  const auth = await autorizarSeparacion(supabase, clienteId);
  if (!auth.ok) return { success: false, error: auth.error };

  const [interesesResult, disponiblesResult] = await Promise.all([
    supabase
      .schema("crm")
      .from("cliente_propiedad_interes")
      .select("lote_id")
      .eq("cliente_id", clienteId)
      .not("lote_id", "is", null),
    supabase
      .from("lote")
      .select("id, codigo, precio, moneda, sup_m2, estado, proyecto_id, proyecto:proyecto!proyecto_id(nombre)")
      .eq("estado", "disponible")
      .order("codigo", { ascending: true })
      .limit(200),
  ]);

  const interesIds = new Set<string>(
    (interesesResult.data ?? []).map((r) => r.lote_id).filter((x): x is string => !!x),
  );

  const lotes: LoteDisponible[] = (disponiblesResult.data ?? []).map((l) => {
    const proyecto = Array.isArray(l.proyecto) ? l.proyecto[0] : l.proyecto;
    return {
      id: l.id,
      codigo: l.codigo,
      precio: l.precio ?? null,
      moneda: l.moneda ?? null,
      sup_m2: l.sup_m2 ?? null,
      estado: l.estado,
      proyecto_id: l.proyecto_id,
      proyecto_nombre: proyecto?.nombre ?? null,
      es_interes: interesIds.has(l.id),
    };
  });

  // Interes primero, luego resto (mantiene orden por codigo dentro de cada grupo).
  lotes.sort((a, b) => {
    if (a.es_interes !== b.es_interes) return a.es_interes ? -1 : 1;
    return 0;
  });

  return { success: true, data: lotes };
}

/**
 * Registra una separacion: crea la reserva, dispara la creacion del proceso
 * de adquisicion (con salto condicional de calificacion bancaria) y mueve
 * al cliente al estado 'en_proceso'.
 */
export async function registrarSeparacion(input: RegistrarSeparacionInput): Promise<{
  success: boolean;
  error?: string;
  data?: { reservaId: string; codigoReserva: string | null };
}> {
  if (!input.clienteId || !input.loteId) {
    return { success: false, error: "Cliente y lote son requeridos" };
  }
  if (!FORMAS_PAGO_VALIDAS.includes(input.formaPago)) {
    return { success: false, error: "Forma de pago invalida" };
  }
  const monto = parseOptionalNumber(String(input.montoSeparacion));
  if (monto === null || monto <= 0) {
    return { success: false, error: "Monto de separacion invalido" };
  }

  const supabase = await createServerActionClient();

  const auth = await autorizarSeparacion(supabase, input.clienteId);
  if (!auth.ok) return { success: false, error: auth.error };

  // Validar que el lote siga disponible (evita race con otro usuario).
  const { data: lote } = await supabase
    .from("lote")
    .select("id, estado, proyecto_id")
    .eq("id", input.loteId)
    .maybeSingle();

  if (!lote) return { success: false, error: "Lote no encontrado" };
  if (lote.estado !== "disponible") {
    return { success: false, error: `El lote no esta disponible (estado: ${lote.estado})` };
  }

  // Dias de vigencia configurables por proyecto (default 7 si no hay config).
  let diasVigencia = 7;
  if (lote.proyecto_id) {
    const { data: config } = await supabase
      .schema("crm")
      .from("configuracion_proyecto_financiera")
      .select("dias_vigencia_reserva")
      .eq("proyecto_id", lote.proyecto_id)
      .maybeSingle();
    if (typeof config?.dias_vigencia_reserva === "number") {
      diasVigencia = config.dias_vigencia_reserva;
    }
  }

  const fechaVencimientoISO = input.fechaVencimiento
    ? new Date(input.fechaVencimiento).toISOString()
    : new Date(Date.now() + diasVigencia * 24 * 60 * 60 * 1000).toISOString();

  // Reservar el lote de forma atomica via RPC.
  const { error: rpcLoteError } = await supabase.rpc("reservar_lote", {
    p_lote: input.loteId,
  });
  if (rpcLoteError) {
    return { success: false, error: `No se pudo reservar el lote: ${rpcLoteError.message}` };
  }

  // Crear la reserva con forma_pago y tipo_separacion.
  const { data: reserva, error: reservaError } = await supabase
    .schema("crm")
    .from("reserva")
    .insert({
      cliente_id: input.clienteId,
      lote_id: input.loteId,
      vendedor_username: auth.username,
      monto_reserva: monto,
      moneda: input.moneda ?? "PEN",
      fecha_vencimiento: fechaVencimientoISO,
      metodo_pago: input.metodoPago ?? null,
      notas: input.notas ?? null,
      estado: "activa",
      tipo_separacion: input.tipoSeparacion ?? "separacion_simple",
      forma_pago: input.formaPago,
    })
    .select("id, codigo_reserva")
    .single();

  if (reservaError || !reserva) {
    // Rollback del lote si no se pudo crear la reserva.
    await supabase.rpc("liberar_lote", { p_lote: input.loteId });
    return { success: false, error: reservaError?.message ?? "Error creando la reserva" };
  }

  // Crear proceso de adquisicion con la forma_pago para activar salto condicional.
  const { error: procesoError } = await supabase.rpc("crear_proceso_desde_plantilla", {
    p_cliente_id: input.clienteId,
    p_lote_id: input.loteId,
    p_reserva_id: reserva.id,
    p_vendedor_username: auth.username,
    p_proyecto_id: lote.proyecto_id,
    p_forma_pago: input.formaPago,
  });
  if (procesoError) {
    console.error("[registrarSeparacion] Error creando proceso:", procesoError);
    // No hacemos rollback de la reserva: el proceso puede reconstruirse despues.
  }

  // Mover cliente a 'en_proceso'. Si falla, la separacion ya quedo registrada.
  const { error: pipelineError } = await supabase.rpc("mover_cliente_pipeline", {
    p_cliente_id: input.clienteId,
    p_estado_nuevo: "en_proceso",
    p_motivo: `Separacion registrada: ${reserva.codigo_reserva ?? reserva.id}`,
  });
  if (pipelineError) {
    console.error("[registrarSeparacion] Error moviendo estado cliente:", pipelineError);
  }

  revalidatePath(`/dashboard/clientes/${input.clienteId}`);
  revalidatePath("/dashboard/adquisicion");
  revalidatePath("/dashboard/clientes");

  return {
    success: true,
    data: {
      reservaId: reserva.id,
      codigoReserva: reserva.codigo_reserva ?? null,
    },
  };
}

// ============================================================
// ACCIONES DE ADMINISTRADOR
// ============================================================

import { esAdmin } from "@/lib/permissions/server";

/**
 * Anula una separacion: cancela la reserva, libera el lote, cancela el proceso
 * de adquisicion asociado, y revierte al cliente al estado 'potencial'.
 * Solo admin.
 */
export async function anularSeparacion(reservaId: string, motivo: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!reservaId) return { success: false, error: "ID de reserva requerido" };
  if (!motivo || motivo.trim().length === 0) {
    return { success: false, error: "Debes indicar un motivo de anulacion" };
  }

  if (!(await esAdmin())) {
    return { success: false, error: "Solo un administrador puede anular separaciones" };
  }

  const supabase = await createServerActionClient();

  const { data: reserva } = await supabase
    .schema("crm")
    .from("reserva")
    .select("id, cliente_id, lote_id, estado")
    .eq("id", reservaId)
    .maybeSingle();

  if (!reserva) return { success: false, error: "Reserva no encontrada" };
  if (reserva.estado !== "activa") {
    return { success: false, error: `La reserva no esta activa (estado: ${reserva.estado})` };
  }

  // Marcar reserva como cancelada.
  const { error: updReservaError } = await supabase
    .schema("crm")
    .from("reserva")
    .update({
      estado: "cancelada",
      motivo_cancelacion: motivo,
    })
    .eq("id", reservaId);

  if (updReservaError) {
    return { success: false, error: `No se pudo cancelar la reserva: ${updReservaError.message}` };
  }

  // Liberar el lote (vuelve a disponible).
  if (reserva.lote_id) {
    const { error: rpcError } = await supabase.rpc("liberar_lote", { p_lote: reserva.lote_id });
    if (rpcError) {
      console.error("[anularSeparacion] Error liberando lote:", rpcError);
    }
  }

  // Cancelar el proceso de adquisicion asociado, si existe.
  if (reserva.cliente_id) {
    const { error: procError } = await supabase
      .schema("crm")
      .from("proceso_adquisicion")
      .update({ estado: "cancelado", fecha_cierre: new Date().toISOString().slice(0, 10) })
      .eq("reserva_id", reservaId)
      .eq("estado", "activo");
    if (procError) {
      console.error("[anularSeparacion] Error cancelando proceso:", procError);
    }

    // Revertir estado del cliente a 'potencial' (admin puede hacerlo).
    const { error: pipeError } = await supabase.rpc("mover_cliente_pipeline", {
      p_cliente_id: reserva.cliente_id,
      p_estado_nuevo: "potencial",
      p_motivo: `Separacion anulada: ${motivo}`,
    });
    if (pipeError) {
      console.error("[anularSeparacion] Error revirtiendo estado cliente:", pipeError);
    }
  }

  revalidatePath(`/dashboard/clientes/${reserva.cliente_id}`);
  revalidatePath("/dashboard/adquisicion");
  revalidatePath("/dashboard/clientes");

  return { success: true };
}

/**
 * Extiende la fecha de vencimiento de una separacion activa.
 * Solo admin.
 */
export async function extenderVencimientoSeparacion(
  reservaId: string,
  nuevaFechaISO: string,
): Promise<{ success: boolean; error?: string }> {
  if (!reservaId) return { success: false, error: "ID de reserva requerido" };
  if (!nuevaFechaISO) return { success: false, error: "Nueva fecha requerida" };

  const fecha = new Date(nuevaFechaISO);
  if (Number.isNaN(fecha.getTime())) {
    return { success: false, error: "Fecha invalida" };
  }
  if (fecha.getTime() <= Date.now()) {
    return { success: false, error: "La nueva fecha debe ser futura" };
  }

  if (!(await esAdmin())) {
    return { success: false, error: "Solo un administrador puede extender el vencimiento" };
  }

  const supabase = await createServerActionClient();

  const { data: reserva } = await supabase
    .schema("crm")
    .from("reserva")
    .select("id, cliente_id, estado")
    .eq("id", reservaId)
    .maybeSingle();

  if (!reserva) return { success: false, error: "Reserva no encontrada" };
  if (reserva.estado !== "activa") {
    return { success: false, error: `La reserva no esta activa (estado: ${reserva.estado})` };
  }

  const { error: updError } = await supabase
    .schema("crm")
    .from("reserva")
    .update({ fecha_vencimiento: fecha.toISOString() })
    .eq("id", reservaId);

  if (updError) {
    return { success: false, error: `No se pudo extender el vencimiento: ${updError.message}` };
  }

  revalidatePath(`/dashboard/clientes/${reserva.cliente_id}`);
  revalidatePath("/dashboard/adquisicion");

  return { success: true };
}
