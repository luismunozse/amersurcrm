/**
 * Batch Server Actions for Proyectos Module
 *
 * Optimized server actions for batch operations on lots and coordinates.
 */

"use server";

import { revalidatePath } from "next/cache";
import { createServerActionClient } from "@/lib/supabase.server-actions";
import { obtenerPerfilUsuario } from "@/lib/auth/roles";
import type { LoteCoordenadas } from "@/types/proyectos";

/**
 * Batch updates coordinates for multiple lotes
 *
 * @param updates - Array of coordinate updates
 * @returns Result with success count and errors
 */
export async function actualizarCoordenadasBatch(
  updates: Array<{
    lote_id: string;
    coordenadas: LoteCoordenadas;
  }>
): Promise<{ success: boolean; successCount: number; errors: string[] }> {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No autenticado");
  }

  // Verificar permisos de administrador
  try {
    const perfil = await obtenerPerfilUsuario();
    if (!perfil || perfil.rol?.nombre !== 'ROL_ADMIN') {
      throw new Error("No tienes permisos para actualizar coordenadas por lotes. Solo los administradores pueden realizar esta acción.");
    }
  } catch (error) {
    throw new Error("Error verificando permisos: " + (error as Error).message);
  }

  if (!updates || updates.length === 0) {
    throw new Error("No hay actualizaciones para procesar");
  }

  const errors: string[] = [];
  let successCount = 0;

  try {
    // Process updates in batches of 50 to avoid overwhelming the database
    const BATCH_SIZE = 50;
    const batches = [];

    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      batches.push(updates.slice(i, i + BATCH_SIZE));
    }

    for (const batch of batches) {
      // Use Promise.allSettled to process all updates even if some fail
      const results = await Promise.allSettled(
        batch.map(async (update) => {
          try {
            const { error } = await supabase
              .from("lote")
              .update({
                plano_poligono: update.coordenadas.coordinates,
                updated_at: new Date().toISOString(),
              })
              .eq("id", update.lote_id);

            if (error) {
              throw new Error(`Lote ${update.lote_id}: ${error.message}`);
            }

            return { success: true, loteId: update.lote_id };
          } catch (err) {
            throw new Error(`Lote ${update.lote_id}: ${(err as Error).message}`);
          }
        })
      );

      // Count successes and collect errors
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          errors.push(result.reason.message);
        }
      });
    }

    // Revalidate paths
    if (successCount > 0) {
      // Get unique project IDs from successful updates
      const { data: lotes } = await supabase
        .from("lote")
        .select("proyecto_id")
        .in(
          "id",
          updates.slice(0, successCount).map((u) => u.lote_id)
        );

      const projectIds = [...new Set(lotes?.map((l) => l.proyecto_id) || [])];
      projectIds.forEach((proyectoId) => {
        revalidatePath(`/dashboard/proyectos/${proyectoId}`);
      });
      revalidatePath("/dashboard/propiedades");
    }

    return {
      success: errors.length === 0,
      successCount,
      errors,
    };
  } catch (error) {
    throw new Error(`Error en actualización por lotes: ${(error as Error).message}`);
  }
}

/**
 * Batch creates multiple lotes at once
 *
 * @param proyectoId - Project ID to create lotes in
 * @param lotes - Array of lote data
 * @returns Result with created lotes and errors
 */
export async function crearLotesBatch(
  proyectoId: string,
  lotes: Array<{
    codigo: string;
    sup_m2?: number | null;
    precio?: number | null;
    moneda?: string;
    estado?: 'disponible' | 'reservado' | 'vendido';
    plano_poligono?: number[][][] | null;
  }>
): Promise<{ success: boolean; createdCount: number; errors: string[]; lotes: any[] }> {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No autenticado");
  }

  // Verificar permisos de administrador
  try {
    const perfil = await obtenerPerfilUsuario();
    if (!perfil || perfil.rol?.nombre !== 'ROL_ADMIN') {
      throw new Error("No tienes permisos para crear lotes por lotes. Solo los administradores pueden realizar esta acción.");
    }
  } catch (error) {
    throw new Error("Error verificando permisos: " + (error as Error).message);
  }

  if (!lotes || lotes.length === 0) {
    throw new Error("No hay lotes para crear");
  }

  const errors: string[] = [];
  const createdLotes: any[] = [];

  try {
    // Check for duplicate codes
    const codes = lotes.map((l) => l.codigo);
    const uniqueCodes = new Set(codes);

    if (uniqueCodes.size !== codes.length) {
      throw new Error("Hay códigos duplicados en el lote de creación");
    }

    // Check existing codes in project
    const { data: existingLotes } = await supabase
      .from("lote")
      .select("codigo")
      .eq("proyecto_id", proyectoId)
      .in("codigo", codes);

    if (existingLotes && existingLotes.length > 0) {
      const existingCodes = existingLotes.map((l) => l.codigo).join(', ');
      throw new Error(`Los siguientes códigos ya existen en el proyecto: ${existingCodes}`);
    }

    // Prepare data for batch insert
    const lotesData = lotes.map((lote) => ({
      proyecto_id: proyectoId,
      codigo: lote.codigo,
      sup_m2: lote.sup_m2 ?? null,
      precio: lote.precio ?? null,
      moneda: lote.moneda ?? 'PEN',
      estado: lote.estado ?? 'disponible',
      plano_poligono: lote.plano_poligono ?? null,
      created_by: user.id,
      created_at: new Date().toISOString(),
    }));

    // Insert in batches of 100
    const BATCH_SIZE = 100;
    for (let i = 0; i < lotesData.length; i += BATCH_SIZE) {
      const batch = lotesData.slice(i, i + BATCH_SIZE);

      const { data, error } = await supabase
        .from("lote")
        .insert(batch)
        .select();

      if (error) {
        errors.push(`Lotes ${i + 1}-${i + batch.length}: ${error.message}`);
      } else if (data) {
        createdLotes.push(...data);
      }
    }

    // Revalidate paths
    if (createdLotes.length > 0) {
      revalidatePath(`/dashboard/proyectos/${proyectoId}`);
      revalidatePath("/dashboard/propiedades");
      revalidatePath("/dashboard");
    }

    return {
      success: errors.length === 0,
      createdCount: createdLotes.length,
      errors,
      lotes: createdLotes,
    };
  } catch (error) {
    throw new Error(`Error en creación por lotes: ${(error as Error).message}`);
  }
}

