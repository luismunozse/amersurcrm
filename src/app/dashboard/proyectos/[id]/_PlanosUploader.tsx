"use client";

import { useState, useTransition } from "react";
import { subirPlanos, eliminarPlanos } from "./_actions";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import toast from "react-hot-toast";

interface PlanosUploaderProps {
  proyectoId: string;
  planosUrl: string | null;
  proyectoNombre: string;
}

export default function PlanosUploader({ proyectoId, planosUrl, proyectoNombre }: PlanosUploaderProps) {
  const [pending, start] = useTransition();
  const { isAdmin, loading } = useAdminPermissions();
  const [dragActive, setDragActive] = useState(false);

  const handleFileUpload = (file: File) => {
    if (!file) return;

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato no válido. Use JPG, PNG, WEBP o PDF');
      return;
    }

    // Validar tamaño (10MB máximo para planos)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('El archivo es muy grande. Máximo 10MB');
      return;
    }

    const formData = new FormData();
    formData.append('planos', file);

    start(async () => {
      try {
        await subirPlanos(proyectoId, formData);
        toast.success('Planos subidos correctamente');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Error subiendo planos');
      }
    });
  };

  const handleDelete = () => {
    if (!confirm('¿Estás seguro de que quieres eliminar los planos?')) return;

    start(async () => {
      try {
        await eliminarPlanos(proyectoId);
        toast.success('Planos eliminados correctamente');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Error eliminando planos');
      }
    });
  };

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
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  if (loading) {
    return (
      <div className="crm-card p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-crm-border rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-crm-border rounded"></div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // No mostrar nada si no es admin
  }

  return (
    <div className="crm-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-crm-text-primary">Planos del Proyecto</h3>
          <p className="text-sm text-crm-text-muted">Sube el plano general de {proyectoNombre}</p>
        </div>
        {planosUrl && (
          <button
            onClick={handleDelete}
            disabled={pending}
            className="px-3 py-1.5 text-sm font-medium text-crm-danger bg-crm-danger/10 hover:bg-crm-danger/20 rounded-lg transition-colors disabled:opacity-50"
          >
            {pending ? "Eliminando..." : "Eliminar"}
          </button>
        )}
      </div>

      {planosUrl ? (
        <div className="space-y-4">
          <div className="relative rounded-lg overflow-hidden border border-crm-border">
            {planosUrl.endsWith('.pdf') ? (
              <div className="w-full h-96 bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-16 h-16 text-crm-text-muted mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  <p className="text-sm text-crm-text-muted">Documento PDF</p>
                  <a 
                    href={planosUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-crm-primary hover:text-crm-primary-hover text-sm font-medium"
                  >
                    Ver PDF
                  </a>
                </div>
              </div>
            ) : (
              <img 
                src={planosUrl} 
                alt={`Planos de ${proyectoNombre}`}
                className="w-full h-96 object-contain bg-gray-50"
              />
            )}
          </div>
          <div className="text-center">
            <p className="text-xs text-crm-text-muted">Planos actuales del proyecto</p>
          </div>
        </div>
      ) : (
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
            type="file"
            accept="image/*,application/pdf"
            onChange={handleChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={pending}
          />
          
          <div className="space-y-4">
            <div className="w-16 h-16 bg-crm-primary/10 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
              </svg>
            </div>
            
            <div>
              <p className="text-lg font-medium text-crm-text-primary">
                {dragActive ? 'Suelta el archivo aquí' : 'Subir Planos del Proyecto'}
              </p>
              <p className="text-sm text-crm-text-muted mt-1">
                Arrastra y suelta o haz clic para seleccionar
              </p>
              <p className="text-xs text-crm-text-muted mt-2">
                Formatos: JPG, PNG, WEBP, PDF • Máx: 10MB
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
