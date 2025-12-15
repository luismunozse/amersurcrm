"use server";

import { createServerOnlyClient, getCachedAuthUser } from "@/lib/supabase.server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  Evento,
  EstadoEvento,
} from "@/lib/types/agenda";
import { crearNotificacion } from "@/app/_actionsNotifications";
import { 
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  addDays,
} from "date-fns";

// =====================================================
// MÉTRICAS DE AGENDA
// =====================================================

export async function obtenerMetricasAgenda(): Promise<{
  eventosPendientes: number;
  eventosHoy: number;
  eventosSemana: number;
}> {
  try {
    const supabase = await createServerOnlyClient();
    // Usar función cacheada para evitar rate limits
    const { user } = await getCachedAuthUser();

    if (!user) {
      return { eventosPendientes: 0, eventosHoy: 0, eventosSemana: 0 };
    }

    const ahora = new Date();
    const finHoy = endOfDay(ahora);
    const finSemana = endOfDay(addDays(ahora, 7));

    // Eventos pendientes (programados que aún no han pasado)
    const [pendientesRes, hoyRes, semanaRes] = await Promise.all([
      supabase
        .from('evento')
        .select('id', { count: 'exact', head: true })
        .eq('vendedor_id', user.id)
        .eq('estado', 'programado')
        .gte('fecha_inicio', ahora.toISOString()),
      
      supabase
        .from('evento')
        .select('id', { count: 'exact', head: true })
        .eq('vendedor_id', user.id)
        .eq('estado', 'programado')
        .gte('fecha_inicio', startOfDay(ahora).toISOString())
        .lte('fecha_inicio', finHoy.toISOString()),
      
      supabase
        .from('evento')
        .select('id', { count: 'exact', head: true })
        .eq('vendedor_id', user.id)
        .eq('estado', 'programado')
        .gte('fecha_inicio', ahora.toISOString())
        .lte('fecha_inicio', finSemana.toISOString()),
    ]);

    return {
      eventosPendientes: pendientesRes.count ?? 0,
      eventosHoy: hoyRes.count ?? 0,
      eventosSemana: semanaRes.count ?? 0,
    };
  } catch (error) {
    console.error('Error obteniendo métricas de agenda:', error);
    return { eventosPendientes: 0, eventosHoy: 0, eventosSemana: 0 };
  }
}

// =====================================================
// SCHEMAS DE VALIDACIÓN
// =====================================================

const EventoSchema = z.object({
  titulo: z.string().min(1, "El título es requerido"),
  descripcion: z.string().optional(),
  tipo: z.enum(['cita', 'llamada', 'email', 'visita', 'seguimiento', 'recordatorio', 'tarea']),
  prioridad: z.enum(['baja', 'media', 'alta', 'urgente']),
  fecha_inicio: z.string().min(1, "La fecha de inicio es requerida"),
  fecha_fin: z.string().optional(),
  duracion_minutos: z.number().min(1).max(1440), // Máximo 24 horas
  todo_el_dia: z.boolean().default(false),
  cliente_id: z.string().uuid().optional(),
  propiedad_id: z.string().uuid().optional(),
  ubicacion: z.string().optional(),
  direccion: z.string().optional(),
  recordar_antes_minutos: z.number().min(0).max(10080), // Máximo 7 días
  notificar_email: z.boolean().default(true),
  notificar_push: z.boolean().default(false),
  es_recurrente: z.boolean().default(false),
  patron_recurrencia: z.object({
    tipo: z.enum(['diario', 'semanal', 'mensual']),
    intervalo: z.number().min(1),
    dias_semana: z.array(z.number().min(1).max(7)).optional(),
    fin_fecha: z.string().optional(),
  }).optional(),
  notas: z.string().optional(),
  etiquetas: z.array(z.string()).default([]),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color inválido").default('#3B82F6'),
});

