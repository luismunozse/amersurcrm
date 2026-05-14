"use server";

import { createServerOnlyClient } from "@/lib/supabase.server";
import { esAdmin } from "@/lib/permissions/server";
import { revalidatePath } from "next/cache";
import {
  renderTemplate,
  extractVariables,
  extractSnippetSlugs,
  normalizeWhatsAppPhone,
  buildWhatsAppUrl,
  prependMedia,
} from "@/lib/marketing/whatsapp";
import type {
  MarketingTemplate,
  MarketingSnippet,
  MarketingEnvioLog,
  EstadisticasMarketing,
  EstadoEnvioLog,
} from "@/types/whatsapp-marketing";

// =====================================================
// PLANTILLAS
// =====================================================

export async function obtenerPlantillas() {
  try {
    const supabase = await createServerOnlyClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "No autorizado" };

    const { data, error } = await supabase
      .schema("crm")
      .from("marketing_template")
      .select("*")
      .is("eliminado_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error obteniendo plantillas:", error);
      return { data: null, error: error.message };
    }

    return { data: data as MarketingTemplate[], error: null };
  } catch (error) {
    console.error("Error obteniendo plantillas:", error);
    return { data: null, error: "Error desconocido" };
  }
}

export async function crearPlantilla(plantilla: Partial<MarketingTemplate>) {
  try {
    const supabase = await createServerOnlyClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "No autorizado" };

    const isAdmin = await esAdmin();
    if (!isAdmin) return { data: null, error: "Solo administradores pueden crear plantillas" };

    if (!plantilla.nombre || !plantilla.body_texto) {
      return { data: null, error: "Nombre y mensaje son obligatorios" };
    }

    const variables =
      plantilla.variables && plantilla.variables.length > 0
        ? plantilla.variables
        : extractVariables(plantilla.body_texto);

    const { data, error } = await supabase
      .schema("crm")
      .from("marketing_template")
      .insert({
        nombre: plantilla.nombre,
        categoria: plantilla.categoria ?? "general",
        body_texto: plantilla.body_texto,
        variables,
        objetivo: plantilla.objetivo ?? null,
        tags: plantilla.tags ?? [],
        activo: plantilla.activo ?? true,
        media_url: plantilla.media_url ?? null,
        media_tipo: plantilla.media_tipo ?? null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath("/dashboard/admin/marketing");
    return { data: data as MarketingTemplate, error: null };
  } catch (error) {
    console.error("Error creando plantilla:", error);
    return { data: null, error: "Error desconocido" };
  }
}

export async function actualizarPlantilla(
  id: string,
  plantilla: Partial<MarketingTemplate>,
) {
  try {
    const supabase = await createServerOnlyClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "No autorizado" };

    const isAdmin = await esAdmin();
    if (!isAdmin) return { data: null, error: "Solo administradores pueden editar plantillas" };

    const updates: Record<string, unknown> = {};
    if (plantilla.nombre !== undefined) updates.nombre = plantilla.nombre;
    if (plantilla.categoria !== undefined) updates.categoria = plantilla.categoria;
    if (plantilla.body_texto !== undefined) {
      updates.body_texto = plantilla.body_texto;
      updates.variables =
        plantilla.variables && plantilla.variables.length > 0
          ? plantilla.variables
          : extractVariables(plantilla.body_texto);
    } else if (plantilla.variables !== undefined) {
      updates.variables = plantilla.variables;
    }
    if (plantilla.objetivo !== undefined) updates.objetivo = plantilla.objetivo;
    if (plantilla.tags !== undefined) updates.tags = plantilla.tags;
    if (plantilla.activo !== undefined) updates.activo = plantilla.activo;
    if (plantilla.media_url !== undefined) updates.media_url = plantilla.media_url || null;
    if (plantilla.media_tipo !== undefined) updates.media_tipo = plantilla.media_tipo || null;

    const { data, error } = await supabase
      .schema("crm")
      .from("marketing_template")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath("/dashboard/admin/marketing");
    return { data: data as MarketingTemplate, error: null };
  } catch (error) {
    console.error("Error actualizando plantilla:", error);
    return { data: null, error: "Error desconocido" };
  }
}

