import { createServerOnlyClient } from "@/lib/supabase.server";
import { redirect } from "next/navigation";
import DocumentosClient from "./_DocumentosClient";

export default async function DocumentosPage() {
  const supabase = await createServerOnlyClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Obtener documentos sincronizados de Google Drive (solo para estadísticas iniciales)
  // Los archivos se cargarán dinámicamente desde Google Drive API según la carpeta
  const { data: documentos } = await supabase
    .from('documento')
    .select('id, tamano_bytes, created_at')
    .eq('storage_tipo', 'google_drive')
    .order('created_at', { ascending: false });

  // Obtener configuración de Google Drive (si existe)
  const { data: googleDriveConfig } = await supabase
    .from('google_drive_sync_config')
    .select('*')
    .eq('activo', true)
    .maybeSingle();

  // Calcular estadísticas
  const totalDocumentos = documentos?.length || 0;
  const tamanoTotal = documentos?.reduce((sum, d) => sum + (d.tamano_bytes || 0), 0) || 0;
  const ultimaSincronizacion = googleDriveConfig?.ultima_sincronizacion_at || null;

  return (
    <DocumentosClient
      documentosIniciales={documentos || []}
      googleDriveConectado={!!googleDriveConfig}
      ultimaSincronizacion={ultimaSincronizacion}
      stats={{
        total: totalDocumentos,
        tamanoTotal
      }}
    />
  );
}
