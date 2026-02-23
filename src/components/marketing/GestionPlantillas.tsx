"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  MessageSquare,
  AlertTriangle,
  X,
} from "lucide-react";
import { obtenerPlantillas, eliminarPlantilla } from "@/app/dashboard/admin/marketing/_actions";
import type { MarketingTemplate } from "@/types/whatsapp-marketing";
import toast from "react-hot-toast";
import ModalCrearPlantilla from "./ModalCrearPlantilla";

// ─────────────────────────────────────────────────────────────────────────────
// Modal confirmación eliminar
// ─────────────────────────────────────────────────────────────────────────────

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onCancelar} />
      <div className="relative bg-crm-card border border-crm-border rounded-xl shadow-xl p-6 w-full max-w-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 bg-crm-error/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-crm-error" />
          </div>
          <div>
            <h4 className="text-base font-semibold text-crm-text-primary">Eliminar plantilla</h4>
            <p className="text-sm text-crm-text-secondary mt-1">
              ¿Estás seguro de eliminar <strong>&quot;{nombre}&quot;</strong>? Esta acción no se
              puede deshacer.
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
            className="px-4 py-2 text-sm text-crm-text-secondary border border-crm-border rounded-lg hover:bg-crm-card-hover transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            className="px-4 py-2 text-sm bg-crm-error text-white rounded-lg hover:bg-crm-error/90 transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal preview de plantilla
// ─────────────────────────────────────────────────────────────────────────────

