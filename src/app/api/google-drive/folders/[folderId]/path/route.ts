import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { getConfiguredGoogleDriveClient } from "@/lib/google-drive/helpers";

/**
 * GET /api/google-drive/folders/[folderId]/path
 * Obtiene la ruta completa (breadcrumbs) de una carpeta en Google Drive
 *
 * Returns: Array de carpetas desde la raíz hasta la carpeta actual
 * Ejemplo: [{ id: 'root', name: 'Mi Drive' }, { id: 'xxx', name: 'Documentos' }, { id: 'yyy', name: 'Contratos' }]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    // Verificar autenticación
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { folderId } = await params;
    const sourceParam = request.nextUrl.searchParams.get("source") as ("cache" | "drive" | null);

    // Si es root, retornar solo root
    if (folderId === 'root' || !folderId) {
      return NextResponse.json({
        success: true,
        path: [
          { id: 'root', name: 'Mi Drive' }
        ],
        source: sourceParam ?? "cache",
        cacheHit: true,
      });
    }

    type FolderRecord = {
      id: string;
      nombre: string;
      google_drive_folder_id: string | null;
      carpeta_padre_id: string | null;
    };

    const buildPathFromCache = async (): Promise<
      | { path: Array<{ id: string; name: string }>; cacheHit: boolean }
      | null
    > => {
      const path: Array<{ id: string; name: string }> = [];
      let currentGoogleId: string | null = folderId;
      let guard = 20;

      while (currentGoogleId && guard > 0) {
        const { data: recordData, error } = await supabase
          .from("carpeta_documento")
          .select("id, nombre, google_drive_folder_id, carpeta_padre_id")
          .eq("google_drive_folder_id", currentGoogleId)
          .maybeSingle<FolderRecord>();

        if (error) {
          console.error("Error consultando carpeta_documento:", error);
          return null;
        }

        const record = recordData as FolderRecord | null;

        if (!record) {
          return { path, cacheHit: false };
        }

        path.unshift({
          id: record.google_drive_folder_id ?? currentGoogleId,
          name: record.nombre,
        });

        if (!record.carpeta_padre_id) {
          currentGoogleId = null;
        } else {
          const { data: parentRecordData, error: parentError } = await supabase
            .from("carpeta_documento")
            .select("google_drive_folder_id")
            .eq("id", record.carpeta_padre_id)
            .maybeSingle<{ google_drive_folder_id: string | null }>();

          if (parentError) {
            console.error("Error consultando carpeta padre:", parentError);
            return null;
          }

          const parentRecord = parentRecordData as { google_drive_folder_id: string | null } | null;
          currentGoogleId = parentRecord?.google_drive_folder_id ?? null;
        }

        guard--;
      }

      if (path.length > 0 && path[0].id !== "root") {
        path.unshift({ id: "root", name: "Mi Drive" });
      }

      return { path, cacheHit: true };
    };

    const cached = await buildPathFromCache();

    if (sourceParam !== "drive" && cached && cached.cacheHit) {
      return NextResponse.json({
        success: true,
        path: cached.path,
        source: "cache",
        cacheHit: true,
      });
    }

    // Obtener cliente configurado de Google Drive
    const driveData = await getConfiguredGoogleDriveClient({ supabaseClient: supabase });

    if (!driveData) {
      return NextResponse.json({
        error: "Google Drive no configurado",
        message: "No hay conexión activa con Google Drive"
      }, { status: 503 });
    }

    const { client } = driveData;

    // Construir la ruta completa navegando hacia arriba
    const path: Array<{ id: string; name: string }> = [];
    let currentFolderId: string | undefined = folderId;

    // Límite de 20 niveles para evitar loops infinitos
    let maxDepth = 20;

    while (currentFolderId && maxDepth > 0) {
      try {
        const folderMetadata = await client.getFileMetadata(currentFolderId);

        path.unshift({
          id: folderMetadata.id,
          name: folderMetadata.name
        });

        // Obtener el parent folder
        if (folderMetadata.parents && folderMetadata.parents.length > 0) {
          currentFolderId = folderMetadata.parents[0];
        } else {
          // No tiene parent, llegamos a la raíz
          currentFolderId = undefined;
        }
      } catch (error) {
        console.error(`Error obteniendo metadata de carpeta ${currentFolderId}:`, error);
        break;
      }

      maxDepth--;
    }

    // Agregar "Mi Drive" al inicio si no llegamos a root
    if (path.length > 0 && path[0].id !== 'root') {
      path.unshift({ id: 'root', name: 'Mi Drive' });
    }

    return NextResponse.json({
      success: true,
      path,
      source: "drive",
      cacheHit: false,
    });

  } catch (error) {
    console.error('Error en GET /api/google-drive/folders/[folderId]/path:', error);

    return NextResponse.json({
      error: "Error obteniendo ruta de carpeta",
      message: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 });
  }
}
