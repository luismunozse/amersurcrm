"use server";

import { createServerOnlyClient } from "@/lib/supabase.server";
import { esAdmin } from "@/lib/auth/roles";
import { revalidatePath } from "next/cache";
import type {
  MarketingTemplate,
  MarketingCampana,
  MarketingConversacion,
  MarketingAudiencia,
  MarketingChannelCredential,
  EstadisticasMarketing,
  EstadoCampana,
  EstadoConversacion
} from "@/types/whatsapp-marketing";

// =====================================================
// CREDENCIALES
// =====================================================

export async function verificarCredencialesWhatsApp() {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { tieneCredenciales: false, error: "No autorizado" };
    }

    const { data, error } = await supabase
      .schema('crm')
      .from('marketing_channel_credential')
      .select('id, phone_number_id, access_token, activo')
      .eq('canal_tipo', 'whatsapp')
      .eq('activo', true)
      .single();

    if (error || !data) {
      return { tieneCredenciales: false };
    }

    // Verificar que tenga los campos requeridos
    const tieneCredenciales = !!(
      data.phone_number_id &&
      data.access_token &&
      data.phone_number_id.length > 0 &&
      data.access_token.length > 10
    );

    return { tieneCredenciales, credentialId: data.id };
  } catch (error) {
    console.error('Error verificando credenciales:', error);
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
