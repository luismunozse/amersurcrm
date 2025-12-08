"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ConfirmDialog";
import { actualizarAvatarAction, eliminarAvatarAction } from "./_actions";
import { useUserProfileContext } from "../UserProfileContext";

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  userName: string;
}

export default function AvatarUpload({ currentAvatarUrl, userName }: AvatarUploadProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { setAvatarUrl } = useUserProfileContext();

  const avatarInitial = userName?.charAt(0).toUpperCase() || 'U';

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (uploading) {
      return;
    }

    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Solo se permiten imágenes JPG, PNG o WebP');
      return;
    }

    // Validar tamaño (2MB máximo)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast.error('La imagen no debe superar los 2MB');
      return;
    }

    // Mostrar preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Subir archivo
    await uploadAvatar(file);
  };

  const uploadAvatar = async (file: File) => {
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const result = await actualizarAvatarAction(formData);
      if (!result.success) {
        toast.error(result.error || 'Error al subir la imagen');
        return;
      }
      if (typeof result.avatarUrl !== 'undefined') {
        setAvatarUrl(result.avatarUrl);
      }
      toast.success('Foto de perfil actualizada');
      router.refresh();
    } catch (error) {
      console.error('Error inesperado:', error);
      toast.error('Error al subir la imagen');
    } finally {
      setUploading(false);
      setPreview(null);
    }
  };

  const handleRemoveAvatar = () => {
    if (uploading) return;
    setShowDeleteConfirm(true);
  };

  const confirmRemoveAvatar = async () => {
    setUploading(true);

    try {
      const result = await eliminarAvatarAction();
      if (!result.success) {
        toast.error(result.error || 'Error al eliminar la foto');
      } else {
        setAvatarUrl(null);
        toast.success('Foto de perfil eliminada');
        router.refresh();
      }

    } catch (error) {
      console.error('Error inesperado:', error);
      toast.error('Error al eliminar la foto');
    } finally {
      setUploading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="relative group">
      {/* Avatar */}
      <div className="w-24 h-24 bg-gradient-to-br from-crm-primary to-crm-accent rounded-full flex items-center justify-center shadow-lg ring-4 ring-crm-border overflow-hidden">
        {preview ? (
          <Image
            src={preview}
            alt="Preview"
            width={96}
            height={96}
            className="w-full h-full object-cover"
          />
        ) : currentAvatarUrl ? (
          <Image
            src={currentAvatarUrl}
            alt={userName}
            width={96}
            height={96}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-white text-3xl font-bold">
            {avatarInitial}
          </span>
        )}

        {/* Overlay de carga */}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Botones de acción */}
      <div className="absolute -bottom-2 -right-2 flex gap-2">
        {/* Botón de subir/cambiar */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="p-2 bg-crm-primary text-white rounded-full shadow-lg hover:bg-crm-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={currentAvatarUrl ? "Cambiar foto" : "Subir foto"}
        >
          {currentAvatarUrl ? (
            <Camera className="w-4 h-4" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
        </button>

        {/* Botón de eliminar (solo si hay avatar) */}
        {currentAvatarUrl && (
          <button
            onClick={handleRemoveAvatar}
            disabled={uploading}
            className="p-2 bg-crm-danger text-white rounded-full shadow-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Eliminar foto"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Input file oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Ayuda */}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        <div className="bg-neutral-900 dark:bg-neutral-700 text-white dark:text-neutral-100 text-xs px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg border border-neutral-700 dark:border-neutral-600">
          {currentAvatarUrl ? "Cambiar o eliminar foto" : "Subir foto de perfil"}
        </div>
        {/* Flecha del tooltip */}
        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-neutral-900 dark:bg-neutral-700 border-l border-t border-neutral-700 dark:border-neutral-600 rotate-45"></div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Eliminar foto de perfil"
        description="Tu foto actual será eliminada. Puedes subir una nueva en cualquier momento."
        confirmText={uploading ? "Eliminando..." : "Eliminar"}
        cancelText="Cancelar"
        onConfirm={confirmRemoveAvatar}
        onClose={() => {
          if (uploading) return;
          setShowDeleteConfirm(false);
        }}
        disabled={uploading}
      />
    </div>
  );
}
