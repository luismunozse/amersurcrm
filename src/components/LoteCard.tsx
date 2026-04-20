"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Home, Image as ImageIcon, Box, ExternalLink } from "lucide-react";
import { actualizarLote, eliminarLote } from "@/app/dashboard/proyectos/[id]/_actions";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import ConfirmDialog from "./ConfirmDialog";
import StorageImagePreview from "./StorageImagePreview";

type Lote = {
  id: string;
  codigo: string;
  sup_m2: number | null;
  precio: number | null;
  moneda: string | null;
  estado: "disponible" | "reservado" | "vendido";
  data?: {
    fotos?: string[];
    plano?: string;
    renders?: string[];
    links3D?: string[];
    proyecto?: string;
    ubicacion?: string;
    etapa?: string;
    identificador?: string;
    manzana?: string;
    numero?: string;
    condiciones?: string;
    descuento?: number;
  };
};

interface LoteCardProps {
  lote: Lote;
  proyectoId: string;
}

export default function LoteCard({ lote, proyectoId }: LoteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<{ open: boolean; id: string; codigo: string }>({
    open: false,
    id: lote.id,
    codigo: lote.codigo,
  });
  const router = useRouter();

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "disponible":
        return "bg-crm-success text-white";
      case "reservado":
        return "bg-crm-warning text-white";
      case "vendido":
        return "bg-crm-danger text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getEstadoText = (estado: string) => {
    switch (estado) {
      case "disponible":
        return "Disponible";
      case "reservado":
        return "Reservado";
      case "vendido":
        return "Vendido";
      default:
        return estado;
    }
  };

  const formatPrecio = (precio: number | null, _moneda: string | null) => {
    if (!precio) return "No especificado";
    return `S/ ${precio.toLocaleString('es-PE')}`;
  };

  const handleDelete = () => {
    start(async () => {
      try {
        await eliminarLote(lote.id, proyectoId);
        toast.success("Lote eliminado");
        setConfirm((c) => ({ ...c, open: false }));
        router.refresh();
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || "No se pudo eliminar el lote");
      }
    });
  };

  const handleUpdate = (formData: FormData) => {
    start(async () => {
      try {
        // asegurar que el servidor pueda revalidar la ruta del proyecto
        formData.set("proyecto_id", proyectoId);
        await actualizarLote(lote.id, formData);
        toast.success("Lote actualizado");
        setIsEditing(false);
        router.refresh();
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || "No se pudo actualizar el lote");
      }
    });
  };

  if (isEditing) {
    return (
      <div className="crm-card p-6">
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-8 h-8 bg-crm-warning/10 rounded-lg flex items-center justify-center">
            <Pencil className="w-4 h-4 text-crm-warning" />
          </div>
          <h4 className="text-lg font-semibold text-crm-text-primary">Editando Lote: {lote.codigo}</h4>
        </div>
        
        <form
          action={handleUpdate}
          className="grid grid-cols-1 sm:grid-cols-6 gap-4 items-end"
        >
          <div className="sm:col-span-2 space-y-2">
            <label className="block text-sm font-medium text-crm-text-primary">Código *</label>
            <input 
              name="codigo" 
              defaultValue={lote.codigo} 
              required 
              className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary" 
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-crm-text-primary">Superficie (m²)</label>
            <input 
              name="sup_m2" 
              type="number" 
              step="0.01" 
              defaultValue={lote.sup_m2 ?? ""} 
              className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary" 
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-crm-text-primary">Precio</label>
            <input 
              name="precio" 
              type="number" 
              step="0.01" 
              defaultValue={lote.precio ?? ""} 
              className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary" 
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-crm-text-primary">Moneda</label>
            <select 
              name="moneda" 
              defaultValue={lote.moneda ?? "PEN"} 
              className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
            >
              <option value="PEN">PEN</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-crm-text-primary">Estado</label>
            <select 
              name="estado" 
              defaultValue={lote.estado} 
              className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
            >
              <option value="disponible">Disponible</option>
              <option value="reservado">Reservado</option>
              <option value="vendido">Vendido</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button 
              className="crm-button-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50" 
              disabled={pending}
            >
              {pending ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-crm-danger bg-crm-danger/10 hover:bg-crm-danger/20 rounded-lg transition-colors"
              onClick={() => setIsEditing(false)}
              disabled={pending}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <>
      <div className="crm-card-hover p-6 rounded-lg border border-crm-border transition-all duration-200 hover:shadow-lg">
        {/* Header con imagen y estado */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-12 h-12 bg-crm-primary/10 rounded-lg flex items-center justify-center">
                <Home className="w-6 h-6 text-crm-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-crm-text-primary">{lote.codigo}</h3>
                <p className="text-sm text-crm-text-muted">
                  {lote.data?.proyecto || 'Proyecto no especificado'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoColor(lote.estado)}`}>
              {getEstadoText(lote.estado)}
            </span>
          </div>
        </div>

        {/* Imagen principal */}
        <div className="mb-4">
          <div className="w-full h-48 bg-crm-card-hover rounded-lg overflow-hidden">
            {lote.data?.fotos && lote.data.fotos.length > 0 ? (
              <StorageImagePreview
                src={lote.data.fotos[0]}
                alt={`Lote ${lote.codigo}`}
                className="w-full h-full"
                fallbackIcon={
                  <ImageIcon className="w-16 h-16 text-crm-text-muted mx-auto mb-2" />
                }
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <ImageIcon className="w-16 h-16 text-crm-text-muted mx-auto mb-2" />
                  <p className="text-sm text-crm-text-muted">Sin imagen</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Información del lote */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-xs text-crm-text-muted">Superficie</p>
            <p className="text-sm font-medium text-crm-text-primary">
              {lote.sup_m2 ? `${lote.sup_m2} m²` : 'No especificado'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-crm-text-muted">Precio</p>
            <p className="text-sm font-medium text-crm-text-primary">
              {formatPrecio(lote.precio, lote.moneda)}
            </p>
          </div>
        </div>

        {/* Información adicional */}
        {lote.data && (
          <div className="mb-4 p-3 bg-crm-card-hover rounded-lg">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {lote.data.ubicacion && (
                <div>
                  <span className="text-crm-text-muted">Ubicación:</span>
                  <span className="ml-1 text-crm-text-primary">{lote.data.ubicacion}</span>
                </div>
              )}
              {lote.data.etapa && (
                <div>
                  <span className="text-crm-text-muted">Etapa:</span>
                  <span className="ml-1 text-crm-text-primary">{lote.data.etapa}</span>
                </div>
              )}
              {lote.data.manzana && (
                <div>
                  <span className="text-crm-text-muted">Manzana:</span>
                  <span className="ml-1 text-crm-text-primary">{lote.data.manzana}</span>
                </div>
              )}
              {lote.data.numero && (
                <div>
                  <span className="text-crm-text-muted">Número:</span>
                  <span className="ml-1 text-crm-text-primary">{lote.data.numero}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Multimedia info */}
        <div className="flex items-center justify-between text-xs text-crm-text-muted mb-4">
          <div className="flex items-center space-x-4">
            {lote.data?.fotos && lote.data.fotos.length > 0 && (
              <div className="flex items-center space-x-1">
                <ImageIcon className="w-4 h-4" />
                <span>{lote.data.fotos.length} foto(s)</span>
              </div>
            )}
            {lote.data?.renders && lote.data.renders.length > 0 && (
              <div className="flex items-center space-x-1">
                <Box className="w-4 h-4" />
                <span>{lote.data.renders.length} render(s)</span>
              </div>
            )}
            {lote.data?.links3D && lote.data.links3D.length > 0 && (
              <div className="flex items-center space-x-1">
                <ExternalLink className="w-4 h-4" />
                <span>{lote.data.links3D.length} enlace(s) 3D</span>
              </div>
            )}
            {(!lote.data?.fotos || lote.data.fotos.length === 0) && 
             (!lote.data?.renders || lote.data.renders.length === 0) && 
             (!lote.data?.links3D || lote.data.links3D.length === 0) && (
              <div className="flex items-center space-x-1">
                <ImageIcon className="w-4 h-4" />
                <span>Sin multimedia</span>
              </div>
            )}
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-sm font-medium text-crm-primary bg-crm-primary/10 hover:bg-crm-primary/20 rounded-lg transition-colors"
            >
              Editar
            </button>
            <button
              onClick={() => setConfirm((c) => ({ ...c, open: true }))}
              className="px-4 py-2 text-sm font-medium text-crm-danger bg-crm-danger/10 hover:bg-crm-danger/20 rounded-lg transition-colors"
            >
              Eliminar
            </button>
          </div>
          <div className="text-xs text-crm-text-muted">
            ID: {lote.id.slice(0, 8)}...
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirm.open}
        title="Eliminar lote"
        description={`Vas a eliminar el lote "${confirm.codigo}". Esta acción no se puede deshacer.`}
        confirmText={pending ? "Eliminando…" : "Eliminar"}
        onConfirm={handleDelete}
        onClose={() => setConfirm((c) => ({ ...c, open: false }))}
        disabled={pending}
      />
    </>
  );
}
