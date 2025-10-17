"use client";

import { useState, useRef } from "react";
import { Upload, X, File, CheckCircle, AlertCircle } from "lucide-react";

interface DocumentoUploaderProps {
  carpetaId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DocumentoUploader({
  carpetaId,
  onClose,
  onSuccess
}: DocumentoUploaderProps) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [storageType, setStorageType] = useState<'supabase' | 'google_drive'>('supabase');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setArchivo(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setArchivo(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!archivo) return;

    setUploading(true);

    try {
      // TODO: Implementar lógica de subida
      // Por ahora simulamos
      await new Promise(resolve => setTimeout(resolve, 2000));

      onSuccess();
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error subiendo archivo');
    } finally {
      setUploading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-crm-border">
          <h2 className="text-xl font-semibold text-crm-text-primary">
            Subir Documento
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-crm-card-hover rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Storage Type */}
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Dónde guardar
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setStorageType('supabase')}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  storageType === 'supabase'
                    ? 'border-crm-primary bg-crm-primary/5'
                    : 'border-crm-border hover:border-crm-primary/50'
                }`}
              >
                <div className="font-medium text-crm-text-primary mb-1">
                  Supabase Storage
                </div>
                <div className="text-xs text-crm-text-muted">
                  Almacenamiento propio del CRM
                </div>
              </button>

              <button
                onClick={() => setStorageType('google_drive')}
                disabled
                className="p-4 border-2 rounded-lg text-left opacity-50 cursor-not-allowed border-crm-border"
              >
                <div className="font-medium text-crm-text-primary mb-1">
                  Google Drive
                </div>
                <div className="text-xs text-crm-text-muted">
                  Requiere configuración
                </div>
              </button>
            </div>
          </div>

          {/* Upload Area */}
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Archivo
            </label>

            {!archivo ? (
              <div
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-crm-primary bg-crm-primary/5'
                    : 'border-crm-border hover:border-crm-primary/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={inputRef}
                  type="file"
                  onChange={handleChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                <div className="w-16 h-16 bg-crm-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-crm-primary" />
                </div>

                <p className="text-lg font-medium text-crm-text-primary mb-1">
                  {dragActive ? 'Suelta el archivo aquí' : 'Arrastra y suelta tu archivo'}
                </p>
                <p className="text-sm text-crm-text-muted mb-4">
                  o haz clic para seleccionar
                </p>
                <p className="text-xs text-crm-text-muted">
                  Máximo 50MB • Todos los formatos permitidos
                </p>
              </div>
            ) : (
              <div className="border border-crm-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-crm-primary/10 rounded-lg">
                      <File className="w-6 h-6 text-crm-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-crm-text-primary">
                        {archivo.name}
                      </p>
                      <p className="text-sm text-crm-text-muted">
                        {formatBytes(archivo.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setArchivo(null)}
                    className="p-2 hover:bg-crm-card-hover rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Info Alert */}
          <div className="bg-crm-info/10 border border-crm-info/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-crm-info flex-shrink-0 mt-0.5" />
              <div className="text-sm text-crm-text-secondary">
                <p className="font-medium text-crm-text-primary mb-1">
                  Configuración pendiente
                </p>
                <p>
                  Para habilitar la sincronización con Google Drive, un administrador debe configurar las credenciales en la sección de Configuración.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-crm-border">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 text-crm-text-secondary hover:bg-crm-card-hover rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleUpload}
            disabled={!archivo || uploading}
            className="px-6 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Subir Archivo
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
