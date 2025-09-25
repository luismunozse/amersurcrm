"use client";

import { useState, useTransition, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { cambiarEstadoPropiedad } from "./_actions";
import { actualizarLote } from "../proyectos/[id]/_actions";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import UbicacionSelector from "@/components/UbicacionSelector";

type Propiedad = {
  id: string;
  codigo: string;
  tipo: string;
  identificacion_interna: string;
  ubicacion: {
    ciudad?: string;
    direccion?: string;
  } | null;
  superficie: {
    total?: number;
    construida?: number;
  } | null;
  estado_comercial: string;
  precio: number | null;
  moneda: string;
  data: Record<string, unknown> | null;
  created_at: string;
  proyecto_id: string | null;
  proyecto: {
    id: string;
    nombre: string;
    ubicacion: string | null;
    estado: string;
  } | null;
  es_lote?: boolean;
};

interface EditarPropiedadModalProps {
  propiedad: Propiedad | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditarPropiedadModal({ propiedad, isOpen, onClose, onSuccess }: EditarPropiedadModalProps) {
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    identificacion_interna: '',
    precio: '',
    superficie_total: '',
    superficie_construida: '',
    ubicacion_ciudad: '',
    ubicacion_direccion: '',
    estado_comercial: 'disponible',
    // Datos de ubigeo
    departamento: '',
    provincia: '',
    distrito: ''
  });

  // Inicializar formData cuando se abre el modal
  useEffect(() => {
    if (propiedad && isOpen) {
      setFormData({
        identificacion_interna: propiedad.identificacion_interna || '',
        precio: propiedad.precio?.toString() || '',
        superficie_total: propiedad.superficie?.total?.toString() || '',
        superficie_construida: propiedad.superficie?.construida?.toString() || '',
        ubicacion_ciudad: propiedad.ubicacion?.ciudad || '',
        ubicacion_direccion: propiedad.ubicacion?.direccion || '',
        estado_comercial: propiedad.estado_comercial,
        // Inicializar ubigeo (se puede extraer de ubicacion_ciudad si está en formato "Departamento, Provincia, Distrito")
        departamento: '',
        provincia: '',
        distrito: ''
      });
    }
  }, [propiedad, isOpen]);

  if (!isOpen || !propiedad) return null;

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'lote': return '🏗️';
      case 'casa': return '🏠';
      case 'departamento': return '🏢';
      case 'oficina': return '🏢';
      case 'otro': return '📋';
      default: return '🏠';
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'lote': return 'Lote';
      case 'casa': return 'Casa';
      case 'departamento': return 'Departamento';
      case 'oficina': return 'Oficina';
      case 'otro': return 'Otro';
      default: return 'Propiedad';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    startTransition(async () => {
      try {
        if (propiedad.es_lote) {
          // Para lotes, usar actualizarLote
          const formDataObj = new FormData();
          formDataObj.append("identificacion_interna", formData.identificacion_interna);
          formDataObj.append("precio", formData.precio);
          formDataObj.append("superficie_total", formData.superficie_total);
          formDataObj.append("superficie_construida", formData.superficie_construida);
          
          // Construir ubicación completa con ubigeo
          const ubicacionCompleta = [formData.distrito, formData.provincia, formData.departamento]
            .filter(Boolean)
            .join(', ');
          formDataObj.append("ubicacion_ciudad", ubicacionCompleta || formData.ubicacion_ciudad);
          formDataObj.append("ubicacion_direccion", formData.ubicacion_direccion);
          formDataObj.append("estado", formData.estado_comercial);
          formDataObj.append("proyecto_id", propiedad.proyecto_id || "");
          
          await actualizarLote(propiedad.id, formDataObj);
        } else {
          // Para propiedades, usar cambiarEstadoPropiedad (solo estado por ahora)
          await cambiarEstadoPropiedad(propiedad.id, formData.estado_comercial as 'disponible' | 'reservado' | 'vendido' | 'bloqueado');
        }
        
        toast.success("Propiedad actualizada exitosamente");
        onSuccess();
        onClose();
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || "No se pudo actualizar la propiedad");
      }
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUbigeoChange = (departamento: string, provincia: string, distrito: string) => {
    setFormData(prev => ({
      ...prev,
      departamento,
      provincia,
      distrito,
      // Actualizar también la ubicación ciudad con el ubigeo seleccionado
      ubicacion_ciudad: [distrito, provincia, departamento].filter(Boolean).join(', ')
    }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-crm-border">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">{getTipoIcon(propiedad.tipo)}</div>
              <div>
                <h2 className="text-xl font-semibold text-crm-text-primary">
                  Editar {getTipoLabel(propiedad.tipo)}
                </h2>
                <p className="text-sm text-crm-text-muted font-mono">{propiedad.codigo}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-crm-card-hover rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-crm-text-muted" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Información Básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Identificación Interna
                </label>
                <input
                  type="text"
                  value={formData.identificacion_interna}
                  onChange={(e) => handleInputChange('identificacion_interna', e.target.value)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary bg-white text-crm-text-primary"
                  placeholder="Ej: Lote A-15"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Estado Comercial
                </label>
                <select
                  value={formData.estado_comercial}
                  onChange={(e) => handleInputChange('estado_comercial', e.target.value)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary bg-white text-crm-text-primary"
                >
                  <option value="disponible">Disponible</option>
                  <option value="reservado">Reservado</option>
                  <option value="vendido">Vendido</option>
                  <option value="bloqueado">Bloqueado</option>
                </select>
              </div>
            </div>

            {/* Ubicación */}
            <div className="space-y-4 w-full">
              <div className="w-full">
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Ubicación (Ubigeo)
                </label>
                <UbicacionSelector
                  key={`ubigeo-edit-${propiedad?.id || 'new'}`}
                  departamento={formData.departamento}
                  provincia={formData.provincia}
                  distrito={formData.distrito}
                  onUbigeoChange={handleUbigeoChange}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Dirección Específica
                </label>
                <input
                  type="text"
                  value={formData.ubicacion_direccion}
                  onChange={(e) => handleInputChange('ubicacion_direccion', e.target.value)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary bg-white text-crm-text-primary"
                  placeholder="Ej: Av. Principal 123, Urbanización Los Pinos"
                />
              </div>
            </div>

            {/* Superficie */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Superficie Total (m²)
                </label>
                <input
                  type="number"
                  value={formData.superficie_total}
                  onChange={(e) => handleInputChange('superficie_total', e.target.value)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary bg-white text-crm-text-primary"
                  placeholder="Ej: 120"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Superficie Construida (m²)
                </label>
                <input
                  type="number"
                  value={formData.superficie_construida}
                  onChange={(e) => handleInputChange('superficie_construida', e.target.value)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary bg-white text-crm-text-primary"
                  placeholder="Ej: 80"
                />
              </div>
            </div>

            {/* Precio */}
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">
                Precio (S/.)
              </label>
              <input
                type="number"
                value={formData.precio}
                onChange={(e) => handleInputChange('precio', e.target.value)}
                className="w-full px-3 py-2 border border-crm-border rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-crm-primary bg-white text-crm-text-primary"
                placeholder="Ej: 150000"
              />
            </div>

            {/* Información del Proyecto */}
            {propiedad.proyecto && (
              <div className="bg-crm-card-hover rounded-lg p-4">
                <h3 className="text-sm font-medium text-crm-text-muted mb-2">Proyecto Asociado</h3>
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="text-crm-text-primary font-medium">{propiedad.proyecto.nombre}</span>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-crm-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-crm-text-primary bg-white border border-crm-border rounded-lg hover:bg-crm-card-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-crm-primary rounded-lg hover:bg-crm-primary-hover disabled:opacity-50 transition-colors"
              >
                {isPending ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
