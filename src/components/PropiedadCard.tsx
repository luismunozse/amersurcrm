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
  proyecto_id: string | null;
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

        {/* Información comercial compacta */}
        <div className="mb-4 p-3 bg-crm-card-hover rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-crm-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-crm-text-primary">
                  {formatPrecio(propiedad.precio, propiedad.moneda)}
                </p>
                <p className="text-xs text-crm-text-muted">Precio de venta</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-crm-text-primary">
                {propiedad.superficie?.total ? `${propiedad.superficie.total} m²` : 'N/A'}
              </p>
              <p className="text-xs text-crm-text-muted">Superficie</p>
            </div>
          </div>
        </div>

        {/* Información de gestión */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-xs text-crm-text-muted">Proyecto</p>
            <p className="text-sm font-medium text-crm-text-primary">
              {propiedad.proyecto ? propiedad.proyecto.nombre : 'Independiente'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-crm-text-muted">Ubicación</p>
            <p className="text-sm font-medium text-crm-text-primary">
              {propiedad.ubicacion?.ciudad || 'No especificada'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-crm-text-muted">Código</p>
            <p className="text-sm font-medium text-crm-text-primary font-mono">
              {propiedad.codigo}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-crm-text-muted">Creado</p>
            <p className="text-sm font-medium text-crm-text-primary">
              {new Date(propiedad.created_at).toLocaleDateString('es-PE')}
            </p>
          </div>
        </div>

        {/* Recursos disponibles */}
        <div className="flex items-center justify-between text-xs text-crm-text-muted mb-4">
          <div className="flex items-center space-x-3">
            {propiedad.marketing?.fotos && propiedad.marketing.fotos.length > 0 && (
              <span className="px-2 py-1 bg-crm-primary/10 text-crm-primary rounded">
                {propiedad.marketing.fotos.length} fotos
              </span>
            )}
            {propiedad.marketing?.renders && propiedad.marketing.renders.length > 0 && (
              <span className="px-2 py-1 bg-crm-primary/10 text-crm-primary rounded">
                {propiedad.marketing.renders.length} renders
              </span>
            )}
            {propiedad.marketing?.links3D && propiedad.marketing.links3D.length > 0 && (
              <span className="px-2 py-1 bg-crm-primary/10 text-crm-primary rounded">
                {propiedad.marketing.links3D.length} 3D
              </span>
            )}
            {(!propiedad.marketing?.fotos || propiedad.marketing.fotos.length === 0) && 
             (!propiedad.marketing?.renders || propiedad.marketing.renders.length === 0) && 
             (!propiedad.marketing?.links3D || propiedad.marketing.links3D.length === 0) && (
              <span className="px-2 py-1 bg-crm-border text-crm-text-muted rounded">
                Sin recursos
              </span>
            )}
          </div>
        </div>

        {/* Etiquetas (solo si hay muchas) */}
        {propiedad.marketing?.etiquetas && propiedad.marketing.etiquetas.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {propiedad.marketing.etiquetas.slice(0, 2).map((etiqueta: string) => (
                <span
                  key={etiqueta}
                  className="px-2 py-1 bg-crm-border text-crm-text-muted text-xs rounded"
                >
                  {etiqueta}
                </span>
              ))}
              {propiedad.marketing.etiquetas.length > 2 && (
                <span className="px-2 py-1 bg-crm-card-hover text-crm-text-muted text-xs rounded">
                  +{propiedad.marketing.etiquetas.length - 2}
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
