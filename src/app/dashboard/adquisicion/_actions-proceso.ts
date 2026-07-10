"use server";

import { createServerActionClient } from "@/lib/supabase.server-actions";
import { PERMISOS } from "@/lib/permissions";
import { tienePermiso, esAdminOCoordinador, esAdmin, esAdminOGerente } from "@/lib/permissions/server";
import { obtenerUsernameActual, revalidarCliente } from "../clientes/_actions-crm-helpers";
import { revalidatePath } from "next/cache";
import type { EstadoRevision } from "@/lib/types/proceso-adquisicion";
import { crearNotificacion } from "@/app/_actionsNotifications";
import { notificarVentaCreada } from "@/lib/notifications/venta";

// ============================================================
// PROCESOS DE ADQUISICIÓN
// ============================================================

export async function obtenerProcesos(filtros?: {
  estado?: string;
  etapaActual?: string;
  vendedorUsername?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = await createServerActionClient();

  try {
    // Admin/coord/gerente ven todo. Resto cae al permiso explícito o filtra por su username.
    const privilegiado = await esAdminOCoordinador();
    const puedeVerTodos = privilegiado || (await tienePermiso(PERMISOS.VENTAS.VER_TODAS));

    let query = supabase
      .from('proceso_adquisicion')
      .select(`
        *,
        cliente:cliente!cliente_id(id, nombre),
        lote:lote!lote_id(codigo, proyecto:proyecto!proyecto_id(nombre)),
        etapas:proceso_etapa(*, checklist:proceso_checklist_item(*))
      `);

    if (!puedeVerTodos) {
      const authResult = await obtenerUsernameActual(supabase);
      if (!authResult.success) return authResult;
      query = query.eq('vendedor_username', authResult.username);
    }

    if (filtros?.estado === 'activos') {
      query = query.in('estado', ['activo', 'pausado']);
    } else if (filtros?.estado) {
      query = query.eq('estado', filtros.estado);
    }
    if (filtros?.etapaActual) query = query.eq('etapa_actual', filtros.etapaActual);

    query = query
      .order('created_at', { ascending: false })
      .range(filtros?.offset || 0, (filtros?.offset || 0) + (filtros?.limit || 100) - 1);

    const { data, error } = await query;
    if (error) throw error;

    // Ordenar etapas por orden
    const procesosOrdenados = (data || []).map((p: any) => ({
      ...p,
      etapas: (p.etapas || []).sort((a: any, b: any) => a.orden - b.orden).map((e: any) => ({
        ...e,
        checklist: (e.checklist || []).sort((a: any, b: any) => a.orden - b.orden),
      })),
    }));

    return { success: true, data: procesosOrdenados };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function obtenerProcesosCliente(clienteId: string) {
  const supabase = await createServerActionClient();

  try {
    const { data, error } = await supabase
      .from('proceso_adquisicion')
      .select(`
        *,
        lote:lote!lote_id(codigo, proyecto:proyecto!proyecto_id(nombre)),
        etapas:proceso_etapa(*, checklist:proceso_checklist_item(*))
      `)
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const procesosOrdenados = (data || []).map((p: any) => ({
      ...p,
      etapas: (p.etapas || []).sort((a: any, b: any) => a.orden - b.orden).map((e: any) => ({
        ...e,
        checklist: (e.checklist || []).sort((a: any, b: any) => a.orden - b.orden),
      })),
    }));

    return { success: true, data: procesosOrdenados };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function obtenerResumenPipeline() {
  const supabase = await createServerActionClient();

  try {
    const privilegiado = await esAdminOCoordinador();
    const puedeVerTodos = privilegiado || (await tienePermiso(PERMISOS.VENTAS.VER_TODAS));

    let query = supabase
      .from('proceso_adquisicion')
      .select('id, etapa_actual, estado, vendedor_username');

    if (!puedeVerTodos) {
      const authResult = await obtenerUsernameActual(supabase);
      if (!authResult.success) return authResult;
      query = query.eq('vendedor_username', authResult.username);
    }

    query = query.neq('estado', 'cancelado');

    const { data, error } = await query;
    if (error) throw error;

    const resumen: Record<string, number> = {
      separacion: 0,
      firma_contrato: 0,
      desembolso: 0,
    };

    (data || []).forEach((p: any) => {
      if (resumen[p.etapa_actual] !== undefined) {
        resumen[p.etapa_actual]++;
      }
    });

    return { success: true, data: { ...resumen, total: data?.length || 0 } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleChecklistItem(
  itemId: string,
  completado: boolean,
) {
  const supabase = await createServerActionClient();

  try {
    const authResult = await obtenerUsernameActual(supabase);
    if (!authResult.success) return authResult;

    const { error } = await supabase
      .from('proceso_checklist_item')
      .update({
        completado,
        completado_por: completado ? authResult.username : null,
        fecha_completado: completado ? new Date().toISOString() : null,
      })
      .eq('id', itemId);

    if (error) throw error;

    revalidatePath('/dashboard/adquisicion');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function actualizarDocumentoChecklist(
  itemId: string,
  documentoUrl: string,
) {
  const supabase = await createServerActionClient();

  try {
    const { error } = await supabase
      .from('proceso_checklist_item')
      .update({ documento_url: documentoUrl })
      .eq('id', itemId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function avanzarEtapa(procesoId: string) {
  const supabase = await createServerActionClient();

  try {
    const authResult = await obtenerUsernameActual(supabase);
    if (!authResult.success) return authResult;

    // Obtener proceso con etapas
    const { data: proceso, error: procError } = await supabase
      .from('proceso_adquisicion')
      .select('*, etapas:proceso_etapa(*, checklist:proceso_checklist_item(*))')
      .eq('id', procesoId)
      .single();

    if (procError || !proceso) return { success: false, error: 'Proceso no encontrado' };

    const etapas = (proceso.etapas || []).sort((a: any, b: any) => a.orden - b.orden);
    const etapaActualIdx = etapas.findIndex((e: any) => e.etapa === proceso.etapa_actual);

    if (etapaActualIdx === -1) return { success: false, error: 'Etapa actual no encontrada' };

    const etapaActual = etapas[etapaActualIdx];

    // Verificar que todos los obligatorios estén completados
    const obligatoriosPendientes = (etapaActual.checklist || []).filter(
      (c: any) => c.obligatorio && !c.completado
    );

    if (obligatoriosPendientes.length > 0) {
      return {
        success: false,
        error: `Faltan ${obligatoriosPendientes.length} documento(s) obligatorio(s) por completar`,
      };
    }

    // Completar etapa actual
    await supabase
      .from('proceso_etapa')
      .update({
        estado: 'completada',
        fecha_completada: new Date().toISOString(),
      })
      .eq('id', etapaActual.id);

    // Buscar la siguiente etapa que no este omitida.
    let siguienteIdx = etapaActualIdx + 1;
    while (siguienteIdx < etapas.length && etapas[siguienteIdx].estado === 'omitida') {
      siguienteIdx++;
    }

    if (siguienteIdx < etapas.length) {
      const siguienteEtapa = etapas[siguienteIdx];

      await supabase
        .from('proceso_etapa')
        .update({
          estado: 'en_progreso',
          fecha_inicio: new Date().toISOString(),
          fecha_limite: siguienteEtapa.plazo_dias
            ? new Date(Date.now() + siguienteEtapa.plazo_dias * 86400000).toISOString().split('T')[0]
            : null,
          responsable_username: authResult.username,
        })
        .eq('id', siguienteEtapa.id);

      await supabase
        .from('proceso_adquisicion')
        .update({
          etapa_actual: siguienteEtapa.etapa,
          updated_at: new Date().toISOString(),
        })
        .eq('id', procesoId);
    } else {
      // No hay mas etapas pendientes (o todas las restantes estan omitidas)
      // -> proceso completado.
      await supabase
        .from('proceso_adquisicion')
        .update({
          estado: 'completado',
          fecha_cierre: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', procesoId);
    }

    revalidatePath('/dashboard/adquisicion');
    revalidarCliente(proceso.cliente_id);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Elimina permanentemente un proceso de adquisicion.
 * Solo admin. Borra documentos del bucket y dispara cascada FK
 * sobre proceso_etapa y proceso_checklist_item.
 * No toca reserva, lote, ni estado del cliente: si el admin necesita
 * revertir esos efectos debe usar anularSeparacion().
 */
export async function eliminarProceso(procesoId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!procesoId) return { success: false, error: 'ID de proceso requerido' };

  if (!(await esAdmin())) {
    return { success: false, error: 'Solo un administrador puede eliminar procesos' };
  }

  const supabase = await createServerActionClient();

  const { data: proceso } = await supabase
    .from('proceso_adquisicion')
    .select('id, cliente_id')
    .eq('id', procesoId)
    .maybeSingle();

  if (!proceso) return { success: false, error: 'Proceso no encontrado' };

  // Borrar documentos del bucket antes del delete (cascada borra los rows pero no los archivos).
  const { data: etapas } = await supabase
    .from('proceso_etapa')
    .select('id')
    .eq('proceso_id', procesoId);

  if (etapas && etapas.length > 0) {
    const etapaIds = etapas.map((e: any) => e.id);
    const { data: items } = await supabase
      .from('proceso_checklist_item')
      .select('documento_url')
      .in('etapa_id', etapaIds)
      .not('documento_url', 'is', null);

    const paths = (items ?? [])
      .map((it: any) => extraerPathDeUrl(it.documento_url, 'proceso-documentos'))
      .filter((p: string | null): p is string => !!p);

    if (paths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('proceso-documentos')
        .remove(paths);
      if (storageError) {
        console.error('[eliminarProceso] Error borrando documentos del storage:', storageError);
        // No bloqueamos: archivos huerfanos son recuperables manualmente.
      }
    }
  }

  const { data: deleted, error: delError } = await supabase
    .from('proceso_adquisicion')
    .delete()
    .eq('id', procesoId)
    .select('id');

  if (delError) {
    return { success: false, error: `No se pudo eliminar el proceso: ${delError.message}` };
  }

  if (!deleted || deleted.length === 0) {
    return {
      success: false,
      error: 'No se eliminó el proceso. Verifique que la migración 20260507010000_proceso_rls_delete.sql esté aplicada en Supabase (policy DELETE faltante).',
    };
  }

  revalidatePath('/dashboard/adquisicion');
  if (proceso.cliente_id) {
    revalidarCliente(proceso.cliente_id);
  }

  return { success: true };
}

// Intentional behavior change (secure-authz-p1): vendors can no longer cancel
// their own processes. Cancel is now restricted to ROL_ADMIN and ROL_GERENTE.
// See spec §proceso_adquisicion Write Restrictions and design §FIX C.
export async function cancelarProceso(procesoId: string, motivo?: string) {
  if (!procesoId) return { success: false, error: 'ID de proceso requerido' };

  if (!(await esAdminOGerente())) {
    return {
      success: false,
      error: 'Solo administradores o gerentes pueden cancelar procesos',
    };
  }

  const supabase = await createServerActionClient();

  try {
    const auth = await obtenerUsernameActual(supabase);
    if (!auth.success) return auth;

    const { data: updated, error } = await supabase
      .from('proceso_adquisicion')
      .update({
        estado: 'cancelado',
        notas: motivo,
        fecha_cierre: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
        // Audit columns — added by migration 20260629000000_secure_authz_p1.sql
        cancelado_por: auth.userId,
        fecha_cancelacion: new Date().toISOString(),
        motivo_cancelacion: motivo ?? null,
      })
      .eq('id', procesoId)
      .select('id');

    if (error) throw error;

    if (!updated || updated.length === 0) {
      return { success: false, error: 'Proceso no encontrado' };
    }

    revalidatePath('/dashboard/adquisicion');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================
// ETAPA 2: estados de revision, observaciones, documentos
// ============================================================

const ESTADOS_REVISION_VALIDOS: EstadoRevision[] = ['pendiente', 'en_revision', 'aprobado', 'observado'];

/**
 * Cambia el estado de revision de una etapa.
 * - 'en_revision': vendedor o privilegiado (vendedor lo marca al terminar checklist).
 * - 'aprobado' / 'observado' / 'pendiente' (revertir): solo admin/coord/gerente.
 * Estados de revision son informativos: no bloquean avanzarEtapa en este sprint.
 */
export async function cambiarEstadoRevision(
  etapaId: string,
  estadoNuevo: EstadoRevision,
  observaciones?: string,
) {
  if (!etapaId) return { success: false, error: 'ID de etapa requerido' };
  if (!ESTADOS_REVISION_VALIDOS.includes(estadoNuevo)) {
    return { success: false, error: 'Estado de revision invalido' };
  }
  if (estadoNuevo === 'observado' && (!observaciones || !observaciones.trim())) {
    return { success: false, error: 'Las observaciones son obligatorias para marcar como observado' };
  }

  const supabase = await createServerActionClient();

  try {
    const auth = await obtenerUsernameActual(supabase);
    if (!auth.success) return auth;

    const privilegiado = await esAdminOCoordinador();

    if (!privilegiado && estadoNuevo !== 'en_revision') {
      return {
        success: false,
        error: 'Solo administradores o coordinadores pueden aprobar, observar o revertir etapas',
      };
    }

    const update: Record<string, unknown> = {
      estado_revision: estadoNuevo,
      updated_at: new Date().toISOString(),
    };

    if (estadoNuevo === 'aprobado' || estadoNuevo === 'observado') {
      update.fecha_revision = new Date().toISOString();
      update.revisado_por = auth.username;
    } else if (estadoNuevo === 'pendiente') {
      update.fecha_revision = null;
      update.revisado_por = null;
    }

    if (observaciones !== undefined) {
      update.observaciones = observaciones.trim() || null;
    }

    const { error: updError } = await supabase
      .from('proceso_etapa')
      .update(update)
      .eq('id', etapaId);

    if (updError) throw updError;

    if (estadoNuevo === 'en_revision') {
      await notificarPrivilegiadosRevisionPendiente(supabase, etapaId, auth.username);
    } else if (estadoNuevo === 'aprobado' || estadoNuevo === 'observado') {
      await notificarVendedorResultadoRevision(supabase, etapaId, estadoNuevo, observaciones, auth.username);
    }

    revalidatePath('/dashboard/adquisicion');
    revalidatePath('/dashboard/clientes', 'layout');

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function notificarPrivilegiadosRevisionPendiente(
  supabase: Awaited<ReturnType<typeof createServerActionClient>>,
  etapaId: string,
  vendedorUsername: string,
) {
  try {
    const { data: etapa } = await supabase
      .from('proceso_etapa')
      .select(`
        nombre,
        proceso:proceso_id (
          codigo,
          cliente_id,
          cliente:cliente_id ( id, nombre )
        )
      `)
      .eq('id', etapaId)
      .maybeSingle();

    if (!etapa) return;

    const procesoData = Array.isArray(etapa.proceso) ? etapa.proceso[0] : etapa.proceso;
    const codigoProceso: string = procesoData?.codigo ?? 'proceso';
    const clienteId: string | null = procesoData?.cliente_id ?? null;
    const clienteData = procesoData?.cliente;
    const cliente = Array.isArray(clienteData) ? clienteData[0] : clienteData;
    const clienteNombre: string = cliente?.nombre ?? 'Cliente';
    const etapaNombre: string = etapa.nombre ?? 'Etapa';
    const url = clienteId
      ? `/dashboard/clientes/${clienteId}?tab=adquisicion&subtab=procesos`
      : '/dashboard/adquisicion';

    const { data: roles } = await supabase
      .from('rol')
      .select('id')
      .in('nombre', ['ROL_ADMIN', 'ROL_COORDINADOR_VENTAS']);

    if (!roles || roles.length === 0) return;
    const rolIds = roles.map((r: { id: string }) => r.id);

    const { data: usuarios } = await supabase
      .from('usuario_perfil')
      .select('id')
      .eq('activo', true)
      .in('rol_id', rolIds);

    if (!usuarios || usuarios.length === 0) return;

    const titulo = `Etapa pendiente de revisión: ${etapaNombre}`;
    const mensaje = `${vendedorUsername} marcó la etapa "${etapaNombre}" del proceso ${codigoProceso} (${clienteNombre}) como lista para revisión.`;

    const payload = usuarios.map((u: { id: string }) => ({
      usuario_id: u.id,
      tipo: 'sistema',
      titulo,
      mensaje,
      data: {
        etapa_id: etapaId,
        proceso_codigo: codigoProceso,
        cliente_id: clienteId,
        cliente_nombre: clienteNombre,
        accion: 'revisar_etapa_proceso',
        url,
      },
    }));

    const { error: insertError } = await supabase.from('notificacion').insert(payload);
    if (insertError) {
      console.error('Error creando notificaciones de revisión pendiente:', insertError);
    }
  } catch (err) {
    console.error('Error notificando a privilegiados:', err);
  }
}

/**
 * Notifica al vendedor dueño del proceso el resultado de una revision
 * (aprobado / observado) — la contraparte de notificarPrivilegiadosRevisionPendiente:
 * esa notifica revisor <- vendedor (etapa lista para revisar), esta notifica
 * vendedor <- revisor (resultado de la revision). No notifica si el propio
 * dueño del proceso fue quien hizo la revision (no tiene sentido auto-notificarse).
 */
async function notificarVendedorResultadoRevision(
  supabase: Awaited<ReturnType<typeof createServerActionClient>>,
  etapaId: string,
  estadoNuevo: 'aprobado' | 'observado',
  observaciones: string | undefined,
  revisorUsername: string,
) {
  try {
    const { data: etapa } = await supabase
      .from('proceso_etapa')
      .select(`
        nombre,
        proceso:proceso_id (
          codigo,
          cliente_id,
          vendedor_username,
          cliente:cliente_id ( id, nombre )
        )
      `)
      .eq('id', etapaId)
      .maybeSingle();

    if (!etapa) return;

    const procesoData = Array.isArray(etapa.proceso) ? etapa.proceso[0] : etapa.proceso;
    const vendedorUsername: string | null = procesoData?.vendedor_username ?? null;

    if (!vendedorUsername) {
      console.warn('notificarVendedorResultadoRevision: proceso sin vendedor asignado', etapaId);
      return;
    }

    if (vendedorUsername === revisorUsername) {
      // El propio dueño del proceso hizo la revision: nada que notificar.
      return;
    }

    const { data: perfil } = await supabase
      .from('usuario_perfil')
      .select('id')
      .eq('username', vendedorUsername)
      .maybeSingle();

    if (!perfil?.id) {
      console.warn('notificarVendedorResultadoRevision: vendedor sin perfil resoluble', vendedorUsername);
      return;
    }

    const clienteData = Array.isArray(procesoData?.cliente) ? procesoData.cliente[0] : procesoData?.cliente;
    const clienteNombre: string = clienteData?.nombre ?? 'Cliente';
    const codigoProceso: string = procesoData?.codigo ?? 'proceso';
    const etapaNombre: string = etapa.nombre ?? 'Etapa';
    const clienteId: string | null = procesoData?.cliente_id ?? null;
    const url = clienteId
      ? `/dashboard/clientes/${clienteId}?tab=adquisicion&subtab=procesos`
      : '/dashboard/adquisicion';

    const titulo = estadoNuevo === 'aprobado' ? 'Etapa aprobada' : 'Etapa observada';
    const mensajeBase =
      estadoNuevo === 'aprobado'
        ? `La etapa "${etapaNombre}" del proceso ${codigoProceso} (${clienteNombre}) fue aprobada.`
        : `La etapa "${etapaNombre}" del proceso ${codigoProceso} (${clienteNombre}) fue observada.`;
    const mensaje =
      estadoNuevo === 'observado' && observaciones?.trim()
        ? `${mensajeBase} Observaciones: ${observaciones.trim()}`
        : mensajeBase;

    await crearNotificacion(perfil.id, 'sistema', titulo, mensaje, {
      etapa_id: etapaId,
      proceso_codigo: codigoProceso,
      cliente_id: clienteId,
      cliente_nombre: clienteNombre,
      accion: 'resultado_revision_etapa',
      url,
    });
  } catch (err) {
    console.warn('Error notificando resultado de revision al vendedor:', err);
  }
}

/**
 * Guarda observaciones libres en una etapa.
 * Cualquier autenticado puede registrar; admin/coord puede sobrescribir.
 */
export async function guardarObservacionesEtapa(etapaId: string, observaciones: string) {
  if (!etapaId) return { success: false, error: 'ID de etapa requerido' };

  const supabase = await createServerActionClient();

  try {
    const auth = await obtenerUsernameActual(supabase);
    if (!auth.success) return auth;

    const { error: updError } = await supabase
      .from('proceso_etapa')
      .update({
        observaciones: observaciones.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', etapaId);

    if (updError) throw updError;

    revalidatePath('/dashboard/adquisicion');
    revalidatePath('/dashboard/clientes', 'layout');

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Elimina el documento subido a un item del checklist.
 * Borra el archivo del bucket privado y limpia los campos del item.
 */
export async function eliminarDocumentoChecklist(itemId: string) {
  if (!itemId) return { success: false, error: 'ID de item requerido' };

  const supabase = await createServerActionClient();

  try {
    const auth = await obtenerUsernameActual(supabase);
    if (!auth.success) return auth;

    const { data: item } = await supabase
      .from('proceso_checklist_item')
      .select('id, documento_url, documento_subido_por')
      .eq('id', itemId)
      .maybeSingle();

    if (!item) return { success: false, error: 'Item no encontrado' };

    const privilegiado = await esAdminOCoordinador();
    const esQuienSubio = item.documento_subido_por === auth.username;

    if (!privilegiado && !esQuienSubio) {
      return {
        success: false,
        error: 'Solo quien subio el documento o un administrador puede eliminarlo',
      };
    }

    if (item.documento_url) {
      const path = extraerPathDeUrl(item.documento_url, 'proceso-documentos');
      if (path) {
        await supabase.storage.from('proceso-documentos').remove([path]);
      }
    }

    const { error: updError } = await supabase
      .from('proceso_checklist_item')
      .update({
        documento_url: null,
        documento_nombre: null,
        documento_size: null,
        documento_subido_por: null,
        documento_subido_at: null,
      })
      .eq('id', itemId);

    if (updError) throw updError;

    revalidatePath('/dashboard/adquisicion');
    revalidatePath('/dashboard/clientes', 'layout');

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Genera una signed URL temporal para descargar el documento de un item.
 */
export async function obtenerUrlDocumento(itemId: string, expiresInSeconds = 300) {
  if (!itemId) return { success: false as const, error: 'ID de item requerido' };

  const supabase = await createServerActionClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false as const, error: 'No autenticado' };

    const { data: item } = await supabase
      .from('proceso_checklist_item')
      .select('documento_url')
      .eq('id', itemId)
      .maybeSingle();

    if (!item?.documento_url) return { success: false as const, error: 'Item sin documento' };

    const path = extraerPathDeUrl(item.documento_url, 'proceso-documentos');
    if (!path) return { success: false as const, error: 'URL invalida' };

    const { data, error } = await supabase
      .storage
      .from('proceso-documentos')
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data) {
      return { success: false as const, error: error?.message ?? 'No se pudo generar URL' };
    }

    return { success: true as const, data: { url: data.signedUrl } };
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
}

function extraerPathDeUrl(url: string, bucket: string): string | null {
  try {
    const parsed = new URL(url);
    const marker = `/${bucket}/`;
    const idx = parsed.pathname.indexOf(marker);
    if (idx === -1) return null;
    return parsed.pathname.slice(idx + marker.length);
  } catch {
    return null;
  }
}

// ============================================================
// ETAPA 3: cierre del proceso -> creacion de venta + cronograma
// ============================================================

interface CerrarVentaInput {
  procesoId: string;
  precioTotal: number;
  montoInicial: number;
  numeroCuotas: number;
  fechaPrimeraCuota?: string;
  notas?: string;
}

export interface CerrarVentaResult {
  ventaId: string;
  codigoVenta: string;
  totalCuotas: number;
  formaPago: string;
  precioTotal: number;
  saldoPendiente: number;
}

/**
 * Cierra un proceso de adquisicion en etapa 'pago':
 * crea la venta, genera el cronograma de cuotas, marca el lote como
 * vendido, completa el proceso y marca la reserva como convertida.
 * Autorizacion: vendedor asignado al proceso o admin/coord/gerente.
 */
export async function cerrarProcesoYCrearVenta(input: CerrarVentaInput): Promise<{
  success: boolean;
  error?: string;
  data?: CerrarVentaResult;
}> {
  if (!input.procesoId) return { success: false, error: 'ID de proceso requerido' };
  if (!Number.isFinite(input.precioTotal) || input.precioTotal <= 0) {
    return { success: false, error: 'Precio total invalido' };
  }
  if (!Number.isFinite(input.montoInicial) || input.montoInicial < 0) {
    return { success: false, error: 'Monto inicial invalido' };
  }
  if (input.montoInicial > input.precioTotal) {
    return { success: false, error: 'El monto inicial no puede superar el precio total' };
  }
  if (!Number.isInteger(input.numeroCuotas) || input.numeroCuotas < 0) {
    return { success: false, error: 'Numero de cuotas invalido' };
  }

  const supabase = await createServerActionClient();

  try {
    const auth = await obtenerUsernameActual(supabase);
    if (!auth.success) return auth;

    const privilegiado = await esAdminOCoordinador();

    // Cargar proceso para chequear permiso del vendedor. cliente/lote se
    // traen embebidos para la notificación de venta creada más abajo.
    const { data: proceso, error: procError } = await supabase
      .from('proceso_adquisicion')
      .select('id, vendedor_username, estado, etapa_actual, cliente_id, cliente:cliente!cliente_id(nombre), lote:lote!lote_id(codigo)')
      .eq('id', input.procesoId)
      .maybeSingle();

    if (procError) return { success: false, error: procError.message };
    if (!proceso) return { success: false, error: 'Proceso no encontrado' };

    const esVendedorAsignado = proceso.vendedor_username === auth.username;
    if (!privilegiado && !esVendedorAsignado) {
      return {
        success: false,
        error: 'Solo el vendedor asignado o un administrador puede cerrar la venta',
      };
    }

    const { data, error: rpcError } = await supabase.rpc('cerrar_proceso_y_crear_venta', {
      p_proceso_id: input.procesoId,
      p_precio_total: input.precioTotal,
      p_monto_inicial: input.montoInicial,
      p_numero_cuotas: input.numeroCuotas,
      p_fecha_primera_cuota: input.fechaPrimeraCuota ?? null,
      p_notas: input.notas ?? null,
    });

    if (rpcError) {
      return { success: false, error: rpcError.message };
    }

    revalidatePath('/dashboard/adquisicion');
    revalidatePath('/dashboard/clientes', 'layout');
    if (proceso.cliente_id) revalidarCliente(proceso.cliente_id);

    const result = data as Record<string, unknown> | null;
    if (!result || typeof result.venta_id !== 'string') {
      return { success: false, error: 'Respuesta inesperada del servidor' };
    }

    // Notificación no-bloqueante: mismo evento "venta creada" que
    // convertirReservaAVenta (proyectos) / convertirReservaEnVenta (clientes)
    // — ROL_ADMIN + ROL_COORDINADOR_VENTAS, excluyendo al actor.
    try {
      const clienteData = Array.isArray((proceso as any).cliente)
        ? (proceso as any).cliente[0]
        : (proceso as any).cliente;
      const loteData = Array.isArray((proceso as any).lote)
        ? (proceso as any).lote[0]
        : (proceso as any).lote;

      await notificarVentaCreada({
        clienteNombre: clienteData?.nombre ?? 'Cliente',
        loteCodigo: loteData?.codigo ?? null,
        monto: Number(result.precio_total ?? input.precioTotal),
        actorId: auth.userId,
        actorNombre: auth.username,
        ventaId: result.venta_id as string,
        codigoVenta: (result.codigo_venta as string) ?? '',
        url: proceso.cliente_id ? `/dashboard/clientes/${proceso.cliente_id}` : undefined,
      });
    } catch (notifError) {
      console.warn('Error notificando venta creada desde cierre de proceso:', notifError);
    }

    return {
      success: true,
      data: {
        ventaId: result.venta_id as string,
        codigoVenta: (result.codigo_venta as string) ?? '',
        totalCuotas: Number(result.total_cuotas ?? 0),
        formaPago: (result.forma_pago as string) ?? '',
        precioTotal: Number(result.precio_total ?? input.precioTotal),
        saldoPendiente: Number(result.saldo_pendiente ?? 0),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Carga datos de contexto para el modal de cierre de venta:
 * lote (precio sugerido, moneda), reserva (monto seña, forma_pago),
 * y configuracion financiera del proyecto (tasa, max cuotas).
 */
export async function obtenerContextoCierreVenta(procesoId: string): Promise<{
  success: boolean;
  error?: string;
  data?: {
    procesoCodigo: string;
    loteCodigo: string;
    proyectoNombre: string | null;
    precioSugerido: number | null;
    moneda: string;
    montoSeparacion: number | null;
    formaPagoReserva: string | null;
    tasaEfectivaMensual: number;
    maxCuotasSaldo: number;
    porcentajeCuotaInicial: number;
  };
}> {
  if (!procesoId) return { success: false, error: 'ID de proceso requerido' };

  const supabase = await createServerActionClient();

  try {
    const { data: proceso } = await supabase
      .from('proceso_adquisicion')
      .select(`
        codigo,
        lote:lote!lote_id(id, codigo, precio, moneda, proyecto_id, proyecto:proyecto!proyecto_id(nombre)),
        reserva:reserva!reserva_id(monto_reserva, forma_pago, moneda)
      `)
      .eq('id', procesoId)
      .maybeSingle();

    if (!proceso) return { success: false, error: 'Proceso no encontrado' };

    const lote = Array.isArray((proceso as any).lote) ? (proceso as any).lote[0] : (proceso as any).lote;
    const reserva = Array.isArray((proceso as any).reserva) ? (proceso as any).reserva[0] : (proceso as any).reserva;
    const proyecto = lote?.proyecto
      ? (Array.isArray(lote.proyecto) ? lote.proyecto[0] : lote.proyecto)
      : null;

    let tasaEfectivaMensual = 0;
    let maxCuotasSaldo = 120;
    let porcentajeCuotaInicial = 20;

    if (lote?.proyecto_id) {
      const { data: config } = await supabase
        .schema('crm')
        .from('configuracion_proyecto_financiera')
        .select('tasa_efectiva_mensual, max_cuotas_saldo, porcentaje_cuota_inicial')
        .eq('proyecto_id', lote.proyecto_id)
        .maybeSingle();
      if (config) {
        tasaEfectivaMensual = Number(config.tasa_efectiva_mensual) || 0;
        maxCuotasSaldo = Number(config.max_cuotas_saldo) || 120;
        porcentajeCuotaInicial = Number(config.porcentaje_cuota_inicial) || 20;
      }
    }

    return {
      success: true,
      data: {
        procesoCodigo: proceso.codigo,
        loteCodigo: lote?.codigo ?? '',
        proyectoNombre: proyecto?.nombre ?? null,
        precioSugerido: lote?.precio ?? null,
        moneda: reserva?.moneda ?? lote?.moneda ?? 'PEN',
        montoSeparacion: reserva?.monto_reserva ?? null,
        formaPagoReserva: reserva?.forma_pago ?? null,
        tasaEfectivaMensual,
        maxCuotasSaldo,
        porcentajeCuotaInicial,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
