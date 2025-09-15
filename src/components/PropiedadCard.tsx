"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actualizarPropiedad, eliminarPropiedad, cambiarEstadoPropiedad } from "@/app/dashboard/propiedades/_actions";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import ConfirmDialog from "./ConfirmDialog";
import StorageImagePreview from "./StorageImagePreview";

type Propiedad = {
  id: string;
  codigo: string;
  tipo: string;
  identificacion_interna: string;
  ubicacion: any;
  superficie: any;
  estado_comercial: string;
  precio: number | null;
  moneda: string;
  marketing: any;
  data: any;
  created_at: string;
  proyecto: {
    id: string;
    nombre: string;
    ubicacion: string | null;
    estado: string;
  } | null;
};

export default function PropiedadCard({ propiedad }: { propiedad: Propiedad }) {
  const [isPending, startTransition] = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const router = useRouter();

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
      case 'disponible': return 'bg-crm-success text-white';
      case 'reservado': return 'bg-crm-warning text-white';
      case 'vendido': return 'bg-crm-danger text-white';
      case 'bloqueado': return 'bg-crm-text-muted text-white';
      default: return 'bg-crm-border text-crm-text-primary';
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

  const handleEliminar = () => {
    startTransition(async () => {
      try {
        await eliminarPropiedad(propiedad.id);
        toast.success("Propiedad eliminada exitosamente");
        setShowDeleteDialog(false);
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || "No se pudo eliminar la propiedad");
      }
    });
  };

  const handleCambiarEstado = (nuevoEstado: 'disponible' | 'reservado' | 'vendido' | 'bloqueado') => {
    startTransition(async () => {
      try {
        await cambiarEstadoPropiedad(propiedad.id, nuevoEstado);
        toast.success(`Propiedad marcada como ${getEstadoText(nuevoEstado).toLowerCase()}`);
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || "No se pudo cambiar el estado");
      }
    });
  };

  return (
    <>
      <div className="crm-card p-6 hover:shadow-lg transition-shadow">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{getTipoIcon(propiedad.tipo)}</div>
            <div>
              <h3 className="font-semibold text-crm-text-primary">{propiedad.identificacion_interna}</h3>
              <p className="text-sm text-crm-text-muted">{getTipoLabel(propiedad.tipo)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(propiedad.estado_comercial)}`}>
              {getEstadoText(propiedad.estado_comercial)}
            </span>
          </div>
        </div>

        {/* Imagen principal */}
        <div className="mb-4">
          <div className="w-full h-48 bg-crm-card-hover rounded-lg overflow-hidden">
            {propiedad.marketing?.fotos && propiedad.marketing.fotos.length > 0 ? (
              <StorageImagePreview
                src={propiedad.marketing.fotos[0]}
                alt={`${getTipoLabel(propiedad.tipo)} ${propiedad.identificacion_interna}`}
                className="w-full h-full"
                fallbackIcon={
                  <svg className="w-16 h-16 text-crm-text-muted mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                }
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-16 h-16 text-crm-text-muted mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  <p className="text-sm text-crm-text-muted">Sin imagen</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Información de la propiedad */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-xs text-crm-text-muted">Proyecto</p>
            <p className="text-sm font-medium text-crm-text-primary">
              {propiedad.proyecto ? propiedad.proyecto.nombre : 'Sin proyecto'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-crm-text-muted">Superficie</p>
            <p className="text-sm font-medium text-crm-text-primary">
              {propiedad.superficie?.total ? `${propiedad.superficie.total} m²` : 'No especificada'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-crm-text-muted">Ubicación</p>
            <p className="text-sm font-medium text-crm-text-primary">
              {propiedad.ubicacion?.ciudad || 'No especificada'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-crm-text-muted">Precio</p>
            <p className="text-sm font-medium text-crm-text-primary">
              {formatPrecio(propiedad.precio, propiedad.moneda)}
            </p>
          </div>
        </div>

        {/* Multimedia info */}
        <div className="flex items-center justify-between text-xs text-crm-text-muted mb-4">
          <div className="flex items-center space-x-4">
            {propiedad.marketing?.fotos && propiedad.marketing.fotos.length > 0 && (
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                <span>{propiedad.marketing.fotos.length} foto(s)</span>
              </div>
            )}
            {propiedad.marketing?.renders && propiedad.marketing.renders.length > 0 && (
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                </svg>
                <span>{propiedad.marketing.renders.length} render(s)</span>
              </div>
            )}
            {propiedad.marketing?.links3D && propiedad.marketing.links3D.length > 0 && (
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
                <span>{propiedad.marketing.links3D.length} enlace(s) 3D</span>
              </div>
            )}
            {(!propiedad.marketing?.fotos || propiedad.marketing.fotos.length === 0) && 
             (!propiedad.marketing?.renders || propiedad.marketing.renders.length === 0) && 
             (!propiedad.marketing?.links3D || propiedad.marketing.links3D.length === 0) && (
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                <span>Sin multimedia</span>
              </div>
            )}
          </div>
        </div>

        {/* Etiquetas */}
        {propiedad.marketing?.etiquetas && propiedad.marketing.etiquetas.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {propiedad.marketing.etiquetas.slice(0, 3).map((etiqueta: string) => (
                <span
                  key={etiqueta}
                  className="px-2 py-1 bg-crm-primary/10 text-crm-primary text-xs rounded"
                >
                  {etiqueta}
                </span>
              ))}
              {propiedad.marketing.etiquetas.length > 3 && (
                <span className="px-2 py-1 bg-crm-card-hover text-crm-text-muted text-xs rounded">
                  +{propiedad.marketing.etiquetas.length - 3} más
                </span>
              )}
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => router.push(`/dashboard/propiedades/${propiedad.id}`)}
              className="crm-button-secondary px-3 py-1 rounded text-xs font-medium"
            >
              Ver
            </button>
            <button
              onClick={() => router.push(`/dashboard/propiedades/${propiedad.id}/editar`)}
              className="crm-button-primary px-3 py-1 rounded text-xs font-medium"
            >
              Editar
            </button>
          </div>
          
          <div className="flex items-center space-x-1">
            <select
              value={propiedad.estado_comercial}
              onChange={(e) => handleCambiarEstado(e.target.value as any)}
              className="text-xs px-2 py-1 border border-crm-border rounded bg-crm-card text-crm-text-primary"
              disabled={isPending}
            >
              <option value="disponible">Disponible</option>
              <option value="reservado">Reservado</option>
              <option value="vendido">Vendido</option>
              <option value="bloqueado">Bloqueado</option>
            </select>
            
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="text-crm-danger hover:text-crm-danger-hover p-1"
              disabled={isPending}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Dialog de confirmación de eliminación */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleEliminar}
        title="Eliminar Propiedad"
        message={`¿Estás seguro de que deseas eliminar la propiedad "${propiedad.identificacion_interna}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        isLoading={isPending}
      />
    </>
  );
}
