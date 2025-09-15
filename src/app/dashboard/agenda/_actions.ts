"use server";

import { createServerOnlyClient } from "@/lib/supabase.server";
import { revalidatePath } from "next/cache";
import { EventoCalendario } from "@/lib/types/agenda";

export async function obtenerEventos(fecha: Date): Promise<EventoCalendario[]> {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return [];
    }

    // Obtener el primer y último día del mes
    const primerDia = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
    const ultimoDia = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);

    const { data: eventos, error } = await supabase
      .from('evento')
      .select(`
        id,
        titulo,
        descripcion,
        tipo,
        prioridad,
        fecha_inicio,
        fecha_fin,
        duracion_minutos,
        todo_el_dia,
        ubicacion,
        direccion,
        color,
        cliente_id,
        propiedad_id,
        created_at
      `)
      .eq('vendedor_id', user.id)
      .gte('fecha_inicio', primerDia.toISOString())
      .lte('fecha_inicio', ultimoDia.toISOString())
      .order('fecha_inicio', { ascending: true });

    if (error) {
      console.error('Error obteniendo eventos:', error);
      return [];
    }

    return eventos || [];
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

    const titulo = formData.get("titulo") as string;
    const descripcion = formData.get("descripcion") as string;
    const tipo = formData.get("tipo") as string;
    const prioridad = formData.get("prioridad") as string;
    const fecha_inicio = formData.get("fecha_inicio") as string;
    const fecha_fin = formData.get("fecha_fin") as string;
    const duracion_minutos = Number(formData.get("duracion_minutos"));
    const todo_el_dia = formData.get("todo_el_dia") === "true";
    const ubicacion = formData.get("ubicacion") as string;
    const direccion = formData.get("direccion") as string;
    const color = formData.get("color") as string || '#3B82F6';
    const cliente_id = formData.get("cliente_id") as string;
    const propiedad_id = formData.get("propiedad_id") as string;

    // Validaciones básicas
    if (!titulo || !tipo || !fecha_inicio) {
      throw new Error("Título, tipo y fecha de inicio son requeridos");
    }

    // Crear evento
    const { data: evento, error } = await supabase
      .from('evento')
      .insert({
        titulo,
        descripcion: descripcion || null,
        tipo,
        prioridad: prioridad || 'media',
        fecha_inicio,
        fecha_fin: fecha_fin || null,
        duracion_minutos: duracion_minutos || 60,
        todo_el_dia,
        vendedor_id: user.id,
        ubicacion: ubicacion || null,
        direccion: direccion || null,
        color,
        cliente_id: cliente_id || null,
        propiedad_id: propiedad_id || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creando evento:', error);
      throw new Error(`Error creando evento: ${error.message}`);
    }

    revalidatePath('/dashboard/agenda');
    return { success: true, evento };
  } catch (error) {
    console.error('Error creando evento:', error);
    throw error;
  }
}

export async function actualizarEvento(id: string, formData: FormData) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("No autorizado");
    }

    const titulo = formData.get("titulo") as string;
    const descripcion = formData.get("descripcion") as string;
    const tipo = formData.get("tipo") as string;
    const prioridad = formData.get("prioridad") as string;
    const fecha_inicio = formData.get("fecha_inicio") as string;
    const fecha_fin = formData.get("fecha_fin") as string;
    const duracion_minutos = Number(formData.get("duracion_minutos"));
    const todo_el_dia = formData.get("todo_el_dia") === "true";
    const ubicacion = formData.get("ubicacion") as string;
    const direccion = formData.get("direccion") as string;
    const color = formData.get("color") as string;
    const cliente_id = formData.get("cliente_id") as string;
    const propiedad_id = formData.get("propiedad_id") as string;

    // Validaciones básicas
    if (!titulo || !tipo || !fecha_inicio) {
      throw new Error("Título, tipo y fecha de inicio son requeridos");
    }

    // Actualizar evento
    const { error } = await supabase
      .from('evento')
      .update({
        titulo,
        descripcion: descripcion || null,
        tipo,
        prioridad: prioridad || 'media',
        fecha_inicio,
        fecha_fin: fecha_fin || null,
        duracion_minutos: duracion_minutos || 60,
        todo_el_dia,
        ubicacion: ubicacion || null,
        direccion: direccion || null,
        color,
        cliente_id: cliente_id || null,
        propiedad_id: propiedad_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('vendedor_id', user.id);

    if (error) {
      console.error('Error actualizando evento:', error);
      throw new Error(`Error actualizando evento: ${error.message}`);
    }

    revalidatePath('/dashboard/agenda');
    return { success: true };
  } catch (error) {
    console.error('Error actualizando evento:', error);
    throw error;
  }
}

export async function eliminarEvento(id: string) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("No autorizado");
    }

    const { error } = await supabase
      .from('evento')
      .delete()
      .eq('id', id)
      .eq('vendedor_id', user.id);

    if (error) {
      console.error('Error eliminando evento:', error);
      throw new Error(`Error eliminando evento: ${error.message}`);
    }

    revalidatePath('/dashboard/agenda');
    return { success: true };
  } catch (error) {
    console.error('Error eliminando evento:', error);
    throw error;
  }
}