/**
 * Batch updates multiple lotes at once
 *
 * @param updates - Array of lote updates
 * @returns Result with success count and errors
 */
export async function actualizarLotesBatch(
  updates: Array<{
    lote_id: string;
    codigo?: string;
    sup_m2?: number | null;
    precio?: number | null;
    moneda?: string;
    estado?: 'disponible' | 'reservado' | 'vendido';
  }>
): Promise<{ success: boolean; successCount: number; errors: string[] }> {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No autenticado");
  }

  // Verificar permisos de administrador
  try {
    const perfil = await obtenerPerfilUsuario();
    if (!perfil || perfil.rol?.nombre !== 'ROL_ADMIN') {
      throw new Error("No tienes permisos para actualizar lotes por lotes. Solo los administradores pueden realizar esta acción.");
    }
  } catch (error) {
    throw new Error("Error verificando permisos: " + (error as Error).message);
  }

  if (!updates || updates.length === 0) {
    throw new Error("No hay actualizaciones para procesar");
  }

  const errors: string[] = [];
  let successCount = 0;

  try {
    // Process updates one by one (can't batch UPDATE operations easily)
    const results = await Promise.allSettled(
      updates.map(async (update) => {
        const { lote_id, ...updateData } = update;

        try {
          const { error } = await supabase
            .from("lote")
            .update({
              ...updateData,
              updated_at: new Date().toISOString(),
            })
            .eq("id", lote_id);

          if (error) {
            throw new Error(`Lote ${lote_id}: ${error.message}`);
          }

          return { success: true, loteId: lote_id };
        } catch (err) {
          throw new Error(`Lote ${lote_id}: ${(err as Error).message}`);
        }
      })
    );

    // Count successes and collect errors
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        successCount++;
      } else {
        errors.push(result.reason.message);
      }
    });

    // Revalidate paths
    if (successCount > 0) {
      const { data: lotes } = await supabase
        .from("lote")
        .select("proyecto_id")
        .in(
          "id",
          updates.slice(0, successCount).map((u) => u.lote_id)
        );

      const projectIds = [...new Set(lotes?.map((l) => l.proyecto_id) || [])];
      projectIds.forEach((proyectoId) => {
        revalidatePath(`/dashboard/proyectos/${proyectoId}`);
      });
      revalidatePath("/dashboard/propiedades");
    }

    return {
      success: errors.length === 0,
      successCount,
      errors,
    };
  } catch (error) {
    throw new Error(`Error en actualización por lotes: ${(error as Error).message}`);
  }
}

/**
 * Batch deletes multiple lotes at once
 *
 * @param loteIds - Array of lote IDs to delete
 * @returns Result with deleted count and errors
 */
export async function eliminarLotesBatch(
  loteIds: string[]
): Promise<{ success: boolean; deletedCount: number; errors: string[] }> {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No autenticado");
  }

  // Verificar permisos de administrador
  try {
    const perfil = await obtenerPerfilUsuario();
    if (!perfil || perfil.rol?.nombre !== 'ROL_ADMIN') {
      throw new Error("No tienes permisos para eliminar lotes por lotes. Solo los administradores pueden realizar esta acción.");
    }
  } catch (error) {
    throw new Error("Error verificando permisos: " + (error as Error).message);
  }

  if (!loteIds || loteIds.length === 0) {
    throw new Error("No hay lotes para eliminar");
  }

  try {
    // Get project IDs before deletion for cache revalidation
    const { data: lotes } = await supabase
      .from("lote")
      .select("proyecto_id")
      .in("id", loteIds);

    const projectIds = [...new Set(lotes?.map((l) => l.proyecto_id) || [])];

    // Delete lotes
    const { error, count } = await supabase
      .from("lote")
      .delete()
      .in("id", loteIds);

    if (error) {
      throw new Error(error.message);
    }

    // Revalidate paths
    if (count && count > 0) {
      projectIds.forEach((proyectoId) => {
        revalidatePath(`/dashboard/proyectos/${proyectoId}`);
      });
      revalidatePath("/dashboard/propiedades");
    }

    return {
      success: true,
      deletedCount: count || 0,
      errors: [],
    };
  } catch (error) {
    throw new Error(`Error en eliminación por lotes: ${(error as Error).message}`);
  }
}
