"use client";

import Link from "next/link";
import toast from "react-hot-toast";
import {
  PencilSquareIcon,
  ArrowTopRightOnSquareIcon,
  MapPinIcon,
  ShareIcon,
  ChartBarIcon,
  BuildingOffice2Icon,
} from "@heroicons/react/24/outline";

export default function QuickActions({
  id,
  nombre,
  ubicacion,
}: {
  id: string;
  nombre: string;
  ubicacion?: string | null;
}) {
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

  const upcoming = () => toast("Próximamente", { icon: "🚧" });

  return (
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
          onClick={upcoming}
          className="p-2 rounded-lg text-crm-text-secondary hover:text-crm-text-primary hover:bg-crm-card-hover transition-colors"
          title="Reportes del proyecto"
          aria-label="Reportes del proyecto"
          type="button"
        >
          <ChartBarIcon className="w-4 h-4" />
        </button>
        <Link
          href={`/dashboard/proyectos/${id}?edit=1`}
          className="p-2 rounded-lg text-crm-text-secondary hover:text-crm-text-primary hover:bg-crm-card-hover transition-colors"
          title="Editar proyecto"
          aria-label="Editar proyecto"
        >
          <PencilSquareIcon className="w-4 h-4" />
        </Link>
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
  );
}