export async function eliminarPlantilla(id: string) {
  try {
    const supabase = await createServerOnlyClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autorizado" };

    const isAdmin = await esAdmin();
    if (!isAdmin) return { success: false, error: "Solo administradores" };

    // Soft-delete: conserva FK histórica desde marketing_envio_log.template_id.
    const { error } = await supabase
      .schema("crm")
      .from("marketing_template")
      .update({ eliminado_at: new Date().toISOString(), activo: false })
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/admin/marketing");
    return { success: true, error: null };
  } catch (error) {
    console.error("Error eliminando plantilla:", error);
    return { success: false, error: "Error desconocido" };
  }
}

// =====================================================
// ENVÍO LOG (registro click-to-chat)
// =====================================================

export async function registrarApertura(params: {
  templateId: string;
  clienteId: string;
  telefono: string;
  variables: Record<string, string>;
  recordatorioId?: string | null;
}) {
  try {
    const supabase = await createServerOnlyClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "No autorizado" };

    const { data: template, error: errT } = await supabase
      .schema("crm")
      .from("marketing_template")
      .select("body_texto, media_url")
      .eq("id", params.templateId)
      .maybeSingle();

    if (errT || !template) {
      return { data: null, error: errT?.message ?? "Plantilla no encontrada" };
    }

    // Cargar solo snippets referenciados en el body para no bajar todos.
    const slugs = extractSnippetSlugs(template.body_texto);
    let snippetsMap: Record<string, string> = {};
    if (slugs.length > 0) {
      const { data: snippets } = await supabase
        .schema("crm")
        .from("marketing_snippet")
        .select("slug, contenido")
        .in("slug", slugs)
        .is("eliminado_at", null);
      snippetsMap = Object.fromEntries(
        (snippets ?? []).map((s) => [s.slug as string, s.contenido as string]),
      );
    }

    const renderizado = renderTemplate(template.body_texto, params.variables, {
      snippets: snippetsMap,
    });
    const mensajeRenderizado = prependMedia(renderizado, template.media_url);
    const telNormalizado = normalizeWhatsAppPhone(params.telefono);

    const { data: perfil } = await supabase
      .schema("crm")
      .from("usuario_perfil")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    const { data, error } = await supabase
      .schema("crm")
      .from("marketing_envio_log")
      .insert({
        template_id: params.templateId,
        cliente_id: params.clienteId,
        recordatorio_id: params.recordatorioId ?? null,
        vendedor_id: user.id,
        vendedor_username: perfil?.username ?? null,
        telefono: telNormalizado || params.telefono,
        variables_valores: params.variables,
        mensaje_renderizado: mensajeRenderizado,
        estado: "abierto",
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    return {
      data: {
        envioLog: data as MarketingEnvioLog,
        whatsappUrl: buildWhatsAppUrl(params.telefono, mensajeRenderizado),
      },
      error: null,
    };
  } catch (error) {
    console.error("Error registrando apertura:", error);
    return { data: null, error: "Error desconocido" };
  }
}

export async function actualizarEstadoEnvio(
  id: string,
  estado: EstadoEnvioLog,
  notas?: string,
) {
  try {
    const supabase = await createServerOnlyClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autorizado" };

    const updates: Record<string, unknown> = { estado };
    const now = new Date().toISOString();
    if (estado === "enviado") updates.marcado_enviado_at = now;
    if (estado === "respondido") updates.marcado_respondido_at = now;
    if (estado === "descartado") updates.marcado_descartado_at = now;
    if (notas !== undefined) updates.notas = notas;

    const { error } = await supabase
      .schema("crm")
      .from("marketing_envio_log")
      .update(updates)
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/admin/marketing");
    return { success: true, error: null };
  } catch (error) {
    console.error("Error actualizando estado envío:", error);
    return { success: false, error: "Error desconocido" };
  }
}

export async function listarHistorialEnvios(filtros?: {
  vendedorId?: string;
  templateId?: string;
  clienteId?: string;
  estado?: EstadoEnvioLog;
  desde?: string;
  hasta?: string;
  limit?: number;
}) {
  try {
    const supabase = await createServerOnlyClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "No autorizado" };

    const isAdmin = await esAdmin();
    const vendedorIdFilter = isAdmin ? filtros?.vendedorId : user.id;

    let query = supabase
      .schema("crm")
      .from("marketing_envio_log")
      .select(
        "*, template:template_id(id, nombre, categoria)",
      )
      .order("created_at", { ascending: false })
      .limit(filtros?.limit ?? 200);

    if (vendedorIdFilter) query = query.eq("vendedor_id", vendedorIdFilter);
    if (filtros?.templateId) query = query.eq("template_id", filtros.templateId);
    if (filtros?.clienteId) query = query.eq("cliente_id", filtros.clienteId);
    if (filtros?.estado) query = query.eq("estado", filtros.estado);
    if (filtros?.desde) query = query.gte("created_at", filtros.desde);
    if (filtros?.hasta) query = query.lte("created_at", filtros.hasta);

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };

    if (!data || data.length === 0) {
      return { data: [] as MarketingEnvioLog[], error: null };
    }

    const clienteIds = Array.from(
      new Set(data.map((d) => d.cliente_id).filter(Boolean)),
    ) as string[];

    let clientesMap: Record<string, { id: string; nombre: string; telefono: string | null }> = {};
    if (clienteIds.length > 0) {
      const { data: clientes } = await supabase
        .from("cliente")
        .select("id, nombre, telefono")
        .in("id", clienteIds);
      clientesMap = Object.fromEntries(
        (clientes ?? []).map((c) => [c.id, c]),
      );
    }

    const enriched = data.map((d) => ({
      ...d,
      cliente: d.cliente_id ? clientesMap[d.cliente_id] ?? null : null,
    }));

    return { data: enriched as MarketingEnvioLog[], error: null };
  } catch (error) {
    console.error("Error listando historial:", error);
    return { data: null, error: "Error desconocido" };
  }
}

