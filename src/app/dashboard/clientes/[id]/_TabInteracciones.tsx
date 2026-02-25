"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { Plus, Phone, Mail, MessageSquare, Users, Video, FileText, Clock, Calendar, RefreshCw, Edit2, Trash2, AlertCircle, AlertTriangle } from "lucide-react";
import { PageLoader } from "@/components/ui/PageLoader";
import { calcularSeguimientosPendientes } from "@/lib/utils/seguimientos";
import RegistrarInteraccionModal from "@/components/RegistrarInteraccionModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { TIPOS_INTERACCION, RESULTADOS_INTERACCION, PROXIMAS_ACCIONES } from "@/lib/types/crm-flujo";
import type { InteraccionConVendedor } from "@/lib/types/cliente-detail";
import { obtenerInteracciones, eliminarInteraccion } from "../_actions_crm";
import toast from "react-hot-toast";
import { getSmallBadgeClasses } from "@/lib/utils/badge";

interface Props {
  clienteId: string;
  clienteNombre: string;
  interacciones: InteraccionConVendedor[];
  onCountChange?: (count: number) => void;
}

function getIconoTipo(tipo: string) {
  const tipos = {
    'llamada': <Phone className="h-4 w-4" />,
    'email': <Mail className="h-4 w-4" />,
    'whatsapp': <MessageSquare className="h-4 w-4" />,
    'visita': <Users className="h-4 w-4" />,
    'reunion': <Video className="h-4 w-4" />,
    'mensaje': <FileText className="h-4 w-4" />,
  };
  return tipos[tipo as keyof typeof tipos] || <FileText className="h-4 w-4" />;
}

function getColorResultado(resultado: string) {
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
}

export default function TabInteracciones({ clienteId, clienteNombre, interacciones: initialInteracciones, onCountChange }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [interacciones, setInteracciones] = useState<InteraccionConVendedor[]>(initialInteracciones);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interaccionToEdit, setInteraccionToEdit] = useState<InteraccionConVendedor | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; interaccionId: string | null }>({
    open: false,
    interaccionId: null,
  });
  const [isPending, startTransition] = useTransition();

  const cargarInteracciones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await obtenerInteracciones(clienteId);
      if (result.success && result.data) {
        setInteracciones(result.data);
        onCountChange?.(result.data.length);
      } else {
        setError(result.error || "No se pudieron cargar las interacciones");
      }
    } catch (err) {
      setError("Error inesperado al cargar interacciones");
      console.error("Error cargando interacciones:", err);
    } finally {
      setLoading(false);
    }
  }, [clienteId, onCountChange]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await obtenerInteracciones(clienteId);
        if (cancelled) return;
        if (result.success && result.data) {
          setInteracciones(result.data);
          onCountChange?.(result.data.length);
        } else {
          setError(result.error || "No se pudieron cargar las interacciones");
        }
      } catch (err) {
        if (cancelled) return;
        setError("Error inesperado al cargar interacciones");
        console.error("Error cargando interacciones:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [clienteId, onCountChange]);

  const handleModalClose = () => {
    setIsModalOpen(false);
    setInteraccionToEdit(null);
    cargarInteracciones();
  };

  const handleDelete = async () => {
    if (!confirmDelete.interaccionId) return;

    startTransition(async () => {
      const result = await eliminarInteraccion(confirmDelete.interaccionId!);

      if (result.success) {
        toast.success('Interacción eliminada exitosamente');
        setConfirmDelete({ open: false, interaccionId: null });
        cargarInteracciones();
      } else {
        toast.error(result.error || 'Error al eliminar la interacción');
      }
    });
  };

  const seguimientosVencidos = calcularSeguimientosPendientes(interacciones).filter(s => s.esVencido);

  return (
    <div className="space-y-4">
      {/* Resumen de seguimientos vencidos */}
      {seguimientosVencidos.length > 0 && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <h4 className="text-sm font-semibold text-red-800 dark:text-red-200">
              {seguimientosVencidos.length} seguimiento{seguimientosVencidos.length > 1 ? 's' : ''} vencido{seguimientosVencidos.length > 1 ? 's' : ''}
            </h4>
          </div>
          <div className="space-y-1">
            {seguimientosVencidos.slice(0, 5).map(s => {
              const accionInfo = PROXIMAS_ACCIONES.find(p => p.value === s.proximaAccion);
              return (
                <div key={s.interaccionId} className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                  <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{accionInfo?.label || s.proximaAccion}</span>
                  <span className="text-red-500 dark:text-red-400 font-medium">
                    (hace {s.diasVencido} dia{s.diasVencido !== 1 ? 's' : ''})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {loading && interacciones.length === 0 ? (
        <PageLoader size="sm" />
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
            const esVencido = !!(
              interaccion.proxima_accion &&
              interaccion.proxima_accion !== 'ninguna' &&
              interaccion.fecha_proxima_accion &&
              new Date(interaccion.fecha_proxima_accion) < new Date()
            );

            return (
              <div
                key={interaccion.id}
                className={`p-4 bg-crm-background rounded-lg border transition-colors ${
                  esVencido
                    ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10'
                    : 'border-crm-border hover:border-crm-primary'
                }`}
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
                          <span className={getSmallBadgeClasses(colorResultado)}>
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

                  <div className="flex items-center gap-2">
                    {interaccion.duracion_minutos && (
                      <div className="flex items-center gap-1 text-sm text-crm-text-muted">
                        <Clock className="h-3 w-3" />
                        <span>{interaccion.duracion_minutos} min</span>
                      </div>
                    )}

                    {/* Botones de acción */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setInteraccionToEdit(interaccion);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 text-crm-text-muted hover:text-crm-primary hover:bg-crm-card-hover rounded transition-colors"
                        title="Editar interacción"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete({ open: true, interaccionId: interaccion.id })}
                        className="p-1.5 text-crm-text-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Eliminar interacción"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {interaccion.notas && (
                  <p className="text-sm text-crm-text mb-3 pl-11">{interaccion.notas}</p>
                )}

                {interaccion.proxima_accion && interaccion.proxima_accion !== 'ninguna' && (
                  <div className={`pl-11 pt-3 border-t ${esVencido ? 'border-red-200 dark:border-red-800' : 'border-crm-border'}`}>
                    <div className="flex items-start gap-2 text-sm">
                      <Calendar className={`h-4 w-4 mt-0.5 ${esVencido ? 'text-red-500' : 'text-crm-primary'}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-medium ${esVencido ? 'text-red-700 dark:text-red-300' : 'text-crm-text'}`}>
                            Próxima acción: {proximaAccionInfo?.label || interaccion.proxima_accion}
                          </p>
                          {esVencido && (
                            <span className="px-2 py-0.5 text-xs font-bold rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                              VENCIDO — {Math.floor((Date.now() - new Date(interaccion.fecha_proxima_accion!).getTime()) / (1000 * 60 * 60 * 24))} dias
                            </span>
                          )}
                        </div>
                        {interaccion.fecha_proxima_accion && (
                          <p className={`text-xs mt-1 ${esVencido ? 'text-red-500 dark:text-red-400' : 'text-crm-text-muted'}`}>
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
        interaccionToEdit={interaccionToEdit}
      />

      {/* Dialog de confirmación de eliminación */}
      <ConfirmDialog
        open={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, interaccionId: null })}
        onConfirm={handleDelete}
        title="Eliminar Interacción"
        description="¿Estás seguro de que deseas eliminar esta interacción? Esta acción no se puede deshacer."
        confirmText={isPending ? "Eliminando…" : "Eliminar"}
        cancelText="Cancelar"
        disabled={isPending}
      />
    </div>
  );
}