const RecordatorioSchema = z.object({
  titulo: z.string().min(1, "El título es requerido"),
  descripcion: z.string().optional(),
  tipo: z.enum(['seguimiento_cliente', 'llamada_prospecto', 'envio_documentos', 'visita_propiedad', 'reunion_equipo', 'personalizado']),
  prioridad: z.enum(['baja', 'media', 'alta', 'urgente']),
  fecha_recordatorio: z.string().min(1, "La fecha del recordatorio es requerida"),
  cliente_id: z.string().uuid().optional(),
  propiedad_id: z.string().uuid().optional(),
  evento_id: z.string().uuid().optional(),
  notificar_email: z.boolean().default(true),
  notificar_push: z.boolean().default(false),
  notas: z.string().optional(),
  etiquetas: z.array(z.string()).default([]),
});

// =====================================================
// FUNCIONES DE EVENTOS
// =====================================================

type VistaCalendario = 'mes' | 'semana' | 'dia';

export async function obtenerEventos(fecha: Date, vista: VistaCalendario = 'mes'): Promise<Evento[]> {
  try {
    const supabase = await createServerOnlyClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      throw authError;
    }

    if (!user) {
      return [];
    }

    let inicioRango: Date;
    let finRango: Date;

    switch (vista) {
      case 'semana':
        inicioRango = startOfWeek(fecha, { weekStartsOn: 1 });
        finRango = endOfWeek(fecha, { weekStartsOn: 1 });
        break;
      case 'dia':
        inicioRango = startOfDay(fecha);
        finRango = endOfDay(fecha);
        break;
      case 'mes':
      default:
        inicioRango = startOfMonth(fecha);
        finRango = endOfMonth(fecha);
        break;
    }

    const { data, error } = await supabase
      .from('evento')
      .select(`
        id,
        titulo,
        descripcion,
        tipo,
        estado,
        prioridad,
        fecha_inicio,
        fecha_fin,
        duracion_minutos,
        todo_el_dia,
        vendedor_id,
        cliente_id,
        propiedad_id,
        ubicacion,
        direccion,
        recordar_antes_minutos,
        notificar_email,
        notificar_push,
        es_recurrente,
        patron_recurrencia,
        notas,
        etiquetas,
        color,
        created_by,
        created_at,
        updated_at,
        cliente:cliente_id(id, nombre, telefono, email)
      `)
      .eq('vendedor_id', user.id)
      .gte('fecha_inicio', inicioRango.toISOString())
      .lte('fecha_inicio', finRango.toISOString())
      .order('fecha_inicio', { ascending: true })
      .limit(1000);

    if (error) {
      throw error;
    }

    return (data ?? []).map((item) => ({
      ...item,
      descripcion: item.descripcion ?? undefined,
      fecha_fin: item.fecha_fin ?? undefined,
      cliente_id: item.cliente_id ?? undefined,
      propiedad_id: item.propiedad_id ?? undefined,
      ubicacion: item.ubicacion ?? undefined,
      direccion: item.direccion ?? undefined,
      recordar_antes_minutos: item.recordar_antes_minutos ?? 15,
      notificar_email: item.notificar_email ?? true,
      notificar_push: item.notificar_push ?? false,
      es_recurrente: item.es_recurrente ?? false,
      patron_recurrencia: item.patron_recurrencia ?? undefined,
      notas: item.notas ?? undefined,
      etiquetas: item.etiquetas ?? [],
    })) as Evento[];
  } catch (error) {
    console.error('Error obteniendo eventos:', error);
    return [];
  }
}

