import { useState } from 'react';
import { Cliente } from '@/types/crm';
import { CRMApiClient } from '@/lib/api';

interface UpdateLeadStatusProps {
  cliente: Cliente;
  apiClient: CRMApiClient;
  onUpdate: () => void;
}

const ESTADOS = [
  { value: 'por_contactar', label: 'Por Contactar', color: 'bg-yellow-100 text-yellow-800', icon: '📋' },
  { value: 'contactado', label: 'Contactado', color: 'bg-blue-100 text-blue-800', icon: '📞' },
  { value: 'intermedio', label: 'Intermedio', color: 'bg-purple-100 text-purple-800', icon: '🔄' },
  { value: 'potencial', label: 'Potencial', color: 'bg-crm-accent/30 text-crm-primary', icon: '⭐' },
  { value: 'desestimado', label: 'Desestimado', color: 'bg-red-100 text-red-800', icon: '❌' },
  { value: 'transferido', label: 'Transferido', color: 'bg-gray-100 text-gray-800', icon: '↗️' },
];

export function UpdateLeadStatus({ cliente, apiClient, onUpdate }: UpdateLeadStatusProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nota, setNota] = useState('');

  const currentEstado = ESTADOS.find((e) => e.value === cliente.estado_cliente);

  async function handleUpdateStatus(nuevoEstado: string) {
    if (nuevoEstado === cliente.estado_cliente) {
      setIsExpanded(false);
      return;
    }

    setUpdating(true);
    setError(null);

    try {
      await apiClient.updateEstado(cliente.id, nuevoEstado, nota || undefined);
      setIsExpanded(false);
      setNota('');
      onUpdate();
    } catch (err) {
      console.error('[UpdateLeadStatus] Error:', err);
      setError(err instanceof Error ? err.message : 'Error actualizando estado');
    } finally {
      setUpdating(false);
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
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <div className="flex-1 text-left">
            <span className="font-semibold text-gray-900 dark:text-white block">Cambiar estado</span>
            {currentEstado && (
              <span className={`text-xs px-2 py-0.5 rounded-full inline-block mt-1 ${currentEstado.color}`}>
                {currentEstado.icon} {currentEstado.label}
              </span>
            )}
          </div>
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
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="space-y-3">
            {/* Selector de estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nuevo estado
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ESTADOS.map((estado) => (
                  <button
                    key={estado.value}
                    onClick={() => handleUpdateStatus(estado.value)}
                    disabled={updating || estado.value === cliente.estado_cliente}
                    className={`p-3 rounded-lg border-2 text-left transition ${
                      estado.value === cliente.estado_cliente
                        ? 'border-crm-primary bg-crm-accent/10 dark:bg-crm-secondary/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-crm-primary hover:bg-gray-50 dark:hover:bg-gray-700'
                    } ${updating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="text-lg mb-1">{estado.icon}</div>
                    <div className="text-xs font-medium text-gray-900 dark:text-gray-100">{estado.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Nota opcional */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nota (opcional)
              </label>
              <textarea
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Ej: Cliente interesado en terreno Villa Sol, solicita visita..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-crm-primary text-sm"
                rows={3}
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-md p-3">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {updating && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-crm-primary"></div>
                Actualizando estado...
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Los cambios se reflejarán inmediatamente en el CRM
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
