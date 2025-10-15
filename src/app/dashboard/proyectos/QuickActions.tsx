"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  PencilSquareIcon,
  ArrowTopRightOnSquareIcon,
  MapPinIcon,
  ShareIcon,
  ChartBarIcon,
  BuildingOffice2Icon,
  TrashIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { eliminarProyecto } from "./_actions";
import EditProjectModal from "./_EditProjectModal";

export default function QuickActions({
  id,
  nombre,
  ubicacion,
  lotesCount = 0,
  proyecto,
}: {
  id: string;
  nombre: string;
  ubicacion?: string | null;
  lotesCount?: number;
  proyecto?: {
    id: string;
    nombre: string;
    estado: string;
    ubicacion?: string | null;
    descripcion?: string | null;
    imagen_url?: string | null;
  };
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const router = useRouter();
  const copyLink = async () => {
    try {
      const url = `${window.location.origin}/dashboard/proyectos/${id}`;
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const openMaps = () => {
    if (!ubicacion) {
      toast("Sin ubicación", { icon: "ℹ️" });
      return;
    }
    const q = encodeURIComponent(ubicacion);
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
  };

  const handleReports = () => {
    router.push(`/dashboard/proyectos/${id}/reportes`);
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setIsDeleting(true);
    
    try {
      const result = await eliminarProyecto(id);
      
      if (result.success) {
        toast.success(result.message);
        // Recargar la página para actualizar la lista
        router.refresh();
      }
    } catch (error) {
      console.error('Error eliminando proyecto:', error);
      toast.error(error instanceof Error ? error.message : 'Error eliminando proyecto');
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleCloseEdit = () => {
    setShowEditModal(false);
  };

  if (showDeleteConfirm) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <ExclamationTriangleIcon className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-red-800">
              ¿Eliminar "{nombre}"?
            </p>
            <p className="text-xs text-red-600 mt-1">
              {lotesCount} lote(s) se eliminarán
            </p>
            <div className="flex gap-1 mt-2">
              <button
                onClick={handleCancelDelete}
                className="text-xs px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-100 transition-colors"
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="text-xs px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-100 transition-colors"
                disabled={isDeleting}
              >
                {isDeleting ? 'Eliminando...' : 'Sí'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-crm-text-muted">Acciones rápidas</span>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/proyectos/${id}`}
            className="p-2 rounded-lg text-crm-text-secondary hover:text-crm-text-primary hover:bg-crm-card-hover transition-colors"
            title="Ver unidades"
            aria-label="Ver unidades"
          >
            <BuildingOffice2Icon className="w-4 h-4" />
          </Link>
          <button
            onClick={openMaps}
            className="p-2 rounded-lg text-crm-text-secondary hover:text-crm-text-primary hover:bg-crm-card-hover transition-colors"
            title="Abrir en Maps"
            aria-label="Abrir en Maps"
            type="button"
          >
            <MapPinIcon className="w-4 h-4" />
          </button>
          <button
            onClick={handleReports}
            className="p-2 rounded-lg text-crm-text-secondary hover:text-crm-text-primary hover:bg-crm-card-hover transition-colors"
            title="Reportes del proyecto"
            aria-label="Reportes del proyecto"
            type="button"
          >
            <ChartBarIcon className="w-4 h-4" />
          </button>
          <button
            onClick={handleEdit}
            className="p-2 rounded-lg text-crm-text-secondary hover:text-crm-text-primary hover:bg-crm-card-hover transition-colors"
            title="Editar proyecto"
            aria-label="Editar proyecto"
            type="button"
          >
            <PencilSquareIcon className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
            title="Eliminar proyecto"
            aria-label="Eliminar proyecto"
            type="button"
            disabled={isDeleting}
          >
            <TrashIcon className="w-4 h-4" />
          </button>
          <button
            onClick={copyLink}
            className="p-2 rounded-lg text-crm-text-secondary hover:text-crm-text-primary hover:bg-crm-card-hover transition-colors"
            title="Compartir enlace"
            aria-label="Compartir enlace"
            type="button"
          >
            <ShareIcon className="w-4 h-4" />
          </button>
          <Link
            href={`/dashboard/proyectos/${id}`}
            className="p-2 rounded-lg text-crm-text-secondary hover:text-crm-text-primary hover:bg-crm-card-hover transition-colors"
            title="Abrir en nueva pestaña"
            aria-label="Abrir en nueva pestaña"
            target="_blank"
          >
            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Modal de edición */}
      {proyecto && (
        <EditProjectModal
          proyecto={proyecto}
          isOpen={showEditModal}
          onClose={handleCloseEdit}
        />
      )}
    </>
  );
}


