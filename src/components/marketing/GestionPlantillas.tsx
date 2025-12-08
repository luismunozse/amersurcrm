"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Eye, CheckCircle, Clock, MessageSquare } from "lucide-react";
import { obtenerPlantillas, eliminarPlantilla } from "@/app/dashboard/admin/marketing/_actions";
import type { MarketingTemplate } from "@/types/whatsapp-marketing";
import toast from "react-hot-toast";
import ModalCrearPlantilla from "./ModalCrearPlantilla";

export default function GestionPlantillas() {
  const [plantillas, setPlantillas] = useState<MarketingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalCrear, setModalCrear] = useState(false);

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

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta plantilla?')) return;

    const result = await eliminarPlantilla(id);
    
    if (result.success) {
      toast.success('Plantilla eliminada');
      cargarPlantillas();
    } else {
      toast.error(result.error || 'Error eliminando plantilla');
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'APPROVED':
        return <CheckCircle className="w-4 h-4 text-crm-success" />;
      case 'DRAFT':
        return <Clock className="w-4 h-4 text-crm-text-muted" />;
      default:
        return <Clock className="w-4 h-4 text-crm-text-muted" />;
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'APPROVED':
        return 'bg-crm-success/10 text-crm-success border-crm-success/30';
      case 'DRAFT':
        return 'bg-crm-text-muted/10 text-crm-text-secondary border-crm-border';
      default:
        return 'bg-crm-text-muted/10 text-crm-text-secondary border-crm-border';
    }
  };

  const getCategoriaColor = (categoria: string) => {
    switch (categoria) {
      case 'MARKETING':
        return 'bg-crm-primary/10 text-crm-primary';
      case 'UTILITY':
        return 'bg-crm-secondary/10 text-crm-secondary';
      case 'AUTHENTICATION':
        return 'bg-crm-accent/10 text-crm-accent';
      default:
        return 'bg-crm-text-muted/10 text-crm-text-secondary';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="bg-crm-card border border-crm-border rounded-xl p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-crm-border rounded w-48 mb-4"></div>
              <div className="h-4 bg-crm-border rounded w-full mb-2"></div>
              <div className="h-4 bg-crm-border rounded w-3/4"></div>
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
            <h2 className="text-xl font-semibold text-crm-text-primary">Plantillas de Mensajes</h2>
            <p className="text-sm text-crm-text-secondary mt-1">
              Gestiona tus plantillas de WhatsApp y SMS con Twilio
            </p>
          </div>
          <button
            onClick={() => setModalCrear(true)}
            className="flex items-center gap-2 px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva Plantilla
          </button>
        </div>

      {/* Lista de plantillas */}
      {plantillas.length === 0 ? (
        <div className="bg-crm-card border border-crm-border rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-crm-text-primary mb-2">
            No hay plantillas creadas
          </h3>
          <p className="text-sm text-crm-text-secondary mb-6">
            Crea tu primera plantilla de mensajes para comenzar a enviar campañas con Twilio
          </p>
          <button
            onClick={() => setModalCrear(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            Crear Primera Plantilla
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {plantillas.map((plantilla) => (
            <div key={plantilla.id} className="bg-crm-card border border-crm-border rounded-xl p-6 hover:shadow-lg transition-shadow duration-200">
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
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoriaColor(plantilla.categoria)}`}>
                      {plantilla.categoria}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getEstadoColor(plantilla.estado_aprobacion)}`}>
                      {plantilla.estado_aprobacion}
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
                      <span key={index} className="px-2 py-1 text-xs bg-crm-info/10 text-crm-info rounded">
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
                      <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded border border-gray-300">
                        {boton.texto}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Acciones */}
              <div className="flex items-center gap-2 pt-4 border-t border-crm-border">
                <button
                  className="inline-flex items-center justify-center w-8 h-8 text-crm-info hover:text-crm-info hover:bg-crm-info/10 rounded-lg transition-colors"
                  title="Ver detalles"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  className="inline-flex items-center justify-center w-8 h-8 text-crm-secondary hover:text-crm-secondary hover:bg-crm-secondary/10 rounded-lg transition-colors"
                  title="Editar"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleEliminar(plantilla.id)}
                  className="inline-flex items-center justify-center w-8 h-8 text-crm-danger hover:text-crm-danger hover:bg-crm-danger/10 rounded-lg transition-colors"
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

      {/* Modal */}
      <ModalCrearPlantilla
        open={modalCrear}
        onClose={() => setModalCrear(false)}
        onSuccess={cargarPlantillas}
      />
    </>
  );
}
