"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import { ChevronRight, User, MapPin, Clock, CheckCircle2, Circle, AlertCircle, Search, Download, Filter, X, LayoutGrid } from "lucide-react";
import { obtenerProcesos, obtenerResumenPipeline, toggleChecklistItem, avanzarEtapa } from "./_actions-proceso";
import { ETAPAS_PROCESO, calcularProgresoEtapa, puedeAvanzarEtapa } from "@/lib/types/proceso-adquisicion";
import type { ProcesoConRelaciones } from "@/lib/types/proceso-adquisicion";
import toast from "react-hot-toast";

export default function PipelineView() {
  const [procesos, setProcesos] = useState<ProcesoConRelaciones[]>([]);
  const [resumen, setResumen] = useState<Record<string, number>>({});
  const [selectedProceso, setSelectedProceso] = useState<ProcesoConRelaciones | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Filtros — default a "Todos" para que admin vea procesos en cualquier
  // estado (activo, completado, etc) sin necesidad de cambiar el filtro.
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [showFiltros, setShowFiltros] = useState(false);

  useEffect(() => { loadData(); }, [filtroEstado, filtroEtapa]);

  async function loadData() {
    setLoading(true);
    try {
      const [procesosRes, resumenRes] = await Promise.all([
        obtenerProcesos({ estado: filtroEstado || undefined, etapaActual: filtroEtapa || undefined }),
        obtenerResumenPipeline(),
      ]);
      if (procesosRes.success) setProcesos(procesosRes.data as ProcesoConRelaciones[]);
      if (resumenRes.success) setResumen(resumenRes.data as Record<string, number>);
    } catch (err) {
      console.error('Error cargando procesos:', err);
    } finally {
      setLoading(false);
    }
  }

  // Búsqueda local (filtrado client-side para velocidad)
  const procesosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return procesos;
    const q = busqueda.toLowerCase();
    return procesos.filter(p =>
      p.codigo?.toLowerCase().includes(q) ||
      p.cliente?.nombre?.toLowerCase().includes(q) ||
      p.lote?.codigo?.toLowerCase().includes(q) ||
      p.lote?.proyecto?.nombre?.toLowerCase().includes(q) ||
      p.vendedor_username?.toLowerCase().includes(q)
    );
  }, [procesos, busqueda]);

  async function handleToggleCheck(itemId: string, completado: boolean) {
    startTransition(async () => {
      const result = await toggleChecklistItem(itemId, completado);
      if (result.success) {
        loadData();
        if (selectedProceso) {
          const updated = await obtenerProcesos({ estado: filtroEstado || undefined });
          if (updated.success) {
            const found = (updated.data as ProcesoConRelaciones[]).find(p => p.id === selectedProceso.id);
            if (found) setSelectedProceso(found);
          }
        }
      } else {
        toast.error(result.error || 'Error');
      }
    });
  }

  async function handleAvanzar(procesoId: string) {
    startTransition(async () => {
      const result = await avanzarEtapa(procesoId);
      if (result.success) {
        toast.success('Etapa completada, proceso avanzado');
        setSelectedProceso(null);
        loadData();
      } else {
        toast.error(result.error || 'Error al avanzar');
      }
    });
  }

  function exportarExcel() {
    // Generar CSV simple para descarga
    const headers = ['Código', 'Cliente', 'Proyecto', 'Lote', 'Etapa', 'Estado', 'Vendedor', 'Fecha Inicio', 'Progreso'];
    const rows = procesosFiltrados.map(p => {
      const etapaActual = p.etapas?.find(e => e.etapa === p.etapa_actual);
      const progreso = etapaActual ? calcularProgresoEtapa(etapaActual.checklist || []) : 0;
      return [
        p.codigo,
        p.cliente?.nombre || '',
        p.lote?.proyecto?.nombre || '',
        p.lote?.codigo || '',
        ETAPAS_PROCESO.find(e => e.value === p.etapa_actual)?.label || p.etapa_actual,
        p.estado,
        p.vendedor_username || '',
        p.fecha_inicio ? new Date(p.fecha_inicio).toLocaleDateString('es-PE') : '',
        `${progreso}%`,
      ].join(',');
    });

    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `procesos_adquisicion_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Archivo exportado');
  }

  const etapaColor: Record<string, string> = {
    blue: 'bg-blue-500', purple: 'bg-purple-500', orange: 'bg-orange-500', green: 'bg-green-500',
  };

  const etapaColorLight: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    green: 'bg-green-50 border-green-200 text-green-700',
  };

  if (loading) {
    return <div className="text-center py-12 text-crm-text-muted">Cargando pipeline...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Pipeline Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ETAPAS_PROCESO.map(etapa => {
          const count = resumen[etapa.value] || 0;
          const isFiltered = filtroEtapa === etapa.value;
          return (
            <button
              key={etapa.value}
              onClick={() => setFiltroEtapa(isFiltered ? '' : etapa.value)}
              className={`rounded-xl border p-4 transition-all text-left ${etapaColorLight[etapa.color]} ${isFiltered ? 'ring-2 ring-offset-1 ring-current scale-[1.02]' : 'hover:scale-[1.01]'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold">{etapa.label}</span>
                <span className={`w-7 h-7 rounded-full ${etapaColor[etapa.color]} text-white text-sm font-bold flex items-center justify-center`}>
                  {count}
                </span>
              </div>
              <div className={`h-1 rounded-full ${etapaColor[etapa.color]} opacity-30 mt-2`} />
            </button>
          );
        })}
      </div>

      {/* Buscador + Filtros + Exportar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Buscador */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-crm-text-muted" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por código, cliente, lote o proyecto..."
            className="w-full pl-10 pr-4 py-2.5 border border-crm-border rounded-lg bg-crm-card text-sm text-crm-text placeholder:text-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary/30"
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-crm-text-muted hover:text-crm-text">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filtros rápidos */}
        <div className="flex gap-2">
          {[
            { value: 'activos', label: 'Activos' },
            { value: 'completado', label: 'Completados' },
            { value: 'cancelado', label: 'Cancelados' },
            { value: '', label: 'Todos' },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFiltroEstado(f.value)}
              className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap ${
                filtroEstado === f.value
                  ? 'bg-crm-primary text-white'
                  : 'bg-crm-background border border-crm-border text-crm-text-muted hover:text-crm-text'
              }`}
            >
              {f.label}
            </button>
          ))}

          {/* Exportar */}
          <button
            onClick={exportarExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 whitespace-nowrap"
          >
            <Download className="h-4 w-4" /> Excel
          </button>
        </div>
      </div>

      {/* Indicador de filtro de etapa activo */}
      {filtroEtapa && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-crm-text-muted">Filtrando por etapa:</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${etapaColorLight[ETAPAS_PROCESO.find(e => e.value === filtroEtapa)?.color || 'blue']}`}>
            {ETAPAS_PROCESO.find(e => e.value === filtroEtapa)?.label}
          </span>
          <button onClick={() => setFiltroEtapa('')} className="text-crm-text-muted hover:text-crm-text">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Conteo de resultados */}
      <p className="text-xs text-crm-text-muted">
        {procesosFiltrados.length} proceso{procesosFiltrados.length !== 1 ? 's' : ''}
        {busqueda && ` encontrado${procesosFiltrados.length !== 1 ? 's' : ''}`}
      </p>

      {/* Lista de procesos */}
      {procesosFiltrados.length === 0 ? (
        <div className="text-center py-12 text-crm-text-muted">
          <LayoutGrid className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p>No hay procesos de adquisición</p>
          <p className="text-xs mt-1">Los procesos se crean automáticamente al registrar una separación</p>
        </div>
      ) : (
        <div className="space-y-2">
          {procesosFiltrados.map(proceso => {
            const etapaInfo = ETAPAS_PROCESO.find(e => e.value === proceso.etapa_actual);
            const etapaActual = proceso.etapas?.find(e => e.etapa === proceso.etapa_actual);
            const progreso = etapaActual ? calcularProgresoEtapa(etapaActual.checklist || []) : 0;
            const isSelected = selectedProceso?.id === proceso.id;

            return (
              <div key={proceso.id}>
                {/* Fila del proceso */}
                <button
                  onClick={() => setSelectedProceso(isSelected ? null : proceso)}
                  className={`w-full text-left bg-crm-card border rounded-lg p-4 hover:border-crm-primary/50 transition-colors ${
                    isSelected ? 'border-crm-primary ring-1 ring-crm-primary/20' : 'border-crm-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <span className="font-mono text-xs font-semibold text-crm-text shrink-0">{proceso.codigo}</span>
                      <div className="flex items-center gap-1 min-w-0">
                        <User className="h-3.5 w-3.5 text-crm-text-muted shrink-0" />
                        <a
                          href={`/dashboard/clientes/${proceso.cliente?.id}`}
                          onClick={e => e.stopPropagation()}
                          className="text-sm font-medium text-crm-primary hover:underline truncate"
                        >
                          {proceso.cliente?.nombre}
                        </a>
                      </div>
                      {proceso.lote && (
                        <div className="flex items-center gap-1 shrink-0 hidden md:flex">
                          <MapPin className="h-3.5 w-3.5 text-crm-text-muted" />
                          <span className="text-xs text-crm-text-muted">
                            {proceso.lote.proyecto?.nombre} / {proceso.lote.codigo}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${etapaColorLight[etapaInfo?.color || 'blue']}`}>
                        {etapaInfo?.label}
                      </span>
                      {proceso.estado === 'completado' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium border bg-green-50 border-green-200 text-green-700">
                          Completado
                        </span>
                      )}
                      {proceso.estado === 'cancelado' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium border bg-red-50 border-red-200 text-red-700">
                          Cancelado
                        </span>
                      )}
                      {proceso.estado === 'pausado' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium border bg-gray-50 border-gray-200 text-gray-600">
                          Pausado
                        </span>
                      )}
                      <div className="flex items-center gap-1.5 w-20 hidden sm:flex">
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                          <div className={`rounded-full h-1.5 transition-all ${etapaColor[etapaInfo?.color || 'blue']}`} style={{ width: `${progreso}%` }} />
                        </div>
                        <span className="text-xs text-crm-text-muted w-8 text-right">{progreso}%</span>
                      </div>
                      <ChevronRight className={`h-4 w-4 text-crm-text-muted transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                    </div>
                  </div>

                  {/* Stepper visual */}
                  <div className="flex items-center gap-1 mt-3">
                    {proceso.etapas?.map((etapa, idx) => {
                      const eInfo = ETAPAS_PROCESO.find(e => e.value === etapa.etapa);
                      return (
                        <div key={etapa.id} className="flex items-center flex-1">
                          <div className={`h-1.5 flex-1 rounded-full ${
                            etapa.estado === 'completada' ? etapaColor[eInfo?.color || 'blue']
                            : etapa.estado === 'en_progreso' ? `${etapaColor[eInfo?.color || 'blue']} opacity-40`
                            : 'bg-gray-200'
                          }`} />
                          {idx < (proceso.etapas?.length || 0) - 1 && <div className="w-1" />}
                        </div>
                      );
                    })}
                  </div>
                </button>

                {/* Detalle expandido */}
                {isSelected && (
                  <div className="bg-crm-background border border-crm-border border-t-0 rounded-b-lg p-5 -mt-1 space-y-4">
                    {proceso.etapas?.map((etapa) => {
                      const eInfo = ETAPAS_PROCESO.find(e => e.value === etapa.etapa);
                      const esActual = etapa.etapa === proceso.etapa_actual && proceso.estado === 'activo';
                      const completada = etapa.estado === 'completada';
                      const checklistCompleto = puedeAvanzarEtapa(etapa.checklist || []);

                      return (
                        <div key={etapa.id} className={`rounded-lg border p-4 ${
                          completada ? 'bg-green-50/50 border-green-200' :
                          esActual ? 'bg-white border-crm-primary/30 shadow-sm' :
                          'bg-crm-card border-crm-border opacity-60'
                        }`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {completada ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : esActual ? (
                                <div className={`w-5 h-5 rounded-full ${etapaColor[eInfo?.color || 'blue']} flex items-center justify-center`}>
                                  <span className="text-white text-xs font-bold">{eInfo?.icon}</span>
                                </div>
                              ) : (
                                <Circle className="h-5 w-5 text-gray-300" />
                              )}
                              <span className={`font-semibold text-sm ${completada ? 'text-green-700' : 'text-crm-text'}`}>
                                {etapa.nombre}
                              </span>
                              {etapa.fecha_limite && esActual && (
                                <span className="text-xs text-crm-text-muted flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Límite: {new Date(etapa.fecha_limite).toLocaleDateString('es-PE')}
                                </span>
                              )}
                              {completada && etapa.fecha_completada && (
                                <span className="text-xs text-green-600">
                                  {new Date(etapa.fecha_completada).toLocaleDateString('es-PE')}
                                </span>
                              )}
                            </div>

                            {esActual && checklistCompleto && (
                              <button
                                onClick={() => handleAvanzar(proceso.id)}
                                disabled={isPending}
                                className={`px-3 py-1.5 text-xs font-medium text-white rounded-lg ${etapaColor[eInfo?.color || 'blue']} hover:opacity-90 disabled:opacity-50`}
                              >
                                {isPending ? 'Avanzando...' : 'Completar y Avanzar'}
                              </button>
                            )}
                          </div>

                          {/* Checklist */}
                          {(esActual || completada) && etapa.checklist && etapa.checklist.length > 0 && (
                            <div className="space-y-1.5 ml-7">
                              {etapa.checklist.map(item => (
                                <label
                                  key={item.id}
                                  className={`flex items-center gap-2.5 py-1.5 px-2 rounded-md cursor-pointer transition-colors ${
                                    item.completado ? 'bg-green-50' : esActual ? 'hover:bg-crm-background' : ''
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={item.completado}
                                    onChange={() => esActual && handleToggleCheck(item.id, !item.completado)}
                                    disabled={!esActual || isPending}
                                    className="w-4 h-4 rounded border-gray-300 text-crm-primary focus:ring-crm-primary disabled:opacity-50"
                                  />
                                  <span className={`text-sm flex-1 ${item.completado ? 'text-green-700 line-through' : 'text-crm-text'}`}>
                                    {item.descripcion}
                                  </span>
                                  {item.obligatorio && !item.completado && (
                                    <span className="text-xs text-red-500 flex items-center gap-0.5">
                                      <AlertCircle className="h-3 w-3" /> Obligatorio
                                    </span>
                                  )}
                                  {item.completado_por && (
                                    <span className="text-xs text-crm-text-muted">{item.completado_por}</span>
                                  )}
                                </label>
                              ))}
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
      )}
    </div>
  );
}

