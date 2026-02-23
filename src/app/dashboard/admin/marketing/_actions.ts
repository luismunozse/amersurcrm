"use server";

import { createServerOnlyClient } from "@/lib/supabase.server";
import { esAdmin } from "@/lib/permissions/server";
import { revalidatePath } from "next/cache";
import type {
  MarketingTemplate,
  MarketingCampana,
  MarketingConversacion,
  MarketingAudiencia,
  MarketingChannelCredential,
  EstadisticasMarketing,
  EstadoCampana,
  EstadoConversacion,
  MarketingAutomatizacion,
  MarketingMensaje,
} from "@/types/whatsapp-marketing";

type VerificarCredencialesResult =
  | { tieneCredenciales: false; error: string }
  | { tieneCredenciales: true; proveedor: string; origen: 'database'; sandbox: boolean; updatedAt: string | null }
  | { tieneCredenciales: true; proveedor: string; origen: 'env' };

// =====================================================
// CREDENCIALES TWILIO
// =====================================================

export async function verificarCredencialesWhatsApp(): Promise<VerificarCredencialesResult> {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { tieneCredenciales: false, error: "No autorizado" };
    }

    const { data: credencialDb } = await supabase
      .schema('crm')
      .from('marketing_channel_credential')
      .select('provider, account_sid, auth_token, access_token, whatsapp_from, es_sandbox, updated_at')
      .eq('canal_tipo', 'whatsapp')
      .eq('provider', 'twilio')
      .eq('activo', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (
      credencialDb &&
      credencialDb.account_sid &&
      (credencialDb.auth_token || credencialDb.access_token) &&
      credencialDb.whatsapp_from
    ) {
      return {
        tieneCredenciales: true,
        proveedor: 'twilio',
        origen: 'database',
        sandbox: credencialDb.es_sandbox ?? true,
        updatedAt: credencialDb.updated_at ?? null,
      };
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID ?? "";
    const authToken = process.env.TWILIO_AUTH_TOKEN ?? "";
    const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM ?? "";

    const tieneCredenciales =
      accountSid.length > 10 &&
      authToken.length > 10 &&
      Boolean(whatsappFrom);

    if (!tieneCredenciales) {
      return {
        tieneCredenciales: false,
        error: "No hay credenciales activas. Configúralas en la pestaña Configuración."
      };
    }

    return {
      tieneCredenciales: true,
      proveedor: 'twilio',
      origen: 'env'
    };
  } catch (error) {
    console.error('Error verificando credenciales de Twilio:', error);
    return { tieneCredenciales: false, error: 'Error desconocido' };
  }
}

// =====================================================
// PLANTILLAS
// =====================================================

export async function obtenerPlantillas() {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "No autorizado" };
    }

    const { data, error } = await supabase
      .schema('crm')
      .from('marketing_template')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo plantillas:', error);
      return { data: null, error: error.message };
    }

    return { data: data as MarketingTemplate[], error: null };
  } catch (error) {
    console.error('Error obteniendo plantillas:', error);
    return { data: null, error: 'Error desconocido' };
  }
}

export async function crearPlantilla(plantilla: Partial<MarketingTemplate>) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "No autorizado" };
    }

    const isAdminUser = await esAdmin();
    if (!isAdminUser) {
      return { data: null, error: "No tienes permisos de administrador" };
    }

    const { data, error } = await supabase
      .schema('crm')
      .from('marketing_template')
      .insert({
        ...plantilla,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creando plantilla:', error);
      return { data: null, error: error.message };
    }

    revalidatePath('/dashboard/admin/marketing');
    return { data: data as MarketingTemplate, error: null };
  } catch (error) {
    console.error('Error creando plantilla:', error);
    return { data: null, error: 'Error desconocido' };
  }
}

