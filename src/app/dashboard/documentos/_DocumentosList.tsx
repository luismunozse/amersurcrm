"use client";

import {
  FileText,
  Image,
  FileArchive,
  File,
  Download,
  Eye,
  ExternalLink
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import toast from "react-hot-toast";

interface Documento {
  id: string;
  nombre: string;
  tipo_mime: string;
  extension: string;
  tamano_bytes: number;
  storage_tipo: 'supabase' | 'google_drive' | 'externo';
  google_drive_file_id?: string;
  google_drive_web_view_link?: string;
  created_at: string;
  carpeta?: { nombre: string; color: string };
  proyecto?: { nombre: string };
  cliente?: { nombre_completo: string };
}

interface DocumentosListProps {
  documentos: Documento[];
  vista: 'grid' | 'list';
}

export default function DocumentosList({ documentos, vista }: DocumentosListProps) {

  // Obtener icono según tipo
  const getFileIcon = (mimeType: string) => {
    if (mimeType?.startsWith('image/')) return Image;
    if (mimeType?.includes('pdf')) return FileText;
    if (mimeType?.includes('zip') || mimeType?.includes('rar')) return FileArchive;
    return File;
  };

  // Obtener color según tipo
  const getFileColor = (mimeType: string) => {
    if (mimeType?.startsWith('image/')) return 'text-purple-600 bg-purple-100';
    if (mimeType?.includes('pdf')) return 'text-red-600 bg-red-100';
    if (mimeType?.includes('word')) return 'text-blue-600 bg-blue-100';
    if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return 'text-green-600 bg-green-100';
    return 'text-gray-600 bg-gray-100';
  };

  // Formatear tamaño
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Ver documento en Google Drive
  const handleVer = (doc: Documento) => {
    if (doc.google_drive_web_view_link) {
      window.open(doc.google_drive_web_view_link, '_blank');
    } else {
      toast.error('No hay enlace disponible para este documento');
    }
  };

  // Descargar documento
  const handleDescargar = async (doc: Documento) => {
    if (!doc.google_drive_file_id) {
      toast.error('No hay archivo para descargar');
      return;
    }

    const toastId = toast.loading('Descargando archivo...');

    try {
      const response = await fetch(`/api/google-drive/download/${doc.google_drive_file_id}`);

      if (!response.ok) {
        throw new Error('Error al descargar el archivo');
      }

      // Crear un blob con la respuesta
      const blob = await response.blob();

      // Crear un enlace temporal y hacer click para descargar
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.nombre;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Archivo descargado', { id: toastId });

    } catch (error) {
      console.error('Error descargando archivo:', error);
      toast.error('Error al descargar el archivo', { id: toastId });
    }
  };

  if (documentos.length === 0) {
    return (
      <div className="crm-card p-12 rounded-xl text-center">
        <div className="w-16 h-16 bg-crm-card-hover rounded-full flex items-center justify-center mx-auto mb-4">
          <File className="w-8 h-8 text-crm-text-muted" />
        </div>
        <h3 className="text-lg font-semibold text-crm-text-primary mb-2">
          No hay documentos
        </h3>
        <p className="text-sm text-crm-text-secondary">
          Sincroniza con Google Drive para ver tus documentos
        </p>
      </div>
    );
  }

  if (vista === 'grid') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {documentos.map((doc) => {
          const Icon = getFileIcon(doc.tipo_mime, doc.extension);
          const colorClass = getFileColor(doc.tipo_mime);

          return (
            <div
              key={doc.id}
              className="crm-card p-4 rounded-xl hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-3 rounded-lg ${colorClass}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>

              <h4 className="font-medium text-crm-text-primary text-sm mb-1 truncate" title={doc.nombre}>
                {doc.nombre}
              </h4>

              <div className="flex items-center gap-2 text-xs text-crm-text-muted mb-2">
                <span>{formatBytes(doc.tamano_bytes)}</span>
                <span>•</span>
                <span>{doc.extension?.toUpperCase()}</span>
              </div>

              {doc.carpeta && (
                <span className="inline-block px-2 py-0.5 bg-crm-card-hover rounded text-xs text-crm-text-secondary mb-2">
                  {doc.carpeta.nombre}
                </span>
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-crm-border">
                <span className="text-xs text-crm-text-muted">
                  {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true, locale: es })}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleVer(doc)}
                    className="p-1.5 hover:bg-crm-card-hover rounded transition-colors"
                    title="Ver en Google Drive"
                  >
                    <Eye className="w-4 h-4 text-crm-text-secondary" />
                  </button>
                  <button
                    onClick={() => handleDescargar(doc)}
                    className="p-1.5 hover:bg-crm-card-hover rounded transition-colors"
                    title="Descargar"
                  >
                    <Download className="w-4 h-4 text-crm-text-secondary" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Vista de lista
  return (
    <div className="crm-card rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-crm-card-hover">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-crm-text-secondary uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-crm-text-secondary uppercase tracking-wider">
                Carpeta
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-crm-text-secondary uppercase tracking-wider">
                Tamaño
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-crm-text-secondary uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-crm-text-secondary uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-crm-border">
            {documentos.map((doc) => {
              const Icon = getFileIcon(doc.tipo_mime, doc.extension);
              const colorClass = getFileColor(doc.tipo_mime);

              return (
                <tr key={doc.id} className="hover:bg-crm-card-hover transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-crm-text-primary">
                          {doc.nombre}
                        </p>
                        <p className="text-xs text-crm-text-muted">
                          {doc.extension?.toUpperCase()}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {doc.carpeta && (
                      <span className="inline-block px-2 py-1 bg-crm-card-hover rounded text-xs text-crm-text-secondary">
                        {doc.carpeta.nombre}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-crm-text-secondary">
                    {formatBytes(doc.tamano_bytes)}
                  </td>
                  <td className="px-4 py-3 text-sm text-crm-text-secondary">
                    {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true, locale: es })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleVer(doc)}
                        className="p-1.5 hover:bg-crm-card-hover rounded transition-colors"
                        title="Ver en Google Drive"
                      >
                        <Eye className="w-4 h-4 text-crm-text-secondary" />
                      </button>
                      <button
                        onClick={() => handleDescargar(doc)}
                        className="p-1.5 hover:bg-crm-card-hover rounded transition-colors"
                        title="Descargar"
                      >
                        <Download className="w-4 h-4 text-crm-text-secondary" />
                      </button>
                      {doc.google_drive_web_view_link && (
                        <a
                          href={doc.google_drive_web_view_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 hover:bg-crm-card-hover rounded transition-colors"
                          title="Abrir en Google Drive"
                        >
                          <ExternalLink className="w-4 h-4 text-crm-text-secondary" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
