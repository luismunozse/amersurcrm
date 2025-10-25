import { google } from 'googleapis';

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  parents?: string[];
}

export interface GoogleDriveFolder {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink?: string;
}

export class GoogleDriveClient {
  private drive;

  constructor(accessToken: string) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    this.drive = google.drive({ version: 'v3', auth: oauth2Client });
  }

  /**
   * Lista archivos en una carpeta
   */
  async listFiles(folderId?: string, pageSize: number = 100): Promise<GoogleDriveFile[]> {
    try {
      const query = folderId
        ? `'${folderId}' in parents and trashed = false`
        : `trashed = false`;

      const response = await this.drive.files.list({
        q: query,
        pageSize,
        fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, iconLink, thumbnailLink, parents)',
        orderBy: 'modifiedTime desc'
      });

      return (response.data.files || []) as GoogleDriveFile[];
    } catch (error) {
      console.error('Error listing files from Google Drive:', error);
      throw new Error(`Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Lista carpetas
   */
  async listFolders(parentFolderId?: string): Promise<GoogleDriveFolder[]> {
    try {
      const query = parentFolderId
        ? `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
        : `mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

      const response = await this.drive.files.list({
        q: query,
        pageSize: 100,
        fields: 'files(id, name, createdTime, modifiedTime, webViewLink)',
        orderBy: 'name'
      });

      return (response.data.files || []) as GoogleDriveFolder[];
    } catch (error) {
      console.error('Error listing folders from Google Drive:', error);
      throw new Error(`Failed to list folders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Crea una carpeta
   */
  async createFolder(name: string, parentFolderId?: string): Promise<GoogleDriveFolder> {
    try {
      const fileMetadata: any = {
        name,
        mimeType: 'application/vnd.google-apps.folder'
      };

      if (parentFolderId) {
        fileMetadata.parents = [parentFolderId];
      }

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        fields: 'id, name, createdTime, modifiedTime, webViewLink'
      });

      return response.data as GoogleDriveFolder;
    } catch (error) {
      console.error('Error creating folder in Google Drive:', error);
      throw new Error(`Failed to create folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sube un archivo
   */
  async uploadFile(
    fileName: string,
    fileBuffer: Buffer,
    mimeType: string,
    folderId?: string
  ): Promise<GoogleDriveFile> {
    try {
      const fileMetadata: any = {
        name: fileName
      };

      if (folderId) {
        fileMetadata.parents = [folderId];
      }

      const { Readable } = await import('stream');
      const media = {
        mimeType,
        body: Readable.from(fileBuffer)
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink'
      });

      return response.data as GoogleDriveFile;
    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Descarga un archivo
   */
  async downloadFile(fileId: string): Promise<Buffer> {
    try {
      const response = await this.drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'arraybuffer' }
      );

      return Buffer.from(response.data as ArrayBuffer);
    } catch (error) {
      console.error('Error downloading file from Google Drive:', error);
      throw new Error(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Elimina un archivo o carpeta
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.drive.files.delete({ fileId });
    } catch (error) {
      console.error('Error deleting file from Google Drive:', error);
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtiene información de un archivo
   */
  async getFileMetadata(fileId: string): Promise<GoogleDriveFile> {
    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, iconLink, thumbnailLink, parents'
      });

      return response.data as GoogleDriveFile;
    } catch (error) {
      console.error('Error getting file metadata from Google Drive:', error);
      throw new Error(`Failed to get file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Busca archivos por nombre
   */
  async searchFiles(searchTerm: string, folderId?: string): Promise<GoogleDriveFile[]> {
    try {
      let query = `name contains '${searchTerm}' and trashed = false`;

      if (folderId) {
        query += ` and '${folderId}' in parents`;
      }

      const response = await this.drive.files.list({
        q: query,
        pageSize: 50,
        fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, iconLink, thumbnailLink)',
        orderBy: 'modifiedTime desc'
      });

      return (response.data.files || []) as GoogleDriveFile[];
    } catch (error) {
      console.error('Error searching files in Google Drive:', error);
      throw new Error(`Failed to search files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Comparte un archivo/carpeta con un usuario
   */
  async shareFile(fileId: string, email: string, role: 'reader' | 'writer' | 'commenter' = 'reader'): Promise<void> {
    try {
      await this.drive.permissions.create({
        fileId,
        requestBody: {
          type: 'user',
          role,
          emailAddress: email
        },
        sendNotificationEmail: true
      });
    } catch (error) {
      console.error('Error sharing file in Google Drive:', error);
      throw new Error(`Failed to share file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Mueve un archivo a otra carpeta
   */
  async moveFile(fileId: string, newFolderId: string): Promise<void> {
    try {
      // Primero obtener los parents actuales
      const file = await this.drive.files.get({
        fileId,
        fields: 'parents'
      });

      const previousParents = file.data.parents?.join(',');

      // Mover el archivo
      await this.drive.files.update({
        fileId,
        addParents: newFolderId,
        removeParents: previousParents,
        fields: 'id, parents'
      });
    } catch (error) {
      console.error('Error moving file in Google Drive:', error);
      throw new Error(`Failed to move file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Clase para gestionar tokens OAuth de Google
 */
export class GoogleOAuthClient {
  private oauth2Client;

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
  }

  /**
   * Genera URL de autorización
   */
  getAuthUrl(scopes: string[] = [
    'https://www.googleapis.com/auth/drive.readonly'
  ]): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent' // Fuerza mostrar pantalla de consentimiento para obtener refresh token
    });
  }

  /**
   * Obtiene tokens desde el código de autorización
   */
  async getTokensFromCode(code: string): Promise<{
    access_token: string;
    refresh_token?: string;
    expiry_date: number;
  }> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      return {
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token || undefined,
        expiry_date: tokens.expiry_date!
      };
    } catch (error) {
      console.error('Error getting tokens from code:', error);
      throw new Error(`Failed to get tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Refresca el access token usando el refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    expiry_date: number;
  }> {
    try {
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await this.oauth2Client.refreshAccessToken();

      return {
        access_token: credentials.access_token!,
        expiry_date: credentials.expiry_date!
      };
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw new Error(`Failed to refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Revoca el token (desconectar)
   */
  async revokeToken(token: string): Promise<void> {
    try {
      await this.oauth2Client.revokeToken(token);
    } catch (error) {
      console.error('Error revoking token:', error);
      throw new Error(`Failed to revoke token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Helper para obtener un cliente de Google Drive con tokens actualizados
 */
export async function getGoogleDriveClient(config: {
  accessToken: string;
  refreshToken?: string;
  expiryDate?: number;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<GoogleDriveClient> {
  const now = Date.now();

  // Si el token está expirado o expira en menos de 5 minutos
  if (config.expiryDate && config.expiryDate < now + 5 * 60 * 1000) {
    if (!config.refreshToken) {
      throw new Error('Access token expired and no refresh token available');
    }

    // Refrescar token
    const oauthClient = new GoogleOAuthClient(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    const newTokens = await oauthClient.refreshAccessToken(config.refreshToken);
    return new GoogleDriveClient(newTokens.access_token);
  }

  return new GoogleDriveClient(config.accessToken);
}
