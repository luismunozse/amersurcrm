"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Edit, Trash2, Eye, MapPin, Ruler, Calendar, CheckCircle, Clock, XCircle, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { actualizarLote, eliminarLote, duplicarLote, eliminarTodosLosLotes } from "./_actions";
import LoteEditModal from "./LoteEditModal";
import LoteDetailModal from "./LoteDetailModal";
import ModalReservaLote from "./ModalReservaLote";
import DeleteAllLotesModal from "./_DeleteAllLotesModal";

type Lote = {
  id: string;
  codigo: string;
  sup_m2: number | null;
  precio: number | null;
  moneda: string | null;
  estado: "disponible" | "reservado" | "vendido";
  created_at: string;
  proyecto?: {
    id: string;
    nombre: string;
  };
  data?: {
    fotos?: string[];
    plano?: string;
    renders?: string[];
    links3D?: string[];
    proyecto?: string;
    ubicacion?: string;
    etapa?: string;
    identificador?: string;
    manzana?: string;
    numero?: string;
    condiciones?: string;
    descuento?: number;
    nombre?: string;
    tipo_unidad?: string;
    precio_m2?: number;
  };
};

interface LotesListProps {
  proyectoId: string;
  lotes: Lote[];
  totalLotes?: number;
}

export default function LotesList({ proyectoId, lotes, totalLotes }: LotesListProps) {
  const [editingLote, setEditingLote] = useState<string | null>(null);
  const [lotesState, setLotesState] = useState<Lote[]>(lotes);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null);
  const [reservandoLoteId, setReservandoLoteId] = useState<string | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);

  // Sincronizar el estado cuando cambien los lotes
  useEffect(() => {
    setLotesState(lotes);
  }, [lotes]);

  // Helper para parsear data
  const parseData = (data: any) => {
    if (!data) return null;
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch (e) {
        return null;
      }
    }
    return data;
  };


  // Sincronizar estado cuando cambien los props
  useEffect(() => {
    setLotesState(lotes);
  }, [lotes]);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId && !(event.target as Element).closest('.relative')) {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  // Usar solo los lotes reales
  const lotesAMostrar = lotesState;
  const totalListado = typeof totalLotes === "number" ? totalLotes : lotesAMostrar.length;

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'disponible':
        return 'bg-green-100 text-green-600 border-green-200';
      case 'reservado':
        return 'bg-yellow-100 text-yellow-600 border-yellow-200';
      case 'vendido':
        return 'bg-red-100 text-red-600 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEstadoText = (estado: string) => {
    switch (estado) {
      case 'disponible':
        return 'Disponible';
      case 'reservado':
        return 'Reservado';
      case 'vendido':
        return 'Vendido';
      default:
        return estado;
    }
  };

  const formatPrecio = (precio: number | null, moneda: string | null) => {
    if (!precio) return 'No especificado';
    const formatter = new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return formatter.format(precio).replace('PEN', 'S/');
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleEdit = (loteId: string) => {
    setEditingLote(loteId);
  };

  const handleDelete = async (loteId: string, codigo: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el lote ${codigo}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      // Actualización optimista
      setLotesState(prevLotes => prevLotes.filter(lote => lote.id !== loteId));

      await eliminarLote(loteId, proyectoId);
      toast.success(`Lote ${codigo} eliminado exitosamente`);
    } catch (error) {
      // Revertir cambios en caso de error
      setLotesState(lotes);
      toast.error(`Error eliminando lote: ${(error as Error).message}`);
    }
  };

  const handleDeleteAll = () => {
    setShowDeleteAllModal(true);
  };

  const handleConfirmDeleteAll = async () => {
    const totalCount = totalLotes || lotesAMostrar.length;

    try {
      // Mostrar loading toast
      const loadingToast = toast.loading(`Eliminando ${totalCount} lotes...`);

      // Actualización optimista
      setLotesState([]);

      const result = await eliminarTodosLosLotes(proyectoId);

      toast.dismiss(loadingToast);
      toast.success(result.message || `${result.deletedCount} lotes eliminados exitosamente`);

      // Refrescar la página para mostrar el estado actualizado
      window.location.reload();
    } catch (error) {
      // Revertir cambios en caso de error
      setLotesState(lotes);
      toast.error(`Error eliminando lotes: ${(error as Error).message}`);
    }
  };

  const handleView = (lote: Lote) => {
    setSelectedLote(lote);
  };

  const handleDuplicate = async (loteId: string, codigo: string) => {
    try {
      const dup = await duplicarLote(loteId, proyectoId);
      toast.success(`Lote ${codigo} duplicado como ${dup.codigo}`);
      setLotesState(prev => [dup as any, ...prev]);
    } catch (e) {
      toast.error((e as Error).message || 'Error duplicando lote');
    }
  };

  const toggleMenu = (loteId: string) => {
    setOpenMenuId(openMenuId === loteId ? null : loteId);
  };

  const closeMenu = () => {
    setOpenMenuId(null);
  };

  const handleEstadoChange = async (loteId: string, nuevoEstado: string) => {
    try {
      // Actualización optimista
      setLotesState(prevLotes => 
        prevLotes.map(lote => 
          lote.id === loteId 
            ? { ...lote, estado: nuevoEstado as "disponible" | "reservado" | "vendido" }
            : lote
        )
      );

      // Actualizar también el estado en el mapa si existe la función
      if (typeof (window as any).updateLoteState === 'function') {
        (window as any).updateLoteState(loteId, nuevoEstado);
      }

      const formData = new FormData();
      formData.append('estado', nuevoEstado);
      formData.append('proyecto_id', proyectoId);
      
      await actualizarLote(loteId, formData);
      
      const estadoText = getEstadoText(nuevoEstado);
      toast.success(`Estado cambiado a ${estadoText}`);
    } catch (error) {
      // Revertir cambios en caso de error
      setLotesState(lotes);
      toast.error(error instanceof Error ? error.message : 'Error cambiando estado');
    }
  };

  const getEstadoButtons = (lote: Lote) => {
    const buttons = [];

    if (lote.estado === 'disponible') {
      buttons.push(
        <Button
          key="reservar"
          variant="outline"
          size="sm"
          onClick={() => setReservandoLoteId(lote.id)}
          className="px-2 py-1 text-xs font-medium text-yellow-600 bg-yellow-100 border-yellow-200 hover:bg-yellow-200 hover:border-yellow-300 transition-colors"
        >
          <Clock className="w-3 h-3 mr-1" />
          <span className="hidden xl:inline">Reservar</span>
        </Button>
      );
      buttons.push(
        <Button
          key="vender"
          variant="outline"
          size="sm"
          onClick={() => handleEstadoChange(lote.id, 'vendido')}
          className="px-2 py-1 text-xs font-medium text-red-600 bg-red-100 border-red-200 hover:bg-red-200 hover:border-red-300 transition-colors"
        >
          <CheckCircle className="w-3 h-3 mr-1" />
          <span className="hidden xl:inline">Vender</span>
        </Button>
      );
    }
    
    if (lote.estado === 'reservado') {
      buttons.push(
        <Button
          key="vender"
          variant="outline"
          size="sm"
          onClick={() => handleEstadoChange(lote.id, 'vendido')}
          className="px-2 py-1 text-xs font-medium text-red-600 bg-red-100 border-red-200 hover:bg-red-200 hover:border-red-300 transition-colors"
        >
          <CheckCircle className="w-3 h-3 mr-1" />
          <span className="hidden xl:inline">Vender</span>
        </Button>
      );
      buttons.push(
        <Button
          key="liberar"
          variant="outline"
          size="sm"
          onClick={() => handleEstadoChange(lote.id, 'disponible')}
          className="px-2 py-1 text-xs font-medium text-green-600 bg-green-100 border-green-200 hover:bg-green-200 hover:border-green-300 transition-colors"
        >
          <XCircle className="w-3 h-3 mr-1" />
          <span className="hidden xl:inline">Liberar</span>
        </Button>
      );
    }
    
    if (lote.estado === 'vendido') {
      buttons.push(
        <Button
          key="revertir"
          variant="outline"
          size="sm"
          onClick={() => handleEstadoChange(lote.id, 'reservado')}
          className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 border-blue-200 hover:bg-blue-200 hover:border-blue-300 transition-colors"
        >
          <Clock className="w-3 h-3 mr-1" />
          <span className="hidden xl:inline">Revertir</span>
        </Button>
      );
    }
    
    return buttons;
  };

  return (
    <>
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="flex items-center gap-2 flex-wrap">
              <div className="w-8 h-8 bg-crm-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                </svg>
              </div>
              Lotes del Proyecto
              <span className="text-sm font-normal text-crm-text-muted">
                ({totalListado} {totalListado === 1 ? 'lote' : 'lotes'})
              </span>
            </CardTitle>

            {/* Botón eliminar todos los lotes */}
            {totalListado > 0 && (
              <Button
                onClick={handleDeleteAll}
                variant="outline"
                size="sm"
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-crm-danger border-crm-danger hover:bg-crm-danger hover:text-white transition-colors w-full sm:w-auto"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden md:inline">Eliminar todos los lotes</span>
                <span className="md:hidden">Eliminar todos</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {lotesAMostrar.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-crm-card-hover rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-crm-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                </svg>
              </div>
              <h4 className="text-xl font-medium text-crm-text-primary mb-3">No hay lotes registrados</h4>
              <p className="text-crm-text-muted mb-6 max-w-md mx-auto">
                Comienza agregando tu primer lote usando el asistente paso a paso de arriba.
              </p>
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-crm-primary/10 text-crm-primary rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span className="text-sm font-medium">Usa el botón &quot;Crear Lote&quot; para comenzar</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Vista de escritorio - Tabla completa */}
              <div className="hidden lg:block space-y-3">
              {/* Header de la tabla */}
              <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-crm-card-hover rounded-lg text-sm font-medium text-crm-text-muted">
                <div className="col-span-2">Código</div>
                <div className="col-span-2">Tipo de Unidad</div>
                <div className="col-span-2">Proyecto</div>
                <div className="col-span-1">Estado</div>
                <div className="col-span-1">Superficie</div>
                <div className="col-span-1">Precio</div>
                <div className="col-span-1">Fecha</div>
                <div className="col-span-2 text-center">Acciones</div>
              </div>

                {/* Lista de lotes - Vista de escritorio */}
                {lotesAMostrar.map((lote) => (
                  <div
                    key={lote.id}
                    className="grid grid-cols-12 gap-3 px-4 py-4 bg-crm-card border border-crm-border rounded-lg hover:bg-crm-card-hover transition-colors"
                  >
                    {/* Código */}
                    <div className="col-span-2 flex items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-crm-primary/10 rounded-lg flex items-center justify-center">
                          <span className="text-xs font-semibold text-crm-primary">
                            {lote.codigo.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-crm-text-primary truncate">{lote.codigo}</div>
                        </div>
                      </div>
                    </div>

                    {/* Tipo de Unidad */}
                    <div className="col-span-2 flex items-center">
                      <div className="flex-1 min-w-0">
                        {(() => {
                          const dataObj = parseData(lote.data);
                          return (
                            <>
                              <div className="text-crm-text-primary truncate">
                                {dataObj?.tipo_unidad || 'Lote'}
                              </div>
                              {dataObj?.manzana && (
                                <div className="text-xs text-crm-text-muted">Mz. {dataObj.manzana}</div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Proyecto */}
                    <div className="col-span-2 flex items-center">
                      <div className="flex-1 min-w-0">
                        {lote.proyecto ? (
                          <div className="text-crm-primary font-medium truncate">{lote.proyecto.nombre}</div>
                        ) : (
                          <span className="text-crm-text-muted">No especificado</span>
                        )}
                      </div>
                    </div>

                    {/* Estado */}
                    <div className="col-span-1 flex items-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getEstadoColor(lote.estado)}`}>
                        {getEstadoText(lote.estado)}
                      </span>
                    </div>

                    {/* Superficie */}
                    <div className="col-span-1 flex items-center text-crm-text-primary">
                      {lote.sup_m2 ? (
                        <div className="flex items-center gap-1">
                          <Ruler className="w-4 h-4 text-crm-text-muted" />
                          <span>{lote.sup_m2} m²</span>
                        </div>
                      ) : (
                        <span className="text-crm-text-muted">No especificado</span>
                      )}
                    </div>

                    {/* Precio */}
                    <div className="col-span-1 flex items-center text-crm-text-primary">
                      {lote.precio ? (
                        <div className="flex items-center gap-1">
                          <span className="text-crm-text-muted font-medium">S/</span>
                          <span className="font-medium">{formatPrecio(lote.precio, lote.moneda).replace('S/', '')}</span>
                        </div>
                      ) : (
                        <span className="text-crm-text-muted">No especificado</span>
                      )}
                    </div>

                    {/* Fecha */}
                    <div className="col-span-1 flex items-center text-crm-text-muted">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">{formatFecha(lote.created_at)}</span>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <div className="flex items-center gap-1 flex-wrap justify-end">
                        {/* Botones de cambio de estado - Solo los más importantes */}
                        <div className="flex items-center gap-1">
                          {getEstadoButtons(lote).slice(0, 1)}
                        </div>
                        
                        {/* Menú de más opciones */}
                        <div className="relative">
                          <button
                            onClick={() => toggleMenu(lote.id)}
                            className="text-crm-text-muted hover:text-crm-text-primary transition-colors p-1.5"
                            title="Más opciones"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          
                          {/* Menú desplegable */}
                          {openMenuId === lote.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-crm-card border border-crm-border rounded-lg shadow-lg z-50">
                              <div className="py-1">
                                {/* Botones de estado restantes */}
                                {getEstadoButtons(lote).slice(1).map((button, index) => (
                                  <div key={index} className="px-3 py-1">
                                    {button}
                                  </div>
                                ))}
                                
                                {/* Separador */}
                                {getEstadoButtons(lote).length > 1 && (
                                  <div className="border-t border-crm-border my-1"></div>
                                )}
                                
                                {/* Acciones adicionales */}
                                
                                <button
                                  onClick={() => {
                                    handleView(lote);
                                    closeMenu();
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-crm-text-primary hover:bg-crm-card-hover transition-colors"
                                >
                                  <Eye className="w-4 h-4" />
                                  Ver detalles
                                </button>
                                <button
                                  onClick={() => {
                                    handleEdit(lote.id);
                                    closeMenu();
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-crm-text-primary hover:bg-crm-card-hover transition-colors"
                                >
                                  <Edit className="w-4 h-4" />
                                  Editar lote
                                </button>
                                <button
                                  onClick={() => {
                                    handleDuplicate(lote.id, lote.codigo);
                                    closeMenu();
                                  }}
                                  title="Duplicar lote"
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-crm-text-primary hover:bg-crm-card-hover transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H6a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-2M8 7V5a2 2 0 012-2h6a2 2 0 012 2v6M8 7h6a2 2 0 012 2v6"/></svg>
                                  Duplicar lote
                                </button>
                                <button
                                  onClick={() => {
                                    handleDelete(lote.id, lote.codigo);
                                    closeMenu();
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-crm-danger hover:bg-crm-card-hover transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Eliminar lote
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Vista móvil y tablet - Lista compacta */}
              <div className="lg:hidden rounded-xl border border-crm-border divide-y divide-crm-border bg-transparent">
                {lotesAMostrar.map((lote) => {
                  const dataObj = parseData(lote.data);
                  return (
                    <div key={lote.id} className="relative p-4 space-y-3 bg-crm-card/40">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-crm-text-primary">{lote.codigo}</p>
                          <p className="text-xs text-crm-text-muted">
                            {dataObj?.tipo_unidad || 'Lote'}
                            {dataObj?.manzana && ` · Mz. ${dataObj.manzana}`}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getEstadoColor(lote.estado)}`}>
                          {getEstadoText(lote.estado)}
                        </span>
                      </div>

                      <dl className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt className="text-xs text-crm-text-muted uppercase tracking-wide">Proyecto</dt>
                          <dd className="font-medium text-crm-primary truncate">
                            {lote.proyecto ? lote.proyecto.nombre : 'No especificado'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-crm-text-muted uppercase tracking-wide">Superficie</dt>
                          <dd className="text-crm-text-primary">
                            {lote.sup_m2 ? `${lote.sup_m2} m²` : 'No especificado'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-crm-text-muted uppercase tracking-wide">Precio</dt>
                          <dd className="text-crm-text-primary">
                            {lote.precio ? (
                              <span className="font-medium">{formatPrecio(lote.precio, lote.moneda)}</span>
                            ) : 'No especificado'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-crm-text-muted uppercase tracking-wide">Fecha</dt>
                          <dd className="text-crm-text-muted">{formatFecha(lote.created_at)}</dd>
                        </div>
                      </dl>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                          {getEstadoButtons(lote).slice(0, 1)}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleView(lote)}
                            className="text-green-600 hover:text-green-700 transition-colors p-2"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <div className="relative">
                            <button
                              onClick={() => toggleMenu(lote.id)}
                              className="text-crm-text-muted hover:text-crm-text-primary transition-colors p-2"
                              title="Más opciones"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {openMenuId === lote.id && (
                              <div className="absolute right-0 top-9 z-50 w-48 rounded-lg border border-crm-border bg-crm-card shadow-lg">
                                <div className="py-1 text-left">
                                  {getEstadoButtons(lote).slice(1).length > 0 && (
                                    <div className="px-3 py-1 space-y-1 border-b border-crm-border/80">
                                      {getEstadoButtons(lote).slice(1).map((button, index) => (
                                        <div key={index}>{button}</div>
                                      ))}
                                    </div>
                                  )}
                                  <button
                                    onClick={() => {
                                      handleEdit(lote.id);
                                      closeMenu();
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-crm-text-primary hover:bg-crm-card-hover transition-colors"
                                  >
                                    <Edit className="w-4 h-4" />
                                    Editar lote
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleDuplicate(lote.id, lote.codigo);
                                      closeMenu();
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-crm-text-primary hover:bg-crm-card-hover transition-colors"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H6a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-2M8 7V5a2 2 0 012-2h6a2 2 0 012 2v6M8 7h6a2 2 0 012 2v6"/></svg>
                                    Duplicar lote
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleDelete(lote.id, lote.codigo);
                                      closeMenu();
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-crm-danger hover:bg-crm-card-hover transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Eliminar lote
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    {/* Modal de edición de lote */}
    <LoteEditModal
      open={!!editingLote}
      onClose={() => setEditingLote(null)}
      lote={lotesAMostrar.find(l => l.id === editingLote) || null}
      onSave={async (payload) => {
        try {
          const fd = new FormData();
          if (typeof payload.codigo !== 'undefined') fd.append('codigo', payload.codigo);
          if (typeof payload.sup_m2 !== 'undefined') fd.append('sup_m2', String(payload.sup_m2 ?? ''));
          if (typeof payload.precio !== 'undefined') fd.append('precio', String(payload.precio ?? ''));
          if (typeof payload.moneda !== 'undefined') fd.append('moneda', String(payload.moneda ?? ''));
          if (typeof payload.estado !== 'undefined') fd.append('estado', String(payload.estado));
          fd.append('proyecto_id', proyectoId);

          await actualizarLote(payload.id, fd);
          toast.success('Lote actualizado');
          // Optimista: refrescar lista
          setLotesState(prev => prev.map(it => it.id === payload.id ? {
            ...it,
            codigo: payload.codigo ?? it.codigo,
            sup_m2: typeof payload.sup_m2 === 'undefined' ? it.sup_m2 : (payload.sup_m2 as any),
            precio: typeof payload.precio === 'undefined' ? it.precio : (payload.precio as any),
            moneda: typeof payload.moneda === 'undefined' ? it.moneda : (payload.moneda as any),
            estado: (payload.estado as any) ?? it.estado,
          } : it));
          return true;
        } catch (e) {
          toast.error('No se pudo actualizar');
          return false;
        }
      }}
    />
    <LoteDetailModal
      open={!!selectedLote}
      onClose={() => setSelectedLote(null)}
      lote={selectedLote}
    />
    {reservandoLoteId && (
      <ModalReservaLote
        open={!!reservandoLoteId}
        onClose={() => setReservandoLoteId(null)}
        lote={lotesAMostrar.find(l => l.id === reservandoLoteId) || { id: '', codigo: '', precio: null, sup_m2: null }}
        proyectoId={proyectoId}
        onSuccess={() => {
          // Actualizar el lote a reservado localmente
          setLotesState(prevLotes =>
            prevLotes.map(lote =>
              lote.id === reservandoLoteId
                ? { ...lote, estado: 'reservado' as const }
                : lote
            )
          );
        }}
      />
    )}
    <DeleteAllLotesModal
      isOpen={showDeleteAllModal}
      onClose={() => setShowDeleteAllModal(false)}
      onConfirm={handleConfirmDeleteAll}
      lotesCount={totalLotes || lotesAMostrar.length}
    />
    </>
  );
}
