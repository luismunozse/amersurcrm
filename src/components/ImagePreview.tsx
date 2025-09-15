"use client";

import { useState, useEffect } from "react";

interface ImagePreviewProps {
  file: File;
  className?: string;
}

export default function ImagePreview({ file, className = "" }: ImagePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    // Crear URL de preview para el archivo
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Limpiar URL cuando el componente se desmonte
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  if (!previewUrl) {
    return (
      <div className={`bg-crm-card-hover rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center">
          <svg className="w-8 h-8 text-crm-text-muted mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <p className="text-sm text-crm-text-muted">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <img
      src={previewUrl}
      alt={file.name}
      className={`object-cover rounded-lg ${className}`}
      onError={(e) => {
        // Si la imagen falla al cargar, mostrar placeholder
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
        const placeholder = target.nextElementSibling as HTMLElement;
        if (placeholder) placeholder.style.display = 'block';
      }}
    />
  );
}
