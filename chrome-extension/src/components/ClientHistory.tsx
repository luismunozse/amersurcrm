import { useState, useEffect } from 'react';
import { CRMApiClient } from '@/lib/api';

interface Interaccion {
  id: string;
  tipo: 'llamada' | 'whatsapp' | 'email' | 'visita' | 'nota';
  fecha: string;
  descripcion: string;
  usuario: string;
}

interface ClientHistoryProps {
  clienteId: string;
  apiClient: CRMApiClient;
}

export function ClientHistory({ clienteId, apiClient }: ClientHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [interacciones, setInteracciones] = useState<Interaccion[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isExpanded && interacciones.length === 0) {
      loadHistory();
    }
  }, [isExpanded]);

  async function loadHistory() {
    setLoading(true);
    setError(null);

    try {
      console.log('[ClientHistory] Cargando interacciones para cliente:', clienteId);

      // Obtener interacciones reales del CRM
      const data = await apiClient.getInteracciones(clienteId);

      console.log('[ClientHistory] Datos recibidos:', data);

      if (!Array.isArray(data)) {
        console.error('[ClientHistory] Respuesta no es un array:', data);
        setError('Respuesta inválida del servidor');
        return;
      }

      // Convertir al formato esperado
      const interaccionesFormateadas: Interaccion[] = data.map((int: any) => ({
        id: int.id,
        tipo: int.tipo as Interaccion['tipo'],
        fecha: int.fecha,
        descripcion: int.descripcion || int.notas || `${int.tipo} - ${int.resultado || 'sin resultado'}`,
        usuario: int.usuario || int.vendedor_username || 'Sistema',
      }));

      console.log('[ClientHistory] Interacciones formateadas:', interaccionesFormateadas.length);
      setInteracciones(interaccionesFormateadas);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      console.error('[ClientHistory] Error cargando historial:', errorMsg, err);
      setError(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  }

  const tipoIcons: Record<string, string> = {
    llamada: '📞',
    whatsapp: '💬',
    email: '📧',
    visita: '🏠',
    nota: '📝',
  };

  const tipoColors: Record<string, string> = {
    llamada: 'bg-blue-100 text-blue-800',
    whatsapp: 'bg-green-100 text-green-800',
    email: 'bg-purple-100 text-purple-800',
    visita: 'bg-orange-100 text-orange-800',
    nota: 'bg-gray-100 text-gray-800',
  };

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
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="font-semibold text-gray-900 dark:text-white">Historial de interacciones</span>
          {interacciones.length > 0 && (
            <span className="bg-crm-primary text-white text-xs px-2 py-0.5 rounded-full">
              {interacciones.length}
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
        <div className="border-t border-gray-200 dark:border-gray-700">
          {loading && (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-crm-primary mx-auto"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Cargando historial...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-700">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {!loading && !error && interacciones.length === 0 && (
            <div className="p-6 text-center">
              <svg
                className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-sm text-gray-600 dark:text-gray-400">No hay interacciones registradas</p>
            </div>
          )}

          {!loading && !error && interacciones.length > 0 && (
            <div className="max-h-80 overflow-y-auto">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {interacciones.map((interaccion) => (
                  <div key={interaccion.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                            tipoColors[interaccion.tipo]
                          }`}
                        >
                          {tipoIcons[interaccion.tipo]}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-gray-100">{interaccion.descripcion}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(interaccion.fecha).toLocaleDateString('es-PE', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-600">•</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{interaccion.usuario}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Las interacciones se sincronizan automáticamente desde el CRM
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
