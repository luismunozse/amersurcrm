import React, { useState, useEffect } from 'react';
import { CRMApiClient } from '@/lib/api';

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
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      loadData();
    }
  }, [isExpanded]);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      console.log('[ProjectInterest] Cargando datos para cliente:', clienteId);

      // Cargar proyectos disponibles y proyectos de interés en paralelo
      const [proyectosData, interesesData] = await Promise.all([
        apiClient.getProyectos(),
        apiClient.getProyectosInteres(clienteId),
      ]);

      console.log('[ProjectInterest] Proyectos recibidos:', proyectosData);
      console.log('[ProjectInterest] Proyectos de interés recibidos:', interesesData);

      setProyectos(proyectosData);
      setProyectosInteres(interesesData);
    } catch (err) {
      console.error('[ProjectInterest] Error:', err);
      setError('Error cargando datos');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddProyecto() {
    if (!selectedProyecto) {
      setError('Selecciona un proyecto');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await apiClient.addProyectoInteres(clienteId, selectedProyecto, notas);

      // Recargar datos
      await loadData();

      // Limpiar formulario
      setSelectedProyecto('');
      setNotas('');
    } catch (err) {
      console.error('[ProjectInterest] Error agregando proyecto:', err);
      setError('Error agregando proyecto de interés');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveProyecto(interesId: string) {
    if (!confirm('¿Eliminar este proyecto de interés?')) return;

    try {
      await apiClient.removeProyectoInteres(clienteId, interesId);
      await loadData();
    } catch (err) {
      console.error('[ProjectInterest] Error eliminando proyecto:', err);
      setError('Error eliminando proyecto');
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 transition"
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
          <span className="font-semibold text-gray-900">Proyecto de interés</span>
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
        <div className="border-t border-gray-200">
          {loading && (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-crm-primary mx-auto"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Cargando proyectos...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500">
              <p className="text-sm text-red-800">{error}</p>
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
                        <p className="text-sm font-medium text-gray-900">
                          {interes.lote?.proyecto?.nombre || 'Proyecto'}
                        </p>
                        {interes.lote?.nombre && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">Lote: {interes.lote.nombre}</p>
                        )}
                        {interes.notas && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{interes.notas}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveProyecto(interes.id)}
                        className="text-red-600 hover:text-red-800 ml-3"
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulario para agregar nuevo proyecto */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Agregar proyecto:</h4>

                <select
                  value={selectedProyecto}
                  onChange={(e) => setSelectedProyecto(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-transparent mb-2 text-sm"
                  disabled={saving}
                >
                  <option value="">Selecciona un proyecto</option>
                  {proyectos.map((proyecto) => (
                    <option key={proyecto.id} value={proyecto.id}>
                      {proyecto.nombre}
                    </option>
                  ))}
                </select>

                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Notas adicionales (opcional)"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crm-primary focus:border-transparent mb-3 text-sm resize-none"
                  disabled={saving}
                />

                <button
                  onClick={handleAddProyecto}
                  disabled={!selectedProyecto || saving}
                  className="w-full py-2 px-4 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {saving ? 'Guardando...' : 'Agregar proyecto'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
