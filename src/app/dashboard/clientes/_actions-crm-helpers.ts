/**
 * Helpers compartidos para server actions CRM de clientes.
 * Este archivo NO tiene "use server" — contiene tipos, funciones sync,
 * constantes y utilidades async que no son server actions.
 *
 * Convencion de errores: las acciones que usan estos helpers retornan
 * { success: boolean, error?: string, data?: T }.
 */

import { createServerActionClient } from "@/lib/supabase.server-actions";
import { revalidatePath } from "next/cache";
import type { TipoEvento, EstadoEvento } from "@/lib/types/agenda";
import type { ProximaAccion, TipoInteraccion } from "@/lib/types/crm-flujo";

// ============================================================
// Tipos
// ============================================================

export type SupabaseActionClient = Awaited<ReturnType<typeof createServerActionClient>>;

// ============================================================
// Helpers compartidos
// ============================================================

/**
 * Obtiene el username del usuario autenticado
 */
export async function obtenerUsernameActual(supabase: SupabaseActionClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'No autenticado' } as const;
  }

  const { data: perfil } = await supabase
    .schema('crm')
    .from('usuario_perfil')
    .select('username')
    .eq('id', user.id)
    .single();

  if (!perfil?.username) {
    return { success: false, error: 'Usuario sin username' } as const;
  }

  return { success: true, username: perfil.username, userId: user.id } as const;
}

/**
 * Valida que un monto sea positivo
 */
export function validarMonto(monto: number, nombreCampo: string = 'Monto'): { valid: boolean; error?: string } {
  if (monto <= 0) {
    return { valid: false, error: `${nombreCampo} debe ser mayor a cero` };
  }
  if (!isFinite(monto) || isNaN(monto)) {
    return { valid: false, error: `${nombreCampo} no es valido` };
  }
  return { valid: true };
}

/**
 * Valida que una fecha sea futura (para vencimientos)
 */
export function validarFechaFutura(fecha: string, nombreCampo: string = 'Fecha'): { valid: boolean; error?: string } {
  const fechaObj = new Date(fecha);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  if (isNaN(fechaObj.getTime())) {
    return { valid: false, error: `${nombreCampo} no es valida` };
  }

  if (fechaObj < hoy) {
    return { valid: false, error: `${nombreCampo} no puede ser en el pasado` };
  }

  return { valid: true };
}

/**
 * Revalida paths de manera consistente
 */
export function revalidarCliente(clienteId?: string) {
  if (clienteId) {
    revalidatePath(`/dashboard/clientes/${clienteId}`);
  }
  revalidatePath('/dashboard/clientes');
}

// ============================================================
// Constantes de mapeo Agenda
// ============================================================

export const INTERACCION_EVENTO_MAP: Record<TipoInteraccion, { tipo: TipoEvento; titulo: string; duracion?: number }> = {
  llamada: { tipo: 'llamada', titulo: 'Llamada con cliente', duracion: 15 },
  email: { tipo: 'email', titulo: 'Correo enviado', duracion: 15 },
  whatsapp: { tipo: 'seguimiento', titulo: 'Mensaje por WhatsApp', duracion: 10 },
  visita: { tipo: 'visita', titulo: 'Visita con cliente', duracion: 60 },
  reunion: { tipo: 'cita', titulo: 'Reunion con cliente', duracion: 45 },
  mensaje: { tipo: 'seguimiento', titulo: 'Mensaje al cliente', duracion: 10 },
};

export const PROXIMA_ACCION_EVENTO_MAP: Record<Exclude<ProximaAccion, 'ninguna'>, { tipo: TipoEvento; titulo: string; duracion?: number }> = {
  llamar: { tipo: 'llamada', titulo: 'Llamar al cliente', duracion: 15 },
  enviar_propuesta: { tipo: 'email', titulo: 'Enviar propuesta', duracion: 20 },
  reunion: { tipo: 'cita', titulo: 'Reunion agendada', duracion: 45 },
  visita: { tipo: 'visita', titulo: 'Visita agendada', duracion: 60 },
  seguimiento: { tipo: 'seguimiento', titulo: 'Seguimiento al cliente', duracion: 20 },
  cierre: { tipo: 'tarea', titulo: 'Cierre de venta', duracion: 30 },
};

// ============================================================
// Crear evento en agenda
// ============================================================

export async function crearEventoAgenda(
  supabase: SupabaseActionClient,
  userId: string,
  data: {
    titulo: string;
    tipo: TipoEvento;
    fechaInicio: string;
    fechaFin?: string;
    clienteId?: string;
    propiedadId?: string;
    duracionMinutos?: number;
    prioridad?: 'baja' | 'media' | 'alta' | 'urgente';
    estado?: EstadoEvento;
    descripcion?: string;
    etiquetas?: string[];
    todoElDia?: boolean;
    notas?: string;
  }
) {
  try {
    const payload = {
      titulo: data.titulo,
      tipo: data.tipo,
      prioridad: data.prioridad ?? 'media',
      fecha_inicio: data.fechaInicio,
      fecha_fin: data.fechaFin,
      duracion_minutos: data.duracionMinutos ?? 60,
      todo_el_dia: data.todoElDia ?? false,
      vendedor_id: userId,
      cliente_id: data.clienteId,
      propiedad_id: data.propiedadId,
      descripcion: data.descripcion,
      notas: data.notas ?? data.descripcion,
      etiquetas: data.etiquetas ?? [],
      estado: data.estado ?? ('pendiente' as EstadoEvento),
      recordar_antes_minutos: 15,
      notificar_email: false,
      notificar_push: false,
      created_by: userId,
    };

    const { error } = await supabase.from('evento').insert(payload);

    if (error) {
      console.warn('No se pudo crear evento en agenda:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.warn('No se pudo crear evento en agenda:', error);
    return false;
  }
}
