"use server";

import { createServerActionClient } from "@/lib/supabase.server-actions";
import { PERMISOS } from "@/lib/permissions";
import { requierePermiso, esAdminOCoordinador } from "@/lib/permissions/server";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export type AuditoriaAccion = "insert" | "update" | "delete";
export type AuditoriaEntidad = "proyecto" | "lote";

export interface AuditoriaCambioCampo {
  old: unknown;
  new: unknown;
}

// En INSERT/DELETE es Record<string, unknown> (fila completa).
// En UPDATE es Record<string, AuditoriaCambioCampo>.
export type AuditoriaCambios =
  | Record<string, unknown>
  | Record<string, AuditoriaCambioCampo>;

export interface AuditoriaEntry {
  id: string;
  entidad_tipo: AuditoriaEntidad;
  entidad_id: string;
  accion: AuditoriaAccion;
  usuario_username: string | null;
  cambios: AuditoriaCambios | null;
  proyecto_id: string | null;
  created_at: string;
}

export interface ObtenerAuditoriaOpciones {
  limit?: number;
  offset?: number;
}

export interface ObtenerAuditoriaResultado {
  data: AuditoriaEntry[];
  total: number;
  error: string | null;
}

export async function obtenerAuditoriaProyecto(
  proyectoId: string,
  opciones: ObtenerAuditoriaOpciones = {},
): Promise<ObtenerAuditoriaResultado> {
  try {
    if (!proyectoId || !UUID_REGEX.test(proyectoId)) {
      return { data: [], total: 0, error: "ID de proyecto inválido" };
    }

    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: [], total: 0, error: "No autenticado" };
    }

    await requierePermiso(PERMISOS.PROYECTOS.VER);

    const esAutorizado = await esAdminOCoordinador();
    if (!esAutorizado) {
      return {
        data: [],
        total: 0,
        error: "Solo administradores o coordinadores pueden ver la auditoría",
      };
    }

    const rawLimit = typeof opciones.limit === "number" && Number.isFinite(opciones.limit)
      ? Math.floor(opciones.limit)
      : DEFAULT_LIMIT;
    const limit = Math.min(Math.max(rawLimit, 1), MAX_LIMIT);

    const rawOffset = typeof opciones.offset === "number" && Number.isFinite(opciones.offset)
      ? Math.floor(opciones.offset)
      : 0;
    const offset = Math.max(rawOffset, 0);

    const from = offset;
    const to = offset + limit - 1;

    const { data, error, count } = await supabase
      .schema("crm")
      .from("auditoria_proyecto_lote")
      .select(
        "id,entidad_tipo,entidad_id,accion,usuario_username,cambios,proyecto_id,created_at",
        { count: "exact" },
      )
      .eq("proyecto_id", proyectoId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      return { data: [], total: 0, error: error.message };
    }

    return {
      data: (data ?? []) as AuditoriaEntry[],
      total: count ?? 0,
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      total: 0,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

export interface UltimoCambioLote {
  accion: AuditoriaAccion;
  usuario_username: string | null;
  created_at: string;
  cambios: AuditoriaCambios | null;
}

export async function obtenerUltimoCambioLote(
  loteId: string,
): Promise<{ data: UltimoCambioLote | null; error: string | null }> {
  if (!loteId || !UUID_REGEX.test(loteId)) {
    return { data: null, error: "ID de lote inválido" };
  }

  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "No autenticado" };

    const puede = await esAdminOCoordinador();
    if (!puede) {
      return { data: null, error: "Sin acceso" };
    }

    const { data, error } = await supabase
      .schema("crm")
      .from("auditoria_proyecto_lote")
      .select("accion, usuario_username, created_at, cambios")
      .eq("entidad_tipo", "lote")
      .eq("entidad_id", loteId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    return { data: (data as UltimoCambioLote | null) ?? null, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
