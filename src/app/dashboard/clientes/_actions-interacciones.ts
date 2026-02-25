"use server";

/**
 * Server actions para interacciones de clientes.
 *
 * Convencion de errores: estas acciones retornan { success: boolean, error?: string, data?: T }.
 * Los consumidores verifican result.success antes de continuar.
 */

import { createServerActionClient } from "@/lib/supabase.server-actions";
import { revalidatePath } from "next/cache";
import type { EstadoEvento } from "@/lib/types/agenda";
import type { ProximaAccion, ResultadoInteraccion, TipoInteraccion } from "@/lib/types/crm-flujo";

import {
  obtenerUsernameActual,
  validarFechaFutura,
  crearEventoAgenda,
  revalidarCliente,
  INTERACCION_EVENTO_MAP,
  PROXIMA_ACCION_EVENTO_MAP,
} from "./_actions-crm-helpers";

// ============================================================
// INTERACCIONES
// ============================================================

export async function registrarInteraccion(data: {
  clienteId: string;
  tipo: TipoInteraccion;
  resultado?: ResultadoInteraccion;
  notas?: string;
  duracionMinutos?: number;
  proximaAccion?: ProximaAccion;
  fechaProximaAccion?: string;
}) {
  const supabase = await createServerActionClient();

  try {
    // Obtener username usando helper
    const authResult = await obtenerUsernameActual(supabase);
    if (!authResult.success) {
      return authResult;
    }

    // Validar fecha de proxima accion si se proporciona
    if (data.fechaProximaAccion) {
      const validacionFecha = validarFechaFutura(data.fechaProximaAccion, 'Fecha de proxima accion');
      if (!validacionFecha.valid) {
        return { success: false, error: validacionFecha.error };
      }
    }

    const insertData = {
      cliente_id: data.clienteId,
      vendedor_username: authResult.username,
      tipo: data.tipo,
      resultado: data.resultado,
      notas: data.notas,
      duracion_minutos: data.duracionMinutos,
      proxima_accion: data.proximaAccion,
      fecha_proxima_accion: data.fechaProximaAccion,
    };

    const { data: insertedData, error } = await supabase
      .from('cliente_interaccion')
      .insert(insertData)
      .select();

    if (error) {
      throw error;
    }

    const interaccion = Array.isArray(insertedData) ? insertedData[0] : insertedData;
    const fechaInteraccion = interaccion?.fecha_interaccion || new Date().toISOString();

    // Actualizar ultimo_contacto en la tabla cliente
    await supabase
      .from('cliente')
      .update({ ultimo_contacto: fechaInteraccion })
      .eq('id', data.clienteId);

    let agendaTouched = false;

    // Registrar el evento realizado (interaccion actual)
    const eventoInteraccion = INTERACCION_EVENTO_MAP[data.tipo];
    if (eventoInteraccion) {
      const creado = await crearEventoAgenda(supabase, authResult.userId, {
        titulo: eventoInteraccion.titulo,
        tipo: eventoInteraccion.tipo,
        fechaInicio: fechaInteraccion,
        duracionMinutos: data.duracionMinutos ?? eventoInteraccion.duracion,
        prioridad: 'media',
        clienteId: data.clienteId,
        descripcion: data.notas,
        notas: data.notas,
        estado: 'completado',
      });
      agendaTouched = agendaTouched || creado;
    }

    // Registrar proxima accion agendada
    if (data.proximaAccion && data.proximaAccion !== 'ninguna' && data.fechaProximaAccion) {
      const proximaConfig = PROXIMA_ACCION_EVENTO_MAP[data.proximaAccion as Exclude<ProximaAccion, 'ninguna'>];
      if (proximaConfig) {
        const fechaObjetivo = new Date(data.fechaProximaAccion);
        const estado: EstadoEvento = fechaObjetivo < new Date() ? 'completado' : 'pendiente';
        const creado = await crearEventoAgenda(supabase, authResult.userId, {
          titulo: proximaConfig.titulo,
          tipo: proximaConfig.tipo,
          fechaInicio: fechaObjetivo.toISOString(),
          duracionMinutos: proximaConfig.duracion,
          prioridad: 'alta',
          clienteId: data.clienteId,
          descripcion: 'Programado desde una interaccion con el cliente',
          estado,
        });
        agendaTouched = agendaTouched || creado;
      }
    }

    if (agendaTouched) {
      revalidatePath('/dashboard/agenda');
    }
    revalidarCliente(data.clienteId);
    return { success: true, data: insertedData };
  } catch (error: any) {
    console.error('Error en registrarInteraccion:', error);
    return { success: false, error: error.message };
  }
}

