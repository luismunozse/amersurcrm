"use client";

import { useState, useEffect } from "react";
import { Folder, ChevronRight, Home } from "lucide-react";
import toast from "react-hot-toast";

interface GoogleDriveFoldersProps {
  carpetaActual: string | null;
  onSelectCarpeta: (carpetaId: string | null) => void;
  googleDriveConectado: boolean;
}

interface DriveFolder {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
}

interface BreadcrumbItem {
  id: string;
  name: string;
}

export default function GoogleDriveFolders({
  carpetaActual,
  onSelectCarpeta,
  googleDriveConectado
}: GoogleDriveFoldersProps) {
  const [carpetas, setCarpetas] = useState<DriveFolder[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: 'root', name: 'Mi Drive' }
  ]);
  const [loading, setLoading] = useState(false);

  // Cargar carpetas cuando cambia la carpeta actual
  useEffect(() => {
    if (googleDriveConectado) {
      cargarCarpetas(carpetaActual || undefined);
      cargarBreadcrumbs(carpetaActual);
    }
  }, [carpetaActual, googleDriveConectado]);

  const cargarCarpetas = async (parentFolderId?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (parentFolderId && parentFolderId !== 'root') {
        params.set('parentFolderId', parentFolderId);
      }
      params.set('source', 'cache');

      const response = await fetch(`/api/google-drive/folders?${params}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Error al cargar carpetas');
      }

      if (data.source === 'cache' && !data.cacheHit) {
        if (googleDriveConectado) {
          params.set('source', 'drive');
          const driveResp = await fetch(`/api/google-drive/folders?${params}`);
          const driveData = await driveResp.json();
          if (driveResp.ok && driveData.success) {
            setCarpetas(driveData.folders || []);
            return;
          }
        }
      }

      setCarpetas(data.folders || []);
    } catch (error) {
      console.error('Error cargando carpetas:', error);
      toast.error('Error al cargar carpetas de Google Drive');
      setCarpetas([]);
    } finally {
      setLoading(false);
    }
  };

  const cargarBreadcrumbs = async (folderId: string | null) => {
    if (!folderId || folderId === 'root') {
      setBreadcrumbs([{ id: 'root', name: 'Mi Drive' }]);
      return;
    }

    try {
      const response = await fetch(`/api/google-drive/folders/${folderId}/path`);
      const data = await response.json();

      if (response.ok && data.success) {
        setBreadcrumbs(data.path);
      } else if (data?.cacheHit === false && googleDriveConectado) {
        const driveResp = await fetch(`/api/google-drive/folders/${folderId}/path?source=drive`);
        const driveData = await driveResp.json();
        if (driveResp.ok && driveData.success) {
          setBreadcrumbs(driveData.path);
        }
      }
    } catch (error) {
      console.error('Error cargando breadcrumbs:', error);
    }
  };

  const handleNavigate = (carpetaId: string | null) => {
    onSelectCarpeta(carpetaId === 'root' ? null : carpetaId);
  };

  if (!googleDriveConectado) {
    return (
      <div className="text-center py-8 text-crm-text-muted">
        <p>Google Drive no está conectado</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm overflow-x-auto pb-2">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.id} className="flex items-center gap-1 flex-shrink-0">
            {index > 0 && <ChevronRight className="w-4 h-4 text-crm-text-muted" />}
            <button
              onClick={() => handleNavigate(crumb.id === 'root' ? null : crumb.id)}
              className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-crm-card-hover transition-colors ${
                index === breadcrumbs.length - 1
                  ? 'text-crm-primary font-medium'
                  : 'text-crm-text-muted hover:text-crm-text-primary'
              }`}
            >
              {crumb.id === 'root' && <Home className="w-3.5 h-3.5" />}
              {crumb.name}
            </button>
          </div>
        ))}
      </div>

      {/* Lista de carpetas */}
      <div className="space-y-1">
        {loading ? (
          <div className="text-center py-4 text-crm-text-muted text-sm">
            Cargando carpetas...
          </div>
        ) : carpetas.length === 0 ? (
          <div className="text-center py-4 text-crm-text-muted text-sm">
            No hay subcarpetas
          </div>
        ) : (
          carpetas.map((carpeta) => (
            <button
              key={carpeta.id}
              onClick={() => handleNavigate(carpeta.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-crm-card-hover transition-colors text-left ${
                carpetaActual === carpeta.id
                  ? 'bg-crm-primary/10 text-crm-primary'
                  : 'text-crm-text-primary'
              }`}
            >
              <Folder className={`w-4 h-4 flex-shrink-0 ${
                carpetaActual === carpeta.id ? 'text-crm-primary' : 'text-crm-text-muted'
              }`} />
              <span className="truncate text-sm">{carpeta.name}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
