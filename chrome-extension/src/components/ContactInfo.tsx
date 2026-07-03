import { useEffect, useState } from 'react';
import { WhatsAppContact, Cliente } from '@/types/crm';
import { CRMApiClient } from '@/lib/api';
import { createLogger } from '@/lib/logger';
import { Skeleton } from './Skeleton';

const logger = createLogger('ContactInfo');

// El mensaje que el cliente dejó en WhatsApp se guarda en `notas` con el formato:
//   'Lead capturado automáticamente desde WhatsApp Web\n\nMensaje inicial: "<msg>"'
// Lo separamos del boilerplate para mostrarlo como bloque propio y prominente,
// dejando en "Notas" solo lo que el asesor haya agregado a mano.
const AUTO_CAPTURE_PREFIX = 'Lead capturado automáticamente desde WhatsApp Web';

export function parseNotasCliente(notas?: string | null): {
  mensajeInicial: string | null;
  notasAdicionales: string | null;
} {
  if (!notas) return { mensajeInicial: null, notasAdicionales: null };

  // Lazy hasta la comilla de cierre seguida de fin de línea o de string. Así
  // soporta notas manuales agregadas DESPUÉS del bloque auto-capturado (el
  // asesor puede editar `notas`) y comillas dentro del propio mensaje.
  const match = notas.match(/Mensaje inicial:\s*"([\s\S]*?)"\s*(?:\n|$)/);
  const mensajeInicial = match ? match[1].trim() : null;

  // Quitar el bloque de mensaje conservando lo que haya antes y después de él.
  let resto = notas;
  if (match && typeof match.index === 'number') {
    resto = `${notas.slice(0, match.index)}\n${notas.slice(match.index + match[0].length)}`;
  }
  resto = resto.replace(AUTO_CAPTURE_PREFIX, '').trim();

  return {
    mensajeInicial: mensajeInicial && mensajeInicial.length > 0 ? mensajeInicial : null,
    notasAdicionales: resto.length > 0 ? resto : null,
  };
}

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
    intermedio: 'bg-purple-100 text-purple-800 border-purple-300',
    potencial: 'bg-crm-accent/30 text-crm-primary border-crm-primary',
    desestimado: 'bg-red-100 text-red-800 border-red-300',
    transferido: 'bg-gray-100 text-gray-800 border-gray-300',
  };

  const estadoIcons: Record<string, string> = {
    por_contactar: '📋',
    contactado: '📞',
    intermedio: '🔄',
    potencial: '⭐',
    desestimado: '❌',
    transferido: '↗️',
  };

  const estadoLabels: Record<string, string> = {
    por_contactar: 'Por Contactar',
    contactado: 'Contactado',
    intermedio: 'Intermedio',
    potencial: 'Potencial',
    desestimado: 'Desestimado',
    transferido: 'Transferido',
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
          logger.error('Error cargando info adicional', error instanceof Error ? error : undefined);
        });
    } else {
      setUltimaInteraccion(null);
      setProyectosInteres([]);
    }
  }, [cliente, apiClient]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-crm-primary to-crm-primary-hover p-4 text-white">
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
          <div className="space-y-3" aria-busy="true" aria-label="Buscando en CRM">
            <Skeleton className="h-16 w-full" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}

        {!loading && cliente && (
          <div className="space-y-3 animate-fade-in">
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
              <div className="bg-crm-accent/10 dark:bg-crm-secondary/20 p-3 rounded-lg border border-crm-accent/30">
                <p className="text-xs font-medium text-crm-primary dark:text-crm-secondary mb-2">
                  🏠 Proyectos de interés ({proyectosInteres.length}):
                </p>
                <div className="space-y-2">
                  {proyectosInteres.slice(0, 3).map((interes: any, idx: number) => (
                    <div key={idx} className="text-xs text-crm-primary dark:text-crm-accent">
                      <p className="font-medium">
                        • {interes.lote?.proyecto?.nombre || 'Proyecto'}
                      </p>
                      {interes.lote?.codigo && (
                        <p className="ml-3 text-crm-text-secondary dark:text-crm-text-muted">
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

            {(() => {
              const { mensajeInicial, notasAdicionales } = parseNotasCliente(cliente.notas);
              const notasMostrar = notasAdicionales || (!mensajeInicial ? cliente.notas : null);
              return (
                <>
                  {mensajeInicial && (
                    <div className="pt-2">
                      <p className="text-xs font-medium text-crm-primary dark:text-crm-secondary mb-1">
                        💬 Mensaje del cliente:
                      </p>
                      <p className="text-sm text-gray-800 dark:text-gray-100 bg-crm-accent/10 dark:bg-crm-secondary/20 border border-crm-accent/30 p-2 rounded max-h-32 overflow-y-auto whitespace-pre-wrap">
                        {mensajeInicial}
                      </p>
                    </div>
                  )}
                  {notasMostrar && (
                    <div className="pt-2">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">📝 Notas:</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded max-h-20 overflow-y-auto whitespace-pre-wrap">
                        {notasMostrar}
                      </p>
                    </div>
                  )}
                </>
              );
            })()}
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