export async function obtenerHistorialPorCliente(clienteId: string) {
  return listarHistorialEnvios({ clienteId, limit: 100 });
}

// =====================================================
// RECORDATORIOS WHATSAPP
// =====================================================

export async function crearRecordatorioEnvioTemplate(params: {
  clienteId: string;
  templateId: string;
  fechaProgramada: string; // ISO
  variables: Record<string, string>;
  telefono: string;
  notas?: string;
  prioridad?: "baja" | "media" | "alta" | "urgente";
}) {
  try {
    const supabase = await createServerOnlyClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "No autorizado" };

    const { data: template } = await supabase
      .schema("crm")
      .from("marketing_template")
      .select("nombre, body_texto")
      .eq("id", params.templateId)
      .maybeSingle();

    if (!template) return { data: null, error: "Plantilla no encontrada" };

    const { data, error } = await supabase
      .schema("crm")
      .from("recordatorio")
      .insert({
        titulo: `Enviar plantilla: ${template.nombre}`,
        descripcion: params.notas ?? null,
        tipo: "envio_template_whatsapp",
        prioridad: params.prioridad ?? "media",
        fecha_recordatorio: params.fechaProgramada,
        vendedor_id: user.id,
        cliente_id: params.clienteId,
        notificar_push: true,
        data: {
          template_id: params.templateId,
          variables_valores: params.variables,
          telefono: params.telefono,
        },
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath("/dashboard/admin/marketing");
    revalidatePath("/dashboard/agenda");
    return { data, error: null };
  } catch (error) {
    console.error("Error creando recordatorio WhatsApp:", error);
    return { data: null, error: "Error desconocido" };
  }
}

export async function listarRecordatoriosEnvioTemplate(filtros?: {
  pendientesSolo?: boolean;
  vendedorId?: string;
  diasAdelante?: number;
}) {
  try {
    const supabase = await createServerOnlyClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "No autorizado" };

    const isAdmin = await esAdmin();
    const vendedorIdFilter = isAdmin ? filtros?.vendedorId : user.id;

    let query = supabase
      .schema("crm")
      .from("recordatorio")
      .select("*, cliente:cliente_id(id, nombre, telefono)")
      .eq("tipo", "envio_template_whatsapp")
      .order("fecha_recordatorio", { ascending: true });

    if (filtros?.pendientesSolo ?? true) {
      query = query.eq("completado", false);
    }
    if (vendedorIdFilter) {
      query = query.eq("vendedor_id", vendedorIdFilter);
    }
    if (filtros?.diasAdelante) {
      const limite = new Date(
        Date.now() + filtros.diasAdelante * 24 * 60 * 60 * 1000,
      ).toISOString();
      query = query.lte("fecha_recordatorio", limite);
    }

    const { data, error } = await query.limit(200);
    if (error) return { data: null, error: error.message };

    return { data: data ?? [], error: null };
  } catch (error) {
    console.error("Error listando recordatorios WhatsApp:", error);
    return { data: null, error: "Error desconocido" };
  }
}

