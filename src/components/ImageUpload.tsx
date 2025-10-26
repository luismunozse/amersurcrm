"use client";

import { useState, useRef } from "react";
import { InfoDialog } from "@/components/ui/InfoDialog";

interface ImageUploadProps {
  onImagesChange: (images: File[]) => void;
  existingImages?: string[];
  maxImages?: number;
  accept?: string;
  className?: string;
}

export default function ImageUpload({ 
  onImagesChange, 
  existingImages = [], 
  maxImages = 10,
  accept = "image/*",
  className = ""
}: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList) => {
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
    
    if (existingImages.length + imageFiles.length > maxImages) {
      setLimitReached(true);
      return;
    }

    onImagesChange(imageFiles);
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
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`relative ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
      
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive 
            ? "border-crm-primary bg-crm-primary/5" 
            : "border-crm-border hover:border-crm-primary/50"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="space-y-2">
          <svg 
            className={`w-12 h-12 mx-auto ${
              dragActive ? "text-crm-primary" : "text-crm-text-muted"
            }`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          
          <div>
            <button
              type="button"
              onClick={onButtonClick}
              className="text-crm-primary hover:text-crm-primary-hover font-medium"
            >
              Haz clic para subir imágenes
            </button>
            <p className="text-sm text-crm-text-muted mt-1">
              o arrastra y suelta aquí
            </p>
          </div>
          
          <p className="text-xs text-crm-text-muted">
            PNG, JPG, JPEG hasta 10MB • Máximo {maxImages} imágenes
          </p>
        </div>
      </div>

      <InfoDialog
        open={limitReached}
        onClose={() => setLimitReached(false)}
        title="Límite de imágenes"
        description={`Solo puedes subir máximo ${maxImages} imágenes por propiedad. Actualmente ya tienes ${existingImages.length} en la galería.`}
        tone="warning"
      />
    </div>
  );
}
