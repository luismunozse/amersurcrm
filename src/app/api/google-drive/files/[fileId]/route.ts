import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { getConfiguredGoogleDriveClient } from "@/lib/google-drive/helpers";

type FileRouteContext = {
  params: Promise<{
    fileId: string;
  }>;
};

/**
 * GET /api/google-drive/files/[fileId]
 * Obtiene metadatos de un archivo específico de Google Drive
 */
export async function GET(
  request: NextRequest,
  context: FileRouteContext
) {
  let fileId: string | undefined;
  try {
    const resolvedParams = await context.params;
    fileId = resolvedParams?.fileId;

    // Verificar autenticación
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!fileId) {
      return NextResponse.json({ error: "fileId es requerido" }, { status: 400 });
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

    // Obtener metadatos del archivo
    const fileMetadata = await client.getFileMetadata(fileId);

    return NextResponse.json({
      success: true,
      file: fileMetadata
    });

  } catch (error) {
    console.error(`Error en GET /api/google-drive/files/${fileId ?? "unknown"}:`, error);

    return NextResponse.json({
      error: "Error obteniendo archivo",
      message: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 });
  }
}