// =====================================================
// MÉTRICAS / ESTADÍSTICAS
// =====================================================

export type PeriodoMarketing = "hoy" | "7d" | "30d" | "90d";

function calcularDesde(periodo: PeriodoMarketing): Date {
  const ahora = new Date();
  if (periodo === "hoy") {
    ahora.setHours(0, 0, 0, 0);
    return ahora;
  }
  const dias = periodo === "7d" ? 7 : periodo === "30d" ? 30 : 90;
  return new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
}

export async function obtenerEstadisticasMarketing(): Promise<{
  data: EstadisticasMarketing | null;
  error: string | null;
}> {
  try {
    const supabase = await createServerOnlyClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "No autorizado" };

    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);
    const inicioSemana = new Date();
    inicioSemana.setDate(inicioSemana.getDate() - 7);

    const [
      { count: enviosHoy },
      { count: enviosSemana },
      { count: marcadosEnviadosHoy },
      { count: respondidosHoy },
    ] = await Promise.all([
      supabase
        .schema("crm")
        .from("marketing_envio_log")
        .select("id", { count: "exact", head: true })
        .gte("created_at", inicioHoy.toISOString()),
      supabase
        .schema("crm")
        .from("marketing_envio_log")
        .select("id", { count: "exact", head: true })
        .gte("created_at", inicioSemana.toISOString()),
      supabase
        .schema("crm")
        .from("marketing_envio_log")
        .select("id", { count: "exact", head: true })
        .gte("marcado_enviado_at", inicioHoy.toISOString()),
      supabase
        .schema("crm")
        .from("marketing_envio_log")
        .select("id", { count: "exact", head: true })
        .gte("marcado_respondido_at", inicioHoy.toISOString()),
    ]);

    const tasaRespuesta =
      enviosSemana && enviosSemana > 0
        ? Math.round(((respondidosHoy ?? 0) / enviosSemana) * 1000) / 10
        : 0;

    return {
      data: {
        envios_hoy: enviosHoy ?? 0,
        envios_semana: enviosSemana ?? 0,
        marcados_enviados_hoy: marcadosEnviadosHoy ?? 0,
        marcados_respondidos_hoy: respondidosHoy ?? 0,
        tasa_respuesta_promedio: tasaRespuesta,
      },
      error: null,
    };
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error);
    return { data: null, error: "Error desconocido" };
  }
}

