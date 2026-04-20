"use client";

import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

interface StorageImagePreviewProps {
  src: string;
  alt: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
}

export default function StorageImagePreview({ 
  src, 
  alt, 
  className = "",
  fallbackIcon
}: StorageImagePreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  if (hasError) {
    return (
      <div className={`bg-crm-card-hover rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center">
          {fallbackIcon || (
            <ImageIcon className="w-16 h-16 text-crm-text-muted mx-auto mb-2" />
          )}
          <p className="text-sm text-crm-text-muted">Error al cargar imagen</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-crm-card-hover rounded-lg flex items-center justify-center">
          <div className="text-center">
            <Spinner size="md" color="primary" />
            <p className="text-sm text-crm-text-muted mt-2">Cargando...</p>
          </div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover rounded-lg ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}
