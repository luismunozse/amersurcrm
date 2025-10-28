import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient, createServiceRoleClient } from "@/lib/supabase.server";
import { getConfiguredGoogleDriveClient } from "@/lib/google-drive/helpers";

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

    console.log('[SYNC] Iniciando sincronización...');
    console.log('[SYNC] FolderId:', folderId || 'root (todos)');
    console.log('[SYNC] FullSync:', fullSync);

    // Si es sincronización completa, eliminar documentos existentes de Google Drive
    if (fullSync) {
      console.log('[SYNC] Eliminando documentos existentes...');
      const { error: deleteError } = await serviceSupabase
        .from('documento')
        .delete()
        .eq('storage_tipo', 'google_drive');

      if (deleteError) {
        console.error('[SYNC] Error eliminando documentos:', deleteError);
      }
    }

    // Listar archivos de Google Drive
    console.log('[SYNC] Listando archivos de Google Drive...');
    const files = await client.listFiles(folderId, 1000);

    console.log(`[SYNC] Archivos encontrados en Google Drive: ${files.length}`);

    // Filtrar solo archivos (excluir carpetas)
    const archivos = files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');
    console.log(`[SYNC] Archivos (sin carpetas): ${archivos.length}`);

    // Estadísticas de sincronización
    let inserted = 0;
    let updated = 0;
    let errors = 0;
    const errorsDetails: string[] = [];

    // Insertar/actualizar cada archivo en la base de datos
    for (const file of archivos) {
      try {
        console.log(`[SYNC] Procesando: ${file.name} (${file.mimeType})`);

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
        };

        if (existing) {
          // Actualizar existente
          console.log(`[SYNC] Actualizando: ${file.name}`);
          const { error: updateError } = await serviceSupabase
            .from('documento')
            .update({
              ...documentData,
              updated_at: new Date().toISOString(),
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
          console.log(`[SYNC] Insertando nuevo: ${file.name}`);
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

    console.log('[SYNC] Sincronización completada');
    console.log(`[SYNC] Inserted: ${inserted}, Updated: ${updated}, Errors: ${errors}`);

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
