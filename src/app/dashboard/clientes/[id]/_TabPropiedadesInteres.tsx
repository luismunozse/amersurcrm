"use client";

import { useState } from "react";
import { Heart, DollarSign, Tag, Plus, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { formatearMoneda, type Moneda } from "@/lib/types/crm-flujo";
import { getSmallBadgeClasses } from "@/lib/utils/badge";
import AgregarPropiedadInteresModal from "@/components/AgregarPropiedadInteresModal";
import EditarPropiedadInteresModal from "@/components/EditarPropiedadInteresModal";
import EliminarPropiedadInteresModal from "@/components/EliminarPropiedadInteresModal";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { eliminarPropiedadInteres } from "@/app/dashboard/clientes/_actions_crm";
import type { PropiedadInteres } from "@/types/propiedades-interes";

interface Props {
  propiedades: PropiedadInteres[];
  clienteId: string;
}

export default function TabPropiedadesInteres({ propiedades, clienteId }: Props) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPropiedad, setEditingPropiedad] = useState<PropiedadInteres | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PropiedadInteres | null>(null);
  const [deleting, setDeleting] = useState(false);

  const getPrioridadColor = (prioridad: number) => {
    if (prioridad === 1) return 'red';
    if (prioridad === 2) return 'yellow';
    return 'green';
  };

  const getPrioridadLabel = (prioridad: number) => {
    if (prioridad === 1) return 'Alta';
    if (prioridad === 2) return 'Media';
    return 'Baja';
  };

  const listaVacia = !propiedades || propiedades.length === 0;

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await eliminarPropiedadInteres(deleteTarget.id);
      if (result.success) {
        toast.success("Propiedad eliminada de la lista");
        router.refresh();
      } else {
        toast.error(result.error || "No se pudo eliminar la propiedad");
      }
    } catch (error) {
      console.error("Error eliminando propiedad de interés:", error);
      toast.error("Error inesperado al eliminar");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleCancelDelete = () => {
    if (deleting) return;
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-crm-text">Lista de Deseos</h3>
          <p className="text-sm text-crm-text-muted">{propiedades.length} propiedades</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-crm-primary rounded-lg hover:bg-crm-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Agregar propiedad
        </button>
      </div>

      {listaVacia ? (
        <div className="text-center py-12 bg-crm-background rounded-lg">
          <Heart className="h-12 w-12 mx-auto mb-3 text-crm-text-muted opacity-50" />
          <p className="text-crm-text-muted">No hay propiedades de interés registradas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {propiedades.map((item) => {
            const prioridadColor = getPrioridadColor(item.prioridad);
            const prioridadLabel = getPrioridadLabel(item.prioridad);

            return (
              <div
                key={item.id}
                className="p-4 bg-crm-background rounded-lg border border-crm-border hover:border-crm-primary transition-colors"
              >
                {/* Lote Info */}
                {item.lote && (
                  <div className="mb-3">
                    <div className="flex items-start justify-between mb-2 gap-3">
                      <div className="flex-1">
                        <Link
                          href={`/dashboard/proyectos/${item.lote.proyecto?.id}`}
                          className="font-medium text-crm-text hover:text-crm-primary transition-colors"
                        >
                          Lote {item.lote.codigo || 'sin código'}
                        </Link>
                        <p className="text-sm text-crm-text-muted">
                          {item.lote.proyecto?.nombre}
                        </p>
                      </div>
                      <span className={getSmallBadgeClasses(prioridadColor)}>
                        {prioridadLabel}
                      </span>
                    </div>

                    {typeof item.lote.precio === 'number' && (
                      <div className="flex items-center gap-2 text-sm text-crm-text">
                        <DollarSign className="h-4 w-4 text-crm-text-muted" />
                        <span className="font-semibold">
                          {formatearMoneda(
                            item.lote.precio,
                            (item.lote.moneda as Moneda | undefined) ?? 'PEN'
                          )}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-crm-text-muted mt-1">
                      <Tag className="h-3 w-3" />
                      <span className="capitalize">
                        {item.lote.estado ? item.lote.estado : 'Sin estado'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Notas */}
                {item.notas && (
                  <p className="text-sm text-crm-text-muted mb-3 pt-3 border-t border-crm-border">
                    {item.notas}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-crm-text-muted pt-2 border-t border-crm-border">
                  <div className="flex flex-col">
                    <span>Agregado por {item.agregado_por || 'equipo'}</span>
                    <span>
                      {new Date(item.fecha_agregado).toLocaleDateString('es-PE', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      onClick={() => setEditingPropiedad(item)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-crm-border text-crm-text hover:text-crm-primary hover:border-crm-primary transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button
                      onClick={() => setDeleteTarget(item)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-red-200/60 text-red-500 hover:bg-red-500/10 disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <AgregarPropiedadInteresModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        clienteId={clienteId}
      />
      <EditarPropiedadInteresModal
        isOpen={Boolean(editingPropiedad)}
        propiedad={editingPropiedad}
        onClose={() => setEditingPropiedad(null)}
      />
      <EliminarPropiedadInteresModal
        isOpen={Boolean(deleteTarget)}
        propiedad={deleteTarget}
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}