export async function crearEvento(formData: FormData) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("No autorizado");
    }

    // Validar datos
    const datos = EventoSchema.parse({
      titulo: formData.get("titulo"),
      descripcion: formData.get("descripcion") || undefined,
      tipo: formData.get("tipo"),
      prioridad: formData.get("prioridad"),
      fecha_inicio: formData.get("fecha_inicio"),
      fecha_fin: formData.get("fecha_fin") || undefined,
      duracion_minutos: Number(formData.get("duracion_minutos")) || 60,
      todo_el_dia: formData.get("todo_el_dia") === "true",
      cliente_id: formData.get("cliente_id") || undefined,
      propiedad_id: formData.get("propiedad_id") || undefined,
      ubicacion: formData.get("ubicacion") || undefined,
      direccion: formData.get("direccion") || undefined,
      recordar_antes_minutos: Number(formData.get("recordar_antes_minutos")) || 15,
      notificar_email: formData.get("notificar_email") === "true",
      notificar_push: formData.get("notificar_push") === "true",
      es_recurrente: formData.get("es_recurrente") === "true",
      patron_recurrencia: formData.get("patron_recurrencia") ? JSON.parse(formData.get("patron_recurrencia") as string) : undefined,
      notas: formData.get("notas") || undefined,
      etiquetas: formData.get("etiquetas") ? JSON.parse(formData.get("etiquetas") as string) : [],
      color: formData.get("color") || '#3B82F6',
    });

    // Crear evento
    const { data: evento, error } = await supabase
      .from('evento')
      .insert({
        ...datos,
        vendedor_id: user.id,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error creando evento: ${error.message}`);
    }

    if (evento?.id) {
      try {
        await crearNotificacion(
          user.id,
          "sistema",
          "Nuevo evento agendado",
          `Has creado el evento "${datos.titulo}" para ${new Date(datos.fecha_inicio).toLocaleString("es-PE")}.`,
          { evento_id: evento.id, prioridad: datos.prioridad, tipo: datos.tipo }
        );
      } catch (notifyError) {
        console.warn("No se pudo crear notificación de evento:", notifyError);
      }
    }

    revalidatePath('/dashboard/agenda');
    return { success: true, message: "Evento creado exitosamente", data: evento };

  } catch (error) {
    console.error('Error creando evento:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Error desconocido" 
    };
  }
}

export async function actualizarEvento(eventoId: string, formData: FormData) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("No autorizado");
    }

    // Verificar que el evento pertenece al usuario
    const { data: eventoExistente } = await supabase
      .from('evento')
      .select('vendedor_id')
      .eq('id', eventoId)
      .single();

    if (!eventoExistente || eventoExistente.vendedor_id !== user.id) {
      throw new Error("No tienes permisos para editar este evento");
    }

    // Validar datos
    const datos = EventoSchema.parse({
      titulo: formData.get("titulo"),
      descripcion: formData.get("descripcion") || undefined,
      tipo: formData.get("tipo"),
      prioridad: formData.get("prioridad"),
      fecha_inicio: formData.get("fecha_inicio"),
      fecha_fin: formData.get("fecha_fin") || undefined,
      duracion_minutos: Number(formData.get("duracion_minutos")) || 60,
      todo_el_dia: formData.get("todo_el_dia") === "true",
      cliente_id: formData.get("cliente_id") || undefined,
      propiedad_id: formData.get("propiedad_id") || undefined,
      ubicacion: formData.get("ubicacion") || undefined,
      direccion: formData.get("direccion") || undefined,
      recordar_antes_minutos: Number(formData.get("recordar_antes_minutos")) || 15,
      notificar_email: formData.get("notificar_email") === "true",
      notificar_push: formData.get("notificar_push") === "true",
      es_recurrente: formData.get("es_recurrente") === "true",
      patron_recurrencia: formData.get("patron_recurrencia") ? JSON.parse(formData.get("patron_recurrencia") as string) : undefined,
      notas: formData.get("notas") || undefined,
      etiquetas: formData.get("etiquetas") ? JSON.parse(formData.get("etiquetas") as string) : [],
      color: formData.get("color") || '#3B82F6',
    });

    // Actualizar evento
    const { error } = await supabase
      .from('evento')
      .update(datos)
      .eq('id', eventoId);

    if (error) {
      throw new Error(`Error actualizando evento: ${error.message}`);
    }

    if (datos.titulo) {
      try {
        await crearNotificacion(
          user.id,
          "sistema",
          "Evento actualizado",
          `Actualizaste el evento "${datos.titulo}".`,
          { evento_id: eventoId }
        );
      } catch (notifyError) {
        console.warn("No se pudo crear notificación de actualización de evento:", notifyError);
      }
    }

    revalidatePath('/dashboard/agenda');
    return { success: true, message: "Evento actualizado exitosamente" };

  } catch (error) {
    console.error('Error actualizando evento:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Error desconocido" 
    };
  }
}

export async function eliminarEvento(eventoId: string) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("No autorizado");
    }

    // Verificar que el evento pertenece al usuario
    const { data: eventoExistente } = await supabase
      .from('evento')
      .select('vendedor_id')
      .eq('id', eventoId)
      .single();

    if (!eventoExistente || eventoExistente.vendedor_id !== user.id) {
      throw new Error("No tienes permisos para eliminar este evento");
    }

    // Eliminar evento (los recordatorios se eliminan en cascada)
    const { error } = await supabase
      .from('evento')
      .delete()
      .eq('id', eventoId);

    if (error) {
      throw new Error(`Error eliminando evento: ${error.message}`);
    }

    revalidatePath('/dashboard/agenda');
    return { success: true, message: "Evento eliminado exitosamente" };

  } catch (error) {
    console.error('Error eliminando evento:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Error desconocido" 
    };
  }
}

export async function cambiarEstadoEvento(eventoId: string, nuevoEstado: EstadoEvento) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("No autorizado");
    }

    // Verificar que el evento pertenece al usuario
    const { data: eventoExistente } = await supabase
      .from('evento')
      .select('vendedor_id, titulo')
      .eq('id', eventoId)
      .single();

    if (!eventoExistente || eventoExistente.vendedor_id !== user.id) {
      throw new Error("No tienes permisos para modificar este evento");
    }

    // Actualizar estado
    const { error } = await supabase
      .from('evento')
      .update({ estado: nuevoEstado })
      .eq('id', eventoId);

    if (error) {
      throw new Error(`Error actualizando estado: ${error.message}`);
    }

    // Crear notificación
    if (nuevoEstado === 'completado') {
      try {
        await crearNotificacion(
          user.id,
          "sistema",
          "Evento completado",
          `Has completado el evento "${eventoExistente.titulo}".`,
          { evento_id: eventoId }
        );
      } catch (notifyError) {
        console.warn("No se pudo crear notificación:", notifyError);
      }
    }

    revalidatePath('/dashboard/agenda');
    return { success: true, message: "Estado actualizado exitosamente" };

  } catch (error) {
    console.error('Error actualizando estado:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Error desconocido"
    };
  }
}

export async function reprogramarEvento(
  eventoId: string,
  nuevaFechaInicio: string,
  nuevaFechaFin?: string
) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("No autorizado");
    }

    // Verificar que el evento pertenece al usuario
    const { data: eventoExistente } = await supabase
      .from('evento')
      .select('vendedor_id, titulo')
      .eq('id', eventoId)
      .single();

    if (!eventoExistente || eventoExistente.vendedor_id !== user.id) {
      throw new Error("No tienes permisos para modificar este evento");
    }

    // Actualizar fechas y marcar como reprogramado
    const updateData: any = {
      fecha_inicio: nuevaFechaInicio,
      estado: 'reprogramado' as EstadoEvento,
    };

    if (nuevaFechaFin) {
      updateData.fecha_fin = nuevaFechaFin;
    }

    const { error } = await supabase
      .from('evento')
      .update(updateData)
      .eq('id', eventoId);

    if (error) {
      throw new Error(`Error reprogramando evento: ${error.message}`);
    }

    // Crear notificación
    try {
      await crearNotificacion(
        user.id,
        "sistema",
        "Evento reprogramado",
        `Has reprogramado el evento "${eventoExistente.titulo}" para ${new Date(nuevaFechaInicio).toLocaleString("es-PE")}.`,
        { evento_id: eventoId }
      );
    } catch (notifyError) {
      console.warn("No se pudo crear notificación:", notifyError);
    }

    revalidatePath('/dashboard/agenda');
    return { success: true, message: "Evento reprogramado exitosamente" };

  } catch (error) {
    console.error('Error reprogramando evento:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Error desconocido"
    };
  }
}

// =====================================================
// FUNCIONES DE RECORDATORIOS
// =====================================================

export async function crearRecordatorio(formData: FormData) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("No autorizado");
    }

    // Validar datos
    const datos = RecordatorioSchema.parse({
      titulo: formData.get("titulo"),
      descripcion: formData.get("descripcion") || undefined,
      tipo: formData.get("tipo"),
      prioridad: formData.get("prioridad"),
      fecha_recordatorio: formData.get("fecha_recordatorio"),
      cliente_id: formData.get("cliente_id") || undefined,
      propiedad_id: formData.get("propiedad_id") || undefined,
      evento_id: formData.get("evento_id") || undefined,
      notificar_email: formData.get("notificar_email") === "true",
      notificar_push: formData.get("notificar_push") === "true",
      notas: formData.get("notas") || undefined,
      etiquetas: formData.get("etiquetas") ? JSON.parse(formData.get("etiquetas") as string) : [],
    });

    // Crear recordatorio
    const { data: recordatorio, error } = await supabase
      .from('recordatorio')
      .insert({
        ...datos,
        vendedor_id: user.id,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error creando recordatorio: ${error.message}`);
    }

    if (recordatorio?.id) {
      try {
        await crearNotificacion(
          user.id,
          "sistema",
          "Nuevo recordatorio creado",
          `Has creado un recordatorio: "${datos.titulo}".`,
          { recordatorio_id: recordatorio.id, prioridad: datos.prioridad, tipo: datos.tipo }
        );
      } catch (notifyError) {
        console.warn("No se pudo crear notificación de recordatorio:", notifyError);
      }
    }

    revalidatePath('/dashboard/agenda');
    return { success: true, message: "Recordatorio creado exitosamente", data: recordatorio };

  } catch (error) {
    console.error('Error creando recordatorio:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Error desconocido" 
    };
  }
}