export async function obtenerInteracciones(
  clienteId: string,
  options?: { limit?: number }
) {
  const supabase = await createServerActionClient();

  try {
    const limit = options?.limit ?? 100;

    // Obtener interacciones sin el join problematico
    const { data: rawData, error } = await supabase
      .from('cliente_interaccion')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('fecha_interaccion', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    let data = rawData;

    // Si hay datos, obtener la informacion del vendedor por separado
    if (data && data.length > 0) {
      const vendedorUsernames = [...new Set(data.map(d => d.vendedor_username).filter(Boolean))];

      if (vendedorUsernames.length > 0) {
        const { data: vendedores } = await supabase
          .schema('crm')
          .from('usuario_perfil')
          .select('username, nombre_completo')
          .in('username', vendedorUsernames);

        // Combinar los datos
        if (vendedores) {
          const vendedoresMap = Object.fromEntries(
            vendedores.map(v => [v.username, v])
          );

          data = data.map(interaccion => ({
            ...interaccion,
            vendedor: vendedoresMap[interaccion.vendedor_username] || { username: interaccion.vendedor_username }
          }));
        }
      }
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function actualizarInteraccion(data: {
  interaccionId: string;
  tipo?: TipoInteraccion;
  resultado?: ResultadoInteraccion;
  notas?: string;
  duracionMinutos?: number;
  proximaAccion?: ProximaAccion;
  fechaProximaAccion?: string;
}) {
  const supabase = await createServerActionClient();

  try {

    // Validar fecha de proxima accion si se proporciona
    if (data.fechaProximaAccion) {
      const validacionFecha = validarFechaFutura(data.fechaProximaAccion, 'Fecha de proxima accion');
      if (!validacionFecha.valid) {
        console.error('Error validando fecha:', validacionFecha.error);
        return { success: false, error: validacionFecha.error };
      }
    }

    const updateData: any = {};
    if (data.tipo !== undefined) updateData.tipo = data.tipo;
    if (data.resultado !== undefined) updateData.resultado = data.resultado;
    if (data.notas !== undefined) updateData.notas = data.notas;
    if (data.duracionMinutos !== undefined) updateData.duracion_minutos = data.duracionMinutos;
    if (data.proximaAccion !== undefined) updateData.proxima_accion = data.proximaAccion;
    if (data.fechaProximaAccion !== undefined) updateData.fecha_proxima_accion = data.fechaProximaAccion;

    const { data: updatedData, error } = await supabase
      .from('cliente_interaccion')
      .update(updateData)
      .eq('id', data.interaccionId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Revalidar el cliente
    if (updatedData.cliente_id) {
      revalidarCliente(updatedData.cliente_id);
    }

    return { success: true, data: updatedData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function eliminarInteraccion(interaccionId: string) {
  const supabase = await createServerActionClient();

  try {
    // Primero obtener la interaccion para saber el cliente_id
    const { data: interaccion } = await supabase
      .from('cliente_interaccion')
      .select('cliente_id')
      .eq('id', interaccionId)
      .single();

    const { error } = await supabase
      .from('cliente_interaccion')
      .delete()
      .eq('id', interaccionId);

    if (error) {
      throw error;
    }

    // Revalidar el cliente
    if (interaccion?.cliente_id) {
      revalidarCliente(interaccion.cliente_id);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
