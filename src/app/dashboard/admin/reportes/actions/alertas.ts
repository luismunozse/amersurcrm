"use server";

import { getAuthorizedClient, safeAction } from "./shared";
import { revalidarReportes } from "./shared-cache";

export interface AlertaRegla {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  metrica: string;
  umbral: number;
  comparacion: string;
  ventanaDias: number;
  activo: boolean;
  cooldownHoras: number;
  destinatariosRoles: string[];
  ultimoDisparoAt: string | null;
  ultimaEvalAt: string | null;
  ultimoValor: number | null;
}

export interface AlertaDisparo {
  id: string;
  reglaId: string;
  reglaNombre: string;
  reglaCodigo: string;
  valorObservado: number;
  umbralEvaluado: number;
  notificacionesCreadas: number;
  detalle: Record<string, unknown> | null;
  fechaDisparo: string;
}

function mapearRegla(row: any): AlertaRegla {
  return {
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    descripcion: row.descripcion,
    metrica: row.metrica,
    umbral: Number(row.umbral),
    comparacion: row.comparacion,
    ventanaDias: row.ventana_dias,
    activo: row.activo,
    cooldownHoras: row.cooldown_horas,
    destinatariosRoles: row.destinatarios_roles || [],
    ultimoDisparoAt: row.ultimo_disparo_at,
    ultimaEvalAt: row.ultima_eval_at,
    ultimoValor: row.ultimo_valor !== null ? Number(row.ultimo_valor) : null,
  };
}

export async function listarAlertaReglas(): Promise<{
  data: AlertaRegla[] | null;
  error: string | null;
}> {
  return safeAction(async () => {
    const supabase = await getAuthorizedClient();
    const { data, error } = await supabase
      .schema("crm")
      .from("reporte_alerta_regla")
      .select("*")
      .order("nombre", { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []).map(mapearRegla);
  });
}

export async function toggleAlertaRegla(
  reglaId: string,
  activo: boolean,
): Promise<{ data: { id: string; activo: boolean } | null; error: string | null }> {
  return safeAction(async () => {
    const supabase = await getAuthorizedClient();
    const { data, error } = await supabase
      .schema("crm")
      .from("reporte_alerta_regla")
      .update({ activo })
      .eq("id", reglaId)
      .select("id, activo")
      .single();
    if (error) throw new Error(error.message);
    revalidarReportes("reporte-alertas");
    return { id: data.id as string, activo: data.activo as boolean };
  });
}

export async function listarAlertaDisparos(
  limite: number = 50,
): Promise<{ data: AlertaDisparo[] | null; error: string | null }> {
  return safeAction(async () => {
    const supabase = await getAuthorizedClient();
    const { data, error } = await supabase
      .schema("crm")
      .from("reporte_alerta_disparo")
      .select(`
        id,
        regla_id,
        valor_observado,
        umbral_evaluado,
        notificaciones_creadas,
        detalle,
        fecha_disparo,
        regla:regla_id ( nombre, codigo )
      `)
      .order("fecha_disparo", { ascending: false })
      .limit(limite);
    if (error) throw new Error(error.message);
    return (data || []).map((row: any) => ({
      id: row.id,
      reglaId: row.regla_id,
      reglaNombre: row.regla?.nombre || "Regla eliminada",
      reglaCodigo: row.regla?.codigo || "",
      valorObservado: Number(row.valor_observado),
      umbralEvaluado: Number(row.umbral_evaluado),
      notificacionesCreadas: row.notificaciones_creadas,
      detalle: row.detalle,
      fechaDisparo: row.fecha_disparo,
    }));
  });
}
