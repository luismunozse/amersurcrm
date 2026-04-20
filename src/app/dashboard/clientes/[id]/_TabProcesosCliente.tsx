"use client";

import { useEffect, useState, useTransition } from "react";
import { ShoppingCart, CheckCircle2, Circle, MinusCircle, AlertCircle, Clock, ChevronDown, HelpCircle } from "lucide-react";
import { obtenerProcesosCliente, toggleChecklistItem, avanzarEtapa } from "../../adquisicion/_actions-proceso";
import { ETAPAS_PROCESO, calcularProgresoEtapa, puedeAvanzarEtapa } from "@/lib/types/proceso-adquisicion";
import type { ProcesoConRelaciones } from "@/lib/types/proceso-adquisicion";
import { getAyudaChecklist } from "@/lib/data/checklist-ayudas";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import toast from "react-hot-toast";

interface Props {
  clienteId: string;
}

export default function TabProcesosCliente({ clienteId }: Props) {
  const [procesos, setProcesos] = useState<ProcesoConRelaciones[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, [clienteId]);

  async function loadData() {
    const result = await obtenerProcesosCliente(clienteId);
    if (result.success) {
      setProcesos(result.data as ProcesoConRelaciones[]);
      if ((result.data as any[]).length === 1) {
        setExpandedId((result.data as any[])[0].id);
      }
    }
    setLoading(false);
  }

  async function handleToggleCheck(itemId: string, completado: boolean) {
    startTransition(async () => {
      const result = await toggleChecklistItem(itemId, completado);
      if (result.success) loadData();
      else toast.error(result.error || 'Error');
    });
  }

  async function handleAvanzar(procesoId: string) {
    startTransition(async () => {
      const result = await avanzarEtapa(procesoId);
      if (result.success) {
        toast.success('Etapa completada');
        loadData();
      } else toast.error(result.error || 'Error');
    });
  }

  const etapaColor: Record<string, string> = {
    blue: 'bg-blue-500', purple: 'bg-purple-500', orange: 'bg-orange-500', green: 'bg-green-500',
  };

  if (loading) return <div className="text-center py-8 text-crm-text-muted">Cargando procesos...</div>;

  if (procesos.length === 0) {
    return (
      <div className="text-center py-8 text-crm-text-muted">
        <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-30" />
        <p>No hay procesos de adquisición</p>
        <p className="text-xs mt-1">Se crean automáticamente al registrar una separación</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
    <div className="space-y-4">
      {procesos.map(proceso => {
        const isExpanded = expandedId === proceso.id;
        const etapaInfo = ETAPAS_PROCESO.find(e => e.value === proceso.etapa_actual);

        return (
          <div key={proceso.id} className="border border-crm-border rounded-lg overflow-hidden">
            {/* Header */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : proceso.id)}
              className="w-full flex items-center justify-between p-4 bg-crm-card hover:bg-crm-background/50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-semibold text-crm-text">{proceso.codigo}</span>
                {proceso.estado === 'completado' ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium border bg-green-50 border-green-200 text-green-700 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Completado
                  </span>
                ) : proceso.estado === 'cancelado' ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium border bg-red-50 border-red-200 text-red-700">
                    Cancelado
                  </span>
                ) : (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                    etapaInfo?.color === 'blue' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                    etapaInfo?.color === 'purple' ? 'bg-purple-50 border-purple-200 text-purple-700' :
                    etapaInfo?.color === 'orange' ? 'bg-orange-50 border-orange-200 text-orange-700' :
                    'bg-green-50 border-green-200 text-green-700'
                  }`}>{etapaInfo?.label}</span>
                )}
                {proceso.lote && (
                  <span className="text-xs text-crm-text-muted">{proceso.lote.proyecto?.nombre} / {proceso.lote.codigo}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {/* Stepper mini */}
                <div className="flex items-center gap-0.5">
                  {proceso.etapas?.map(etapa => {
                    const eInfo = ETAPAS_PROCESO.find(e => e.value === etapa.etapa);
                    return (
                      <div
                        key={etapa.id}
                        className={`w-6 h-1.5 rounded-full ${
                          etapa.estado === 'completada' ? etapaColor[eInfo?.color || 'blue'] :
                          etapa.estado === 'en_progreso' ? `${etapaColor[eInfo?.color || 'blue']} opacity-40` :
                          etapa.estado === 'omitida' ? 'bg-gray-400 opacity-40' :
                          'bg-gray-200'
                        }`}
                        title={etapa.estado === 'omitida' ? 'Etapa omitida' : undefined}
                      />
                    );
                  })}
                </div>
                <ChevronDown className={`h-4 w-4 text-crm-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {/* Detalle expandido */}
            {isExpanded && (
              <div className="border-t border-crm-border p-4 space-y-3 bg-crm-background">
                {proceso.etapas?.map(etapa => {
                  const eInfo = ETAPAS_PROCESO.find(e => e.value === etapa.etapa);
                  const esActual = etapa.etapa === proceso.etapa_actual && proceso.estado === 'activo';
                  const completada = etapa.estado === 'completada';
                  const omitida = etapa.estado === 'omitida';
                  const checklistOk = puedeAvanzarEtapa(etapa.checklist || []);

                  return (
                    <div key={etapa.id} className={`rounded-lg border p-3 ${
                      completada ? 'bg-green-50/50 border-green-200' :
                      omitida ? 'bg-gray-50 border-gray-200 border-dashed' :
                      esActual ? 'bg-white border-crm-primary/30 shadow-sm' :
                      'bg-crm-card border-crm-border opacity-50'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {completada ? <CheckCircle2 className="h-4 w-4 text-green-500" /> :
                           omitida ? <MinusCircle className="h-4 w-4 text-gray-400" /> :
                           esActual ? <div className={`w-4 h-4 rounded-full ${etapaColor[eInfo?.color || 'blue']} flex items-center justify-center`}><span className="text-white text-[10px] font-bold">{eInfo?.icon}</span></div> :
                           <Circle className="h-4 w-4 text-gray-300" />}
                          <span className={`font-medium text-sm ${completada ? 'text-green-700' : omitida ? 'text-gray-500 italic' : 'text-crm-text'}`}>{etapa.nombre}</span>
                          {omitida && (
                            <span
                              className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-200 text-gray-600 border border-gray-300"
                              title={etapa.notas || 'Etapa omitida'}
                            >
                              Omitida
                            </span>
                          )}
                          {etapa.fecha_limite && esActual && (
                            <span className="text-xs text-crm-text-muted flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(etapa.fecha_limite).toLocaleDateString('es-PE')}</span>
                          )}
                        </div>
                        {esActual && checklistOk && (
                          <button onClick={() => handleAvanzar(proceso.id)} disabled={isPending}
                            className={`px-2.5 py-1 text-xs font-medium text-white rounded-lg ${etapaColor[eInfo?.color || 'blue']} hover:opacity-90 disabled:opacity-50`}>
                            {isPending ? '...' : 'Completar'}
                          </button>
                        )}
                      </div>

                      {(esActual || completada) && etapa.checklist?.length > 0 && (
                        <div className="space-y-1 ml-6">
                          {etapa.checklist.map(item => {
                            const ayuda = getAyudaChecklist(item.descripcion);
                            return (
                              <label key={item.id} className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer text-sm ${item.completado ? 'text-green-700' : 'text-crm-text'} ${esActual ? 'hover:bg-crm-background' : ''}`}>
                                <input type="checkbox" checked={item.completado} onChange={() => esActual && handleToggleCheck(item.id, !item.completado)} disabled={!esActual || isPending}
                                  className="w-3.5 h-3.5 rounded border-gray-300 text-crm-primary focus:ring-crm-primary disabled:opacity-50" />
                                <span className={item.completado ? 'line-through' : ''}>{item.descripcion}</span>
                                {ayuda && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        onClick={(e) => e.preventDefault()}
                                        className="text-crm-text-muted hover:text-crm-primary shrink-0"
                                        aria-label={`Ayuda: ${item.descripcion}`}
                                      >
                                        <HelpCircle className="h-3.5 w-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="max-w-xs text-left leading-snug">
                                      {ayuda}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                {item.obligatorio && !item.completado && <AlertCircle className="h-3 w-3 text-red-400 shrink-0" />}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
    </TooltipProvider>
  );
}
