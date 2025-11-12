import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { getConfiguredGoogleDriveClient } from "@/lib/google-drive/helpers";

type DataSource = "cache" | "drive";

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
    const source = (searchParams.get("source") as DataSource | null) ?? "cache";

    if (source === "cache") {
      let parentCarpetaId: string | null = null;
      if (parentFolderId && parentFolderId !== "root") {
        const { data: parentRecord, error: parentError } = await supabase
          .from("carpeta_documento")
          .select("id")
          .eq("google_drive_folder_id", parentFolderId)
          .maybeSingle();

        if (parentError) {
          console.error("Error consultando carpeta padre:", parentError);
          return NextResponse.json(
            { error: "Error consultando carpetas" },
            { status: 500 }
          );
        }

        if (!parentRecord) {
          return NextResponse.json({
            success: true,
            folders: [],
            total: 0,
            parentFolderId: parentFolderId || null,
            source: "cache",
            cacheHit: false,
          });
        }

        parentCarpetaId = parentRecord.id;
      }

      let query = supabase
        .from("carpeta_documento")
        .select("id, nombre, google_drive_folder_id, created_at, updated_at")
        .order("nombre", { ascending: true });

      if (parentCarpetaId) {
        query = query.eq("carpeta_padre_id", parentCarpetaId);
      } else if (!parentFolderId || parentFolderId === "root") {
        query = query.is("carpeta_padre_id", null);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error consultando carpetas cacheadas:", error);
        return NextResponse.json(
          { error: "Error consultando carpetas" },
          { status: 500 }
        );
      }

      const folders = (data ?? []).map((folder) => ({
        id: folder.google_drive_folder_id ?? folder.id,
        name: folder.nombre,
        createdTime: folder.created_at,
        modifiedTime: folder.updated_at,
      }));

      return NextResponse.json({
        success: true,
        folders,
        total: folders.length,
        parentFolderId: parentFolderId || null,
        source: "cache",
        cacheHit: Boolean(folders.length),
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

    // Listar carpetas
    const folders = await client.listFolders(parentFolderId);

    return NextResponse.json({
      success: true,
      folders,
      total: folders.length,
      parentFolderId: parentFolderId || null,
      source: "drive",
      cacheHit: false,
    });

  } catch (error) {
    console.error('Error en GET /api/google-drive/folders:', error);

    return NextResponse.json({
      error: "Error listando carpetas",
      message: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 });
  }
}
