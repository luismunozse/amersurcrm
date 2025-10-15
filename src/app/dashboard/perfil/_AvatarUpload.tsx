"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  userName: string;
  userId: string;
}

export default function AvatarUpload({ currentAvatarUrl, userName, userId }: AvatarUploadProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const avatarInitial = userName?.charAt(0).toUpperCase() || 'U';

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      const supabase = supabaseBrowser();

      // Generar nombre único para el archivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/avatar.${fileExt}`;

      // Subir a Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          upsert: true, // Reemplazar si ya existe
          contentType: file.type,
        });

      if (uploadError) {
        console.error('Error al subir imagen:', uploadError);
        toast.error('Error al subir la imagen');
        return;
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Actualizar URL en la base de datos
      const { error: updateError } = await supabase
        .from('usuario_perfil')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) {
        console.error('Error al actualizar perfil:', updateError);
        toast.error('Error al actualizar el perfil');
        return;
      }

      toast.success('Foto de perfil actualizada');

      // Refrescar la página para mostrar el nuevo avatar
      router.refresh();

    } catch (error) {
      console.error('Error inesperado:', error);
      toast.error('Error al subir la imagen');
    } finally {
      setUploading(false);
      setPreview(null);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!confirm('¿Estás seguro de eliminar tu foto de perfil?')) return;

    setUploading(true);

    try {
      const supabase = supabaseBrowser();

      // Eliminar de Storage (opcional, puede fallar si no existe)
      if (currentAvatarUrl) {
        const fileName = `${userId}/avatar.${currentAvatarUrl.split('.').pop()}`;
        await supabase.storage.from('avatars').remove([fileName]);
      }

      // Actualizar BD
      const { error } = await supabase
        .from('usuario_perfil')
        .update({ avatar_url: null })
        .eq('id', userId);

      if (error) {
        console.error('Error al eliminar avatar:', error);
        toast.error('Error al eliminar la foto');
        return;
      }

      toast.success('Foto de perfil eliminada');
      router.refresh();

    } catch (error) {
      console.error('Error inesperado:', error);
      toast.error('Error al eliminar la foto');
    } finally {
      setUploading(false);
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
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="bg-crm-text-primary text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap">
          {currentAvatarUrl ? "Cambiar o eliminar foto" : "Subir foto de perfil"}
        </div>
      </div>
    </div>
  );
}
