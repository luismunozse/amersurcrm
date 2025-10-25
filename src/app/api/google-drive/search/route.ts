import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { getConfiguredGoogleDriveClient } from "@/lib/google-drive/helpers";

/**
 * GET /api/google-drive/search
 * Busca archivos en Google Drive por nombre
 *
 * Query params:
 * - q: Término de búsqueda (requerido)
 * - folderId: ID de la carpeta donde buscar (opcional, si no se envía busca en todo el drive)
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
    const searchTerm = searchParams.get('q');
    const folderId = searchParams.get('folderId') || undefined;

    if (!searchTerm || searchTerm.trim().length === 0) {
      return NextResponse.json({
        error: "Término de búsqueda requerido",
        message: "Debes proporcionar un término de búsqueda usando el parámetro 'q'"
      }, { status: 400 });
    }

    // Obtener cliente configurado de Google Drive
    const driveData = await getConfiguredGoogleDriveClient();

    if (!driveData) {
      return NextResponse.json({
        error: "Google Drive no configurado",
        message: "No hay conexión activa con Google Drive"
      }, { status: 503 });
    }

    const { client } = driveData;

    // Buscar archivos
    const files = await client.searchFiles(searchTerm, folderId);

    return NextResponse.json({
      success: true,
      files,
      total: files.length,
      searchTerm,
      folderId: folderId || null
    });

  } catch (error) {
    console.error('Error en GET /api/google-drive/search:', error);

    return NextResponse.json({
      error: "Error buscando archivos",
      message: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 });
  }
}