function ModalDetallePlantilla({
  plantilla,
  onCerrar,
  onEditar,
}: {
  plantilla: MarketingTemplate;
  onCerrar: () => void;
  onEditar: () => void;
}) {
  const estadoColor =
    plantilla.estado_aprobacion === "APPROVED"
      ? "bg-crm-success/10 text-crm-success border-crm-success/30"
      : "bg-crm-card-hover text-crm-text-secondary border-crm-border";

  const categoriaColor: Record<string, string> = {
    MARKETING: "bg-crm-primary/10 text-crm-primary",
    UTILITY: "bg-crm-secondary/10 text-crm-secondary",
    AUTHENTICATION: "bg-crm-accent/10 text-crm-accent",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onCerrar} />
      <div className="relative bg-crm-card border border-crm-border rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-crm-border">
          <div>
            <h4 className="text-lg font-semibold text-crm-text-primary">{plantilla.nombre}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${categoriaColor[plantilla.categoria] ?? "bg-crm-card-hover text-crm-text-secondary"}`}
              >
                {plantilla.categoria}
              </span>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full border ${estadoColor}`}
              >
                {plantilla.estado_aprobacion === "APPROVED" ? "Activa" : "Borrador"}
              </span>
              <span className="text-xs text-crm-text-muted">{plantilla.idioma}</span>
            </div>
          </div>
          <button onClick={onCerrar} className="text-crm-text-muted hover:text-crm-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="overflow-y-auto p-5 space-y-4">
          {/* Preview del mensaje */}
          <div>
            <p className="text-xs font-medium text-crm-text-muted uppercase tracking-wide mb-2">
              Vista previa
            </p>
            <div className="bg-crm-bg-secondary rounded-xl p-4 border border-crm-border">
              <p className="text-sm text-crm-text-primary whitespace-pre-wrap leading-relaxed">
                {plantilla.body_texto}
              </p>
              {plantilla.footer_texto && (
                <p className="text-xs text-crm-text-muted mt-2 border-t border-crm-border pt-2">
                  {plantilla.footer_texto}
                </p>
              )}
              {plantilla.botones && plantilla.botones.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {plantilla.botones.map((boton, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 text-xs font-medium bg-crm-primary/10 text-crm-primary rounded-full border border-crm-primary/20"
                    >
                      {boton.texto}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Variables */}
          {plantilla.variables && plantilla.variables.length > 0 && (
            <div>
              <p className="text-xs font-medium text-crm-text-muted uppercase tracking-wide mb-2">
                Variables
              </p>
              <div className="flex flex-wrap gap-1">
                {plantilla.variables.map((v, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 text-xs bg-crm-info/10 text-crm-info rounded border border-crm-info/20"
                  >
                    {`{{${i + 1}}}`} = {v}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Objetivo */}
          {plantilla.objetivo && (
            <div>
              <p className="text-xs font-medium text-crm-text-muted uppercase tracking-wide mb-1">
                Objetivo
              </p>
              <p className="text-sm text-crm-text-secondary">{plantilla.objetivo}</p>
            </div>
          )}

          {/* Metadatos */}
          <div className="grid grid-cols-2 gap-3 text-xs text-crm-text-muted pt-2 border-t border-crm-border">
            <div>
              <span className="font-medium">Creada:</span>{" "}
              {new Date(plantilla.created_at).toLocaleDateString("es-PE")}
            </div>
            {plantilla.whatsapp_template_id && (
              <div>
                <span className="font-medium">Código:</span> {plantilla.whatsapp_template_id}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-crm-border">
          <button
            onClick={onCerrar}
            className="px-4 py-2 text-sm text-crm-text-secondary border border-crm-border rounded-lg hover:bg-crm-card-hover transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={() => {
              onCerrar();
              onEditar();
            }}
            className="px-4 py-2 text-sm bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover transition-colors flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Editar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de estilo
// ─────────────────────────────────────────────────────────────────────────────

function getEstadoIcon(estado: string) {
  return estado === "APPROVED" ? (
    <CheckCircle className="w-4 h-4 text-crm-success" />
  ) : (
    <Clock className="w-4 h-4 text-crm-text-muted" />
  );
}

function getEstadoColor(estado: string) {
  return estado === "APPROVED"
    ? "bg-crm-success/10 text-crm-success border-crm-success/30"
    : "bg-crm-card-hover text-crm-text-secondary border-crm-border";
}

function getCategoriaColor(categoria: string) {
  const map: Record<string, string> = {
    MARKETING: "bg-crm-primary/10 text-crm-primary",
    UTILITY: "bg-crm-secondary/10 text-crm-secondary",
    AUTHENTICATION: "bg-crm-accent/10 text-crm-accent",
  };
  return map[categoria] ?? "bg-crm-card-hover text-crm-text-secondary";
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

export default function GestionPlantillas() {
  const [plantillas, setPlantillas] = useState<MarketingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalCrear, setModalCrear] = useState(false);
  const [plantillaEditar, setPlantillaEditar] = useState<MarketingTemplate | null>(null);
  const [plantillaDetalle, setPlantillaDetalle] = useState<MarketingTemplate | null>(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState<{
    id: string;
    nombre: string;
  } | null>(null);

  useEffect(() => {
    cargarPlantillas();
  }, []);

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
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="bg-crm-card border border-crm-border rounded-xl p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-crm-border rounded w-48 mb-4" />
              <div className="h-4 bg-crm-border rounded w-full mb-2" />
              <div className="h-4 bg-crm-border rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-crm-text-primary">
              Plantillas de Mensajes
            </h2>
            <p className="text-sm text-crm-text-secondary mt-1">
              Gestiona tus plantillas de WhatsApp y SMS con Twilio
            </p>
          </div>
          <button
            onClick={() => {
              setPlantillaEditar(null);
              setModalCrear(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva Plantilla
          </button>
        </div>

        {/* Lista de plantillas */}
        {plantillas.length === 0 ? (
          <div className="bg-crm-card border border-crm-border rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-crm-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-crm-primary" />
            </div>
            <h3 className="text-lg font-medium text-crm-text-primary mb-2">
              No hay plantillas creadas
            </h3>
            <p className="text-sm text-crm-text-secondary mb-6">
              Crea tu primera plantilla de mensajes para comenzar a enviar campañas con Twilio
            </p>
            <button
              onClick={() => {
                setPlantillaEditar(null);
                setModalCrear(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover transition-colors"
            >
              <Plus className="w-4 h-4" />
              Crear Primera Plantilla
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {plantillas.map((plantilla) => (
              <div
                key={plantilla.id}
                className="bg-crm-card border border-crm-border rounded-xl p-6 hover:shadow-lg transition-shadow duration-200"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-crm-text-primary">
                        {plantilla.nombre}
                      </h3>
                      {getEstadoIcon(plantilla.estado_aprobacion)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoriaColor(plantilla.categoria)}`}
                      >
                        {plantilla.categoria}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full border ${getEstadoColor(plantilla.estado_aprobacion)}`}
                      >
                        {plantilla.estado_aprobacion === "APPROVED" ? "Activa" : plantilla.estado_aprobacion}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contenido */}
                <div className="mb-4">
                  <p className="text-sm text-crm-text-secondary line-clamp-3">
                    {plantilla.body_texto}
                  </p>
                </div>

                {/* Variables */}
                {plantilla.variables && plantilla.variables.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-crm-text-muted mb-2">Variables:</p>
                    <div className="flex flex-wrap gap-1">
                      {plantilla.variables.map((variable, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-crm-info/10 text-crm-info rounded"
                        >
                          {`{{${variable}}}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Botones */}
                {plantilla.botones && plantilla.botones.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-crm-text-muted mb-2">Botones:</p>
                    <div className="flex flex-wrap gap-1">
                      {plantilla.botones.map((boton, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-crm-card-hover text-crm-text-secondary rounded border border-crm-border"
                        >
                          {boton.texto}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Acciones */}
                <div className="flex items-center gap-2 pt-4 border-t border-crm-border">
                  <button
                    onClick={() => setPlantillaDetalle(plantilla)}
                    className="inline-flex items-center justify-center w-8 h-8 text-crm-info hover:bg-crm-info/10 rounded-lg transition-colors"
                    title="Ver detalles"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setPlantillaEditar(plantilla);
                      setModalCrear(true);
                    }}
                    className="inline-flex items-center justify-center w-8 h-8 text-crm-secondary hover:bg-crm-secondary/10 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      setConfirmarEliminar({ id: plantilla.id, nombre: plantilla.nombre })
                    }
                    className="inline-flex items-center justify-center w-8 h-8 text-crm-error hover:bg-crm-error/10 rounded-lg transition-colors"
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

      {/* Modal crear / editar */}
      <ModalCrearPlantilla
        open={modalCrear}
        onClose={() => {
          setModalCrear(false);
          setPlantillaEditar(null);
        }}
        onSuccess={cargarPlantillas}
        plantilla={plantillaEditar ?? undefined}
      />

      {/* Modal confirmar eliminar */}
      {confirmarEliminar && (
        <ModalConfirmarEliminar
          nombre={confirmarEliminar.nombre}
          onConfirmar={handleEliminar}
          onCancelar={() => setConfirmarEliminar(null)}
        />
      )}

      {/* Modal preview */}
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
