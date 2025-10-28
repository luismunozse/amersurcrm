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
  _request: NextRequest,
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

    // Si es root, retornar solo root
    if (folderId === 'root' || !folderId) {
      return NextResponse.json({
        success: true,
        path: [
          { id: 'root', name: 'Mi Drive' }
        ]
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
      path
    });

  } catch (error) {
    console.error('Error en GET /api/google-drive/folders/[folderId]/path:', error);

    return NextResponse.json({
      error: "Error obteniendo ruta de carpeta",
      message: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 });
  }
}
