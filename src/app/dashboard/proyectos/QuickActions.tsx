'use client';

import { useMemo, useState, type ComponentType, type SVGProps } from "react";
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
import type { ProyectoMediaItem } from "@/types/proyectos";
import { usePermissions, PERMISOS } from "@/lib/permissions";

type QuickActionsProps = {
  id: string;
  nombre: string;
  ubicacion?: string | null;
  lotesCount?: number;
  proyecto?: {
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
};

type ActionConfig = {
  key: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  onClick: () => void;
  tone?: "default" | "danger";
};

export default function QuickActions({
  id,
  nombre,
  ubicacion,
  lotesCount = 0,
  proyecto,
}: QuickActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const router = useRouter();
  const { tienePermiso } = usePermissions();
  const puedeEditarProyecto = tienePermiso(PERMISOS.PROYECTOS.EDITAR);
  const puedeEliminarProyecto = tienePermiso(PERMISOS.PROYECTOS.ELIMINAR);

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
    const lat = proyecto?.latitud;
    const lng = proyecto?.longitud;

    if (typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng)) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, "_blank");
      return;
    }

    const destino = proyecto?.ubicacion || ubicacion;
    if (!destino) {
      toast("Sin ubicación", { icon: "ℹ️" });
      return;
    }

    const q = encodeURIComponent(destino);
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
        router.refresh();
      }
    } catch (error) {
      console.error("Error eliminando proyecto:", error);
      toast.error(error instanceof Error ? error.message : "Error eliminando proyecto");
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

  const actionItems = useMemo<ActionConfig[]>(() => {
    const actions: ActionConfig[] = [
      {
        key: "unidades",
        label: "Ver unidades",
        icon: BuildingOffice2Icon,
        onClick: () => router.push(`/dashboard/proyectos/${id}`),
      },
      {
        key: "maps",
        label: "Abrir en Maps",
        icon: MapPinIcon,
        onClick: openMaps,
      },
      {
        key: "reportes",
        label: "Reportes",
        icon: ChartBarIcon,
        onClick: handleReports,
      },
    ];

    if (puedeEditarProyecto) {
      actions.push({
        key: "editar",
        label: "Editar",
        icon: PencilSquareIcon,
        onClick: handleEdit,
      });
    }

    if (puedeEliminarProyecto) {
      actions.push({
        key: "eliminar",
        label: showDeleteConfirm ? "Confirmar eliminación" : "Eliminar",
        icon: TrashIcon,
        onClick: handleDelete,
        tone: "danger",
      });
    }

    actions.push(
      {
        key: "compartir",
        label: "Compartir",
        icon: ShareIcon,
        onClick: copyLink,
      },
      {
        key: "nueva-pestana",
        label: "Abrir nueva pestaña",
        icon: ArrowTopRightOnSquareIcon,
        onClick: () => window.open(`/dashboard/proyectos/${id}`, "_blank"),
      }
    );

    return actions;
  }, [
    copyLink,
    handleDelete,
    handleEdit,
    handleReports,
    id,
    openMaps,
    router,
    showDeleteConfirm,
    puedeEditarProyecto,
    puedeEliminarProyecto,
  ]);

  if (showDeleteConfirm) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <ExclamationTriangleIcon className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-red-800">¿Eliminar &quot;{nombre}&quot;?</p>
            <p className="text-xs text-red-600 mt-1">{lotesCount} lote(s) se eliminarán</p>
            <div className="flex gap-1 mt-2">
              <button
                onClick={handleCancelDelete}
                className="text-xs px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-100 transition-colors"
                disabled={isDeleting}
                type="button"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="text-xs px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-100 transition-colors"
                disabled={isDeleting}
                type="button"
              >
                {isDeleting ? "Eliminando..." : "Sí"}
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

        {/* Desktop buttons */}
        <div className="hidden sm:flex items-center gap-2">
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
          {puedeEditarProyecto && (
            <button
              onClick={handleEdit}
              className="p-2 rounded-lg text-crm-text-secondary hover:text-crm-text-primary hover:bg-crm-card-hover transition-colors"
              title="Editar proyecto"
              aria-label="Editar proyecto"
              type="button"
            >
              <PencilSquareIcon className="w-4 h-4" />
            </button>
          )}
          {puedeEliminarProyecto && (
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
          )}
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

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setMobileActionsOpen((open) => !open)}
          className="sm:hidden inline-flex items-center gap-2 text-xs font-medium text-crm-primary border border-crm-primary/40 rounded-lg px-3 py-1 transition-colors"
          aria-expanded={mobileActionsOpen}
        >
          {mobileActionsOpen ? "Ocultar" : "Ver acciones"}
        </button>
      </div>

      {mobileActionsOpen && (
        <div className="sm:hidden mt-3 grid grid-cols-2 gap-2">
          {actionItems.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.key}
                onClick={() => {
                  action.onClick();
                  setMobileActionsOpen(false);
                }}
                type="button"
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium transition-colors ${
                  action.tone === "danger"
                    ? "border border-red-200 text-red-600 hover:bg-red-50"
                    : "border border-crm-border text-crm-text-secondary hover:bg-crm-card-hover"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1 line-clamp-2">{action.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {proyecto && puedeEditarProyecto && (
        <EditProjectModal proyecto={proyecto} isOpen={showEditModal} onClose={handleCloseEdit} />
      )}
    </>
  );
}
