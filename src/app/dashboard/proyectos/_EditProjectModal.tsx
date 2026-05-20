"use client";

import { useEffect, useState, useTransition } from 'react';
import { X as XMarkIcon, ImageIcon as PhotoIcon, Trash2 as TrashIcon, GripVertical } from 'lucide-react';
import { actualizarProyecto } from './_actions';
import toast from 'react-hot-toast';
import type { ProyectoMediaItem } from "@/types/proyectos";
import { createClient } from "@/lib/supabase.client";
import {
  uploadProyectoAsset,
  removeProyectoAssets,
} from "@/lib/storage/proyectoUpload.client";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type GalleryDraftItem =
  | {
      kind: "existing";
      id: string;
      url: string;
      path: string | null;
      nombre: string | null;
      created_at: string | null;
    }
  | {
      kind: "pending";
      id: string;
      file: File;
      preview: string;
    };

function toDraft(items: ProyectoMediaItem[]): GalleryDraftItem[] {
  return items.map((item, idx) => ({
    kind: "existing" as const,
    id: item.path ?? item.url ?? `existing-${idx}`,
    url: item.url,
    path: item.path ?? null,
    nombre: item.nombre ?? null,
    created_at: item.created_at ?? null,
  }));
}

interface EditProjectModalProps {
  proyecto: {
    id: string;
    nombre: string;
    tipo: string;
    estado: string;
    ubicacion?: string | null;
    latitud?: number | null;
    longitud?: number | null;
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
    tipo: proyecto.tipo,
    estado: proyecto.estado,
    ubicacion: proyecto.ubicacion || '',
    latitud: proyecto.latitud?.toString() || '',
    longitud: proyecto.longitud?.toString() || '',
    descripcion: proyecto.descripcion || '',
  });
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [imagenPreview, setImagenPreview] = useState<string | null>(proyecto.imagen_url || null);
  const [eliminarImagen, setEliminarImagen] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(proyecto.logo_url || null);
  const [eliminarLogo, setEliminarLogo] = useState(false);
  const [galleryDraft, setGalleryDraft] = useState<GalleryDraftItem[]>(() =>
    toDraft(Array.isArray(proyecto.galeria_imagenes) ? proyecto.galeria_imagenes : []),
  );
  const [galleryDragOver, setGalleryDragOver] = useState(false);
  const galleryLimitReached = galleryDraft.length >= MAX_GALERIA_ITEMS;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setGalleryDraft((prev) => {
      const oldIdx = prev.findIndex((i) => i.id === active.id);
      const newIdx = prev.findIndex((i) => i.id === over.id);
      if (oldIdx === -1 || newIdx === -1) return prev;
      return arrayMove(prev, oldIdx, newIdx);
    });
  };

  const clearGalleryPreviews = () => {
    setGalleryDraft((prev) => {
      prev.forEach((item) => {
        if (item.kind === "pending") URL.revokeObjectURL(item.preview);
      });
      return [];
    });
  };

  const resetToProjectValues = () => {
    setFormData({
      nombre: proyecto.nombre,
      tipo: proyecto.tipo,
      estado: proyecto.estado,
      ubicacion: proyecto.ubicacion || "",
      latitud: proyecto.latitud?.toString() || '',
      longitud: proyecto.longitud?.toString() || '',
      descripcion: proyecto.descripcion || "",
    });
    setImagenFile(null);
    setImagenPreview(proyecto.imagen_url || null);
    setEliminarImagen(false);
    setLogoFile(null);
    setLogoPreview(proyecto.logo_url || null);
    setEliminarLogo(false);
    clearGalleryPreviews();
    setGalleryDraft(
      toDraft(Array.isArray(proyecto.galeria_imagenes) ? proyecto.galeria_imagenes : []),
    );
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

  const addGalleryFiles = (files: File[]) => {
    if (files.length === 0) return;

    const remainingSlots = MAX_GALERIA_ITEMS - galleryDraft.length;
    if (remainingSlots <= 0) {
      toast.error(`La galería ya tiene ${MAX_GALERIA_ITEMS} imágenes.`);
      return;
    }

    if (files.length > remainingSlots) {
      toast(`Solo se agregaron ${remainingSlots} de ${files.length} imágenes (límite ${MAX_GALERIA_ITEMS}).`);
    }

    const nextEntries: GalleryDraftItem[] = [];
    for (const file of files.slice(0, remainingSlots)) {
      if (!validateClientImage(file, "Imagen de la galería")) {
        continue;
      }
      const preview = URL.createObjectURL(file);
      const id = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      nextEntries.push({ kind: "pending", id, file, preview });
    }

    if (nextEntries.length === 0) return;
    setGalleryDraft((prev) => [...prev, ...nextEntries]);
  };

  const handleGalleryFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addGalleryFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
  };

  const handleGalleryDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setGalleryDragOver(false);
    if (isPending || galleryLimitReached) return;
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    addGalleryFiles(files);
  };

  const handleGalleryDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPending || galleryLimitReached) return;
    if (!galleryDragOver) setGalleryDragOver(true);
  };

  const handleGalleryDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setGalleryDragOver(false);
  };

  const handleGalleryPaste = (e: React.ClipboardEvent<HTMLLabelElement>) => {
    if (isPending || galleryLimitReached) return;
    const files = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;
    e.preventDefault();
    addGalleryFiles(files);
  };

  const handleRemoveGalleryItem = (id: string) => {
    setGalleryDraft((prev) => {
      const next = prev.filter((item) => {
        if (item.id !== id) return true;
        if (item.kind === "pending") URL.revokeObjectURL(item.preview);
        return false;
      });
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre.trim()) {
      toast.error('El nombre del proyecto es requerido');
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const uploadedPaths: string[] = [];

      try {
        let imagenUpload: { publicUrl: string; path: string } | null = null;
        let logoUpload: { publicUrl: string; path: string } | null = null;

        if (imagenFile) {
          const result = await uploadProyectoAsset(supabase, proyecto.id, imagenFile, "portada");
          uploadedPaths.push(result.path);
          imagenUpload = { publicUrl: result.publicUrl, path: result.path };
        }

        if (logoFile) {
          const result = await uploadProyectoAsset(supabase, proyecto.id, logoFile, "logo");
          uploadedPaths.push(result.path);
          logoUpload = { publicUrl: result.publicUrl, path: result.path };
        }

        const galeriaFinal: Array<{ url: string; path: string | null; nombre: string | null; created_at: string | null }> = [];
        for (const item of galleryDraft) {
          if (item.kind === "existing") {
            galeriaFinal.push({
              url: item.url,
              path: item.path,
              nombre: item.nombre,
              created_at: item.created_at,
            });
          } else {
            const result = await uploadProyectoAsset(supabase, proyecto.id, item.file, "galeria");
            uploadedPaths.push(result.path);
            galeriaFinal.push({
              url: result.publicUrl,
              path: result.path,
              nombre: result.nombre,
              created_at: new Date().toISOString(),
            });
          }
        }

        const fd = new FormData();
        fd.append('nombre', formData.nombre);
        fd.append('tipo', formData.tipo);
        fd.append('estado', formData.estado);
        fd.append('ubicacion', formData.ubicacion);
        fd.append('latitud', formData.latitud);
        fd.append('longitud', formData.longitud);
        fd.append('descripcion', formData.descripcion);
        fd.append('eliminar_imagen', eliminarImagen.toString());
        fd.append('eliminar_logo', eliminarLogo.toString());

        if (imagenUpload) {
          fd.append('imagen_url', imagenUpload.publicUrl);
          fd.append('imagen_path', imagenUpload.path);
        }
        if (logoUpload) {
          fd.append('logo_url', logoUpload.publicUrl);
          fd.append('logo_path', logoUpload.path);
        }
        fd.append('galeria_final', JSON.stringify(galeriaFinal));

        const result = await actualizarProyecto(proyecto.id, fd);

        if (result.success) {
          toast.success(result.message);
          resetToProjectValues();
          onClose();
        }
      } catch (error) {
        console.error('Error actualizando proyecto:', error);
        toast.error(error instanceof Error ? error.message : 'Error actualizando proyecto');
        if (uploadedPaths.length > 0) {
          await removeProyectoAssets(supabase, uploadedPaths);
        }
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
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-gray-800 rounded-t-lg sm:rounded-lg shadow-xl sm:max-w-2xl w-full max-h-[92vh] sm:max-h-[90vh] overflow-y-auto pb-[env(safe-area-inset-bottom)] sm:pb-0 animate-in slide-in-from-bottom-4 sm:zoom-in-95 sm:slide-in-from-bottom-0 duration-200">
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <span className="h-1 w-10 rounded-full bg-crm-border" aria-hidden />
        </div>
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

          {/* Tipo de Proyecto */}
          <div>
            <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de Proyecto *
            </label>
            <select
              id="tipo"
              name="tipo"
              value={formData.tipo}
              onChange={handleInputChange}
              disabled={isPending}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="propio">Propio (Desarrollo propio)</option>
              <option value="corretaje">Corretaje (Proyecto de terceros)</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Selecciona si es un proyecto de desarrollo propio o corretaje
            </p>
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

          {/* Coordenadas GPS */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                📍 Coordenadas del Proyecto (Opcional)
              </label>
              <a
                href="https://www.google.com/maps"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
              >
                Buscar en Google Maps →
              </a>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              Las coordenadas permiten centrar el mapa automáticamente al ver el proyecto
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="latitud" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Latitud (ej: -11.498265)
                </label>
                <input
                  type="number"
                  step="any"
                  id="latitud"
                  name="latitud"
                  value={formData.latitud}
                  onChange={handleInputChange}
                  disabled={isPending}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                  placeholder="-11.498265"
                />
              </div>
              <div>
                <label htmlFor="longitud" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Longitud (ej: -77.226632)
                </label>
                <input
                  type="number"
                  step="any"
                  id="longitud"
                  name="longitud"
                  value={formData.longitud}
                  onChange={handleInputChange}
                  disabled={isPending}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                  placeholder="-77.226632"
                />
              </div>
            </div>
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
                Galería de imágenes ({galleryDraft.length}/{MAX_GALERIA_ITEMS})
              </label>
              <span className="text-xs text-gray-500">
                Arrastre para reordenar
              </span>
            </div>

            {galleryDraft.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={galleryDraft.map((i) => i.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                    {galleryDraft.map((item, idx) => (
                      <SortableGalleryItem
                        key={item.id}
                        item={item}
                        index={idx}
                        disabled={isPending}
                        onRemove={() => handleRemoveGalleryItem(item.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Aún no se agregaron imágenes adicionales.
              </p>
            )}

            <div className="flex flex-col gap-2">
              <label
                htmlFor="galeria"
                tabIndex={galleryLimitReached || isPending ? -1 : 0}
                onDrop={handleGalleryDrop}
                onDragOver={handleGalleryDragOver}
                onDragEnter={handleGalleryDragOver}
                onDragLeave={handleGalleryDragLeave}
                onPaste={handleGalleryPaste}
                className={`relative flex flex-col items-center justify-center gap-2 px-4 py-6 border-2 border-dashed rounded-lg transition-colors text-center ${
                  galleryLimitReached || isPending
                    ? "opacity-50 cursor-not-allowed border-gray-300 dark:border-gray-600"
                    : galleryDragOver
                      ? "border-crm-primary bg-crm-primary/10 cursor-copy"
                      : "border-gray-300 dark:border-gray-600 cursor-pointer hover:border-crm-primary/60 hover:bg-gray-50 dark:hover:bg-gray-700/40"
                }`}
              >
                <PhotoIcon className={`w-8 h-8 ${galleryDragOver ? "text-crm-primary" : "text-gray-400"}`} />
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {galleryDragOver
                      ? "Suelte para agregar"
                      : "Arrastre imágenes aquí o haga clic para seleccionar"}
                  </p>
                  <p className="text-xs text-gray-500">
                    Puede seleccionar varias a la vez · También pegar con Ctrl+V
                  </p>
                </div>
                <span className="text-xs text-crm-text-muted">
                  {Math.max(0, MAX_GALERIA_ITEMS - galleryDraft.length)} espacios disponibles · Máx {MAX_GALERIA_ITEMS} imágenes · 5MB c/u
                </span>
                <input
                  type="file"
                  id="galeria"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleGalleryFilesChange}
                  disabled={isPending || galleryLimitReached}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-500">
                Arrastre las miniaturas existentes para cambiar el orden.
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

function SortableGalleryItem({
  item,
  index,
  disabled,
  onRemove,
}: {
  item: GalleryDraftItem;
  index: number;
  disabled: boolean;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : "auto",
  };

  const url = item.kind === "existing" ? item.url : item.preview;
  const isPending = item.kind === "pending";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative rounded-lg overflow-hidden border ${
        isPending
          ? "border-dashed border-gray-300 dark:border-gray-600"
          : "border-gray-200 dark:border-gray-600"
      } ${isDragging ? "ring-2 ring-crm-primary" : ""} bg-crm-card`}
    >
      <img
        src={url}
        alt={item.kind === "existing" ? item.nombre ?? `Imagen ${index + 1}` : `Nueva imagen ${index + 1}`}
        className={`h-24 w-full object-cover ${isPending ? "opacity-90" : ""}`}
        draggable={false}
      />
      <button
        type="button"
        {...attributes}
        {...listeners}
        disabled={disabled}
        className="absolute top-1 left-1 p-1 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors cursor-grab active:cursor-grabbing"
        title="Arrastrar para reordenar"
        aria-label="Reordenar imagen"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <span className="absolute bottom-1 left-1 text-[10px] font-semibold px-2 py-0.5 bg-white/80 rounded-full text-gray-700">
        {isPending ? "Nuevo" : `#${index + 1}`}
      </span>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
        title="Eliminar de la galería"
      >
        <TrashIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
