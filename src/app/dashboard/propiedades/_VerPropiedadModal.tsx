"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";

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

interface VerPropiedadModalProps {
  propiedad: Propiedad | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function VerPropiedadModal({ propiedad, isOpen, onClose }: VerPropiedadModalProps) {
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

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'disponible': return 'bg-green-100 text-green-700';
      case 'reservado': return 'bg-yellow-100 text-yellow-700';
      case 'vendido': return 'bg-red-100 text-red-700';
      case 'bloqueado': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getEstadoText = (estado: string) => {
    switch (estado) {
      case 'disponible': return 'Disponible';
      case 'reservado': return 'Reservado';
      case 'vendido': return 'Vendido';
      case 'bloqueado': return 'Bloqueado';
      default: return estado;
    }
  };

  const formatPrecio = (precio: number | null, moneda: string) => {
    if (!precio) return "Precio a consultar";
    
    const formatter = new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: moneda,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    
    return formatter.format(precio);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
                  {propiedad.identificacion_interna}
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

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Información General */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-crm-text-muted mb-2">Tipo de Propiedad</h3>
                <p className="text-crm-text-primary font-medium">{getTipoLabel(propiedad.tipo)}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-crm-text-muted mb-2">Estado Comercial</h3>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getEstadoColor(propiedad.estado_comercial)}`}>
                  {getEstadoText(propiedad.estado_comercial)}
                </span>
              </div>
            </div>

            {/* Proyecto */}
            <div>
              <h3 className="text-sm font-medium text-crm-text-muted mb-2">Proyecto</h3>
              {!propiedad.proyecto_id ? (
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-crm-primary text-white">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Independiente
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="text-crm-text-primary font-medium">{propiedad.proyecto?.nombre}</span>
                </div>
              )}
            </div>

            {/* Ubicación */}
            <div>
              <h3 className="text-sm font-medium text-crm-text-muted mb-2">Ubicación</h3>
              <p className="text-crm-text-primary">
                {propiedad.ubicacion?.ciudad || 'No especificada'}
                {propiedad.ubicacion?.direccion && (
                  <span className="block text-sm text-crm-text-muted mt-1">
                    {propiedad.ubicacion.direccion}
                  </span>
                )}
              </p>
            </div>

            {/* Superficie y Precio */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-crm-text-muted mb-2">Superficie</h3>
                <div className="space-y-1">
                  <p className="text-crm-text-primary">
                    <span className="font-medium">Total:</span> {propiedad.superficie?.total ? `${propiedad.superficie.total} m²` : 'No especificada'}
                  </p>
                  {propiedad.superficie?.construida && (
                    <p className="text-crm-text-primary">
                      <span className="font-medium">Construida:</span> {propiedad.superficie.construida} m²
                    </p>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-crm-text-muted mb-2">Precio</h3>
                <p className="text-lg font-semibold text-crm-text-primary">
                  {formatPrecio(propiedad.precio, propiedad.moneda)}
                </p>
              </div>
            </div>

            {/* Información Adicional */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-crm-text-muted mb-2">Fecha de Creación</h3>
                <p className="text-crm-text-primary">{formatDate(propiedad.created_at)}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-crm-text-muted mb-2">Tipo de Registro</h3>
                <p className="text-crm-text-primary">
                  {propiedad.es_lote ? 'Lote de Proyecto' : 'Propiedad Independiente'}
                </p>
              </div>
            </div>

            {/* Datos Adicionales */}
            {propiedad.data && Object.keys(propiedad.data).length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-crm-text-muted mb-2">Información Adicional</h3>
                <div className="bg-crm-card-hover rounded-lg p-4">
                  <pre className="text-xs text-crm-text-primary whitespace-pre-wrap">
                    {JSON.stringify(propiedad.data, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-crm-border bg-crm-card-hover">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-crm-text-primary bg-white border border-crm-border rounded-lg hover:bg-crm-card-hover transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

