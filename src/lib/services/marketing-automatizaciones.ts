/**
 * Ejecutor de Automatizaciones de Marketing
 *
 * Se llama desde los hooks del CRM cuando ocurren eventos del ciclo de vida
 * del cliente (lead creado, visita agendada, etc.) para disparar los flujos
 * automáticos configurados en Marketing > Automatizaciones.
 */

import { createServiceRoleClient } from "@/lib/supabase.server";
import { enviarWhatsApp } from "@/lib/services/twilio";
import { enviarEmail, textoAHtml } from "@/lib/services/email";
import type { MarketingAutomatizacion, MarketingTemplate } from "@/types/whatsapp-marketing";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export interface AutomatizacionContexto {
  clienteId: string;
  nombre?: string;
  telefono?: string;          // Número WhatsApp del cliente (+51...)
  vendedorUsername?: string;
  fechaVisita?: string;
  // Contexto propiedad.disponible
  propiedadId?: string;
  propiedadTipo?: string;
  precioVenta?: number;
  proyectoId?: string;
}

type AccionEjecutada = {
  tipo: string;
  resultado: "ok" | "skip" | "error" | "pendiente";
  detalle?: string;
  tw_message_sid?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Normaliza número peruano a formato internacional +51XXXXXXXXX */
function normalizarTelefono(tel: string): string {
  const limpio = tel.replace(/\D/g, "");
  if (limpio.startsWith("51") && limpio.length === 11) return `+${limpio}`;
  if (limpio.length === 9) return `+51${limpio}`;
  return tel.startsWith("+") ? tel : `+${limpio}`;
}

/** Reemplaza variables {{nombre}}, {{1}}, etc. con valores del contexto */
function sustituirVariables(texto: string, ctx: AutomatizacionContexto): string {
  const mapa: Record<string, string> = {
    nombre: ctx.nombre || "",
    nombre_cliente: ctx.nombre || "",
    telefono: ctx.telefono || "",
    vendedor: ctx.vendedorUsername || "",
    fecha_visita: ctx.fechaVisita
      ? new Date(ctx.fechaVisita).toLocaleDateString("es-PE")
      : "",
    propiedad_tipo: ctx.propiedadTipo || "",
    precio: ctx.precioVenta ? ctx.precioVenta.toLocaleString("es-PE") : "",
    // Posicionales
    "1": ctx.nombre || "",
    "2": ctx.telefono || "",
    "3": ctx.vendedorUsername || "",
  };
  return texto.replace(/\{\{(\w+)\}\}/g, (match, key) => mapa[key] ?? match);
}

/** Verifica si el cliente ya respondió (para solo_si_no_respondio) */
async function clienteYaRespondio(
  supabase: ReturnType<typeof createServiceRoleClient>,
  telefono: string
): Promise<boolean> {
  const { data } = await supabase
    .schema("crm")
    .from("marketing_conversacion")
    .select("total_mensajes_in")
    .eq("telefono", telefono)
    .gt("total_mensajes_in", 0)
    .limit(1)
    .maybeSingle();

  return !!data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Función principal
// ─────────────────────────────────────────────────────────────────────────────

export async function dispararAutomatizaciones(
  triggerEvento: string,
  contexto: AutomatizacionContexto
): Promise<void> {
  const supabase = createServiceRoleClient();

  // 1. Obtener automatizaciones activas para este trigger
  const { data: automatizaciones, error: fetchError } = await supabase
    .schema("crm")
    .from("marketing_automatizacion")
    .select("*")
    .eq("trigger_evento", triggerEvento)
    .eq("activo", true);

  if (fetchError || !automatizaciones?.length) {
    if (fetchError) {
      console.warn(`[Automatizaciones] Error obteniendo automatizaciones para "${triggerEvento}":`, fetchError.message);
    }
    return;
  }

  // 2. Resolver teléfono desde contexto o desde la BD
  let telefono = contexto.telefono;
  let nombre = contexto.nombre;

  if (!telefono || !nombre) {
    const { data: cliente } = await supabase
      .from("cliente")
      .select("nombre, telefono_whatsapp, telefono")
      .eq("id", contexto.clienteId)
      .maybeSingle();

    if (cliente) {
      telefono = telefono || cliente.telefono_whatsapp || cliente.telefono || undefined;
      nombre = nombre || cliente.nombre || undefined;
    }
  }

  if (!telefono) {
    console.warn(`[Automatizaciones] Cliente ${contexto.clienteId} sin teléfono WhatsApp. Trigger: "${triggerEvento}"`);
    return;
  }

  const telefonoNormalizado = normalizarTelefono(telefono);
  const ctxCompleto: AutomatizacionContexto = {
    ...contexto,
    nombre,
    telefono: telefonoNormalizado,
  };

  // 3. Ejecutar cada automatización
  for (const auto of automatizaciones as MarketingAutomatizacion[]) {
    await ejecutarAutomatizacion(supabase, auto, ctxCompleto, telefonoNormalizado);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Ejecutor de una automatización individual
// ─────────────────────────────────────────────────────────────────────────────

async function ejecutarAutomatizacion(
  supabase: ReturnType<typeof createServiceRoleClient>,
  auto: MarketingAutomatizacion,
  ctx: AutomatizacionContexto,
  telefono: string
): Promise<void> {
  // Crear registro de ejecución
  const { data: ejecucion, error: ejecucionError } = await supabase
    .schema("crm")
    .from("marketing_automatizacion_ejecucion")
    .insert({
      automatizacion_id: auto.id,
      cliente_id: ctx.clienteId,
      estado: "RUNNING",
      paso_actual: 0,
      pasos_ejecutados: [],
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (ejecucionError || !ejecucion) {
    console.error(`[Automatizaciones] Error creando ejecución para "${auto.nombre}":`, ejecucionError?.message);
    return;
  }

  const pasosEjecutados: AccionEjecutada[] = [];
  let estado: "COMPLETED" | "FAILED" = "COMPLETED";
  let errorMensaje: string | undefined;

  let nextActionAt: string | null = null;
  let pausadoEnPaso: number | null = null;

  try {
    for (let i = 0; i < auto.acciones.length; i++) {
      const accion = auto.acciones[i];

      // Actualizar paso actual
      await supabase
        .schema("crm")
        .from("marketing_automatizacion_ejecucion")
        .update({ paso_actual: i })
        .eq("id", ejecucion.id);

      const paso = await ejecutarAccion(supabase, accion, ctx, telefono);
      pasosEjecutados.push(paso);

      // Si una acción falla con error real, detener
      if (paso.resultado === "error") {
        estado = "FAILED";
        errorMensaje = paso.detalle;
        break;
      }

      // Si hay delay (esperar o enviar_template con delay), pausar ejecución
      const tieneDelay = accion.tipo === "esperar" || (accion.delay_minutos ?? 0) > 0;
      if (tieneDelay && paso.resultado === "pendiente") {
        const delaySecs = (accion.delay_minutos ?? 0) * 60 * 1000;
        nextActionAt = new Date(Date.now() + delaySecs).toISOString();
        pausadoEnPaso = i;
        break; // El cron retomará desde i+1
      }
    }
  } catch (err: any) {
    estado = "FAILED";
    errorMensaje = err?.message || "Error desconocido";
    console.error(`[Automatizaciones] Error ejecutando "${auto.nombre}":`, err);
  }

  const estadoFinal: "COMPLETED" | "FAILED" | "RUNNING" =
    estado === "FAILED"
      ? "FAILED"
      : nextActionAt
      ? "RUNNING"
      : "COMPLETED";

  // Actualizar registro de ejecución
  await supabase
    .schema("crm")
    .from("marketing_automatizacion_ejecucion")
    .update({
      estado: estadoFinal,
      pasos_ejecutados: pasosEjecutados as any,
      next_action_at: nextActionAt,
      completed_at: estadoFinal !== "RUNNING" ? new Date().toISOString() : null,
      error_mensaje: errorMensaje || null,
    })
    .eq("id", ejecucion.id);

  // Actualizar contadores en la automatización (solo cuando termina, no cuando está RUNNING)
  if (estadoFinal !== "RUNNING") {
    const incrementos: Record<string, number> = {
      total_ejecutadas: (auto.total_ejecutadas || 0) + 1,
      ...(estadoFinal === "COMPLETED" && { total_completadas: (auto.total_completadas || 0) + 1 }),
    };

    await supabase
      .schema("crm")
      .from("marketing_automatizacion")
      .update(incrementos)
      .eq("id", auto.id);
  }

  console.log(
    `[Automatizaciones] "${auto.nombre}" → ${estadoFinal} para cliente ${ctx.clienteId} | pasos: ${pasosEjecutados.length}${nextActionAt ? ` | reanuda: ${nextActionAt}` : ""}`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ejecutor de acción individual
// ─────────────────────────────────────────────────────────────────────────────

async function ejecutarAccion(
  supabase: ReturnType<typeof createServiceRoleClient>,
  accion: MarketingAutomatizacion["acciones"][number],
  ctx: AutomatizacionContexto,
  telefono: string
): Promise<AccionEjecutada> {
  switch (accion.tipo) {
    // ── Enviar plantilla ──────────────────────────────────────────────────────
    case "enviar_template": {
      if (!accion.template_id) {
        return { tipo: "enviar_template", resultado: "skip", detalle: "Sin template_id" };
      }

      // Acciones con delay se pausan aquí — el cron retomará el siguiente paso
      if ((accion.delay_minutos ?? 0) > 0) {
        return {
          tipo: "enviar_template",
          resultado: "pendiente",
          detalle: `Delay ${accion.delay_minutos} min — reanuda por cron`,
        };
      }

      // Verificar opt-out del cliente
      const { data: clienteCheck } = await supabase
        .from("cliente")
        .select("whatsapp_opt_out, email")
        .eq("id", ctx.clienteId)
        .maybeSingle();

      if (clienteCheck?.whatsapp_opt_out) {
        return { tipo: "enviar_template", resultado: "skip", detalle: "Cliente con opt-out" };
      }

      // Verificar si el cliente ya respondió (condición solo_si_no_respondio)
      if (accion.solo_si_no_respondio) {
        const yaRespondio = await clienteYaRespondio(supabase, telefono);
        if (yaRespondio) {
          return { tipo: "enviar_template", resultado: "skip", detalle: "Cliente ya respondió" };
        }
      }

      // Obtener la plantilla
      const { data: template, error: tmplError } = await supabase
        .schema("crm")
        .from("marketing_template")
        .select("*")
        .eq("id", accion.template_id)
        .maybeSingle();

      if (tmplError || !template) {
        return {
          tipo: "enviar_template",
          resultado: "error",
          detalle: `Plantilla no encontrada: ${accion.template_id}`,
        };
      }

      const tpl = template as MarketingTemplate;
      const cuerpoMensaje = sustituirVariables(tpl.body_texto, ctx);

      try {
        // Enviar por email o WhatsApp según el canal de la plantilla
        if ((tpl as any).canal_tipo === "email") {
          const email = clienteCheck?.email;
          if (!email) {
            return { tipo: "enviar_template", resultado: "skip", detalle: "Sin email" };
          }
          await enviarEmail({
            to: email,
            subject: (tpl as any).subject || tpl.nombre,
            html: (tpl as any).body_html || textoAHtml(cuerpoMensaje, ctx.nombre),
            text: cuerpoMensaje,
          });
          return { tipo: "enviar_template", resultado: "ok", detalle: `email:${email}` };
        }

        const respuesta = await enviarWhatsApp(telefono, cuerpoMensaje);

        // Registrar el mensaje enviado
        await supabase
          .schema("crm")
          .from("marketing_mensaje")
          .insert({
            conversacion_id: null,
            template_id: tpl.id,
            direccion: "OUT",
            tipo: "TEMPLATE",
            contenido_tipo: "TEXT",
            contenido_texto: cuerpoMensaje,
            tw_message_sid: respuesta.sid,
            estado: "SENT",
            sent_at: new Date().toISOString(),
          });

        // Log del evento
        await supabase
          .schema("crm")
          .from("marketing_event_log")
          .insert({
            evento_tipo: "automatizacion.template_enviado",
            payload: {
              automatizacion_nombre: "ejecutor",
              template_id: tpl.id,
              cliente_id: ctx.clienteId,
              telefono,
              tw_message_sid: respuesta.sid,
            },
            resultado: "SUCCESS",
          });

        return { tipo: "enviar_template", resultado: "ok", tw_message_sid: respuesta.sid };
      } catch (err: any) {
        await supabase
          .schema("crm")
          .from("marketing_event_log")
          .insert({
            evento_tipo: "automatizacion.template_error",
            payload: { template_id: tpl.id, cliente_id: ctx.clienteId, telefono },
            resultado: "ERROR",
            error_mensaje: err?.message,
          });

        return { tipo: "enviar_template", resultado: "error", detalle: err?.message };
      }
    }

    // ── Asignar vendedor ──────────────────────────────────────────────────────
    case "asignar_vendedor": {
      if (!accion.vendedor_username) {
        return { tipo: "asignar_vendedor", resultado: "skip", detalle: "Sin vendedor_username" };
      }

      const { error } = await supabase
        .from("cliente")
        .update({ vendedor_asignado: accion.vendedor_username })
        .eq("id", ctx.clienteId);

      if (error) {
        return { tipo: "asignar_vendedor", resultado: "error", detalle: error.message };
      }
      return { tipo: "asignar_vendedor", resultado: "ok", detalle: accion.vendedor_username };
    }

    // ── Actualizar etapa ──────────────────────────────────────────────────────
    case "actualizar_etapa": {
      if (!accion.nueva_etapa) {
        return { tipo: "actualizar_etapa", resultado: "skip", detalle: "Sin nueva_etapa" };
      }

      const { error } = await supabase
        .from("cliente")
        .update({ estado_cliente: accion.nueva_etapa })
        .eq("id", ctx.clienteId);

      if (error) {
        return { tipo: "actualizar_etapa", resultado: "error", detalle: error.message };
      }
      return { tipo: "actualizar_etapa", resultado: "ok", detalle: accion.nueva_etapa };
    }

    // ── Esperar (requiere job queue — registrado, no ejecutado) ───────────────
    case "esperar": {
      return {
        tipo: "esperar",
        resultado: "pendiente",
        detalle: `${accion.delay_minutos ?? 0} minutos`,
      };
    }

    default:
      return { tipo: accion.tipo, resultado: "skip", detalle: "Tipo no implementado" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Trigger especial: propiedad disponible
// Busca clientes que coincidan con la propiedad y dispara las automatizaciones
// ─────────────────────────────────────────────────────────────────────────────

export interface PropiedadDisponibleContexto {
  propiedadId: string;
  propiedadTipo: string;  // 'lote', 'departamento', 'casa', etc.
  precioVenta?: number;
  proyectoId?: string;
}

export async function dispararPropiedadDisponible(
  ctx: PropiedadDisponibleContexto
): Promise<void> {
  const supabase = createServiceRoleClient();

  // 1. Verificar que haya automatizaciones activas para este trigger
  const { data: automatizaciones } = await supabase
    .schema("crm")
    .from("marketing_automatizacion")
    .select("id")
    .eq("trigger_evento", "propiedad.disponible")
    .eq("activo", true)
    .limit(1);

  if (!automatizaciones?.length) return;

  // 2. Buscar clientes que coincidan con la propiedad
  let query = supabase
    .from("cliente")
    .select("id, nombre, telefono_whatsapp, telefono, email, whatsapp_opt_out")
    .eq("whatsapp_opt_out", false)
    .not("estado_cliente", "eq", "desestimado");

  // Filtro de tipo de propiedad si el cliente tiene registrado su interés
  if (ctx.propiedadTipo) {
    query = query.ilike("interes_principal", `%${ctx.propiedadTipo}%`);
  }

  // Filtro de capacidad de compra (cliente puede pagar al menos 80% del precio)
  if (ctx.precioVenta) {
    const minCapacidad = ctx.precioVenta * 0.8;
    query = query.gte("capacidad_compra_estimada", minCapacidad);
  }

  const { data: clientesInteresados } = await query.limit(100);

  if (!clientesInteresados?.length) {
    console.log(`[Automatizaciones] propiedad.disponible: sin clientes coincidentes para ${ctx.propiedadId}`);
    return;
  }

  console.log(`[Automatizaciones] propiedad.disponible: ${clientesInteresados.length} clientes para ${ctx.propiedadId}`);

  // 3. Disparar automatización para cada cliente coincidente
  for (const cliente of clientesInteresados) {
    const telefono = cliente.telefono_whatsapp || cliente.telefono;
    if (!telefono) continue;

    await dispararAutomatizaciones("propiedad.disponible", {
      clienteId: cliente.id,
      nombre: cliente.nombre,
      telefono,
      propiedadId: ctx.propiedadId,
      propiedadTipo: ctx.propiedadTipo,
      precioVenta: ctx.precioVenta,
      proyectoId: ctx.proyectoId,
    }).catch((err) =>
      console.error(`[Automatizaciones] Error disparando para cliente ${cliente.id}:`, err)
    );

    // Small delay to avoid overwhelming Twilio
    await new Promise((r) => setTimeout(r, 200));
  }
}
