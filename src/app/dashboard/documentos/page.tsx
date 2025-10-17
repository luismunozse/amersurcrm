import { createServerOnlyClient } from "@/lib/supabase.server";
import { redirect } from "next/navigation";
import DocumentosClient from "./_DocumentosClient";

export default async function DocumentosPage() {
  const supabase = await createServerOnlyClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Obtener carpetas
  const { data: carpetas } = await supabase
    .from('carpeta_documento')
    .select('*')
    .order('posicion', { ascending: true });

  // Obtener documentos del usuario
  const { data: documentos } = await supabase
    .from('documento')
    .select(`
      *,
      carpeta:carpeta_documento(id, nombre, color, icono),
      proyecto:proyecto(id, nombre),
      lote:lote(id, codigo),
      cliente:cliente(id, nombre_completo)
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  // Obtener configuración de Google Drive (si existe)
  const { data: googleDriveConfig } = await supabase
    .from('google_drive_sync_config')
    .select('*')
    .eq('activo', true)
    .single();

  // Calcular estadísticas
  const totalDocumentos = documentos?.length || 0;
  const documentosSupabase = documentos?.filter(d => d.storage_tipo === 'supabase').length || 0;
  const documentosGoogleDrive = documentos?.filter(d => d.storage_tipo === 'google_drive').length || 0;
  const tamanoTotal = documentos?.reduce((sum, d) => sum + (d.tamano_bytes || 0), 0) || 0;

  return (
    <DocumentosClient
      carpetas={carpetas || []}
      documentosIniciales={documentos || []}
      googleDriveConectado={!!googleDriveConfig}
      stats={{
        total: totalDocumentos,
        supabase: documentosSupabase,
        googleDrive: documentosGoogleDrive,
        tamanoTotal
      }}
    />
  );
}
