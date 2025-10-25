import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { getConfiguredGoogleDriveClient } from "@/lib/google-drive/helpers";

/**
 * GET /api/google-drive/test
 * Endpoint de prueba para verificar conexión con Google Drive
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    console.log('[TEST] Usuario autenticado:', user.id);

    // Obtener cliente configurado de Google Drive
    const driveData = await getConfiguredGoogleDriveClient();

    if (!driveData) {
      return NextResponse.json({
        error: "Google Drive no configurado",
        message: "No hay conexión activa con Google Drive"
      }, { status: 503 });
    }

    console.log('[TEST] Cliente de Google Drive obtenido');

    const { client, config } = driveData;

    console.log('[TEST] Config:', {
      id: config.id,
      hasAccessToken: !!config.access_token,
      hasRefreshToken: !!config.refresh_token,
      tokenExpiresAt: config.token_expires_at
    });

    // Intentar listar archivos
    console.log('[TEST] Listando archivos...');
    const files = await client.listFiles(undefined, 10);

    console.log(`[TEST] Archivos encontrados: ${files.length}`);

    return NextResponse.json({
      success: true,
      message: "Conexión exitosa con Google Drive",
      config: {
        id: config.id,
        hasAccessToken: !!config.access_token,
        hasRefreshToken: !!config.refresh_token,
        tokenExpiresAt: config.token_expires_at,
        ultimaSincronizacion: config.ultima_sincronizacion_at
      },
      files: {
        total: files.length,
        muestra: files.slice(0, 5).map(f => ({
          id: f.id,
          nombre: f.name,
          tipo: f.mimeType,
          tamaño: f.size
        }))
      }
    });

  } catch (error) {
    console.error('[TEST] Error:', error);

    return NextResponse.json({
      error: "Error de conexión",
      message: error instanceof Error ? error.message : "Error desconocido",
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
