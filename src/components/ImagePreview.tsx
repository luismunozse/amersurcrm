"use client";

import { useState, useEffect } from "react";
import { Image as ImageIcon } from "lucide-react";

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
          <ImageIcon className="w-8 h-8 text-crm-text-muted mx-auto mb-2" />
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
