"use server";

import { createServerOnlyClient } from "@/lib/supabase.server";
import { esAdmin } from "@/lib/permissions/server";
import { revalidatePath } from "next/cache";
import {
  renderTemplate,
  extractVariables,
  normalizeWhatsAppPhone,
  buildWhatsAppUrl,
} from "@/lib/marketing/whatsapp";
import type {
  MarketingTemplate,
  MarketingCampana,
  MarketingAudiencia,
  MarketingEnvioLog,
  EstadisticasMarketing,
  EstadoCampana,
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

    const { count: campanasCount, error: countError } = await supabase
      .schema("crm")
      .from("marketing_campana")
      .select("id", { count: "exact", head: true })
      .eq("template_id", id);

    if (countError) return { success: false, error: countError.message };

    if ((campanasCount ?? 0) > 0) {
      return {
        success: false,
        error: `No se puede eliminar: ${campanasCount} campaña${campanasCount === 1 ? "" : "s"} usa${campanasCount === 1 ? "" : "n"} esta plantilla. Elimina esas campañas primero.`,
      };
    }

    const { error } = await supabase
      .schema("crm")
      .from("marketing_template")
      .delete()
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
// AUDIENCIAS
// =====================================================

interface FiltrosAudiencia {
  estados?: string[];
  proyectoId?: string;
  capacidadMin?: number;
  capacidadMax?: number;
  diasSinContacto?: number;
  soloConWhatsApp?: boolean;
}

export async function obtenerAudiencias() {
  try {
    const supabase = await createServerOnlyClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "No autorizado" };

    const { data, error } = await supabase
      .schema("crm")
      .from("marketing_audiencia")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return { data: null, error: error.message };

    return { data: data as MarketingAudiencia[], error: null };
  } catch (error) {
    console.error("Error obteniendo audiencias:", error);
    return { data: null, error: "Error desconocido" };
  }
}

export async function calcularAudiencia(filtros: FiltrosAudiencia) {
  try {
    const supabase = await createServerOnlyClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "No autorizado" };

    let query = supabase
      .from("cliente")
      .select("id, nombre, telefono_whatsapp, whatsapp_opt_out")
      .eq("whatsapp_opt_out", false);

    if (filtros.estados?.length) {
      query = query.in("estado_cliente", filtros.estados);
    }
    if (filtros.proyectoId) {
      query = query.eq("proyecto_interes_id", filtros.proyectoId);
    }
    if (filtros.capacidadMin != null) {
      query = query.gte("capacidad_compra_estimada", filtros.capacidadMin);
    }
    if (filtros.capacidadMax != null) {
      query = query.lte("capacidad_compra_estimada", filtros.capacidadMax);
    }
    if (filtros.diasSinContacto != null) {
      const fechaLimite = new Date(
        Date.now() - filtros.diasSinContacto * 24 * 60 * 60 * 1000,
      ).toISOString();
      query = query.lt("ultimo_contacto", fechaLimite);
    }
    if (filtros.soloConWhatsApp) {
      query = query.not("telefono_whatsapp", "is", null);
    }

    const { data, error } = await query.limit(500);
    if (error) return { data: null, error: error.message };

    return {
      data: {
        count: data?.length ?? 0,
        preview: (data ?? []).slice(0, 5).map((c) => c.nombre),
        ids: (data ?? []).map((c) => c.id),
      },
      error: null,
    };
  } catch (error) {
    console.error("Error calculando audiencia:", error);
    return { data: null, error: "Error desconocido" };
  }
}

