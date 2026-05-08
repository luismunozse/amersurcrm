"use server";

/**
 * Server actions para el flujo de Separacion (Etapa 1 Sperant).
 * Convencion de errores: retorna { success: boolean, error?: string, data?: T }.
 */

import { createServerActionClient } from "@/lib/supabase.server-actions";
import { createServiceRoleClient } from "@/lib/supabase.server";
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
  /** Si la separacion proviene de una proforma aprobada, se enlaza y marca como convertida. */
  proformaId?: string;
}

interface ProformaPrefill {
  proformaId: string;
  loteId: string | null;
  montoSeparacion: number | null;
  moneda: "PEN" | "USD";
  formaPagoSugerida: FormaPago | null;
  notas: string | null;
  numero: string | null;
  proyectoNombre: string | null;
  loteCodigo: string | null;
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
export interface ConstanciaPayload {
  compradorNombre: string;
  compradorDni: string | null;
  compradorDomicilio: string | null;
  montoSeparacion: number;
  moneda: "PEN" | "USD";
  metodoPago: "transferencia" | "deposito" | "efectivo" | "tarjeta" | "cheque" | null;
  numeroOperacion: string | null;
  loteNumero: string;
  loteArea: number;
  proyectoNombre: string;
  fechaDocumento: string;
  observaciones: string | null;
}

export async function registrarSeparacion(input: RegistrarSeparacionInput): Promise<{
  success: boolean;
  error?: string;
  data?: {
    reservaId: string;
    codigoReserva: string | null;
    constancia?: ConstanciaPayload;
  };
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
    return { success: false, error: reservaError?.message ?? "Error creando la separación" };
  }

