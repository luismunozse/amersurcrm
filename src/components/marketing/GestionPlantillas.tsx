"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  MessageSquare,
  AlertTriangle,
  X,
  CheckCircle2,
  CircleSlash,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  obtenerPlantillas,
  eliminarPlantilla,
} from "@/app/dashboard/admin/marketing/_actions";
import type { MarketingTemplate } from "@/types/whatsapp-marketing";
import ModalCrearPlantilla from "./ModalCrearPlantilla";

function ModalConfirmarEliminar({
  nombre,
  onConfirmar,
  onCancelar,
}: {
  nombre: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150">
      <div className="fixed inset-0 bg-black/50" onClick={onCancelar} />
      <div className="relative bg-crm-card border-t sm:border border-crm-border rounded-t-xl sm:rounded-xl shadow-xl p-5 sm:p-6 w-full sm:max-w-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 bg-crm-error/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-crm-error" />
          </div>
          <div>
            <h4 className="text-base font-semibold text-crm-text-primary">
              Eliminar plantilla
            </h4>
            <p className="text-sm text-crm-text-secondary mt-1">
              ¿Eliminar <strong>&quot;{nombre}&quot;</strong>? No se puede deshacer.
            </p>
          </div>
          <button
            onClick={onCancelar}
            className="ml-auto text-crm-text-muted hover:text-crm-text-primary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancelar}
            className="px-4 py-2 text-sm text-crm-text-secondary border border-crm-border rounded-lg hover:bg-crm-card-hover"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            className="px-4 py-2 text-sm bg-crm-error text-white rounded-lg hover:bg-crm-error/90"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalDetallePlantilla({
  plantilla,
  onCerrar,
  onEditar,
}: {
  plantilla: MarketingTemplate;
  onCerrar: () => void;
  onEditar: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150">
      <div className="fixed inset-0 bg-black/50" onClick={onCerrar} />
      <div className="relative bg-crm-card border-t sm:border border-crm-border rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-start justify-between p-5 border-b border-crm-border">
          <div>
            <h4 className="text-lg font-semibold text-crm-text-primary">
              {plantilla.nombre}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-crm-primary/10 text-crm-primary">
                {plantilla.categoria}
              </span>
              {plantilla.activo ? (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-crm-success/10 text-crm-success border border-crm-success/30">
                  Activa
                </span>
              ) : (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-crm-card-hover text-crm-text-secondary border border-crm-border">
                  Inactiva
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="text-crm-text-muted hover:text-crm-text-primary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          <div>
            <p className="text-xs font-medium text-crm-text-muted uppercase tracking-wide mb-2">
              Mensaje
            </p>
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <p className="text-sm text-green-900 dark:text-green-50 whitespace-pre-wrap leading-relaxed">
                {plantilla.body_texto}
              </p>
            </div>
          </div>

          {plantilla.variables && plantilla.variables.length > 0 && (
            <div>
              <p className="text-xs font-medium text-crm-text-muted uppercase tracking-wide mb-2">
                Variables
              </p>
              <div className="flex flex-wrap gap-1">
                {plantilla.variables.map((v) => (
                  <span
                    key={v}
                    className="px-2 py-1 text-xs bg-crm-info/10 text-crm-info rounded border border-crm-info/20"
                  >
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {plantilla.objetivo && (
            <div>
              <p className="text-xs font-medium text-crm-text-muted uppercase tracking-wide mb-1">
                Objetivo
              </p>
              <p className="text-sm text-crm-text-secondary">
                {plantilla.objetivo}
              </p>
            </div>
          )}

          {plantilla.tags && plantilla.tags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-crm-text-muted uppercase tracking-wide mb-2">
                Tags
              </p>
              <div className="flex flex-wrap gap-1">
                {plantilla.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 text-xs bg-crm-card-hover text-crm-text-secondary rounded"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-crm-text-muted pt-2 border-t border-crm-border">
            Creada: {new Date(plantilla.created_at).toLocaleDateString("es-PE")}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-crm-border">
          <button
            onClick={onCerrar}
            className="px-4 py-2 text-sm text-crm-text-secondary border border-crm-border rounded-lg hover:bg-crm-card-hover"
          >
            Cerrar
          </button>
          <button
            onClick={() => {
              onCerrar();
              onEditar();
            }}
            className="px-4 py-2 text-sm bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Editar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GestionPlantillas() {
  const [plantillas, setPlantillas] = useState<MarketingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalCrear, setModalCrear] = useState(false);
  const [plantillaEditar, setPlantillaEditar] =
    useState<MarketingTemplate | null>(null);
  const [plantillaDetalle, setPlantillaDetalle] =
    useState<MarketingTemplate | null>(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState<{
    id: string;
    nombre: string;
  } | null>(null);

  const cargarPlantillas = async () => {
    setLoading(true);
    const result = await obtenerPlantillas();
    if (result.error) {
      toast.error(result.error);
    } else if (result.data) {
      setPlantillas(result.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarPlantillas();
  }, []);

  const handleEliminar = async () => {
    if (!confirmarEliminar) return;
    const result = await eliminarPlantilla(confirmarEliminar.id);
    if (result.success) {
      toast.success("Plantilla eliminada");
      setConfirmarEliminar(null);
      cargarPlantillas();
    } else {
      toast.error(result.error || "Error eliminando plantilla");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="bg-crm-card border border-crm-border rounded-xl p-6 animate-pulse"
          >
            <div className="h-6 bg-crm-border rounded w-48 mb-4" />
            <div className="h-4 bg-crm-border rounded w-full mb-2" />
            <div className="h-4 bg-crm-border rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-crm-text-primary">
              Plantillas WhatsApp
            </h2>
            <p className="text-sm text-crm-text-secondary mt-1">
              Mensajes reutilizables enviables vía WhatsApp Web/App.
            </p>
          </div>
          <button
            onClick={() => {
              setPlantillaEditar(null);
              setModalCrear(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover"
          >
            <Plus className="w-4 h-4" />
            Nueva Plantilla
          </button>
        </div>

        {plantillas.length === 0 ? (
          <div className="bg-crm-card border border-crm-border rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-crm-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-crm-primary" />
            </div>
            <h3 className="text-lg font-medium text-crm-text-primary mb-2">
              Sin plantillas
            </h3>
            <p className="text-sm text-crm-text-secondary mb-6">
              Crea tu primera plantilla para enviar por WhatsApp con un clic.
            </p>
            <button
              onClick={() => {
                setPlantillaEditar(null);
                setModalCrear(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover"
            >
              <Plus className="w-4 h-4" />
              Crear Primera Plantilla
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {plantillas.map((p) => (
              <div
                key={p.id}
                className="bg-crm-card border border-crm-border rounded-xl p-5 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-crm-text-primary truncate">
                      {p.nombre}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-crm-primary/10 text-crm-primary">
                        {p.categoria}
                      </span>
                      {p.activo ? (
                        <span className="inline-flex items-center gap-1 text-xs text-crm-success">
                          <CheckCircle2 className="w-3 h-3" />
                          Activa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-crm-text-muted">
                          <CircleSlash className="w-3 h-3" />
                          Inactiva
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-crm-text-secondary line-clamp-3 mb-3">
                  {p.body_texto}
                </p>

                {p.variables?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {p.variables.map((v) => (
                      <span
                        key={v}
                        className="px-2 py-0.5 text-xs bg-crm-info/10 text-crm-info rounded"
                      >
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-3 border-t border-crm-border">
                  <button
                    onClick={() => setPlantillaDetalle(p)}
                    className="inline-flex items-center justify-center w-8 h-8 text-crm-info hover:bg-crm-info/10 rounded-lg"
                    title="Ver detalles"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setPlantillaEditar(p);
                      setModalCrear(true);
                    }}
                    className="inline-flex items-center justify-center w-8 h-8 text-crm-secondary hover:bg-crm-secondary/10 rounded-lg"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      setConfirmarEliminar({ id: p.id, nombre: p.nombre })
                    }
                    className="inline-flex items-center justify-center w-8 h-8 text-crm-error hover:bg-crm-error/10 rounded-lg"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ModalCrearPlantilla
        open={modalCrear}
        onClose={() => {
          setModalCrear(false);
          setPlantillaEditar(null);
        }}
        onSuccess={cargarPlantillas}
        plantilla={plantillaEditar ?? undefined}
      />

      {confirmarEliminar && (
        <ModalConfirmarEliminar
          nombre={confirmarEliminar.nombre}
          onConfirmar={handleEliminar}
          onCancelar={() => setConfirmarEliminar(null)}
        />
      )}

      {plantillaDetalle && (
        <ModalDetallePlantilla
          plantilla={plantillaDetalle}
          onCerrar={() => setPlantillaDetalle(null)}
          onEditar={() => {
            setPlantillaEditar(plantillaDetalle);
            setModalCrear(true);
          }}
        />
      )}
    </>
  );
}
