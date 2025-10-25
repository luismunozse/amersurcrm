import { createServiceRoleClient } from "@/lib/supabase.server";
import { GoogleDriveClient, getGoogleDriveClient } from "./client";

/**
 * Obtiene el cliente de Google Drive configurado desde la base de datos
 * Incluye refresh automático de tokens si es necesario
 */
export async function getConfiguredGoogleDriveClient(): Promise<{
  client: GoogleDriveClient;
  config: any;
} | null> {
  try {
    // Usar service role para acceder a la configuración (bypasea RLS)
    const supabase = createServiceRoleClient();

    // Obtener configuración activa de Google Drive
    const { data: config, error } = await supabase
      .from('google_drive_sync_config')
      .select('*')
      .eq('activo', true)
      .maybeSingle();

    if (error || !config) {
      console.log('No hay configuración activa de Google Drive');
      return null;
    }

    if (!config.access_token) {
      console.log('Configuración sin access_token');
      return null;
    }

    // Obtener credenciales de entorno
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('Faltan credenciales de Google Drive en variables de entorno');
      return null;
    }

    // Obtener cliente con refresh automático de tokens
    const client = await getGoogleDriveClient({
      accessToken: config.access_token,
      refreshToken: config.refresh_token || undefined,
      expiryDate: config.token_expires_at ? new Date(config.token_expires_at).getTime() : undefined,
      clientId,
      clientSecret,
      redirectUri,
    });

    return { client, config };
  } catch (error) {
    console.error('Error obteniendo cliente de Google Drive:', error);
    return null;
  }
}

/**
 * Verifica si Google Drive está configurado y conectado
 */
export async function isGoogleDriveConfigured(): Promise<boolean> {
  const result = await getConfiguredGoogleDriveClient();
  return result !== null;
}
