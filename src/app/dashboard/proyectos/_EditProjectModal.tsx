"use client";

import { useEffect, useState, useTransition } from 'react';
import { XMarkIcon, PhotoIcon, TrashIcon } from '@heroicons/react/24/outline';
import { actualizarProyecto } from './_actions';
import toast from 'react-hot-toast';
import type { ProyectoMediaItem } from "@/types/proyectos";

interface EditProjectModalProps {
  proyecto: {
    id: string;
    nombre: string;
    estado: string;
    ubicacion?: string | null;
    descripcion?: string | null;
    imagen_url?: string | null;
    logo_url?: string | null;
    galeria_imagenes?: ProyectoMediaItem[] | null;
  };
  isOpen: boolean;
  onClose: () => void;
}

const MAX_GALERIA_ITEMS = 6;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type PendingGalleryFile = {
  file: File;
  preview: string;
};

function validateClientImage(file: File, label: string) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    toast.error(`${label}: formato no permitido (usa JPG, PNG o WEBP)`);
    return false;
  }

  if (file.size > MAX_IMAGE_BYTES) {
    toast.error(`${label}: supera el límite de 5MB`);
    return false;
  }

  return true;
}

export default function EditProjectModal({ proyecto, isOpen, onClose }: EditProjectModalProps) {
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    nombre: proyecto.nombre,
    estado: proyecto.estado,
    ubicacion: proyecto.ubicacion || '',
    descripcion: proyecto.descripcion || '',
  });
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [imagenPreview, setImagenPreview] = useState<string | null>(proyecto.imagen_url || null);
  const [eliminarImagen, setEliminarImagen] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(proyecto.logo_url || null);
  const [eliminarLogo, setEliminarLogo] = useState(false);
  const [galleryItems, setGalleryItems] = useState<ProyectoMediaItem[]>(
    Array.isArray(proyecto.galeria_imagenes) ? proyecto.galeria_imagenes : [],
  );
  const [galleryRemoved, setGalleryRemoved] = useState<string[]>([]);
  const [newGalleryFiles, setNewGalleryFiles] = useState<PendingGalleryFile[]>([]);
  const galleryLimitReached = galleryItems.length + newGalleryFiles.length >= MAX_GALERIA_ITEMS;

  const clearGalleryPreviews = () => {
    setNewGalleryFiles((prev) => {
      prev.forEach(({ preview }) => URL.revokeObjectURL(preview));
      return [];
    });
  };

  const resetToProjectValues = () => {
    setFormData({
      nombre: proyecto.nombre,
      estado: proyecto.estado,
      ubicacion: proyecto.ubicacion || "",
      descripcion: proyecto.descripcion || "",
    });
    setImagenFile(null);
    setImagenPreview(proyecto.imagen_url || null);
    setEliminarImagen(false);
    setLogoFile(null);
    setLogoPreview(proyecto.logo_url || null);
    setEliminarLogo(false);
    setGalleryItems(Array.isArray(proyecto.galeria_imagenes) ? proyecto.galeria_imagenes : []);
    setGalleryRemoved([]);
    clearGalleryPreviews();
  };

  useEffect(() => {
    if (isOpen) {
      resetToProjectValues();
    }
  }, [isOpen, proyecto]);

  useEffect(() => () => clearGalleryPreviews(), []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validateClientImage(file, "Imagen del proyecto")) {
      return;
    }
    setImagenFile(file);
    setEliminarImagen(false);

    const reader = new FileReader();
    reader.onload = (evt) => {
      setImagenPreview(evt.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImagenFile(null);
    setImagenPreview(null);
    setEliminarImagen(true);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validateClientImage(file, "Logo del proyecto")) {
      return;
    }
    setLogoFile(file);
    setEliminarLogo(false);

    const reader = new FileReader();
    reader.onload = (evt) => {
      setLogoPreview(evt.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setEliminarLogo(true);
  };

  const handleGalleryFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const remainingSlots = MAX_GALERIA_ITEMS - (galleryItems.length + newGalleryFiles.length);
    if (remainingSlots <= 0) {
      toast.error(`La galería ya tiene ${MAX_GALERIA_ITEMS} imágenes.`);
      return;
    }

    const nextEntries: PendingGalleryFile[] = [];
    for (const file of files.slice(0, remainingSlots)) {
      if (!validateClientImage(file, "Imagen de la galería")) {
        continue;
      }
      nextEntries.push({ file, preview: URL.createObjectURL(file) });
    }

    if (nextEntries.length === 0) return;
    setNewGalleryFiles((prev) => [...prev, ...nextEntries]);
  };

  const handleRemoveNewGalleryFile = (index: number) => {
    setNewGalleryFiles((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed) {
        URL.revokeObjectURL(removed.preview);
      }
      return next;
    });
  };

  const handleRemoveExistingGalleryItem = (item: ProyectoMediaItem) => {
    const identifier = item.path ?? item.url;
    if (!identifier) return;
    setGalleryRemoved((prev) => (prev.includes(identifier) ? prev : [...prev, identifier]));
    setGalleryItems((prev) => prev.filter((entry) => (entry.path ?? entry.url) !== identifier));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre.trim()) {
      toast.error('El nombre del proyecto es requerido');
      return;
    }

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append('nombre', formData.nombre);
        fd.append('estado', formData.estado);
        fd.append('ubicacion', formData.ubicacion);
        fd.append('descripcion', formData.descripcion);
        fd.append('eliminar_imagen', eliminarImagen.toString());
        fd.append('eliminar_logo', eliminarLogo.toString());
        
        if (imagenFile) {
          fd.append('imagen', imagenFile);
        }
        if (logoFile) {
          fd.append('logo', logoFile);
        }
        newGalleryFiles.forEach(({ file }) => {
          fd.append('galeria', file);
        });
        galleryRemoved.forEach((identifier) => fd.append('galeria_remove', identifier));

        const result = await actualizarProyecto(proyecto.id, fd);
        
        if (result.success) {
          toast.success(result.message);
          resetToProjectValues();
          onClose();
        }
      } catch (error) {
        console.error('Error actualizando proyecto:', error);
        toast.error(error instanceof Error ? error.message : 'Error actualizando proyecto');
      }
    });
  };

  const handleClose = () => {
    if (!isPending) {
      resetToProjectValues();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Editar Proyecto
          </h2>
          <button
            onClick={handleClose}
            disabled={isPending}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nombre */}
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nombre del Proyecto *
            </label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleInputChange}
              required
              disabled={isPending}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Ingrese el nombre del proyecto"
            />
          </div>

          {/* Estado */}
          <div>
            <label htmlFor="estado" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Estado del Proyecto
            </label>
            <select
              id="estado"
              name="estado"
              value={formData.estado}
              onChange={handleInputChange}
              disabled={isPending}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="activo">Activo</option>
              <option value="pausado">Pausado</option>
              <option value="cerrado">Cerrado</option>
            </select>
          </div>

          {/* Ubicación */}
          <div>
            <label htmlFor="ubicacion" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ubicación
            </label>
            <input
              type="text"
              id="ubicacion"
              name="ubicacion"
              value={formData.ubicacion}
              onChange={handleInputChange}
              disabled={isPending}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Ingrese la ubicación del proyecto"
            />
          </div>

          {/* Descripción */}
          <div>
            <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Descripción
            </label>
            <textarea
              id="descripcion"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleInputChange}
              disabled={isPending}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Ingrese una descripción del proyecto"
            />
          </div>

          {/* Imagen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Imagen del Proyecto
            </label>
            
            {/* Preview de imagen actual */}
            {imagenPreview && !eliminarImagen && (
              <div className="mb-4">
                <div className="relative inline-block">
                  <img
                    src={imagenPreview}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    disabled={isPending}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Imagen actual</p>
              </div>
            )}

            {/* Input de archivo */}
            <div className="flex items-center gap-4">
              <label
                htmlFor="imagen"
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <PhotoIcon className="w-5 h-5" />
                <span className="text-sm font-medium">
                  {imagenFile ? 'Cambiar imagen' : 'Seleccionar imagen'}
                </span>
              </label>
              <input
                type="file"
                id="imagen"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                disabled={isPending}
                className="hidden"
              />
              {imagenFile && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {imagenFile.name}
                </span>
              )}
            </div>
            
            <p className="text-xs text-gray-500 mt-1">
              Formatos permitidos: JPG, PNG, WEBP. Máximo 5MB.
            </p>
          </div>

          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Logo del Proyecto
            </label>

            {logoPreview && !eliminarLogo && (
              <div className="mb-4">
                <div className="relative inline-block">
                  <img
                    src={logoPreview}
                    alt="Logo actual del proyecto"
                    className="w-28 h-28 object-contain rounded-lg border border-gray-300 dark:border-gray-600 bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    disabled={isPending}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Logo actual</p>
              </div>
            )}

            <div className="flex items-center gap-4">
              <label
                htmlFor="logo"
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <PhotoIcon className="w-5 h-5" />
                <span className="text-sm font-medium">
                  {logoFile ? "Cambiar logo" : "Seleccionar logo"}
                </span>
              </label>
              <input
                type="file"
                id="logo"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleLogoChange}
                disabled={isPending}
                className="hidden"
              />
              {logoFile && (
                <span className="text-sm text-gray-600 dark:text-gray-400">{logoFile.name}</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              PNG con fondo transparente recomendado. Máximo 5MB.
            </p>
          </div>

          {/* Galería */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Galería de imágenes ({galleryItems.length + newGalleryFiles.length}/{MAX_GALERIA_ITEMS})
              </label>
              <span className="text-xs text-gray-500">
                Renders, vistas interiores o planimetrías
              </span>
            </div>

            {(galleryItems.length > 0 || newGalleryFiles.length > 0) ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                {galleryItems.map((item) => {
                  const key = item.path ?? item.url;
                  return (
                    <div
                      key={key}
                      className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600"
                    >
                      <img
                        src={item.url}
                        alt={item.nombre ?? "Imagen de la galería"}
                        className="h-24 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingGalleryItem(item)}
                        disabled={isPending}
                        className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
                        title="Eliminar de la galería"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
                {newGalleryFiles.map((entry, index) => (
                  <div
                    key={entry.preview}
                    className="relative rounded-lg overflow-hidden border border-dashed border-gray-300 dark:border-gray-600"
                  >
                    <img
                      src={entry.preview}
                      alt={`Nueva imagen ${index + 1}`}
                      className="h-24 w-full object-cover opacity-90"
                    />
                    <span className="absolute bottom-1 left-1 text-[10px] font-semibold px-2 py-0.5 bg-white/80 rounded-full text-gray-700">
                      Nuevo
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveNewGalleryFile(index)}
                      disabled={isPending}
                      className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
                      title="Quitar imagen nueva"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Aún no se agregaron imágenes adicionales.
              </p>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-4">
                <label
                  htmlFor="galeria"
                  className={`flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors ${
                    galleryLimitReached
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  <PhotoIcon className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    Agregar imágenes
                  </span>
                </label>
                <input
                  type="file"
                  id="galeria"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleGalleryFilesChange}
                  disabled={isPending || galleryLimitReached}
                  className="hidden"
                />
                <span className="text-xs text-gray-500">
                  {Math.max(0, MAX_GALERIA_ITEMS - (galleryItems.length + newGalleryFiles.length))} espacios disponibles
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Máximo {MAX_GALERIA_ITEMS} imágenes, 5MB cada una.
              </p>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || !formData.nombre.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-crm-primary hover:bg-crm-primary/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
