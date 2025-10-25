import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { getConfiguredGoogleDriveClient } from "@/lib/google-drive/helpers";

/**
 * GET /api/google-drive/folders
 * Lista carpetas de Google Drive
 *
 * Query params:
 * - parentFolderId: ID de la carpeta padre (opcional, si no se envía lista carpetas raíz)
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener parámetros de query
    const searchParams = request.nextUrl.searchParams;
    const parentFolderId = searchParams.get('parentFolderId') || undefined;

    // Obtener cliente configurado de Google Drive
    const driveData = await getConfiguredGoogleDriveClient();

    if (!driveData) {
      return NextResponse.json({
        error: "Google Drive no configurado",
        message: "No hay conexión activa con Google Drive"
      }, { status: 503 });
    }

    const { client } = driveData;

    // Listar carpetas
    const folders = await client.listFolders(parentFolderId);

    return NextResponse.json({
      success: true,
      folders,
      total: folders.length,
      parentFolderId: parentFolderId || null
    });

  } catch (error) {
    console.error('Error en GET /api/google-drive/folders:', error);

    return NextResponse.json({
      error: "Error listando carpetas",
      message: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 });
  }
}