  // Si la separacion fue originada por una proforma, enlazarla y marcarla convertida.
  if (input.proformaId) {
    const { error: proformaError } = await supabase
      .schema("crm")
      .from("proforma")
      .update({
        reserva_id: reserva.id,
        estado: "convertida",
      })
      .eq("id", input.proformaId);
    if (proformaError) {
      console.error("[registrarSeparacion] Error enlazando proforma:", proformaError);
      // No bloqueamos: la separacion ya quedo registrada. El admin puede enlazar manual.
    }
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

  // Cargar datos para que el cliente pueda generar la constancia
  // automáticamente sin consultas adicionales.
  let constancia: ConstanciaPayload | undefined;
  try {
    const [{ data: cliente }, { data: loteFull }] = await Promise.all([
      supabase
        .from("cliente")
        .select("nombre, documento_identidad, direccion")
        .eq("id", input.clienteId)
        .maybeSingle(),
      supabase
        .from("lote")
        .select("codigo, sup_m2, proyecto:proyecto!proyecto_id(nombre)")
        .eq("id", input.loteId)
        .maybeSingle(),
    ]);

    if (cliente && loteFull) {
      const proyecto = Array.isArray((loteFull as any).proyecto)
        ? (loteFull as any).proyecto[0]
        : (loteFull as any).proyecto;
      const dir = (cliente as any).direccion ?? {};
      const domicilio = [dir.calle, dir.distrito, dir.ciudad].filter(Boolean).join(", ") || null;

      const metodoNorm = ((): ConstanciaPayload["metodoPago"] => {
        const m = (input.metodoPago ?? "").toLowerCase();
        if (m === "transferencia" || m === "deposito" || m === "efectivo" || m === "tarjeta" || m === "cheque") return m;
        return "transferencia";
      })();

      constancia = {
        compradorNombre: (cliente as any).nombre ?? "",
        compradorDni: (cliente as any).documento_identidad ?? null,
        compradorDomicilio: domicilio,
        montoSeparacion: monto,
        moneda: (input.moneda ?? "PEN") as "PEN" | "USD",
        metodoPago: metodoNorm,
        numeroOperacion: null,
        loteNumero: (loteFull as any).codigo ?? "—",
        loteArea: Number((loteFull as any).sup_m2) || 0,
        proyectoNombre: proyecto?.nombre ?? "—",
        fechaDocumento: new Date().toISOString(),
        observaciones: input.notas ?? null,
      };
    }
  } catch (e) {
    console.warn("[registrarSeparacion] No se pudo armar payload de constancia:", e);
  }

  return {
    success: true,
    data: {
      reservaId: reserva.id,
      codigoReserva: reserva.codigo_reserva ?? null,
      constancia,
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
  if (!reservaId) return { success: false, error: "ID de separación requerido" };
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

  if (!reserva) return { success: false, error: "Separación no encontrada" };
  if (reserva.estado !== "activa") {
    return { success: false, error: `La separación no esta activa (estado: ${reserva.estado})` };
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
    return { success: false, error: `No se pudo cancelar la separación: ${updReservaError.message}` };
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
  if (!reservaId) return { success: false, error: "ID de separación requerido" };
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

  if (!reserva) return { success: false, error: "Separación no encontrada" };
  if (reserva.estado !== "activa") {
    return { success: false, error: `La separación no esta activa (estado: ${reserva.estado})` };
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

// ============================================================
// ETAPA 6: puente proforma -> separacion
// ============================================================

/**
 * Mapeo proforma.tipo_operacion + datos -> forma_pago de reserva.
 * Heuristica conservadora: si la proforma tiene cuotas > 0 sugerimos
 * credito_directo; si no, contado. El usuario puede sobreescribir.
 */
function inferirFormaPagoDeProforma(datos: any): FormaPago {
  const cuotas = Number(datos?.formaPago?.numeroCuotas ?? 0);
  if (cuotas > 0) return "credito_directo";
  return "contado";
}

/**
 * Lee una proforma (idealmente aprobada) y devuelve los datos prefillables
 * para abrir el modal de separacion. Idempotente: si ya esta convertida,
 * devuelve el ID de reserva existente como "yaConvertida".
 */
export async function obtenerDatosProformaParaSeparacion(proformaId: string): Promise<{
  success: boolean;
  error?: string;
  data?: ProformaPrefill;
  yaConvertida?: { reservaId: string };
}> {
  if (!proformaId) return { success: false, error: "ID de proforma requerido" };

  const supabase = await createServerActionClient();

  const { data: proforma, error } = await supabase
    .schema("crm")
    .from("proforma")
    .select(`
      id, numero, cliente_id, lote_id, estado, moneda, total, datos, comentarios,
      reserva_id,
      lote:lote!lote_id(codigo, proyecto:proyecto!proyecto_id(nombre))
    `)
    .eq("id", proformaId)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!proforma) return { success: false, error: "Proforma no encontrada" };

  if (proforma.reserva_id) {
    return {
      success: true,
      yaConvertida: { reservaId: proforma.reserva_id as string },
    };
  }

  if (proforma.estado !== "aprobada") {
    return {
      success: false,
      error: `Solo se pueden convertir proformas aprobadas (estado actual: ${proforma.estado})`,
    };
  }

  if (!proforma.lote_id) {
    return { success: false, error: "La proforma no tiene unidad asignada" };
  }

  const datosCualquiera = proforma.datos as any;
  const monto =
    Number(datosCualquiera?.formaPago?.separacion ?? 0) ||
    Number(proforma.total ?? 0) * 0.05 ||
    null;

  const lote = Array.isArray((proforma as any).lote) ? (proforma as any).lote[0] : (proforma as any).lote;
  const proyecto = lote?.proyecto
    ? (Array.isArray(lote.proyecto) ? lote.proyecto[0] : lote.proyecto)
    : null;

  const moneda = (proforma.moneda as "PEN" | "USD") ?? "PEN";

  return {
    success: true,
    data: {
      proformaId: proforma.id as string,
      loteId: proforma.lote_id as string,
      montoSeparacion: monto,
      moneda,
      formaPagoSugerida: inferirFormaPagoDeProforma(proforma.datos),
      notas: (proforma.comentarios as string) || `Generada desde proforma ${proforma.numero ?? proforma.id}`,
      numero: (proforma.numero as string) ?? null,
      proyectoNombre: proyecto?.nombre ?? null,
      loteCodigo: lote?.codigo ?? null,
    },
  };
}

// ============================================================
// DIAGNÓSTICO: para investigar por qué una reserva no aparece.
// Solo admin/coord/gerente. Bypassa RLS con service role.
// ============================================================
export async function diagnosticarReservasCliente(clienteId: string): Promise<{
  success: boolean;
  error?: string;
  data?: {
    clienteId: string;
    nombre: string | null;
    estadoCliente: string | null;
    vendedorUsername: string | null;
    vendedorAsignado: string | null;
    reservasTotal: number;
    reservas: Array<{
      id: string;
      codigo_reserva: string | null;
      estado: string;
      vendedor_username: string;
      lote_id: string | null;
      created_at: string;
    }>;
    procesos: Array<{
      id: string;
      codigo: string;
      estado: string;
      etapa_actual: string;
      reserva_id: string | null;
      lote_id: string | null;
      created_at: string;
    }>;
    visiblePorAuth: { reservas: number; procesos: number };
  };
}> {
  if (!(await esAdminOCoordinador())) {
    return { success: false, error: "Solo admin/coord/gerente" };
  }

  const sr = createServiceRoleClient();
  const auth = await createServerActionClient();

  const [{ data: cli }, { data: reservasSR }, { data: procesosSR }, { data: reservasAuth }, { data: procesosAuth }] =
    await Promise.all([
      sr.schema("crm").from("cliente").select("nombre, estado_cliente, vendedor_username, vendedor_asignado").eq("id", clienteId).maybeSingle(),
      sr.schema("crm").from("reserva").select("id, codigo_reserva, estado, vendedor_username, lote_id, created_at").eq("cliente_id", clienteId).order("created_at", { ascending: false }),
      sr.schema("crm").from("proceso_adquisicion").select("id, codigo, estado, etapa_actual, reserva_id, lote_id, created_at").eq("cliente_id", clienteId).order("created_at", { ascending: false }),
      auth.schema("crm").from("reserva").select("id").eq("cliente_id", clienteId),
      auth.schema("crm").from("proceso_adquisicion").select("id").eq("cliente_id", clienteId),
    ]);

  return {
    success: true,
    data: {
      clienteId,
      nombre: (cli as any)?.nombre ?? null,
      estadoCliente: (cli as any)?.estado_cliente ?? null,
      vendedorUsername: (cli as any)?.vendedor_username ?? null,
      vendedorAsignado: (cli as any)?.vendedor_asignado ?? null,
      reservasTotal: (reservasSR ?? []).length,
      reservas: (reservasSR ?? []) as any,
      procesos: (procesosSR ?? []) as any,
      visiblePorAuth: {
        reservas: (reservasAuth ?? []).length,
        procesos: (procesosAuth ?? []).length,
      },
    },
  };
}


