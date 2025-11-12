import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { getConfiguredGoogleDriveClient } from "@/lib/google-drive/helpers";

const DEFAULT_PAGE_SIZE = 100;
type DataSource = "cache" | "drive";

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
    const page = searchParams.get("page") ? Math.max(1, parseInt(searchParams.get("page")!, 10)) : 1;
    const pageSize = searchParams.get('pageSize')
      ? Math.min(parseInt(searchParams.get('pageSize')!), 500)
      : DEFAULT_PAGE_SIZE;
    const search = searchParams.get("search")?.trim();
    const source = (searchParams.get("source") as DataSource | null) ?? "cache";

    if (source === "cache") {
      const offset = (page - 1) * pageSize;

      let carpetaId: string | null = null;
      if (folderId && folderId !== "root") {
        const { data: folderRecord, error: folderError } = await supabase
          .from("carpeta_documento")
          .select("id")
          .eq("google_drive_folder_id", folderId)
          .maybeSingle();

        if (folderError) {
          console.error("Error consultando carpeta_documento:", folderError);
          return NextResponse.json(
            { error: "Error consultando carpetas" },
            { status: 500 }
          );
        }

        if (!folderRecord) {
          return NextResponse.json({
            success: true,
            files: [],
            total: 0,
            folderId: folderId || null,
            page,
            pageSize,
            source: "cache",
            cacheHit: false,
          });
        }

        carpetaId = folderRecord.id;
      }

      let query = supabase
        .from("documento")
        .select(
          `
            id,
            nombre,
            tipo_mime,
            tamano_bytes,
            google_drive_file_id,
            google_drive_web_view_link,
            google_drive_download_link,
            created_at,
            updated_at,
            ultima_sincronizacion_at,
            carpeta:carpeta_documento(google_drive_folder_id)
          `,
          { count: "exact" }
        )
        .eq("storage_tipo", "google_drive")
        .eq("sincronizado_google_drive", true);

      if (carpetaId) {
        query = query.eq("carpeta_id", carpetaId);
      } else if (!folderId || folderId === "root") {
        query = query.is("carpeta_id", null);
      }

      if (search) {
        query = query.ilike("nombre", `%${search}%`);
      }

      // Ordenar por actualizado más reciente
      query = query
        .order("updated_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error("Error consultando documentos cacheados:", error);
        return NextResponse.json(
          { error: "Error consultando documentos" },
          { status: 500 }
        );
      }

      type FolderRelation =
        | { google_drive_folder_id?: string | null; nombre?: string | null }
        | Array<{ google_drive_folder_id?: string | null; nombre?: string | null }>
        | null;

      const files = (data ?? []).map((doc) => {
        const folderRelation = doc.carpeta as FolderRelation;
        let parentFolderId: string | null = null;
        let folderName: string | null = null;

        if (Array.isArray(folderRelation)) {
          if (folderRelation.length > 0) {
            parentFolderId = folderRelation[0]?.google_drive_folder_id ?? null;
            folderName = folderRelation[0]?.nombre ?? null;
          }
        } else if (folderRelation) {
          parentFolderId = folderRelation.google_drive_folder_id ?? null;
          folderName = folderRelation.nombre ?? null;
        }

        const modifiedTime =
          doc.updated_at ??
          doc.ultima_sincronizacion_at ??
          doc.created_at ??
          new Date().toISOString();

        return {
          id: doc.google_drive_file_id ?? doc.id,
          name: doc.nombre,
          mimeType: doc.tipo_mime,
          size: doc.tamano_bytes ? String(doc.tamano_bytes) : undefined,
          createdTime: doc.created_at,
          modifiedTime,
          webViewLink: doc.google_drive_web_view_link,
          webContentLink: doc.google_drive_download_link,
          parents: parentFolderId ? [parentFolderId] : undefined,
          folderName,
          cached: true,
        };
      });

      return NextResponse.json({
        success: true,
        files,
        total: count ?? files.length,
        folderId: folderId || null,
        page,
        pageSize,
        source: "cache",
        cacheHit: Boolean(files.length),
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

    // Listar archivos
    const files = await client.listFiles(folderId, pageSize);

    return NextResponse.json({
      success: true,
      files,
      total: files.length,
      folderId: folderId || null,
      source: "drive",
      cacheHit: false,
    });

  } catch (error) {
    console.error('Error en GET /api/google-drive/files:', error);

    return NextResponse.json({
      error: "Error listando archivos",
      message: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 });
  }
}
