"use server";

import { revalidatePath } from "next/cache";
import { createServerActionClient } from "@/lib/supabase.server-actions";
import { PERMISOS } from "@/lib/permissions";
import { requierePermiso, esAdminOCoordinador } from "@/lib/permissions/server";
import type { ConfiguracionProyectoFinanciera } from "@/lib/types/cuotas";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MONEDAS_VALIDAS = ["PEN", "USD"] as const;

export type ConfigFinanciera = ConfiguracionProyectoFinanciera;

export interface ConfigFinancieraInput {
  porcentaje_minimo_separacion: number;
  porcentaje_cuota_inicial: number;
  max_cuotas_iniciales: number;
  max_cuotas_saldo: number;
  tasa_efectiva_mensual: number;
  tasa_mora_mensual: number;
  dias_gracia_mora: number;
  penalidad_clientes_al_dia: number;
  penalidad_clientes_morosos: number;
  descuento_maximo_letra: number;
  seguro_desgravamen_porcentaje: number;
  seguro_multiriesgo_porcentaje: number;
  moneda_predeterminada: string;
}

interface PorcentajeRange {
  min: number;
  max: number;
}

const VALIDACIONES_PORCENTAJE: Record<keyof ConfigFinancieraInput, PorcentajeRange | null> = {
  porcentaje_minimo_separacion: { min: 0, max: 100 },
  porcentaje_cuota_inicial: { min: 0, max: 100 },
  penalidad_clientes_al_dia: { min: 0, max: 100 },
  penalidad_clientes_morosos: { min: 0, max: 100 },
  descuento_maximo_letra: { min: 0, max: 100 },
  // Tasas mensuales y seguros se expresan como fracción decimal (0-1)
  tasa_efectiva_mensual: { min: 0, max: 1 },
  tasa_mora_mensual: { min: 0, max: 1 },
  seguro_desgravamen_porcentaje: { min: 0, max: 1 },
  seguro_multiriesgo_porcentaje: { min: 0, max: 1 },
  max_cuotas_iniciales: null,
  max_cuotas_saldo: null,
  dias_gracia_mora: null,
  moneda_predeterminada: null,
};

function validarInput(payload: ConfigFinancieraInput): { ok: true } | { ok: false; error: string } {
  for (const [campo, rango] of Object.entries(VALIDACIONES_PORCENTAJE) as [
    keyof ConfigFinancieraInput,
    PorcentajeRange | null,
  ][]) {
    if (rango === null) continue;
    const valor = payload[campo];
    if (typeof valor !== "number" || Number.isNaN(valor)) {
      return { ok: false, error: `El campo ${campo} debe ser un número` };
    }
    if (valor < rango.min || valor > rango.max) {
      return {
        ok: false,
        error: `El campo ${campo} debe estar entre ${rango.min} y ${rango.max}`,
      };
    }
  }

  if (!Number.isInteger(payload.max_cuotas_iniciales) || payload.max_cuotas_iniciales <= 0) {
    return { ok: false, error: "Máx. cuotas iniciales debe ser un entero mayor a 0" };
  }
  if (!Number.isInteger(payload.max_cuotas_saldo) || payload.max_cuotas_saldo <= 0) {
    return { ok: false, error: "Máx. cuotas de saldo debe ser un entero mayor a 0" };
  }
  if (!Number.isInteger(payload.dias_gracia_mora) || payload.dias_gracia_mora < 0) {
    return { ok: false, error: "Días de gracia de mora debe ser un entero mayor o igual a 0" };
  }

  if (!MONEDAS_VALIDAS.includes(payload.moneda_predeterminada as (typeof MONEDAS_VALIDAS)[number])) {
    return {
      ok: false,
      error: `Moneda inválida. Use una de: ${MONEDAS_VALIDAS.join(", ")}`,
    };
  }

  return { ok: true };
}

export async function obtenerConfigFinanciera(
  proyectoId: string,
): Promise<{ data: ConfigFinanciera | null; error: string | null }> {
  if (!UUID_REGEX.test(proyectoId)) {
    return { data: null, error: "ID de proyecto inválido" };
  }

  try {
    const supabase = await createServerActionClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: "No autenticado" };
    }

    const { data, error } = await supabase
      .from("configuracion_proyecto_financiera")
      .select("*")
      .eq("proyecto_id", proyectoId)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: (data as ConfigFinanciera | null) ?? null, error: null };
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "Error al obtener la configuración financiera";
    return { data: null, error: mensaje };
  }
}

export async function guardarConfigFinanciera(
  proyectoId: string,
  payload: ConfigFinancieraInput,
): Promise<{ success: boolean; error?: string }> {
  if (!UUID_REGEX.test(proyectoId)) {
    return { success: false, error: "ID de proyecto inválido" };
  }

  const validacion = validarInput(payload);
  if (!validacion.ok) {
    return { success: false, error: validacion.error };
  }

  try {
    const supabase = await createServerActionClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    await requierePermiso(PERMISOS.PROYECTOS.EDITAR);

    const puedeGuardar = await esAdminOCoordinador();
    if (!puedeGuardar) {
      return {
        success: false,
        error: "Solo administradores o coordinadores pueden modificar la configuración financiera",
      };
    }

    const upsertPayload = {
      proyecto_id: proyectoId,
      porcentaje_minimo_separacion: payload.porcentaje_minimo_separacion,
      porcentaje_cuota_inicial: payload.porcentaje_cuota_inicial,
      max_cuotas_iniciales: payload.max_cuotas_iniciales,
      max_cuotas_saldo: payload.max_cuotas_saldo,
      tasa_efectiva_mensual: payload.tasa_efectiva_mensual,
      tasa_mora_mensual: payload.tasa_mora_mensual,
      dias_gracia_mora: payload.dias_gracia_mora,
      penalidad_clientes_al_dia: payload.penalidad_clientes_al_dia,
      penalidad_clientes_morosos: payload.penalidad_clientes_morosos,
      descuento_maximo_letra: payload.descuento_maximo_letra,
      seguro_desgravamen_porcentaje: payload.seguro_desgravamen_porcentaje,
      seguro_multiriesgo_porcentaje: payload.seguro_multiriesgo_porcentaje,
      moneda_predeterminada: payload.moneda_predeterminada,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("configuracion_proyecto_financiera")
      .upsert(upsertPayload, { onConflict: "proyecto_id" });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/proyectos/${proyectoId}`);
    return { success: true };
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "Error al guardar la configuración financiera";
    return { success: false, error: mensaje };
  }
}
