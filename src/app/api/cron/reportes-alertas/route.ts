/**
 * Evaluador de reglas de alertas in-app del módulo Reportes.
 *
 * Disparado por Vercel Cron (ver vercel.json). Cada N min:
 *   1. Lee reglas activas + fuera de cooldown.
 *   2. Evalúa la métrica de cada una contra su umbral.
 *   3. Si cumple condición de disparo → crea notificaciones in-app
 *      (`crm.notificacion`) para usuarios con roles destinatarios y
 *      registra en `crm.reporte_alerta_disparo`.
 *   4. Actualiza ultimo_disparo_at + ultima_eval_at + ultimo_valor.
 *
 * Sin canales externos — reutiliza la campana de notificaciones del CRM.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase.server";
import type { SupabaseClient } from "@supabase/supabase-js";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

interface ReglaRow {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  metrica: string;
  umbral: number;
  comparacion: string;
  ventana_dias: number;
  activo: boolean;
  cooldown_horas: number;
  destinatarios_roles: string[];
  ultimo_disparo_at: string | null;
}

interface EvalResultado {
  dispara: boolean;
  valor: number;
  mensaje: string;
  detalle?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────
// Evaluadores por código (built-in)
// ─────────────────────────────────────────────────────────────────────

async function evaluarLeadsDiariosCaida(
  supabase: SupabaseClient,
  regla: ReglaRow,
): Promise<EvalResultado> {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const finHoy = new Date(hoy);
  finHoy.setHours(23, 59, 59, 999);

  const inicioVentana = new Date(hoy);
  inicioVentana.setDate(inicioVentana.getDate() - 7);

  const { data: ultimos } = await supabase
    .schema("crm")
    .from("cliente")
    .select("fecha_alta")
    .gte("fecha_alta", inicioVentana.toISOString())
    .lt("fecha_alta", hoy.toISOString());

  const { data: hoyData } = await supabase
    .schema("crm")
    .from("cliente")
    .select("id", { count: "exact", head: true })
    .gte("fecha_alta", hoy.toISOString())
    .lte("fecha_alta", finHoy.toISOString());
  const leadsHoy = (hoyData as any)?.count ?? 0;

  const totalUltimos = (ultimos || []).length;
  const promedio7d = totalUltimos / 7;

  // Solo evaluar si hay base mínima (evita spam con DB nueva/vacía)
  if (promedio7d < 1) {
    return {
      dispara: false,
      valor: leadsHoy,
      mensaje: `Promedio 7d (${promedio7d.toFixed(1)}) muy bajo, no se evalúa caída.`,
    };
  }

  const ratio = promedio7d > 0 ? leadsHoy / promedio7d : 0;
  const dispara = compararConUmbral(ratio, regla.umbral, regla.comparacion);

  return {
    dispara,
    valor: ratio,
    mensaje: `Hoy ${leadsHoy} leads vs promedio 7d ${promedio7d.toFixed(1)} (ratio ${(ratio * 100).toFixed(0)}%).`,
    detalle: { leadsHoy, promedio7d: promedio7d.toFixed(2), ratio: ratio.toFixed(2) },
  };
}

async function evaluarVentasSemanaCero(
  supabase: SupabaseClient,
  regla: ReglaRow,
): Promise<EvalResultado> {
  const fin = new Date();
  const inicio = new Date(fin);
  inicio.setDate(inicio.getDate() - regla.ventana_dias);

  const { count } = await supabase
    .schema("crm")
    .from("venta")
    .select("id", { count: "exact", head: true })
    .gte("fecha_venta", inicio.toISOString())
    .lte("fecha_venta", fin.toISOString());

  const cantidadVentas = count ?? 0;
  const dispara = compararConUmbral(cantidadVentas, regla.umbral, regla.comparacion);
  return {
    dispara,
    valor: cantidadVentas,
    mensaje: `${cantidadVentas} venta(s) en últimos ${regla.ventana_dias} día(s).`,
    detalle: { cantidadVentas, ventanaDias: regla.ventana_dias },
  };
}

async function evaluarCobranzaAtrasadaCritica(
  supabase: SupabaseClient,
  regla: ReglaRow,
): Promise<EvalResultado> {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);

  // Cuotas vencidas hoy (fecha_vencimiento < hoy y estado pendiente/vencida)
  const { data: vencidasHoy } = await supabase
    .schema("crm")
    .from("cuota")
    .select("id, fecha_vencimiento, estado")
    .lt("fecha_vencimiento", hoy.toISOString())
    .in("estado", ["pendiente", "vencida"]);

  const { data: vencidasAyer } = await supabase
    .schema("crm")
    .from("cuota")
    .select("id, fecha_vencimiento, estado")
    .lt("fecha_vencimiento", ayer.toISOString())
    .in("estado", ["pendiente", "vencida"]);

  const countHoy = (vencidasHoy || []).length;
  const countAyer = (vencidasAyer || []).length;
  const incremento = countHoy - countAyer;

  const dispara = compararConUmbral(incremento, regla.umbral, regla.comparacion);
  return {
    dispara,
    valor: incremento,
    mensaje: `+${incremento} cuotas vencidas vs ayer (${countHoy} hoy / ${countAyer} ayer).`,
    detalle: { vencidasHoy: countHoy, vencidasAyer: countAyer, incremento },
  };
}

const EVALUADORES: Record<
  string,
  (supabase: SupabaseClient, regla: ReglaRow) => Promise<EvalResultado>
> = {
  leads_diarios_caida: evaluarLeadsDiariosCaida,
  ventas_semana_cero: evaluarVentasSemanaCero,
  cobranza_atrasada_critica: evaluarCobranzaAtrasadaCritica,
};

function compararConUmbral(valor: number, umbral: number, comp: string): boolean {
  switch (comp) {
    case "<":  return valor < umbral;
    case "<=": return valor <= umbral;
    case ">":  return valor > umbral;
    case ">=": return valor >= umbral;
    default:   return false;
  }
}

function enCooldown(regla: ReglaRow, ahora: Date): boolean {
  if (!regla.ultimo_disparo_at) return false;
  const ultDisparo = new Date(regla.ultimo_disparo_at);
  const horasDesde = (ahora.getTime() - ultDisparo.getTime()) / (1000 * 60 * 60);
  return horasDesde < regla.cooldown_horas;
}

// ─────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────

async function handleRequest(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[reportes-alertas] CRON_SECRET no configurado");
    return unauthorized();
  }
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return unauthorized();
  }

  const supabase = createServiceRoleClient();
  const ahora = new Date();

  // 1. Reglas activas
  const { data: reglas, error: reglasError } = await supabase
    .schema("crm")
    .from("reporte_alerta_regla")
    .select("*")
    .eq("activo", true);

  if (reglasError) {
    return NextResponse.json({ error: reglasError.message }, { status: 500 });
  }

  const resumen: Array<{
    codigo: string;
    evaluada: boolean;
    disparo: boolean;
    valor?: number;
    motivo?: string;
    notificaciones?: number;
  }> = [];

  for (const regla of (reglas || []) as ReglaRow[]) {
    const evaluador = EVALUADORES[regla.codigo];

    if (!evaluador) {
      resumen.push({
        codigo: regla.codigo,
        evaluada: false,
        disparo: false,
        motivo: "sin_evaluador_built_in",
      });
      continue;
    }

    if (enCooldown(regla, ahora)) {
      resumen.push({
        codigo: regla.codigo,
        evaluada: false,
        disparo: false,
        motivo: "cooldown_activo",
      });
      continue;
    }

    let resultado: EvalResultado;
    try {
      resultado = await evaluador(supabase, regla);
    } catch (err) {
      console.error(`[reportes-alertas] Error evaluando ${regla.codigo}:`, err);
      resumen.push({
        codigo: regla.codigo,
        evaluada: true,
        disparo: false,
        motivo: err instanceof Error ? err.message : "error_evaluacion",
      });
      continue;
    }

    // 2a. Actualizar última evaluación + valor (siempre, dispare o no)
    await supabase
      .schema("crm")
      .from("reporte_alerta_regla")
      .update({
        ultima_eval_at: ahora.toISOString(),
        ultimo_valor: resultado.valor,
      })
      .eq("id", regla.id);

    if (!resultado.dispara) {
      resumen.push({
        codigo: regla.codigo,
        evaluada: true,
        disparo: false,
        valor: resultado.valor,
        motivo: resultado.mensaje,
      });
      continue;
    }

    // 3. Resolver destinatarios (usuarios con roles permitidos, activos)
    const { data: destinatarios } = await supabase
      .schema("crm")
      .from("usuario_perfil")
      .select("id, rol:rol_id(nombre)")
      .eq("activo", true);

    const usuariosTarget = (destinatarios || []).filter((u: any) => {
      const rolNombre = u.rol?.nombre;
      return rolNombre && regla.destinatarios_roles.includes(rolNombre);
    });

    let notificacionesCreadas = 0;
    if (usuariosTarget.length > 0) {
      const notificacionesInsert = usuariosTarget.map((u: any) => ({
        usuario_id: u.id,
        tipo: "sistema",
        titulo: `Alerta: ${regla.nombre}`,
        mensaje: resultado.mensaje,
        data: {
          alerta_codigo: regla.codigo,
          alerta_regla_id: regla.id,
          valor_observado: resultado.valor,
          umbral: regla.umbral,
          url: "/dashboard/admin/reportes?seccion=alertas",
          ...(resultado.detalle || {}),
        },
      }));
      const { error: notifError } = await supabase
        .schema("crm")
        .from("notificacion")
        .insert(notificacionesInsert);
      if (notifError) {
        console.error(
          `[reportes-alertas] Error insertando notificaciones para ${regla.codigo}:`,
          notifError,
        );
      } else {
        notificacionesCreadas = usuariosTarget.length;
      }
    }

    // 4. Registrar disparo
    await supabase.schema("crm").from("reporte_alerta_disparo").insert({
      regla_id: regla.id,
      valor_observado: resultado.valor,
      umbral_evaluado: regla.umbral,
      notificaciones_creadas: notificacionesCreadas,
      detalle: resultado.detalle ?? null,
    });

    // 5. Actualizar ultimo_disparo_at en la regla
    await supabase
      .schema("crm")
      .from("reporte_alerta_regla")
      .update({ ultimo_disparo_at: ahora.toISOString() })
      .eq("id", regla.id);

    resumen.push({
      codigo: regla.codigo,
      evaluada: true,
      disparo: true,
      valor: resultado.valor,
      motivo: resultado.mensaje,
      notificaciones: notificacionesCreadas,
    });
  }

  return NextResponse.json({
    evaluadas: resumen.length,
    disparadas: resumen.filter((r) => r.disparo).length,
    detalle: resumen,
  });
}

export async function GET(req: NextRequest) {
  return handleRequest(req);
}

export async function POST(req: NextRequest) {
  return handleRequest(req);
}
