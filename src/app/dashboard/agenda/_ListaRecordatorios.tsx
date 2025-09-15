"use client";

import { useState } from "react";
import { Recordatorio } from "@/lib/types/agenda";
import { marcarRecordatorioCompletado, marcarRecordatorioLeido, eliminarRecordatorio } from "./actions";
import toast from "react-hot-toast";
import {
  CheckIcon,
  ClockIcon,
  CalendarIcon,
  TrashIcon,
  PencilIcon,
  PlusIcon
} from "@heroicons/react/24/outline";

interface ListaRecordatoriosProps {
  recordatoriosIniciales: Recordatorio[];
  onEditarRecordatorio: (recordatorio: Recordatorio) => void;
  onCrearRecordatorio: () => void;
}

export default function ListaRecordatorios({ 
  recordatoriosIniciales, 
  onEditarRecordatorio, 
  onCrearRecordatorio 
}: ListaRecordatoriosProps) {
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>(recordatoriosIniciales);
  const [filtro, setFiltro] = useState<'todos' | 'pendientes' | 'completados'>('pendientes');

  const recordatoriosFiltrados = recordatorios.filter(recordatorio => {
    if (filtro === 'pendientes') return !recordatorio.completado;
    if (filtro === 'completados') return recordatorio.completado;
    return true;
  });

  const handleMarcarCompletado = async (recordatorioId: string) => {
    try {
      const result = await marcarRecordatorioCompletado(recordatorioId);
      if (result.success) {
        setRecordatorios(prev => 
          prev.map(r => 
            r.id === recordatorioId 
              ? { ...r, completado: true, fecha_completado: new Date().toISOString() }
              : r
          )
        );
        toast.success("Recordatorio marcado como completado");
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error marcando recordatorio:', error);
      toast.error("Error al marcar recordatorio");
    }
  };

  const handleMarcarLeido = async (recordatorioId: string) => {
    try {
      const result = await marcarRecordatorioLeido(recordatorioId);
      if (result.success) {
        setRecordatorios(prev => 
          prev.map(r => 
            r.id === recordatorioId 
              ? { ...r, leido: true }
              : r
          )
        );
        toast.success("Recordatorio marcado como leído");
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error marcando recordatorio:', error);
      toast.error("Error al marcar recordatorio");
    }
  };

  const handleEliminar = async (recordatorioId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este recordatorio?")) {
      return;
    }

    try {
      const result = await eliminarRecordatorio(recordatorioId);
      if (result.success) {
        setRecordatorios(prev => prev.filter(r => r.id !== recordatorioId));
        toast.success("Recordatorio eliminado");
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error eliminando recordatorio:', error);
      toast.error("Error al eliminar recordatorio");
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'urgente': return 'text-red-600 bg-red-100';
      case 'alta': return 'text-orange-600 bg-orange-100';
      case 'media': return 'text-blue-600 bg-blue-100';
      case 'baja': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'seguimiento_cliente': return '👥';
      case 'llamada_prospecto': return '📞';
      case 'envio_documentos': return '📄';
      case 'visita_propiedad': return '🏠';
      case 'reunion_equipo': return '👥';
      default: return '⏰';
    }
  };

  return (
    <div className="crm-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-crm-text-primary">Recordatorios</h3>
        <button
          onClick={onCrearRecordatorio}
          className="flex items-center space-x-2 px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Nuevo</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => setFiltro('pendientes')}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
            filtro === 'pendientes' 
              ? 'bg-crm-primary text-white' 
              : 'bg-crm-border text-crm-text-secondary hover:bg-crm-border-hover'
          }`}
        >
          Pendientes ({recordatorios.filter(r => !r.completado).length})
        </button>
        <button
          onClick={() => setFiltro('completados')}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
            filtro === 'completados' 
              ? 'bg-crm-primary text-white' 
              : 'bg-crm-border text-crm-text-secondary hover:bg-crm-border-hover'
          }`}
        >
          Completados ({recordatorios.filter(r => r.completado).length})
        </button>
        <button
          onClick={() => setFiltro('todos')}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
            filtro === 'todos' 
              ? 'bg-crm-primary text-white' 
              : 'bg-crm-border text-crm-text-secondary hover:bg-crm-border-hover'
          }`}
        >
          Todos ({recordatorios.length})
        </button>
      </div>

      {/* Lista de recordatorios */}
      <div className="space-y-3">
        {recordatoriosFiltrados.length === 0 ? (
          <div className="text-center py-8 text-crm-text-muted">
            <ClockIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay recordatorios {filtro === 'pendientes' ? 'pendientes' : filtro === 'completados' ? 'completados' : ''}</p>
          </div>
        ) : (
          recordatoriosFiltrados.map((recordatorio) => (
            <div
              key={recordatorio.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                recordatorio.completado 
                  ? 'bg-gray-50 border-gray-200 opacity-75' 
                  : 'bg-white border-crm-border hover:border-crm-primary/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-lg">{getTipoIcon(recordatorio.tipo)}</span>
                    <h4 className={`font-medium ${recordatorio.completado ? 'line-through text-gray-500' : 'text-crm-text-primary'}`}>
                      {recordatorio.titulo}
                    </h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPrioridadColor(recordatorio.prioridad)}`}>
                      {recordatorio.prioridad}
                    </span>
                  </div>
                  
                  {recordatorio.descripcion && (
                    <p className={`text-sm mb-2 ${recordatorio.completado ? 'text-gray-400' : 'text-crm-text-secondary'}`}>
                      {recordatorio.descripcion}
                    </p>
                  )}

                  <div className="flex items-center space-x-4 text-xs text-crm-text-muted">
                    <div className="flex items-center space-x-1">
                      <CalendarIcon className="w-4 h-4" />
                      <span>{new Date(recordatorio.fecha_recordatorio).toLocaleString()}</span>
                    </div>
                    {recordatorio.cliente && (
                      <div className="flex items-center space-x-1">
                        <span>👤</span>
                        <span>{recordatorio.cliente.nombre}</span>
                      </div>
                    )}
                    {recordatorio.propiedad && (
                      <div className="flex items-center space-x-1">
                        <span>🏠</span>
                        <span>{recordatorio.propiedad.identificacion_interna}</span>
                      </div>
                    )}
                  </div>

                  {recordatorio.etiquetas && recordatorio.etiquetas.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {recordatorio.etiquetas.map((etiqueta, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-crm-primary/10 text-crm-primary text-xs rounded-full"
                        >
                          {etiqueta}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {!recordatorio.completado && (
                    <button
                      onClick={() => handleMarcarCompletado(recordatorio.id)}
                      className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                      title="Marcar como completado"
                    >
                      <CheckIcon className="w-4 h-4" />
                    </button>
                  )}
                  
                  {!recordatorio.leido && !recordatorio.completado && (
                    <button
                      onClick={() => handleMarcarLeido(recordatorio.id)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Marcar como leído"
                    >
                      <ClockIcon className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => onEditarRecordatorio(recordatorio)}
                    className="p-2 text-crm-text-muted hover:bg-crm-border rounded-lg transition-colors"
                    title="Editar"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleEliminar(recordatorio.id)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
