import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { getConfiguredGoogleDriveClient } from "@/lib/google-drive/helpers";

/**
 * GET /api/google-drive/files
 * Lista archivos de Google Drive
 *
 * Query params:
 * - folderId: ID de la carpeta (opcional, si no se envía lista todos)
 * - pageSize: Número de archivos a devolver (opcional, default 100)
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
    const folderId = searchParams.get('folderId') || undefined;
    const pageSize = searchParams.get('pageSize')
      ? parseInt(searchParams.get('pageSize')!)
      : 100;

    // Obtener cliente configurado de Google Drive
    const driveData = await getConfiguredGoogleDriveClient({ supabaseClient: supabase });

    if (!driveData) {
      return NextResponse.json({
        error: "Google Drive no configurado",
        message: "No hay conexión activa con Google Drive"
      }, { status: 503 });
    }

    const { client } = driveData;

    // Listar archivos
    const files = await client.listFiles(folderId, pageSize);

    return NextResponse.json({
      success: true,
      files,
      total: files.length,
      folderId: folderId || null
    });

  } catch (error) {
    console.error('Error en GET /api/google-drive/files:', error);

    return NextResponse.json({
      error: "Error listando archivos",
      message: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 });
  }
}
