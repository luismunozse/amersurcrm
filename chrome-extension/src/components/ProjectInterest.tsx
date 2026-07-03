import { useState, useEffect } from 'react';
import { CRMApiClient } from '@/lib/api';
import { InlineAlert } from './InlineAlert';
import { Skeleton } from './Skeleton';

interface Proyecto {
  id: string;
  nombre: string;
  direccion?: any;
  estado?: string;
}

interface ProjectInterestProps {
  clienteId: string;
  apiClient: CRMApiClient;
}

export function ProjectInterest({ clienteId, apiClient }: ProjectInterestProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [proyectosInteres, setProyectosInteres] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProyecto, setSelectedProyecto] = useState<string>('');
  const [lotes, setLotes] = useState<any[]>([]);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [selectedLote, setSelectedLote] = useState<string>('');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);
  // ID del interés que está pendiente de confirmación de borrado (confirm inline).
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);

  useEffect(() => {
    if (isExpanded) {
      loadData();
    }
  }, [isExpanded]);

  useEffect(() => {
    if (selectedProyecto) {
      loadLotes(selectedProyecto);
    } else {
      setLotes([]);
      setSelectedLote('');
    }
  }, [selectedProyecto]);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const [proyectosData, interesesData] = await Promise.all([
        apiClient.getProyectos(),
        apiClient.getProyectosInteres(clienteId),
      ]);

      if (!Array.isArray(proyectosData)) {
        setError('Error: respuesta de proyectos inválida');
        return;
      }

      const intereses = Array.isArray(interesesData) ? interesesData : [];
      setProyectos(proyectosData);
      setProyectosInteres(intereses);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  }

  async function loadLotes(proyectoId: string) {
    setLoadingLotes(true);
    setError(null);

    try {
      const lotesData = await apiClient.getLotes(proyectoId);

      if (!Array.isArray(lotesData)) {
        setError('Error: respuesta de lotes inválida');
        setLotes([]);
        return;
      }

      setLotes(lotesData);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error cargando lotes: ${errorMsg}`);
      setLotes([]);
    } finally {
      setLoadingLotes(false);
    }
  }

  async function handleAddProyecto() {
    if (!selectedProyecto) {
      setError('Selecciona un proyecto');
      return;
    }

    if (!selectedLote) {
      setError('Selecciona un lote');
      return;
    }

    // Validar duplicados
    const isDuplicate = proyectosInteres.some(p => p.lote?.id === selectedLote);
    if (isDuplicate) {
      setError('Este lote ya está agregado como proyecto de interés');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await apiClient.addProyectoInteres(clienteId, selectedLote, notas);

      // Recargar datos
      await loadData();

      // Limpiar formulario
      setSelectedProyecto('');
      setSelectedLote('');
      setLotes([]);
      setNotas('');
    } catch (err) {
      setError('Error agregando lote de interés');
    } finally {
      setSaving(false);
    }
  }

  async function doRemoveProyecto(interesId: string) {
    setConfirmandoId(null);
    try {
      await apiClient.removeProyectoInteres(clienteId, interesId);
      await loadData();
    } catch (err) {
      setError('No se pudo eliminar el proyecto de interés.');
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition"
      >
        <div className="flex items-center gap-3">
          <svg
            className="w-5 h-5 text-crm-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <span className="font-semibold text-gray-900 dark:text-white">Proyecto de interés</span>
          {proyectosInteres.length > 0 && (
            <span className="bg-crm-primary text-white text-xs px-2 py-0.5 rounded-full">
              {proyectosInteres.length}
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 animate-fade-in">
          {loading && (
            <div className="p-4 space-y-2" aria-busy="true">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}

          {error && (
            <div className="p-4">
              <InlineAlert variant="error" message={error} onRetry={loadData} onDismiss={() => setError(null)} />
            </div>
          )}

          {!loading && (
            <>
              {/* Lista de proyectos de interés actuales */}
              {proyectosInteres.length > 0 && (
                <div className="p-4 space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Proyectos actuales:</h4>
                  {proyectosInteres.map((interes) => (
                    <div
                      key={interes.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {interes.lote?.proyecto?.nombre || 'Proyecto'}
                        </p>
                        {interes.lote?.codigo && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Lote {interes.lote.codigo}
                            {interes.lote.sup_m2 && ` • ${interes.lote.sup_m2} m²`}
                            {interes.lote.precio && ` • ${interes.lote.moneda} ${interes.lote.precio.toLocaleString()}`}
                          </p>
                        )}
                        {interes.notas && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{interes.notas}</p>
                        )}
                      </div>
                      {confirmandoId === interes.id ? (
                        <div className="flex items-center gap-2 ml-3 shrink-0">
                          <button
                            onClick={() => doRemoveProyecto(interes.id)}
                            className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 active:scale-95 transition-transform"
                          >
                            Eliminar
                          </button>
                          <button
                            onClick={() => setConfirmandoId(null)}
                            className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmandoId(interes.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 ml-3 active:scale-95 transition-transform"
                          title="Eliminar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Formulario para agregar nuevo lote */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Agregar lote de interés:</h4>

                <div className="space-y-2">
                  <select
                    value={selectedProyecto}
                    onChange={(e) => setSelectedProyecto(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-transparent text-sm"
                    disabled={saving}
                  >
                    <option value="">1. Selecciona un proyecto</option>
                    {proyectos.map((proyecto) => (
                      <option key={proyecto.id} value={proyecto.id}>
                        {proyecto.nombre}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedLote}
                    onChange={(e) => setSelectedLote(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-transparent text-sm"
                    disabled={saving || !selectedProyecto || loadingLotes}
                  >
                    <option value="">
                      {loadingLotes ? 'Cargando lotes...' : '2. Selecciona un lote'}
                    </option>
                    {lotes.map((lote) => (
                      <option key={lote.id} value={lote.id}>
                        Lote {lote.codigo} • {lote.sup_m2 ? `${lote.sup_m2} m²` : ''} • {lote.moneda} {lote.precio?.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Notas adicionales (opcional)"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-transparent mb-3 text-sm resize-none"
                  disabled={saving}
                />

                <button
                  onClick={handleAddProyecto}
                  disabled={!selectedLote || saving}
                  className="w-full py-2 px-4 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-dark transition ease-out-strong active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {saving ? 'Guardando...' : 'Agregar lote'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
