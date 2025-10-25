import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { getConfiguredGoogleDriveClient } from "@/lib/google-drive/helpers";

/**
 * GET /api/google-drive/download/[fileId]
 * Descarga un archivo de Google Drive
 *
 * El archivo se descarga como stream y se devuelve al cliente con los headers apropiados
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    // Verificar autenticación
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { fileId } = params;

    if (!fileId) {
      return NextResponse.json({ error: "fileId es requerido" }, { status: 400 });
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

    // Primero obtener metadatos para el nombre y tipo de archivo
    const fileMetadata = await client.getFileMetadata(fileId);

    // Descargar el archivo
    const fileBuffer = await client.downloadFile(fileId);

    // Registrar la descarga en documento_actividad
    await supabase
      .from('documento_actividad')
      .insert({
        documento_id: fileId,
        usuario_id: user.id,
        accion: 'descargado',
        detalles: {
          nombre: fileMetadata.name,
          tamano: fileMetadata.size,
        },
      })
      .catch((err) => {
        console.error('Error registrando actividad de descarga:', err);
        // No fallar si no se puede registrar la actividad
      });

    // Devolver el archivo con los headers apropiados
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': fileMetadata.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileMetadata.name)}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error(`Error en GET /api/google-drive/download/${params?.fileId}:`, error);

    return NextResponse.json({
      error: "Error descargando archivo",
      message: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 });
  }
}
