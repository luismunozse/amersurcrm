"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Phone, Mail, MessageSquare, Users, Video, FileText, Clock, Calendar, Loader2, RefreshCw } from "lucide-react";
import RegistrarInteraccionModal from "@/components/RegistrarInteraccionModal";
import { TIPOS_INTERACCION, RESULTADOS_INTERACCION, PROXIMAS_ACCIONES } from "@/lib/types/crm-flujo";
import { obtenerInteracciones } from "../_actions_crm";

interface Props {
  clienteId: string;
  clienteNombre: string;
  interacciones: any[];
}

export default function TabInteracciones({ clienteId, clienteNombre, interacciones: initialInteracciones }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [interacciones, setInteracciones] = useState(initialInteracciones);
  const [loading, setLoading] = useState(false);

  const cargarInteracciones = useCallback(async () => {
    setLoading(true);
    const result = await obtenerInteracciones(clienteId);
    if (result.success && result.data) {
      setInteracciones(result.data);
    }
    setLoading(false);
  }, [clienteId]);

  useEffect(() => {
    // Cargar interacciones al montar el componente
    cargarInteracciones();
  }, [cargarInteracciones]);

  const handleModalClose = () => {
    setIsModalOpen(false);
    // Recargar interacciones después de cerrar el modal
    cargarInteracciones();
  };

  const getIconoTipo = (tipo: string) => {
    const tipos = {
      'llamada': <Phone className="h-4 w-4" />,
      'email': <Mail className="h-4 w-4" />,
      'whatsapp': <MessageSquare className="h-4 w-4" />,
      'visita': <Users className="h-4 w-4" />,
      'reunion': <Video className="h-4 w-4" />,
      'mensaje': <FileText className="h-4 w-4" />,
    };
    return tipos[tipo as keyof typeof tipos] || <FileText className="h-4 w-4" />;
  };

  const getColorResultado = (resultado: string) => {
    const colores = {
      'contesto': 'green',
      'no_contesto': 'red',
      'reagendo': 'yellow',
      'interesado': 'blue',
      'no_interesado': 'gray',
      'cerrado': 'purple',
      'pendiente': 'orange',
    };
    return colores[resultado as keyof typeof colores] || 'gray';
  };

  return (
    <div className="space-y-4">
      {/* Botón para nueva interacción */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-crm-text">Historial de Interacciones</h3>
        <div className="flex gap-2">
          <button
            onClick={cargarInteracciones}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-crm-text-secondary hover:text-crm-text-primary border border-crm-border rounded-lg hover:bg-crm-card-hover transition-colors disabled:opacity-50"
            title="Recargar interacciones"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-dark transition-colors"
          >
            <Plus className="h-4 w-4" />
            Registrar Interacción
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && interacciones.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-crm-primary" />
        </div>
      ) : !interacciones || interacciones.length === 0 ? (
        <div className="text-center py-12 bg-crm-background rounded-lg">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 text-crm-text-muted opacity-50" />
          <p className="text-crm-text-muted mb-4">No hay interacciones registradas</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-crm-primary hover:underline"
          >
            Registrar primera interacción
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {interacciones.map((interaccion) => {
            const tipoInfo = TIPOS_INTERACCION.find(t => t.value === interaccion.tipo);
            const resultadoInfo = RESULTADOS_INTERACCION.find(r => r.value === interaccion.resultado);
            const proximaAccionInfo = PROXIMAS_ACCIONES.find(p => p.value === interaccion.proxima_accion);
            const colorResultado = getColorResultado(interaccion.resultado || '');

            return (
              <div
                key={interaccion.id}
                className="p-4 bg-crm-background rounded-lg border border-crm-border hover:border-crm-primary transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-crm-card rounded-lg">
                      {getIconoTipo(interaccion.tipo)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-crm-text">{tipoInfo?.label || interaccion.tipo}</p>
                        {interaccion.resultado && (
                          <span className={`px-2 py-0.5 text-xs font-medium rounded bg-${colorResultado}-100 dark:bg-${colorResultado}-900/30 text-${colorResultado}-700 dark:text-${colorResultado}-300`}>
                            {resultadoInfo?.label || interaccion.resultado}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-crm-text-muted mt-1">
                        {new Date(interaccion.fecha_interaccion).toLocaleDateString('es-PE', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  {interaccion.duracion_minutos && (
                    <div className="flex items-center gap-1 text-sm text-crm-text-muted">
                      <Clock className="h-3 w-3" />
                      <span>{interaccion.duracion_minutos} min</span>
                    </div>
                  )}
                </div>

                {interaccion.notas && (
                  <p className="text-sm text-crm-text mb-3 pl-11">{interaccion.notas}</p>
                )}

                {interaccion.proxima_accion && interaccion.proxima_accion !== 'ninguna' && (
                  <div className="pl-11 pt-3 border-t border-crm-border">
                    <div className="flex items-start gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-crm-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-crm-text">
                          Próxima acción: {proximaAccionInfo?.label || interaccion.proxima_accion}
                        </p>
                        {interaccion.fecha_proxima_accion && (
                          <p className="text-xs text-crm-text-muted mt-1">
                            {new Date(interaccion.fecha_proxima_accion).toLocaleDateString('es-PE', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="pl-11 mt-2 text-xs text-crm-text-muted">
                  Registrado por: {interaccion.vendedor?.username || 'desconocido'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <RegistrarInteraccionModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        clienteId={clienteId}
        clienteNombre={clienteNombre}
      />
    </div>
  );
}
