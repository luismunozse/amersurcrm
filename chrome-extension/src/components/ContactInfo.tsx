import { useEffect, useState } from 'react';
import { WhatsAppContact, Cliente } from '@/types/crm';
import { CRMApiClient } from '@/lib/api';

interface ContactInfoProps {
  contact: WhatsAppContact;
  cliente: Cliente | null;
  loading: boolean;
  apiClient?: CRMApiClient;
}

export function ContactInfo({ contact, cliente, loading, apiClient }: ContactInfoProps) {
  const [ultimaInteraccion, setUltimaInteraccion] = useState<any>(null);
  const [proyectosInteres, setProyectosInteres] = useState<any[]>([]);

  const estadoColors: Record<string, string> = {
    por_contactar: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    contactado: 'bg-blue-100 text-blue-800 border-blue-300',
    interesado: 'bg-purple-100 text-purple-800 border-purple-300',
    negociacion: 'bg-orange-100 text-orange-800 border-orange-300',
    cerrado: 'bg-green-100 text-green-800 border-green-300',
    perdido: 'bg-red-100 text-red-800 border-red-300',
  };

  const estadoIcons: Record<string, string> = {
    por_contactar: '📋',
    contactado: '📞',
    interesado: '👀',
    negociacion: '💰',
    cerrado: '✅',
    perdido: '❌',
  };

  const estadoLabels: Record<string, string> = {
    por_contactar: 'Por Contactar',
    contactado: 'Contactado',
    interesado: 'Interesado',
    negociacion: 'En Negociación',
    cerrado: 'Cerrado',
    perdido: 'Perdido',
  };

  // Cargar información adicional cuando hay un cliente
  useEffect(() => {
    if (cliente && apiClient) {
      Promise.all([
        apiClient.getInteracciones(cliente.id).then(ints => ints[0] || null),
        apiClient.getProyectosInteres(cliente.id),
      ])
        .then(([ultimaInt, proyectos]) => {
          setUltimaInteraccion(ultimaInt);
          setProyectosInteres(proyectos);
        })
        .catch(error => {
          console.error('[ContactInfo] Error cargando info adicional:', error);
        });
    } else {
      setUltimaInteraccion(null);
      setProyectosInteres([]);
    }
  }, [cliente, apiClient]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <svg
              className="w-7 h-7"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-lg">
              {cliente?.nombre || contact.name}
            </h2>
            <p className="text-sm opacity-90">{contact.phone}</p>
          </div>
        </div>
      </div>

      {/* Estado del Cliente */}
      <div className="p-4">
        {loading && (
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-crm-primary"></div>
            <span className="text-sm">Buscando en CRM...</span>
          </div>
        )}

        {!loading && cliente && (
          <div className="space-y-3">
            {/* Estado destacado */}
            <div className={`p-3 rounded-lg border-2 ${estadoColors[cliente.estado_cliente]}`}>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{estadoIcons[cliente.estado_cliente]}</span>
                <div>
                  <p className="text-xs font-medium opacity-75">Estado del Lead</p>
                  <p className="font-semibold">{estadoLabels[cliente.estado_cliente]}</p>
                </div>
              </div>
            </div>

            {/* Última interacción */}
            {ultimaInteraccion && (
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  📅 Última interacción:
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {new Date(ultimaInteraccion.fecha).toLocaleString('es-PE', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {ultimaInteraccion.descripcion}
                </p>
              </div>
            )}

            {/* Proyectos de interés */}
            {proyectosInteres.length > 0 && (
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-2">
                  🏠 Proyectos de interés ({proyectosInteres.length}):
                </p>
                <div className="space-y-2">
                  {proyectosInteres.slice(0, 3).map((interes: any, idx: number) => (
                    <div key={idx} className="text-xs text-purple-600 dark:text-purple-400">
                      <p className="font-medium">
                        • {interes.lote?.proyecto?.nombre || 'Proyecto'}
                      </p>
                      {interes.lote?.codigo && (
                        <p className="ml-3 text-purple-500 dark:text-purple-500">
                          Lote {interes.lote.codigo}
                          {interes.lote.sup_m2 && ` • ${interes.lote.sup_m2} m²`}
                          {interes.lote.precio && ` • ${interes.lote.moneda || '$'} ${interes.lote.precio.toLocaleString()}`}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Origen</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {cliente.origen_lead}
                </p>
              </div>
              {cliente.vendedor_asignado && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Vendedor</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {cliente.vendedor_asignado}
                  </p>
                </div>
              )}
            </div>

            {cliente.email && (
              <div className="pt-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                <p className="text-sm text-gray-900 dark:text-gray-100">{cliente.email}</p>
              </div>
            )}

            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                📆 Registrado: {new Date(cliente.created_at).toLocaleDateString('es-PE')}
              </span>
            </div>

            {cliente.notas && (
              <div className="pt-2">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">💬 Notas:</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded max-h-20 overflow-y-auto">
                  {cliente.notas}
                </p>
              </div>
            )}
          </div>
        )}

        {!loading && !cliente && (
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm">Contacto nuevo - No registrado en CRM</span>
          </div>
        )}
      </div>
    </div>
  );
}