export async function marcarRecordatorioCompletado(recordatorioId: string) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("No autorizado");
    }

    // Verificar que el recordatorio pertenece al usuario
    const { data: recordatorioExistente } = await supabase
      .from('recordatorio')
      .select('vendedor_id')
      .eq('id', recordatorioId)
      .single();

    if (!recordatorioExistente || recordatorioExistente.vendedor_id !== user.id) {
      throw new Error("No tienes permisos para modificar este recordatorio");
    }

    // Marcar como completado
    const { error } = await supabase
      .from('recordatorio')
      .update({ 
        completado: true,
        fecha_completado: new Date().toISOString(),
        leido: true
      })
      .eq('id', recordatorioId);

    if (error) {
      throw new Error(`Error marcando recordatorio: ${error.message}`);
    }

    revalidatePath('/dashboard/agenda');
    return { success: true, message: "Recordatorio marcado como completado" };

  } catch (error) {
    console.error('Error marcando recordatorio:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Error desconocido" 
    };
  }
}

export async function marcarRecordatorioLeido(recordatorioId: string) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("No autorizado");
    }

    // Marcar como leído
    const { error } = await supabase
      .from('recordatorio')
      .update({ leido: true })
      .eq('id', recordatorioId)
      .eq('vendedor_id', user.id);

    if (error) {
      throw new Error(`Error marcando recordatorio: ${error.message}`);
    }

    revalidatePath('/dashboard/agenda');
    return { success: true, message: "Recordatorio marcado como leído" };

  } catch (error) {
    console.error('Error marcando recordatorio:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Error desconocido" 
    };
  }
}

export async function eliminarRecordatorio(recordatorioId: string) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("No autorizado");
    }

    // Verificar que el recordatorio pertenece al usuario
    const { data: recordatorioExistente } = await supabase
      .from('recordatorio')
      .select('vendedor_id')
      .eq('id', recordatorioId)
      .single();

    if (!recordatorioExistente || recordatorioExistente.vendedor_id !== user.id) {
      throw new Error("No tienes permisos para eliminar este recordatorio");
    }

    // Eliminar recordatorio
    const { error } = await supabase
      .from('recordatorio')
      .delete()
      .eq('id', recordatorioId);

    if (error) {
      throw new Error(`Error eliminando recordatorio: ${error.message}`);
    }

    revalidatePath('/dashboard/agenda');
    return { success: true, message: "Recordatorio eliminado exitosamente" };

  } catch (error) {
    console.error('Error eliminando recordatorio:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Error desconocido" 
    };
  }
}
