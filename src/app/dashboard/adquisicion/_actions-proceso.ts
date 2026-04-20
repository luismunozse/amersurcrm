"use server";

import { createServerActionClient } from "@/lib/supabase.server-actions";
import { PERMISOS } from "@/lib/permissions";
import { tienePermiso } from "@/lib/permissions/server";
import { obtenerUsernameActual, revalidarCliente } from "../clientes/_actions-crm-helpers";
import { revalidatePath } from "next/cache";

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
    const puedeVerTodos = await tienePermiso(PERMISOS.VENTAS.VER_TODAS);

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

    if (filtros?.estado) query = query.eq('estado', filtros.estado);
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
    const puedeVerTodos = await tienePermiso(PERMISOS.VENTAS.VER_TODAS);

    let query = supabase
      .from('proceso_adquisicion')
      .select('id, etapa_actual, estado, vendedor_username');

    if (!puedeVerTodos) {
      const authResult = await obtenerUsernameActual(supabase);
      if (!authResult.success) return authResult;
      query = query.eq('vendedor_username', authResult.username);
    }

    query = query.eq('estado', 'activo');

    const { data, error } = await query;
    if (error) throw error;

    const resumen: Record<string, number> = {
      separacion: 0,
      calificacion_bancaria: 0,
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
    // Las etapas con estado 'omitida' (p.ej. calificacion bancaria en pago contado)
    // se saltan sin tocar su estado ni su fecha_completada.
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

export async function cancelarProceso(procesoId: string, motivo?: string) {
  const supabase = await createServerActionClient();

  try {
    const { error } = await supabase
      .from('proceso_adquisicion')
      .update({
        estado: 'cancelado',
        notas: motivo,
        fecha_cierre: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', procesoId);

    if (error) throw error;

    revalidatePath('/dashboard/adquisicion');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