export async function obtenerAnalyticsMarketing(
  periodo: PeriodoMarketing = "30d",
) {
  try {
    const supabase = await createServerOnlyClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "No autorizado" };

    const desde = calcularDesde(periodo).toISOString();

    const { data: envios, error } = await supabase
      .schema("crm")
      .from("marketing_envio_log")
      .select(
        "created_at, estado, vendedor_id, vendedor_username, template_id, marcado_enviado_at, marcado_respondido_at, template:template_id(id, nombre)",
      )
      .gte("created_at", desde);

    if (error) return { data: null, error: error.message };

    const rows = envios ?? [];

    // Totales del período
    let totalEnvios = 0;
    let totalConfirmados = 0;
    let totalRespondidos = 0;

    const tendenciaMap: Record<string, number> = {};
    const distribucionMap: Record<string, number> = {};

    type AggVendedor = { total: number; confirmados: number; respondidos: number; username: string };
    const vendedoresMap: Record<string, AggVendedor> = {};

    type AggTemplate = { total: number; confirmados: number; respondidos: number; nombre: string };
    const templatesMap: Record<string, AggTemplate> = {};

    for (const env of rows) {
      totalEnvios++;
      if (env.marcado_enviado_at) totalConfirmados++;
      if (env.marcado_respondido_at) totalRespondidos++;

      const dia = (env.created_at as string).slice(0, 10);
      tendenciaMap[dia] = (tendenciaMap[dia] ?? 0) + 1;

      const est = env.estado as string;
      distribucionMap[est] = (distribucionMap[est] ?? 0) + 1;

      const vId = (env.vendedor_id as string | null) ?? "desconocido";
      const vUser = (env.vendedor_username as string | null) ?? "—";
      if (!vendedoresMap[vId]) {
        vendedoresMap[vId] = { total: 0, confirmados: 0, respondidos: 0, username: vUser };
      }
      vendedoresMap[vId].total++;
      if (env.marcado_enviado_at) vendedoresMap[vId].confirmados++;
      if (env.marcado_respondido_at) vendedoresMap[vId].respondidos++;

      const tId = env.template_id as string | null;
      if (tId) {
        const tNombre =
          (env.template as unknown as { nombre?: string } | null)?.nombre ?? "Plantilla eliminada";
        if (!templatesMap[tId]) {
          templatesMap[tId] = { total: 0, confirmados: 0, respondidos: 0, nombre: tNombre };
        }
        templatesMap[tId].total++;
        if (env.marcado_enviado_at) templatesMap[tId].confirmados++;
        if (env.marcado_respondido_at) templatesMap[tId].respondidos++;
      }
    }

    const tendenciaMensajes = Object.entries(tendenciaMap)
      .map(([fecha, cantidad]) => ({ fecha, cantidad }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    const distribucionEstados = Object.entries(distribucionMap).map(
      ([estado, valor]) => ({ estado, valor }),
    );

    const tasa = (resp: number, total: number) =>
      total > 0 ? Math.round((resp / total) * 1000) / 10 : 0;

    const rankingVendedores = Object.entries(vendedoresMap)
      .map(([vendedor_id, v]) => ({
        vendedor_id,
        username: v.username,
        envios: v.total,
        confirmados: v.confirmados,
        respondidos: v.respondidos,
        tasa_respuesta: tasa(v.respondidos, v.total),
        tasa_confirmacion: tasa(v.confirmados, v.total),
      }))
      .sort((a, b) => b.envios - a.envios);

    const metricasPlantillas = Object.entries(templatesMap)
      .map(([template_id, t]) => ({
        template_id,
        nombre: t.nombre,
        envios: t.total,
        confirmados: t.confirmados,
        respondidos: t.respondidos,
        tasa_respuesta: tasa(t.respondidos, t.total),
        tasa_confirmacion: tasa(t.confirmados, t.total),
      }))
      .sort((a, b) => b.tasa_respuesta - a.tasa_respuesta || b.envios - a.envios);

    return {
      data: {
        periodo,
        desde,
        totales: {
          envios: totalEnvios,
          confirmados: totalConfirmados,
          respondidos: totalRespondidos,
          tasa_respuesta: tasa(totalRespondidos, totalEnvios),
          tasa_confirmacion: tasa(totalConfirmados, totalEnvios),
        },
        tendenciaMensajes,
        distribucionEstados,
        rankingVendedores,
        metricasPlantillas,
      },
      error: null,
    };
  } catch (error) {
    console.error("Error obteniendo analytics:", error);
    return { data: null, error: "Error desconocido" };
  }
}

// =====================================================
// SNIPPETS REUTILIZABLES
// =====================================================

const SLUG_REGEX = /^[a-z][a-z0-9_-]{1,40}$/;

export async function obtenerSnippets() {
  try {
    const supabase = await createServerOnlyClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "No autorizado" };

    const { data, error } = await supabase
      .schema("crm")
      .from("marketing_snippet")
      .select("*")
      .is("eliminado_at", null)
      .order("slug", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: data as MarketingSnippet[], error: null };
  } catch (error) {
    console.error("Error obteniendo snippets:", error);
    return { data: null, error: "Error desconocido" };
  }
}