export async function crearAudiencia(params: {
  nombre: string;
  descripcion?: string;
  tipo: "DINAMICO" | "ESTATICO";
  filtros?: FiltrosAudiencia;
  contactosIds?: string[];
}) {
  try {
    const supabase = await createServerOnlyClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "No autorizado" };

    const isAdmin = await esAdmin();
    if (!isAdmin) return { data: null, error: "Solo administradores" };

    let contactosIds = params.contactosIds ?? [];
    let contactosCount = contactosIds.length;

    if (params.tipo === "DINAMICO" && params.filtros) {
      const resultado = await calcularAudiencia(params.filtros);
      if (resultado.data) {
        contactosIds = resultado.data.ids;
        contactosCount = resultado.data.count;
      }
    }

    const { data, error } = await supabase
      .schema("crm")
      .from("marketing_audiencia")
      .insert({
        nombre: params.nombre,
        descripcion: params.descripcion ?? null,
        tipo: params.tipo,
        filtros: params.filtros ?? null,
        contactos_ids: contactosIds,
        contactos_count: contactosCount,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath("/dashboard/admin/marketing");
    return { data: data as MarketingAudiencia, error: null };
  } catch (error) {
    console.error("Error creando audiencia:", error);
    return { data: null, error: "Error desconocido" };
  }
}

export async function sincronizarAudiencia(audienciaId: string) {
  try {
    const supabase = await createServerOnlyClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autorizado" };

    const { data: audiencia } = await supabase
      .schema("crm")
      .from("marketing_audiencia")
      .select("tipo, filtros")
      .eq("id", audienciaId)
      .maybeSingle();

    if (!audiencia || audiencia.tipo !== "DINAMICO") {
      return {
        success: false,
        error: "Solo se pueden sincronizar audiencias dinámicas",
      };
    }

    const resultado = await calcularAudiencia(audiencia.filtros ?? {});
    if (!resultado.data) return { success: false, error: resultado.error };

    const { error } = await supabase
      .schema("crm")
      .from("marketing_audiencia")
      .update({
        contactos_ids: resultado.data.ids,
        contactos_count: resultado.data.count,
        updated_at: new Date().toISOString(),
      })
      .eq("id", audienciaId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/admin/marketing");
    return { success: true, error: null };
  } catch (error) {
    console.error("Error sincronizando audiencia:", error);
    return { success: false, error: "Error desconocido" };
  }
}

export async function eliminarAudiencia(id: string) {
  try {
    const supabase = await createServerOnlyClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autorizado" };

    const isAdmin = await esAdmin();
    if (!isAdmin) return { success: false, error: "Solo administradores" };

    const { count: campanasCount, error: countError } = await supabase
      .schema("crm")
      .from("marketing_campana")
      .select("id", { count: "exact", head: true })
      .eq("audiencia_id", id);

    if (countError) return { success: false, error: countError.message };

    if ((campanasCount ?? 0) > 0) {
      return {
        success: false,
        error: `No se puede eliminar: ${campanasCount} campaña${campanasCount === 1 ? "" : "s"} usa${campanasCount === 1 ? "" : "n"} esta audiencia. Elimina o reasigna esas campañas primero.`,
      };
    }

    const { error } = await supabase
      .schema("crm")
      .from("marketing_audiencia")
      .delete()
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/admin/marketing");
    return { success: true, error: null };
  } catch (error) {
    console.error("Error eliminando audiencia:", error);
    return { success: false, error: "Error desconocido" };
  }
}

// =====================================================
// CAMPAÑAS
// =====================================================

export async function obtenerCampanas() {
  try {
    const supabase = await createServerOnlyClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "No autorizado" };

    const { data, error } = await supabase
      .schema("crm")
      .from("marketing_campana")
      .select(
        "*, template:template_id(id, nombre, body_texto, variables), audiencia:audiencia_id(id, nombre, contactos_count)",
      )
      .order("created_at", { ascending: false });

    if (error) return { data: null, error: error.message };

    return { data: data as MarketingCampana[], error: null };
  } catch (error) {
    console.error("Error obteniendo campañas:", error);
    return { data: null, error: "Error desconocido" };
  }
}

export async function crearCampana(campana: Partial<MarketingCampana>) {
  try {
    const supabase = await createServerOnlyClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "No autorizado" };

    const isAdmin = await esAdmin();
    if (!isAdmin) return { data: null, error: "Solo administradores pueden crear campañas" };

    if (!campana.nombre || !campana.template_id || !campana.audiencia_id) {
      return {
        data: null,
        error: "Nombre, plantilla y audiencia son obligatorios",
      };
    }

    const { data, error } = await supabase
      .schema("crm")
      .from("marketing_campana")
      .insert({
        nombre: campana.nombre,
        descripcion: campana.descripcion ?? null,
        template_id: campana.template_id,
        audiencia_id: campana.audiencia_id,
        variables_valores: campana.variables_valores ?? {},
        objetivo: campana.objetivo ?? null,
        utm_source: campana.utm_source ?? null,
        utm_medium: campana.utm_medium ?? null,
        utm_campaign: campana.utm_campaign ?? null,
        fecha_inicio: campana.fecha_inicio ?? null,
        fecha_fin: campana.fecha_fin ?? null,
        enviar_inmediatamente: campana.enviar_inmediatamente ?? false,
        estado: campana.estado ?? "DRAFT",
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath("/dashboard/admin/marketing");
    return { data: data as MarketingCampana, error: null };
  } catch (error) {
    console.error("Error creando campaña:", error);
    return { data: null, error: "Error desconocido" };
  }
}

export async function actualizarEstadoCampana(
  id: string,
  estado: EstadoCampana,
) {
  try {
    const supabase = await createServerOnlyClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autorizado" };

    const isAdmin = await esAdmin();
    if (!isAdmin) return { success: false, error: "Solo administradores pueden cambiar estado de campañas" };

    const updates: Record<string, unknown> = { estado };
    if (estado === "COMPLETED") {
      updates.completado_at = new Date().toISOString();
    }

    const { error } = await supabase
      .schema("crm")
      .from("marketing_campana")
      .update(updates)
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/admin/marketing");
    return { success: true, error: null };
  } catch (error) {
    console.error("Error actualizando estado campaña:", error);
    return { success: false, error: "Error desconocido" };
  }
}

export async function eliminarCampana(id: string) {
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
      .from("marketing_campana")
      .delete()
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/admin/marketing");
    return { success: true, error: null };
  } catch (error) {
    console.error("Error eliminando campaña:", error);
    return { success: false, error: "Error desconocido" };
  }
}

export async function obtenerContactosCampana(campanaId: string) {
  try {
    const supabase = await createServerOnlyClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "No autorizado" };

    const { data: campana, error: errCamp } = await supabase
      .schema("crm")
      .from("marketing_campana")
      .select("audiencia_id, template_id, variables_valores")
      .eq("id", campanaId)
      .maybeSingle();

    if (errCamp || !campana) {
      return { data: null, error: errCamp?.message ?? "Campaña no encontrada" };
    }

    const { data: audiencia } = await supabase
      .schema("crm")
      .from("marketing_audiencia")
      .select("contactos_ids")
      .eq("id", campana.audiencia_id)
      .maybeSingle();

    const ids = (audiencia?.contactos_ids ?? []) as string[];
    if (ids.length === 0) {
      return { data: { contactos: [], campana }, error: null };
    }

    const { data: contactos, error: errCon } = await supabase
      .from("cliente")
      .select(
        "id, nombre, telefono_whatsapp, telefono, email, estado_cliente, whatsapp_opt_out",
      )
      .in("id", ids)
      .eq("whatsapp_opt_out", false);

    if (errCon) return { data: null, error: errCon.message };

    return { data: { contactos: contactos ?? [], campana }, error: null };
  } catch (error) {
    console.error("Error obteniendo contactos campaña:", error);
    return { data: null, error: "Error desconocido" };
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
  campanaId?: string | null;
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
      .select("body_texto")
      .eq("id", params.templateId)
      .maybeSingle();

    if (errT || !template) {
      return { data: null, error: errT?.message ?? "Plantilla no encontrada" };
    }

    const mensajeRenderizado = renderTemplate(template.body_texto, params.variables);
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
        campana_id: params.campanaId ?? null,
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
  campanaId?: string;
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
        "*, template:template_id(id, nombre, categoria), campana:campana_id(id, nombre)",
      )
      .order("created_at", { ascending: false })
      .limit(filtros?.limit ?? 200);

    if (vendedorIdFilter) query = query.eq("vendedor_id", vendedorIdFilter);
    if (filtros?.templateId) query = query.eq("template_id", filtros.templateId);
    if (filtros?.clienteId) query = query.eq("cliente_id", filtros.clienteId);
    if (filtros?.campanaId) query = query.eq("campana_id", filtros.campanaId);
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

export async function obtenerEnviosCampana(campanaId: string) {
  return listarHistorialEnvios({ campanaId, limit: 1000 });
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
      { count: campanasActivas },
      { count: enviosHoy },
      { count: enviosSemana },
      { count: marcadosEnviadosHoy },
      { count: respondidosHoy },
    ] = await Promise.all([
      supabase
        .schema("crm")
        .from("marketing_campana")
        .select("id", { count: "exact", head: true })
        .in("estado", ["RUNNING", "SCHEDULED"]),
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
        campanas_activas: campanasActivas ?? 0,
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

export async function obtenerAnalyticsMarketing() {
  try {
    const supabase = await createServerOnlyClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "No autorizado" };

    const desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: campanas } = await supabase
      .schema("crm")
      .from("marketing_campana")
      .select(
        "nombre, total_abiertos, total_marcados_enviados, total_respondidos, total_descartados, completado_at",
      )
      .order("created_at", { ascending: false })
      .limit(10);

    const { data: enviosPorDia } = await supabase
      .schema("crm")
      .from("marketing_envio_log")
      .select("created_at, estado")
      .gte("created_at", desde);

    const tendenciaMap: Record<string, number> = {};
    const distribucionMap: Record<string, number> = {};
    for (const env of enviosPorDia ?? []) {
      const dia = (env.created_at as string).slice(0, 10);
      tendenciaMap[dia] = (tendenciaMap[dia] ?? 0) + 1;
      distribucionMap[env.estado as string] =
        (distribucionMap[env.estado as string] ?? 0) + 1;
    }

    const tendenciaMensajes = Object.entries(tendenciaMap)
      .map(([fecha, cantidad]) => ({ fecha, cantidad }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    const distribucionEstados = Object.entries(distribucionMap).map(
      ([estado, valor]) => ({ estado, valor }),
    );

    return {
      data: {
        metricasCampanas: (campanas ?? []).map((c) => ({
          nombre:
            c.nombre.length > 20 ? c.nombre.slice(0, 20) + "…" : c.nombre,
          abiertos: c.total_abiertos ?? 0,
          enviados: c.total_marcados_enviados ?? 0,
          respondidos: c.total_respondidos ?? 0,
          descartados: c.total_descartados ?? 0,
        })),
        tendenciaMensajes,
        distribucionEstados,
      },
      error: null,
    };
  } catch (error) {
    console.error("Error obteniendo analytics:", error);
    return { data: null, error: "Error desconocido" };
  }
}
