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
  let googleDriveConfig: { access_token: string | null; ultima_sincronizacion_at: string | null } | null = null;
  let googleDriveConfigError: string | null = null;

  try {
    const { data, error } = await supabase
      .from('google_drive_sync_config')
      .select('access_token, ultima_sincronizacion_at')
      .eq('activo', true)
      .maybeSingle();

    if (error) {
      console.error('Error consultando google_drive_sync_config:', error);
      googleDriveConfigError = error.message;
    } else {
      googleDriveConfig = data;
    }
  } catch (error) {
    console.error('Excepción consultando google_drive_sync_config:', error);
    googleDriveConfigError = error instanceof Error ? error.message : 'Error desconocido';
  }

  const hasGoogleDriveConfig = Boolean(googleDriveConfig?.access_token);
  const googleEnvConfigured = Boolean(
    process.env.GOOGLE_DRIVE_CLIENT_ID &&
    process.env.GOOGLE_DRIVE_CLIENT_SECRET &&
    process.env.GOOGLE_DRIVE_REDIRECT_URI
  );
  const serviceRoleConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const googleDriveConectado = Boolean(
    hasGoogleDriveConfig && googleEnvConfigured && serviceRoleConfigured
  );

  // Calcular estadísticas
  const totalDocumentos = documentos?.length || 0;
  const tamanoTotal = documentos?.reduce((sum, d) => sum + (d.tamano_bytes || 0), 0) || 0;
  const ultimaSincronizacion = googleDriveConectado
    ? googleDriveConfig?.ultima_sincronizacion_at || null
    : null;

  return (
    <DocumentosClient
      googleDriveConectado={googleDriveConectado}
      ultimaSincronizacion={ultimaSincronizacion}
      stats={{
        total: totalDocumentos,
        tamanoTotal
      }}
      googleDriveStatus={{
        hasConfig: hasGoogleDriveConfig,
        envReady: googleEnvConfigured,
        serviceRoleReady: serviceRoleConfigured,
        configError: googleDriveConfigError
      }}
    />
  );
}
