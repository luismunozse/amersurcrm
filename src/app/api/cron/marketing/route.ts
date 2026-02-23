/**
 * Vercel Cron Job: Marketing Scheduler
 *
 * GET /api/cron/marketing — ejecutado cada minuto por Vercel Crons
 *
 * Procesa:
 * 1. Automatizaciones con delay pendiente (next_action_at <= NOW)
 * 2. Campañas programadas cuya fecha_inicio ya llegó (estado=SCHEDULED)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase.server";
import { enviarWhatsApp } from "@/lib/services/twilio";
import { enviarEmail, textoAHtml } from "@/lib/services/email";
import type { MarketingAutomatizacion, MarketingTemplate } from "@/types/whatsapp-marketing";

// ─────────────────────────────────────────────────────────────────────────────
// Auth del cron
// ─────────────────────────────────────────────────────────────────────────────

function verificarAuth(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // Sin configurar → solo en dev

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler principal
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!verificarAuth(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const resultados = { automatizaciones: 0, campanas: 0, errores: 0 };

  // ── 1. Automatizaciones con delay pendiente ──────────────────────────────
  try {
    const { data: ejecucionesPendientes } = await supabase
      .schema("crm")
      .from("marketing_automatizacion_ejecucion")
      .select(`
        *,
        automatizacion:automatizacion_id (*)
      `)
      .eq("estado", "RUNNING")
      .lte("next_action_at", new Date().toISOString())
      .not("next_action_at", "is", null)
      .limit(50);

    for (const ejecucion of ejecucionesPendientes ?? []) {
      try {
        await reanudarEjecucion(supabase, ejecucion);
        resultados.automatizaciones++;
      } catch (err) {
        console.error("[Cron] Error reanudando ejecución:", ejecucion.id, err);
        resultados.errores++;
      }
    }
  } catch (err) {
    console.error("[Cron] Error procesando automatizaciones:", err);
    resultados.errores++;
  }

  // ── 2. Campañas programadas listas para enviar ───────────────────────────
  try {
    const { data: campanasPendientes } = await supabase
      .schema("crm")
      .from("marketing_campana")
      .select(`
        *,
        template:template_id (*),
        audiencia:audiencia_id (contactos_ids, contactos_count)
      `)
      .eq("estado", "SCHEDULED")
      .lte("fecha_inicio", new Date().toISOString())
      .limit(5);

    for (const campana of campanasPendientes ?? []) {
      try {
        await ejecutarCampanaProgramada(supabase, campana);
        resultados.campanas++;
      } catch (err) {
        console.error("[Cron] Error ejecutando campaña:", campana.id, err);
        resultados.errores++;
      }
    }
  } catch (err) {
    console.error("[Cron] Error procesando campañas:", err);
    resultados.errores++;
  }

  console.log(`[Cron/Marketing] Procesado: ${JSON.stringify(resultados)}`);
  return NextResponse.json({ ok: true, ...resultados });
}

// ─────────────────────────────────────────────────────────────────────────────
// Reanudar automatización con delay cumplido
// ─────────────────────────────────────────────────────────────────────────────

async function reanudarEjecucion(
  supabase: ReturnType<typeof createServiceRoleClient>,
  ejecucion: any
): Promise<void> {
  const auto: MarketingAutomatizacion = ejecucion.automatizacion;
  if (!auto?.acciones?.length) return;

  const siguientePaso = (ejecucion.paso_actual ?? 0) + 1;
  if (siguientePaso >= auto.acciones.length) {
    // No hay más pasos — completar
    await supabase
      .schema("crm")
      .from("marketing_automatizacion_ejecucion")
      .update({
        estado: "COMPLETED",
        completed_at: new Date().toISOString(),
        next_action_at: null,
      })
      .eq("id", ejecucion.id);
    return;
  }

  const accion = auto.acciones[siguientePaso];

  // Obtener datos del cliente para el contexto
  const { data: cliente } = await supabase
    .from("cliente")
    .select("nombre, telefono_whatsapp, telefono, email, whatsapp_opt_out")
    .eq("id", ejecucion.cliente_id)
    .maybeSingle();

  if (cliente?.whatsapp_opt_out) {
    await supabase
      .schema("crm")
      .from("marketing_automatizacion_ejecucion")
      .update({
        estado: "COMPLETED",
        completed_at: new Date().toISOString(),
        next_action_at: null,
        error_mensaje: "Cliente con opt-out activo",
      })
      .eq("id", ejecucion.id);
    return;
  }

  let resultado: "ok" | "skip" | "error" | "pendiente" = "skip";
  let detalle: string | undefined;

  // Actualizar paso actual
  await supabase
    .schema("crm")
    .from("marketing_automatizacion_ejecucion")
    .update({ paso_actual: siguientePaso, next_action_at: null })
    .eq("id", ejecucion.id);

  if (accion.tipo === "enviar_template" && accion.template_id) {
    const telefono =
      cliente?.telefono_whatsapp || cliente?.telefono;
    if (!telefono) {
      resultado = "skip";
      detalle = "Sin teléfono";
    } else {
      try {
        const { data: template } = await supabase
          .schema("crm")
          .from("marketing_template")
          .select("*")
          .eq("id", accion.template_id)
          .maybeSingle();

        if (template) {
          const tpl = template as MarketingTemplate;
          const cuerpo = sustituirVariables(tpl.body_texto, {
            nombre: cliente?.nombre ?? "",
            telefono: telefono,
          });

          if (tpl.canal_tipo === "email") {
            const email = cliente?.email;
            if (email) {
              await enviarEmail({
                to: email,
                subject: tpl.subject || tpl.nombre,
                html: tpl.body_html || textoAHtml(cuerpo, cliente?.nombre),
                text: cuerpo,
              });
              resultado = "ok";
            } else {
              resultado = "skip";
              detalle = "Sin email";
            }
          } else {
            const tel = normalizarTelefono(telefono);
            await enviarWhatsApp(tel, cuerpo);
            resultado = "ok";
          }
        }
      } catch (err: any) {
        resultado = "error";
        detalle = err.message;
      }
    }
  } else if (accion.tipo === "esperar") {
    resultado = "pendiente";
    detalle = `${accion.delay_minutos ?? 0} minutos`;
  }

  // Si el siguiente paso también tiene delay, programar
  const hayDelay = (accion.delay_minutos ?? 0) > 0 && accion.tipo !== "esperar";
  const nextActionAt = hayDelay || accion.tipo === "esperar"
    ? new Date(Date.now() + (accion.delay_minutos ?? 0) * 60 * 1000).toISOString()
    : null;

  const pasosEjecutados = [
    ...(ejecucion.pasos_ejecutados ?? []),
    { tipo: accion.tipo, resultado, detalle, ejecutado_at: new Date().toISOString() },
  ];

  const esUltimoPaso = siguientePaso >= auto.acciones.length - 1;
  const estadoFinal =
    resultado === "error"
      ? "FAILED"
      : nextActionAt
        ? "RUNNING"
        : esUltimoPaso
          ? "COMPLETED"
          : "RUNNING";

  await supabase
    .schema("crm")
    .from("marketing_automatizacion_ejecucion")
    .update({
      estado: estadoFinal,
      pasos_ejecutados: pasosEjecutados,
      next_action_at: nextActionAt,
      completed_at: estadoFinal !== "RUNNING" ? new Date().toISOString() : null,
    })
    .eq("id", ejecucion.id);
}

// ─────────────────────────────────────────────────────────────────────────────
// Ejecutar campaña programada
// ─────────────────────────────────────────────────────────────────────────────

async function ejecutarCampanaProgramada(
  supabase: ReturnType<typeof createServiceRoleClient>,
  campana: any
): Promise<void> {
  // Marcar como RUNNING
  await supabase
    .schema("crm")
    .from("marketing_campana")
    .update({ estado: "RUNNING" })
    .eq("id", campana.id);

  const template = campana.template as MarketingTemplate | null;
  if (!template) {
    await supabase
      .schema("crm")
      .from("marketing_campana")
      .update({ estado: "CANCELLED" })
      .eq("id", campana.id);
    return;
  }

  const contactosIds: string[] = campana.audiencia?.contactos_ids ?? [];
  if (!contactosIds.length) {
    await supabase
      .schema("crm")
      .from("marketing_campana")
      .update({ estado: "COMPLETED", completado_at: new Date().toISOString() })
      .eq("id", campana.id);
    return;
  }

  // Obtener datos de contactos
  const { data: clientes } = await supabase
    .from("cliente")
    .select("id, nombre, telefono_whatsapp, telefono, email, whatsapp_opt_out")
    .in("id", contactosIds)
    .eq("whatsapp_opt_out", false);

  let enviados = 0;
  let fallidos = 0;

  for (const cliente of clientes ?? []) {
    try {
      const cuerpo = sustituirVariables(template.body_texto, {
        nombre: cliente.nombre ?? "",
        telefono: cliente.telefono_whatsapp || cliente.telefono || "",
      });

      if (template.canal_tipo === "email") {
        if (cliente.email) {
          await enviarEmail({
            to: cliente.email,
            subject: template.subject || template.nombre,
            html: template.body_html || textoAHtml(cuerpo, cliente.nombre),
            text: cuerpo,
          });
          enviados++;
        }
      } else {
        const tel = normalizarTelefono(
          cliente.telefono_whatsapp || cliente.telefono || ""
        );
        if (tel) {
          await enviarWhatsApp(tel, cuerpo);
          enviados++;
        }
      }

      await new Promise((r) => setTimeout(r, 100));
    } catch {
      fallidos++;
    }
  }

  // Actualizar métricas y estado final
  await supabase
    .schema("crm")
    .from("marketing_campana")
    .update({
      estado: "COMPLETED",
      completado_at: new Date().toISOString(),
      total_enviados: enviados,
      total_fallidos: fallidos,
    })
    .eq("id", campana.id);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function normalizarTelefono(tel: string): string {
  if (!tel) return "";
  const limpio = tel.replace(/\D/g, "");
  if (limpio.startsWith("51") && limpio.length === 11) return `+${limpio}`;
  if (limpio.length === 9) return `+51${limpio}`;
  return tel.startsWith("+") ? tel : `+${limpio}`;
}

function sustituirVariables(
  texto: string,
  ctx: { nombre: string; telefono: string }
): string {
  const mapa: Record<string, string> = {
    nombre: ctx.nombre,
    nombre_cliente: ctx.nombre,
    telefono: ctx.telefono,
    "1": ctx.nombre,
    "2": ctx.telefono,
  };
  return texto.replace(/\{\{(\w+)\}\}/g, (match, key) => mapa[key] ?? match);
}