export async function crearSnippet(params: {
  slug: string;
  nombre: string;
  contenido: string;
  descripcion?: string;
}) {
  try {
    const supabase = await createServerOnlyClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "No autorizado" };

    const isAdmin = await esAdmin();
    if (!isAdmin) return { data: null, error: "Solo administradores" };

    if (!SLUG_REGEX.test(params.slug)) {
      return {
        data: null,
        error: "Slug inválido. Use letras minúsculas, números, _ o -. Empieza con letra.",
      };
    }
    if (!params.nombre.trim() || !params.contenido.trim()) {
      return { data: null, error: "Nombre y contenido son obligatorios" };
    }

    const { data, error } = await supabase
      .schema("crm")
      .from("marketing_snippet")
      .insert({
        slug: params.slug,
        nombre: params.nombre.trim(),
        contenido: params.contenido,
        descripcion: params.descripcion?.trim() || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      const msg = error.code === "23505"
        ? `El slug "${params.slug}" ya está en uso.`
        : error.message;
      return { data: null, error: msg };
    }

    revalidatePath("/dashboard/admin/marketing");
    return { data: data as MarketingSnippet, error: null };
  } catch (error) {
    console.error("Error creando snippet:", error);
    return { data: null, error: "Error desconocido" };
  }
}

export async function actualizarSnippet(
  id: string,
  params: Partial<{ nombre: string; contenido: string; descripcion: string }>,
) {
  try {
    const supabase = await createServerOnlyClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "No autorizado" };

    const isAdmin = await esAdmin();
    if (!isAdmin) return { data: null, error: "Solo administradores" };

    const updates: Record<string, unknown> = {};
    if (params.nombre !== undefined) updates.nombre = params.nombre.trim();
    if (params.contenido !== undefined) updates.contenido = params.contenido;
    if (params.descripcion !== undefined) updates.descripcion = params.descripcion.trim() || null;

    const { data, error } = await supabase
      .schema("crm")
      .from("marketing_snippet")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath("/dashboard/admin/marketing");
    return { data: data as MarketingSnippet, error: null };
  } catch (error) {
    console.error("Error actualizando snippet:", error);
    return { data: null, error: "Error desconocido" };
  }
}

export async function eliminarSnippet(id: string) {
  try {
    const supabase = await createServerOnlyClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autorizado" };

    const isAdmin = await esAdmin();
    if (!isAdmin) return { success: false, error: "Solo administradores" };

    const { error } = await supabase
      .schema("crm")
      .from("marketing_snippet")
      .update({ eliminado_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/admin/marketing");
    return { success: true, error: null };
  } catch (error) {
    console.error("Error eliminando snippet:", error);
    return { success: false, error: "Error desconocido" };
  }
}
