"use client";

import { useState, useTransition } from 'react';
import { XMarkIcon, PhotoIcon, TrashIcon } from '@heroicons/react/24/outline';
import { actualizarProyecto } from './_actions';
import toast from 'react-hot-toast';

interface EditProjectModalProps {
  proyecto: {
    id: string;
    nombre: string;
    estado: string;
    ubicacion?: string | null;
    descripcion?: string | null;
    imagen_url?: string | null;
  };
  isOpen: boolean;
  onClose: () => void;
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
  const [imagenPreview, setImagenPreview] = useState<string | null>(proyecto.imagen_url);
  const [eliminarImagen, setEliminarImagen] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagenFile(file);
      setEliminarImagen(false);
      
      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagenPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagenFile(null);
    setImagenPreview(null);
    setEliminarImagen(true);
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
        
        if (imagenFile) {
          fd.append('imagen', imagenFile);
        }

        const result = await actualizarProyecto(proyecto.id, fd);
        
        if (result.success) {
          toast.success(result.message);
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
      // Reset form
      setFormData({
        nombre: proyecto.nombre,
        estado: proyecto.estado,
        ubicacion: proyecto.ubicacion || '',
        descripcion: proyecto.descripcion || '',
      });
      setImagenFile(null);
      setImagenPreview(proyecto.imagen_url);
      setEliminarImagen(false);
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
