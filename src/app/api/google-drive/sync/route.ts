import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient, createServiceRoleClient } from "@/lib/supabase.server";
import { getConfiguredGoogleDriveClient } from "@/lib/google-drive/helpers";
import type { GoogleDriveFile } from "@/lib/google-drive/client";

/**
 * POST /api/google-drive/sync
 * Sincroniza metadatos de archivos de Google Drive con la base de datos local
 *
 * Body (opcional):
 * - folderId: ID de carpeta específica para sincronizar (si no se envía, sincroniza todo)
 * - fullSync: true para sincronización completa (borra y recrea), false para incremental
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación con cliente normal
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Usar service role client para operaciones de base de datos (bypasea RLS)
    const serviceSupabase = createServiceRoleClient();

    // Obtener parámetros del body
    const body = await request.json().catch(() => ({}));
    const folderId = body.folderId || undefined;
    const fullSync = body.fullSync === true;

    // Obtener cliente configurado de Google Drive
    const driveData = await getConfiguredGoogleDriveClient({ supabaseClient: serviceSupabase });

    if (!driveData) {
      return NextResponse.json({
        error: "Google Drive no configurado",
        message: "No hay conexión activa con Google Drive"
      }, { status: 503 });
    }

    const { client, config } = driveData;

    const folderCache = new Map<string, { id: string }>();

    const ensureFolder = async (folderGoogleId?: string | null): Promise<string | null> => {
      if (!folderGoogleId || folderGoogleId === "root" || folderGoogleId === config.root_folder_id) {
        return null;
      }

      if (folderCache.has(folderGoogleId)) {
        return folderCache.get(folderGoogleId)!.id;
      }

      const { data: existing, error: existingError } = await serviceSupabase
        .from("carpeta_documento")
        .select("id, nombre, carpeta_padre_id, google_drive_folder_id")
        .eq("google_drive_folder_id", folderGoogleId)
        .maybeSingle();

      if (existingError) {
        console.error("[SYNC] Error consultando carpeta_documento:", existingError);
      }

      let metadata: GoogleDriveFile | null = null;
      try {
        metadata = await client.getFileMetadata(folderGoogleId);
      } catch (error) {
        console.error(`[SYNC] No se pudo obtener metadata de la carpeta ${folderGoogleId}:`, error);
      }

      if (existing && !metadata) {
        folderCache.set(folderGoogleId, { id: existing.id });
        return existing.id;
      }

      if (!metadata || metadata.mimeType !== "application/vnd.google-apps.folder") {
        return existing ? existing.id : null;
      }

      const parentGoogleId = metadata.parents?.[0] ?? null;
      const parentId = await ensureFolder(parentGoogleId);

      if (existing) {
        const updates: Record<string, unknown> = {};
        if (existing.nombre !== metadata.name) {
          updates.nombre = metadata.name;
        }
        if ((existing.carpeta_padre_id ?? null) !== parentId) {
          updates.carpeta_padre_id = parentId;
        }
        if (Object.keys(updates).length > 0) {
          updates.updated_at = new Date().toISOString();
          const { error: updateError } = await serviceSupabase
            .from("carpeta_documento")
            .update(updates)
            .eq("id", existing.id);
          if (updateError) {
            console.error(`[SYNC] Error actualizando datos de carpeta ${folderGoogleId}:`, updateError);
          }
        }
        folderCache.set(folderGoogleId, { id: existing.id });
        return existing.id;
      }

      const insertPayload = {
        nombre: metadata.name || "Carpeta sin nombre",
        google_drive_folder_id: metadata.id,
        carpeta_padre_id: parentId,
        created_at: metadata.createdTime ? new Date(metadata.createdTime).toISOString() : new Date().toISOString(),
        updated_at: metadata.modifiedTime ? new Date(metadata.modifiedTime).toISOString() : new Date().toISOString(),
      };

      const { data: inserted, error: insertError } = await serviceSupabase
        .from("carpeta_documento")
        .insert(insertPayload)
        .select("id")
        .single();

      if (insertError) {
        console.error(`[SYNC] Error creando carpeta ${folderGoogleId}:`, insertError);
        return null;
      }

      folderCache.set(folderGoogleId, { id: inserted.id });
      return inserted.id;
    };


    // Si es sincronización completa, eliminar documentos existentes de Google Drive
    if (fullSync) {
      const { error: deleteError } = await serviceSupabase
        .from('documento')
        .delete()
        .eq('storage_tipo', 'google_drive');

      if (deleteError) {
        console.error('[SYNC] Error eliminando documentos:', deleteError);
      }
    }

    // Listar archivos de Google Drive
    const files = await client.listFiles(folderId, 1000);


    // Filtrar solo archivos (excluir carpetas)
    const archivos = files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');

    // Estadísticas de sincronización
    let inserted = 0;
    let updated = 0;
    let errors = 0;
    const errorsDetails: string[] = [];

    // Insertar/actualizar cada archivo en la base de datos
    for (const file of archivos) {
      try {

        // Verificar si el documento ya existe
        const { data: existing } = await serviceSupabase
          .from('documento')
          .select('id')
          .eq('google_drive_file_id', file.id)
          .maybeSingle();

        // Extraer extensión del nombre
        const extension = file.name.includes('.')
          ? file.name.split('.').pop()!.toLowerCase()
          : null;

        const parentGoogleId = file.parents?.[0] ?? null;
        const carpetaId = await ensureFolder(parentGoogleId);

        const documentData = {
          nombre: file.name,
          storage_tipo: 'google_drive' as const,
          google_drive_file_id: file.id,
          google_drive_web_view_link: file.webViewLink,
          google_drive_download_link: file.webContentLink,
          tipo_mime: file.mimeType,
          extension,
          tamano_bytes: file.size ? parseInt(file.size) : null,
          sincronizado_google_drive: true,
          ultima_sincronizacion_at: new Date().toISOString(),
          created_by: user.id,
          updated_by: user.id,
          carpeta_id: carpetaId,
          updated_at: new Date().toISOString(),
        };

        if (existing) {
          // Actualizar existente
          const { error: updateError } = await serviceSupabase
            .from('documento')
            .update({
              ...documentData,
            })
            .eq('id', existing.id);

          if (updateError) {
            console.error(`[SYNC] Error actualizando documento ${file.id}:`, updateError);
            errorsDetails.push(`${file.name}: ${updateError.message}`);
            errors++;
          } else {
            updated++;
          }
        } else {
          // Insertar nuevo
          const { error: insertError } = await serviceSupabase
            .from('documento')
            .insert(documentData);

          if (insertError) {
            console.error(`[SYNC] Error insertando documento ${file.id}:`, insertError);
            errorsDetails.push(`${file.name}: ${insertError.message}`);
            errors++;
          } else {
            inserted++;
          }
        }
      } catch (fileError) {
        console.error(`[SYNC] Error procesando archivo ${file.id}:`, fileError);
        errorsDetails.push(`${file.name}: ${fileError instanceof Error ? fileError.message : 'Error desconocido'}`);
        errors++;
      }
    }


    // Actualizar timestamp de última sincronización en la configuración
    await serviceSupabase
      .from('google_drive_sync_config')
      .update({
        ultima_sincronizacion_at: new Date().toISOString(),
      })
      .eq('id', config.id);

    return NextResponse.json({
      success: true,
      message: "Sincronización completada",
      stats: {
        total: archivos.length,
        totalFiles: files.length,
        folders: files.length - archivos.length,
        inserted,
        updated,
        errors,
        fullSync,
      },
      errorsDetails: errorsDetails.length > 0 ? errorsDetails : undefined
    });

  } catch (error) {
    console.error('Error en POST /api/google-drive/sync:', error);

    return NextResponse.json({
      error: "Error sincronizando archivos",
      message: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 });
  }
}