export async function actualizarPlantilla(id: string, plantilla: Partial<MarketingTemplate>) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "No autorizado" };
    }

    const isAdminUser = await esAdmin();
    if (!isAdminUser) {
      return { data: null, error: "No tienes permisos de administrador" };
    }

    const { data, error } = await supabase
      .schema('crm')
      .from('marketing_template')
      .update(plantilla)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error actualizando plantilla:', error);
      return { data: null, error: error.message };
    }

    revalidatePath('/dashboard/admin/marketing');
    return { data: data as MarketingTemplate, error: null };
  } catch (error) {
    console.error('Error actualizando plantilla:', error);
    return { data: null, error: 'Error desconocido' };
  }
}

export async function eliminarPlantilla(id: string) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "No autorizado" };
    }

    const isAdminUser = await esAdmin();
    if (!isAdminUser) {
      return { success: false, error: "No tienes permisos de administrador" };
    }

    const { error } = await supabase
      .schema('crm')
      .from('marketing_template')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error eliminando plantilla:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/admin/marketing');
    return { success: true, error: null };
  } catch (error) {
    console.error('Error eliminando plantilla:', error);
    return { success: false, error: 'Error desconocido' };
  }
}

// =====================================================
// CAMPAÑAS
// =====================================================

export async function obtenerCampanas() {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "No autorizado" };
    }

    const { data, error } = await supabase
      .schema('crm')
      .from('marketing_campana')
      .select(`
        *,
        template:template_id (id, nombre, categoria),
        audiencia:audiencia_id (id, nombre, contactos_count)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo campañas:', error);
      return { data: null, error: error.message };
    }

    return { data: data as MarketingCampana[], error: null };
  } catch (error) {
    console.error('Error obteniendo campañas:', error);
    return { data: null, error: 'Error desconocido' };
  }
}

export async function crearCampana(campana: Partial<MarketingCampana>) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "No autorizado" };
    }

    const isAdminUser = await esAdmin();
    if (!isAdminUser) {
      return { data: null, error: "No tienes permisos de administrador" };
    }

    // Si no tiene audiencia_id, crear una audiencia temporal
    let audienciaId = campana.audiencia_id;

    if (!audienciaId) {
      const { data: audiencia, error: audienciaError } = await supabase
        .schema('crm')
        .from('marketing_audiencia')
        .insert({
          nombre: `Audiencia - ${campana.nombre}`,
          descripcion: 'Audiencia creada automáticamente',
          tipo: 'ESTATICO',
          filtros: {},
          contactos_ids: [],
          contactos_count: 0,
          activo: true,
          created_by: user.id
        })
        .select('id')
        .single();

      if (audienciaError) {
        console.error('Error creando audiencia:', audienciaError);
        return { data: null, error: `Error creando audiencia: ${audienciaError.message}` };
      }

      audienciaId = audiencia.id;
    }

    const { data, error } = await supabase
      .schema('crm')
      .from('marketing_campana')
      .insert({
        ...campana,
        audiencia_id: audienciaId,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creando campaña:', error);
      return { data: null, error: error.message };
    }

    revalidatePath('/dashboard/admin/marketing');
    return { data: data as MarketingCampana, error: null };
  } catch (error) {
    console.error('Error creando campaña:', error);
    return { data: null, error: 'Error desconocido' };
  }
}

export async function actualizarEstadoCampana(id: string, estado: EstadoCampana) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "No autorizado" };
    }

    const isAdminUser = await esAdmin();
    if (!isAdminUser) {
      return { success: false, error: "No tienes permisos de administrador" };
    }

    const updateData: any = { estado };
    if (estado === 'COMPLETED') {
      updateData.completado_at = new Date().toISOString();
    }

    const { error } = await supabase
      .schema('crm')
      .from('marketing_campana')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error actualizando estado de campaña:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/admin/marketing');
    return { success: true, error: null };
  } catch (error) {
    console.error('Error actualizando estado de campaña:', error);
    return { success: false, error: 'Error desconocido' };
  }
}

export async function eliminarCampana(id: string) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "No autorizado" };
    }

    const isAdminUser = await esAdmin();
    if (!isAdminUser) {
      return { success: false, error: "No tienes permisos de administrador" };
    }

    const { error } = await supabase
      .schema('crm')
      .from('marketing_campana')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error eliminando campaña:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/admin/marketing');
    return { success: true, error: null };
  } catch (error) {
    console.error('Error eliminando campaña:', error);
    return { success: false, error: 'Error desconocido' };
  }
}

// =====================================================
// CONVERSACIONES
// =====================================================

export async function obtenerConversaciones(filtros?: {
  estado?: EstadoConversacion;
  vendedor?: string;
}) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "No autorizado" };
    }

    let query = supabase
      .schema('crm')
      .from('marketing_conversacion')
      .select(`
        *,
        cliente:cliente_id (id, nombre, email, telefono)
      `)
      .order('updated_at', { ascending: false });

    if (filtros?.estado) {
      query = query.eq('estado', filtros.estado);
    }

    if (filtros?.vendedor) {
      query = query.eq('vendedor_asignado', filtros.vendedor);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error obteniendo conversaciones:', error);
      return { data: null, error: error.message };
    }

    return { data: data as MarketingConversacion[], error: null };
  } catch (error) {
    console.error('Error obteniendo conversaciones:', error);
    return { data: null, error: 'Error desconocido' };
  }
}

export async function asignarVendedorConversacion(conversacionId: string, vendedorUsername: string) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "No autorizado" };
    }

    const { error } = await supabase
      .schema('crm')
      .from('marketing_conversacion')
      .update({
        vendedor_asignado: vendedorUsername,
        fecha_asignacion: new Date().toISOString()
      })
      .eq('id', conversacionId);

    if (error) {
      console.error('Error asignando vendedor:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/admin/marketing');
    return { success: true, error: null };
  } catch (error) {
    console.error('Error asignando vendedor:', error);
    return { success: false, error: 'Error desconocido' };
  }
}

// =====================================================
// AUDIENCIAS
// =====================================================

export async function obtenerAudiencias() {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "No autorizado" };
    }

    const { data, error } = await supabase
      .schema('crm')
      .from('marketing_audiencia')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo audiencias:', error);
      return { data: null, error: error.message };
    }

    return { data: data as MarketingAudiencia[], error: null };
  } catch (error) {
    console.error('Error obteniendo audiencias:', error);
    return { data: null, error: 'Error desconocido' };
  }
}

// =====================================================
// CREDENCIALES
// =====================================================

export async function obtenerCredenciales() {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "No autorizado" };
    }

    const isAdminUser = await esAdmin();
    if (!isAdminUser) {
      return { data: null, error: "No tienes permisos de administrador" };
    }

    const { data, error } = await supabase
      .schema('crm')
      .from('marketing_channel_credential')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo credenciales:', error);
      return { data: null, error: error.message };
    }

    return { data: data as MarketingChannelCredential[], error: null };
  } catch (error) {
    console.error('Error obteniendo credenciales:', error);
    return { data: null, error: 'Error desconocido' };
  }
}

// =====================================================
// ESTADÍSTICAS
// =====================================================

export async function obtenerEstadisticasMarketing(): Promise<{ data: EstadisticasMarketing | null; error: string | null }> {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "No autorizado" };
    }

    // Campañas activas
    const { data: campanasActivas } = await supabase
      .schema('crm')
      .from('marketing_campana')
      .select('id')
      .in('estado', ['RUNNING', 'SCHEDULED']);

    // Mensajes enviados hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const { data: mensajesHoy } = await supabase
      .schema('crm')
      .from('marketing_mensaje')
      .select('id')
      .eq('direccion', 'OUT')
      .gte('created_at', hoy.toISOString());

    // Conversaciones abiertas
    const { data: conversacionesAbiertas } = await supabase
      .schema('crm')
      .from('marketing_conversacion')
      .select('id')
      .eq('estado', 'ABIERTA');

    // Tasa de respuesta promedio (últimos 30 días)
    const treintaDiasAtras = new Date();
    treintaDiasAtras.setDate(treintaDiasAtras.getDate() - 30);

    const { data: mensajesOut } = await supabase
      .schema('crm')
      .from('marketing_mensaje')
      .select('conversacion_id')
      .eq('direccion', 'OUT')
      .gte('created_at', treintaDiasAtras.toISOString());

    const { data: mensajesIn } = await supabase
      .schema('crm')
      .from('marketing_mensaje')
      .select('conversacion_id')
      .eq('direccion', 'IN')
      .gte('created_at', treintaDiasAtras.toISOString());

    const conversacionesConRespuesta = new Set(mensajesIn?.map(m => m.conversacion_id) || []);
    const totalConversaciones = new Set(mensajesOut?.map(m => m.conversacion_id) || []).size;
    const tasaRespuesta = totalConversaciones > 0 
      ? (conversacionesConRespuesta.size / totalConversaciones) * 100 
      : 0;

    // Tiempo promedio de respuesta
    const { data: conversacionesConTiempo } = await supabase
      .schema('crm')
      .from('marketing_conversacion')
      .select('tiempo_primera_respuesta_segundos')
      .not('tiempo_primera_respuesta_segundos', 'is', null);

    const tiempoPromedio = conversacionesConTiempo && conversacionesConTiempo.length > 0
      ? conversacionesConTiempo.reduce((sum, c) => sum + (c.tiempo_primera_respuesta_segundos || 0), 0) / conversacionesConTiempo.length
      : 0;

    // Conversiones del mes
    const primerDiaMes = new Date();
    primerDiaMes.setDate(1);
    primerDiaMes.setHours(0, 0, 0, 0);

    const { data: campanasMes } = await supabase
      .schema('crm')
      .from('marketing_campana')
      .select('total_conversiones')
      .gte('created_at', primerDiaMes.toISOString());

    const conversionesMes = campanasMes?.reduce((sum, c) => sum + (c.total_conversiones || 0), 0) || 0;

    const estadisticas: EstadisticasMarketing = {
      campanas_activas: campanasActivas?.length || 0,
      mensajes_enviados_hoy: mensajesHoy?.length || 0,
      conversaciones_abiertas: conversacionesAbiertas?.length || 0,
      tasa_respuesta_promedio: Math.round(tasaRespuesta * 100) / 100,
      tiempo_respuesta_promedio_segundos: Math.round(tiempoPromedio),
      conversiones_mes: conversionesMes
    };

    return { data: estadisticas, error: null };
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return { data: null, error: 'Error desconocido' };
  }
}

// =====================================================
// AUTOMATIZACIONES
// =====================================================

export async function obtenerAutomatizaciones() {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "No autorizado" };
    }

    const { data, error } = await supabase
      .schema('crm')
      .from('marketing_automatizacion')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo automatizaciones:', error);
      return { data: null, error: error.message };
    }

    return { data: data as MarketingAutomatizacion[], error: null };
  } catch (error) {
    console.error('Error obteniendo automatizaciones:', error);
    return { data: null, error: 'Error desconocido' };
  }
}

export async function crearAutomatizacion(automatizacion: Partial<MarketingAutomatizacion>) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "No autorizado" };
    }

    const isAdminUser = await esAdmin();
    if (!isAdminUser) {
      return { data: null, error: "No tienes permisos de administrador" };
    }

    const { data, error } = await supabase
      .schema('crm')
      .from('marketing_automatizacion')
      .insert({
        ...automatizacion,
        created_by: user.id,
        total_ejecutadas: 0,
        total_completadas: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creando automatización:', error);
      return { data: null, error: error.message };
    }

    revalidatePath('/dashboard/admin/marketing');
    return { data: data as MarketingAutomatizacion, error: null };
  } catch (error) {
    console.error('Error creando automatización:', error);
    return { data: null, error: 'Error desconocido' };
  }
}

export async function actualizarEstadoAutomatizacion(id: string, activo: boolean) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "No autorizado" };
    }

    const isAdminUser = await esAdmin();
    if (!isAdminUser) {
      return { success: false, error: "No tienes permisos de administrador" };
    }

    const { error } = await supabase
      .schema('crm')
      .from('marketing_automatizacion')
      .update({ activo })
      .eq('id', id);

    if (error) {
      console.error('Error actualizando automatización:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/admin/marketing');
    return { success: true, error: null };
  } catch (error) {
    console.error('Error actualizando automatización:', error);
    return { success: false, error: 'Error desconocido' };
  }
}

export async function eliminarAutomatizacion(id: string) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "No autorizado" };
    }

    const isAdminUser = await esAdmin();
    if (!isAdminUser) {
      return { success: false, error: "No tienes permisos de administrador" };
    }

    const { error } = await supabase
      .schema('crm')
      .from('marketing_automatizacion')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error eliminando automatización:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/admin/marketing');
    return { success: true, error: null };
  } catch (error) {
    console.error('Error eliminando automatización:', error);
    return { success: false, error: 'Error desconocido' };
  }
}

// =====================================================
// ESTADO DE CONVERSACIÓN
// =====================================================

export async function actualizarEstadoConversacion(id: string, estado: EstadoConversacion) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "No autorizado" };
    }

    const updateData: Record<string, unknown> = { estado };
    if (estado === 'CERRADA') {
      updateData.closed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .schema('crm')
      .from('marketing_conversacion')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error actualizando conversación:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/admin/marketing');
    return { success: true, error: null };
  } catch (error) {
    console.error('Error actualizando conversación:', error);
    return { success: false, error: 'Error desconocido' };
  }
}

// =====================================================
// MENSAJES DE CONVERSACIÓN
// =====================================================

export async function obtenerMensajesConversacion(conversacionId: string) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "No autorizado" };
    }

    const { data, error } = await supabase
      .schema('crm')
      .from('marketing_mensaje')
      .select('*')
      .eq('conversacion_id', conversacionId)
      .order('created_at', { ascending: true })
      .limit(200);

    if (error) {
      console.error('Error obteniendo mensajes:', error);
      return { data: null, error: error.message };
    }

    return { data: data as MarketingMensaje[], error: null };
  } catch (error) {
    console.error('Error obteniendo mensajes:', error);
    return { data: null, error: 'Error desconocido' };
  }
}

// =====================================================
// EQUIPO / VENDEDORES
// =====================================================

export async function obtenerVendedores() {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "No autorizado" };

    const { data, error } = await supabase
      .from('usuario_perfil')
      .select('username, nombre_completo, rol')
      .in('rol', ['admin', 'vendedor', 'agente'])
      .order('nombre_completo');

    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  } catch (error) {
    console.error('Error obteniendo vendedores:', error);
    return { data: null, error: 'Error desconocido' };
  }
}

// =====================================================
// NOTAS INTERNAS Y OPT-OUT
// =====================================================

export async function actualizarNotasConversacion(id: string, notas: string) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autorizado" };

    const { error } = await supabase
      .schema('crm')
      .from('marketing_conversacion')
      .update({ notas_internas: notas || null })
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (error) {
    console.error('Error actualizando notas:', error);
    return { success: false, error: 'Error desconocido' };
  }
}

export async function toggleOptOut(
  clienteId: string,
  optOut: boolean,
  motivo?: string
) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autorizado" };

    const updateData: Record<string, unknown> = {
      whatsapp_opt_out: optOut,
      whatsapp_opt_out_fecha: optOut ? new Date().toISOString() : null,
    };
    if (motivo !== undefined) {
      updateData.whatsapp_opt_out_motivo = motivo || null;
    }

    const { error } = await supabase
      .from('cliente')
      .update(updateData)
      .eq('id', clienteId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/dashboard/admin/marketing');
    return { success: true, error: null };
  } catch (error) {
    console.error('Error actualizando opt-out:', error);
    return { success: false, error: 'Error desconocido' };
  }
}

// =====================================================
// ANALYTICS / MÉTRICAS (recharts)
// =====================================================

export async function obtenerAnalyticsMarketing() {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "No autorizado" };

    // Campañas con métricas
    const { data: campanas } = await supabase
      .schema('crm')
      .from('marketing_campana')
      .select('nombre, total_enviados, total_entregados, total_leidos, total_respondidos, total_fallidos, completado_at')
      .not('total_enviados', 'is', null)
      .order('completado_at', { ascending: false })
      .limit(10);

    // Mensajes por día (últimos 30 días)
    const desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: mensajesPorDia } = await supabase
      .schema('crm')
      .from('marketing_mensaje')
      .select('created_at, direccion')
      .gte('created_at', desde)
      .eq('direccion', 'outbound');

    // Distribución de conversaciones por estado
    const { data: convsPorEstado } = await supabase
      .schema('crm')
      .from('marketing_conversacion')
      .select('estado');

    // Agrupar mensajes por día
    const mensajesAgrupados: Record<string, number> = {};
    for (const msg of mensajesPorDia ?? []) {
      const dia = msg.created_at.slice(0, 10);
      mensajesAgrupados[dia] = (mensajesAgrupados[dia] ?? 0) + 1;
    }
    const tendenciaMensajes = Object.entries(mensajesAgrupados)
      .map(([fecha, cantidad]) => ({ fecha, cantidad }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    // Agrupar conversaciones por estado
    const estadoConteo: Record<string, number> = {};
    for (const conv of convsPorEstado ?? []) {
      estadoConteo[conv.estado] = (estadoConteo[conv.estado] ?? 0) + 1;
    }
    const distribucionEstados = Object.entries(estadoConteo).map(([estado, valor]) => ({
      estado,
      valor,
    }));

    return {
      data: {
        metricasCampanas: (campanas ?? []).map((c) => ({
          nombre: c.nombre.length > 20 ? c.nombre.slice(0, 20) + '…' : c.nombre,
          enviados: c.total_enviados ?? 0,
          entregados: c.total_entregados ?? 0,
          leidos: c.total_leidos ?? 0,
          respondidos: c.total_respondidos ?? 0,
          fallidos: c.total_fallidos ?? 0,
        })),
        tendenciaMensajes,
        distribucionEstados,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error obteniendo analytics:', error);
    return { data: null, error: 'Error desconocido' };
  }
}

// =====================================================
// ROI — CONVERSIONES
// =====================================================

export async function registrarConversion(
  conversacionId: string,
  monto?: number,
  nota?: string
) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autorizado" };

    const { error } = await supabase
      .schema('crm')
      .from('marketing_conversacion')
      .update({
        conversion_registrada_at: new Date().toISOString(),
        conversion_monto: monto ?? null,
        conversion_nota: nota ?? null,
      })
      .eq('id', conversacionId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/dashboard/admin/marketing');
    return { success: true, error: null };
  } catch (error) {
    console.error('Error registrando conversión:', error);
    return { success: false, error: 'Error desconocido' };
  }
}

export async function obtenerConversionesCampana(campanaId: string) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "No autorizado" };

    // Step 1: get conversation IDs linked to this campaign via messages
    const { data: mensajes, error: errMsg } = await supabase
      .schema('crm')
      .from('marketing_mensaje')
      .select('conversacion_id')
      .eq('campana_id', campanaId)
      .not('conversacion_id', 'is', null);

    if (errMsg) return { data: null, error: errMsg.message };

    const ids = [...new Set((mensajes ?? []).map((m: { conversacion_id: string }) => m.conversacion_id).filter(Boolean))];
    if (ids.length === 0) return { data: [], error: null };

    // Step 2: get conversaciones with conversion registered
    const { data, error } = await supabase
      .schema('crm')
      .from('marketing_conversacion')
      .select('id, conversion_registrada_at, conversion_monto, conversion_nota, cliente:cliente_id(id, nombre, telefono)')
      .in('id', ids)
      .not('conversion_registrada_at', 'is', null)
      .order('conversion_registrada_at', { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  } catch (error) {
    console.error('Error obteniendo conversiones de campaña:', error);
    return { data: null, error: 'Error desconocido' };
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

export async function calcularAudiencia(filtros: FiltrosAudiencia) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "No autorizado" };

    let query = supabase
      .from('cliente')
      .select('id, nombre, telefono_whatsapp, whatsapp_opt_out')
      .eq('whatsapp_opt_out', false);

    if (filtros.estados?.length) {
      query = query.in('estado_cliente', filtros.estados);
    }
    if (filtros.proyectoId) {
      query = query.eq('proyecto_interes_id', filtros.proyectoId);
    }
    if (filtros.capacidadMin != null) {
      query = query.gte('capacidad_compra_estimada', filtros.capacidadMin);
    }
    if (filtros.capacidadMax != null) {
      query = query.lte('capacidad_compra_estimada', filtros.capacidadMax);
    }
    if (filtros.diasSinContacto != null) {
      const fechaLimite = new Date(
        Date.now() - filtros.diasSinContacto * 24 * 60 * 60 * 1000
      ).toISOString();
      query = query.lt('ultimo_contacto', fechaLimite);
    }
    if (filtros.soloConWhatsApp) {
      query = query.not('telefono_whatsapp', 'is', null);
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
    console.error('Error calculando audiencia:', error);
    return { data: null, error: 'Error desconocido' };
  }
}

export async function crearAudiencia(params: {
  nombre: string;
  descripcion?: string;
  tipo: 'DINAMICO' | 'ESTATICO';
  filtros?: FiltrosAudiencia;
  contactosIds?: string[];
}) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "No autorizado" };

    const isAdmin = await esAdmin();
    if (!isAdmin) return { data: null, error: "Solo administradores" };

    let contactosIds = params.contactosIds ?? [];
    let contactosCount = contactosIds.length;

    if (params.tipo === 'DINAMICO' && params.filtros) {
      const resultado = await calcularAudiencia(params.filtros);
      if (resultado.data) {
        contactosIds = resultado.data.ids;
        contactosCount = resultado.data.count;
      }
    }

    const { data, error } = await supabase
      .schema('crm')
      .from('marketing_audiencia')
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

    revalidatePath('/dashboard/admin/marketing');
    return { data: data as MarketingAudiencia, error: null };
  } catch (error) {
    console.error('Error creando audiencia:', error);
    return { data: null, error: 'Error desconocido' };
  }
}

export async function sincronizarAudiencia(audienciaId: string) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autorizado" };

    const { data: audiencia } = await supabase
      .schema('crm')
      .from('marketing_audiencia')
      .select('tipo, filtros')
      .eq('id', audienciaId)
      .maybeSingle();

    if (!audiencia || audiencia.tipo !== 'DINAMICO') {
      return { success: false, error: "Solo se pueden sincronizar audiencias dinámicas" };
    }

    const resultado = await calcularAudiencia(audiencia.filtros ?? {});
    if (!resultado.data) return { success: false, error: resultado.error };

    const { error } = await supabase
      .schema('crm')
      .from('marketing_audiencia')
      .update({
        contactos_ids: resultado.data.ids,
        contactos_count: resultado.data.count,
        updated_at: new Date().toISOString(),
      })
      .eq('id', audienciaId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/dashboard/admin/marketing');
    return { success: true, error: null };
  } catch (error) {
    console.error('Error sincronizando audiencia:', error);
    return { success: false, error: 'Error desconocido' };
  }
}

export async function eliminarAudiencia(id: string) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autorizado" };

    const isAdmin = await esAdmin();
    if (!isAdmin) return { success: false, error: "Solo administradores" };

    const { error } = await supabase
      .schema('crm')
      .from('marketing_audiencia')
      .delete()
      .eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath('/dashboard/admin/marketing');
    return { success: true, error: null };
  } catch (error) {
    console.error('Error eliminando audiencia:', error);
    return { success: false, error: 'Error desconocido' };
  }
}
