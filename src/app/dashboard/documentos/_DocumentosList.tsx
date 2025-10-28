"use client";

import {
  FileText,
  Image,
  FileArchive,
  File,
  Download,
  Eye,
  Folder,
  FolderOpen
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import toast from "react-hot-toast";

export interface GoogleDriveDocumento {
  id: string;
  nombre: string;
  tipo_mime?: string | null;
  extension?: string | null;
  tamano_bytes?: number | null;
  storage_tipo?: "supabase" | "google_drive" | "externo";
  google_drive_file_id?: string;
  google_drive_web_view_link?: string;
  created_at?: string;
  updated_at?: string;
  modificado_at?: string;
  carpeta?: { nombre: string; color: string };
  proyecto?: { nombre: string };
  cliente?: { nombre_completo: string };
  es_carpeta?: boolean;
}

interface DocumentosListProps {
  documentos: GoogleDriveDocumento[];
  vista: "grid" | "list";
  onOpenFolder?: (doc: GoogleDriveDocumento) => void;
}

function esCarpeta(doc: GoogleDriveDocumento): boolean {
  return Boolean(doc.es_carpeta || doc.tipo_mime === "application/vnd.google-apps.folder");
}

function obtenerIcono(doc: GoogleDriveDocumento) {
  if (esCarpeta(doc)) return Folder;
  const mimeType = doc.tipo_mime ?? "";
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.includes("pdf")) return FileText;
  if (mimeType.includes("zip") || mimeType.includes("rar")) return FileArchive;
  return File;
}

function obtenerColor(doc: GoogleDriveDocumento) {
  if (esCarpeta(doc)) return "text-amber-600 bg-amber-100";
  const mimeType = doc.tipo_mime ?? "";
  if (mimeType.startsWith("image/")) return "text-purple-600 bg-purple-100";
  if (mimeType.includes("pdf")) return "text-red-600 bg-red-100";
  if (mimeType.includes("word")) return "text-blue-600 bg-blue-100";
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "text-green-600 bg-green-100";
  return "text-gray-600 bg-gray-100";
}

function formatearBytes(bytes?: number | null) {
  if (bytes === null || bytes === undefined) return "—";
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

function formatearFecha(valor?: string) {
  if (!valor) return "—";
  return formatDistanceToNow(new Date(valor), { addSuffix: true, locale: es });
}

export default function DocumentosList({ documentos, vista, onOpenFolder }: DocumentosListProps) {
  const handleVer = (doc: GoogleDriveDocumento) => {
    if (esCarpeta(doc)) {
      onOpenFolder?.(doc);
      return;
    }

    if (doc.google_drive_web_view_link) {
      window.open(doc.google_drive_web_view_link, "_blank");
    } else {
      toast.error("No hay enlace disponible para este documento");
    }
  };

  const handleDescargar = async (doc: GoogleDriveDocumento) => {
    if (esCarpeta(doc)) {
      onOpenFolder?.(doc);
      return;
    }

    if (!doc.google_drive_file_id) {
      toast.error("No hay archivo para descargar");
      return;
    }

    const toastId = toast.loading("Descargando archivo...");

    try {
      const response = await fetch(`/api/google-drive/download/${doc.google_drive_file_id}`);

      if (!response.ok) {
        throw new Error("Error al descargar el archivo");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.nombre;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Archivo descargado", { id: toastId });
    } catch (error) {
      console.error("Error descargando archivo:", error);
      toast.error("Error al descargar el archivo", { id: toastId });
    }
  };

  if (documentos.length === 0) {
    return (
      <div className="crm-card p-12 rounded-xl text-center">
        <div className="w-16 h-16 bg-crm-card-hover rounded-full flex items-center justify-center mx-auto mb-4">
          <File className="w-8 h-8 text-crm-text-muted" />
        </div>
        <h3 className="text-lg font-semibold text-crm-text-primary mb-2">No hay documentos</h3>
        <p className="text-sm text-crm-text-secondary">
          Sincroniza con Google Drive para ver tus documentos
        </p>
      </div>
    );
  }

  if (vista === "grid") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {documentos.map((doc) => {
          const Icon = obtenerIcono(doc);
          const colorClass = obtenerColor(doc);
          const carpeta = esCarpeta(doc);

          return (
            <div
              key={doc.id}
              className="crm-card p-4 rounded-xl hover:shadow-md transition-all group cursor-pointer"
              onDoubleClick={() => (carpeta ? onOpenFolder?.(doc) : handleVer(doc))}
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
                <span>{carpeta ? "Carpeta" : formatearBytes(doc.tamano_bytes)}</span>
                {!carpeta && doc.extension && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-crm-card-hover text-crm-text-secondary uppercase">
                    {doc.extension}
                  </span>
                )}
              </div>

              {doc.carpeta && (
                <span className="inline-block px-2 py-0.5 bg-crm-card-hover rounded text-xs text-crm-text-secondary mb-2">
                  {doc.carpeta.nombre}
                </span>
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-crm-border">
                <span className="text-xs text-crm-text-muted">
                  {carpeta ? `Actualizado ${formatearFecha(doc.modificado_at ?? doc.updated_at ?? doc.created_at)}` : formatearFecha(doc.created_at)}
                </span>
                <div className="flex items-center gap-1">
                  {carpeta ? (
                    <button
                      onClick={() => onOpenFolder?.(doc)}
                      className="p-1.5 hover:bg-crm-card-hover rounded transition-colors"
                      title="Abrir carpeta"
                    >
                      <FolderOpen className="w-4 h-4 text-crm-text-secondary" />
                    </button>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

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
              const Icon = obtenerIcono(doc);
              const colorClass = obtenerColor(doc);
              const carpeta = esCarpeta(doc);

              return (
                <tr
                  key={doc.id}
                  className="hover:bg-crm-card-hover transition-colors cursor-pointer"
                  onDoubleClick={() => (carpeta ? onOpenFolder?.(doc) : handleVer(doc))}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-crm-text-primary">{doc.nombre}</p>
                        <div className="flex items-center gap-2 text-xs text-crm-text-muted">
                          <span>{carpeta ? "Carpeta" : doc.extension?.toUpperCase() || "—"}</span>
                          {!carpeta && doc.extension && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-crm-card-hover text-crm-text-secondary uppercase">
                              {doc.extension}
                            </span>
                          )}
                        </div>
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
                    {carpeta ? "—" : formatearBytes(doc.tamano_bytes)}
                  </td>
                  <td className="px-4 py-3 text-sm text-crm-text-secondary">
                    {carpeta
                      ? `Actualizado ${formatearFecha(doc.modificado_at ?? doc.updated_at ?? doc.created_at)}`
                      : formatearFecha(doc.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {carpeta ? (
                        <button
                          onClick={() => onOpenFolder?.(doc)}
                          className="p-2 hover:bg-crm-card-hover rounded-lg transition-colors"
                          title="Abrir carpeta"
                        >
                          <FolderOpen className="w-4 h-4 text-crm-text-secondary" />
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleVer(doc)}
                            className="p-2 hover:bg-crm-card-hover rounded-lg transition-colors"
                            title="Ver en Google Drive"
                          >
                            <Eye className="w-4 h-4 text-crm-text-secondary" />
                          </button>
                          <button
                            onClick={() => handleDescargar(doc)}
                            className="p-2 hover:bg-crm-card-hover rounded-lg transition-colors"
                            title="Descargar"
                          >
                            <Download className="w-4 h-4 text-crm-text-secondary" />
                          </button>
                        </>
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
