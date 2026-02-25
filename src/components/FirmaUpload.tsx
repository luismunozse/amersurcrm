"use client";

import { useState, useRef } from "react";
import { Spinner } from '@/components/ui/Spinner';
import Image from "next/image";
import toast from "react-hot-toast";

interface FirmaUploadProps {
  userId: string;
  currentFirmaUrl?: string | null;
  onUpdate: (firmaUrl: string | null) => void;
}

export default function FirmaUpload({ userId, currentFirmaUrl, onUpdate }: FirmaUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [firmaUrl, setFirmaUrl] = useState<string | null>(currentFirmaUrl || null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploading) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Solo se permiten imágenes JPG, PNG o WebP");
      return;
    }

    const maxSize = 1 * 1024 * 1024; // 1MB
    if (file.size > maxSize) {
      toast.error("La firma no debe superar 1MB");
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Upload via API
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("firma", file);
      formData.append("userId", userId);

      const res = await fetch("/api/admin/usuarios/firma", { method: "POST", body: formData });
      const data = await res.json();

      if (data.success) {
        setFirmaUrl(data.firmaUrl);
        setPreview(null);
        onUpdate(data.firmaUrl);
        toast.success("Firma actualizada");
      } else {
        toast.error(data.error || "Error subiendo firma");
        setPreview(null);
      }
    } catch {
      toast.error("Error de conexión");
      setPreview(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    setUploading(true);
    try {
      const res = await fetch("/api/admin/usuarios/firma", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();

      if (data.success) {
        setFirmaUrl(null);
        setPreview(null);
        onUpdate(null);
        toast.success("Firma eliminada");
      } else {
        toast.error(data.error || "Error eliminando firma");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setUploading(false);
    }
  };

  const displayUrl = preview || firmaUrl;

  return (
    <div>
      <label className="block text-sm font-medium text-crm-text-primary mb-2">
        Firma Digital
      </label>
      <div className="flex items-center gap-4">
        {/* Preview area */}
        <div className="relative w-32 h-16 border border-crm-border rounded-lg overflow-hidden bg-white flex items-center justify-center">
          {displayUrl ? (
            <Image
              src={displayUrl}
              alt="Firma"
              fill
              className="object-contain p-1"
              unoptimized
            />
          ) : (
            <span className="text-xs text-crm-text-muted">Sin firma</span>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <Spinner size="md" color="white" />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-xs text-crm-primary hover:underline disabled:opacity-50"
          >
            {firmaUrl ? "Cambiar firma" : "Subir firma"}
          </button>
          {firmaUrl && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={uploading}
              className="text-xs text-red-500 hover:underline disabled:opacity-50"
            >
              Eliminar
            </button>
          )}
          <span className="text-[10px] text-crm-text-muted">JPG, PNG, WebP - Max 1MB</span>
        </div>
      </div>
    </div>
  );
}
