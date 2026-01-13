import React, { useState, useEffect, useRef } from 'react';
import { WhatsAppContact, Cliente } from '@/types/crm';
import { CRMApiClient } from '@/lib/api';
import { WHATSAPP_WEB_ORIGIN } from '@/lib/constants';

interface Proyecto {
  id: string;
  nombre: string;
  ubicacion?: string;
}

interface Lote {
  id: string;
  codigo: string;
  estado: string;
  precio?: number;
  moneda?: string;
  sup_m2?: number;
}

interface CreateLeadFormProps {
  contact: WhatsAppContact;
  apiClient: CRMApiClient;
  onLeadCreated: (cliente?: Cliente) => void;
}

export function CreateLeadForm({ contact, apiClient, onLeadCreated }: CreateLeadFormProps) {
  const [nombre, setNombre] = useState(contact.name);
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [vendedorAsignado, setVendedorAsignado] = useState<string | null>(null);

  // Estado para origen del lead
  const [origenLead, setOrigenLead] = useState<string>('whatsapp_web');

  // Opciones de origen del lead
  const ORIGENES_LEAD_OPTIONS = [
    { value: 'whatsapp_web', label: 'WhatsApp Web' },
    { value: 'campaña_facebook', label: 'Campaña de Facebook' },
    { value: 'campaña_tiktok', label: 'Campaña de TikTok' },
    { value: 'redes_sociales', label: 'Redes Sociales' },
    { value: 'publicidad', label: 'Publicidad' },
    { value: 'referido', label: 'Referido' },
    { value: 'recomendacion', label: 'Recomendación' },
    { value: 'feria', label: 'Feria/Evento' },
    { value: 'web', label: 'Sitio Web' },
    { value: 'otro', label: 'Otro' },
  ];

  // Estado para proyecto de interés
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [selectedProyecto, setSelectedProyecto] = useState<string>('');
  const [selectedLote, setSelectedLote] = useState<string>('');
  const [loadingProyectos, setLoadingProyectos] = useState(false);
  const [loadingLotes, setLoadingLotes] = useState(false);

  // Ref para controlar que solo se capture el mensaje una vez por contacto
  const mensajeCapturedRef = useRef(false);
  const lastContactIdRef = useRef<string | null>(null);

  // Cargar proyectos al montar
  useEffect(() => {
    loadProyectos();
  }, []);

  // Cargar lotes cuando cambia el proyecto
  useEffect(() => {
    if (selectedProyecto) {
      loadLotes(selectedProyecto);
    } else {
      setLotes([]);
      setSelectedLote('');
    }
  }, [selectedProyecto]);

  // Intentar obtener el último mensaje del chat (solo una vez por contacto)
  useEffect(() => {
    // Si cambió el contacto, resetear el flag
    if (lastContactIdRef.current !== contact.chatId) {
      mensajeCapturedRef.current = false;
      lastContactIdRef.current = contact.chatId;
    }

    // Si ya capturamos el mensaje para este contacto, no hacer nada
    if (mensajeCapturedRef.current) {
      return;
    }

    // Solicitar al content script el último mensaje
    window.parent.postMessage({ type: 'AMERSURCHAT_GET_LAST_MESSAGE' }, WHATSAPP_WEB_ORIGIN);

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== WHATSAPP_WEB_ORIGIN) return;
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'AMERSURCHAT_LAST_MESSAGE') {
        // Solo setear si aún no hemos capturado el mensaje
        if (!mensajeCapturedRef.current && event.data.message) {
          setMensaje(event.data.message.substring(0, 500));
          mensajeCapturedRef.current = true; // Marcar como capturado
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [contact.chatId]);

  async function loadProyectos() {
    setLoadingProyectos(true);
    try {
      const data = await apiClient.getProyectos();
      setProyectos(data);
    } catch (err) {
      console.error('[CreateLeadForm] Error cargando proyectos:', err);
    } finally {
      setLoadingProyectos(false);
    }
  }

  async function loadLotes(proyectoId: string) {
    setLoadingLotes(true);
    try {
      const data = await apiClient.getLotes(proyectoId);
      setLotes(data);
    } catch (err) {
      console.error('[CreateLeadForm] Error cargando lotes:', err);
    } finally {
      setLoadingLotes(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await apiClient.createLead({
        nombre: nombre || `Lead WhatsApp ${contact.phone.slice(-4)}`,
        telefono: contact.phone,
        telefono_whatsapp: contact.phone,
        origen_lead: origenLead,
        canal: 'whatsapp_extension',
        mensaje_inicial: mensaje || undefined,
        chat_id: contact.chatId,
      });

      if (result.success) {
        // Si se seleccionó un lote, agregarlo como proyecto de interés
        if (selectedLote && result.clienteId) {
          try {
            console.log('[CreateLeadForm] Agregando proyecto de interés:', {
              clienteId: result.clienteId,
              loteId: selectedLote,
            });
            const interesResult = await apiClient.addProyectoInteres(result.clienteId, selectedLote);
            console.log('[CreateLeadForm] Proyecto de interés agregado:', interesResult);
          } catch (err) {
            console.error('[CreateLeadForm] Error agregando proyecto de interés:', err);
            // Mostrar warning al usuario pero no fallar la creación del lead
            setWarning('Lead creado, pero hubo un error al guardar el proyecto de interés. Puedes agregarlo manualmente.');
          }
        } else if (selectedProyecto && !selectedLote) {
          // Usuario seleccionó proyecto pero no lote
          console.log('[CreateLeadForm] Proyecto seleccionado pero sin lote, no se agrega interés');
        }

        // Construir objeto cliente con los datos disponibles
        const clienteCreado: Cliente = {
          id: result.clienteId!,
          nombre: nombre || `Lead WhatsApp ${contact.phone.slice(-4)}`,
          telefono: contact.phone,
          telefono_whatsapp: contact.phone,
          estado_cliente: 'por_contactar',
          origen_lead: origenLead,
          vendedor_asignado: result.vendedor || null,
          created_at: new Date().toISOString(),
        };

        // Guardar vendedor asignado para mostrar en éxito
        setVendedorAsignado(result.vendedor || null);

        // Mostrar mensaje de éxito brevemente
        setSuccess(true);

        // Después de 1 segundo, pasar los datos del cliente al Sidebar
        setTimeout(() => {
          onLeadCreated(clienteCreado);
        }, 1000);
      } else if (result.existente) {
        // El cliente ya existe
        setError(`El cliente ya existe en el CRM con el nombre: "${result.cliente?.nombre || 'Desconocido'}"`);
      } else {
        setError(result.message || 'Error al crear lead');
      }
    } catch (err) {
      console.error('[CreateLeadForm] Error:', err);
      setError(err instanceof Error ? err.message : 'Error al crear lead');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-800 rounded-full mb-4">
          <svg
            className="w-8 h-8 text-green-600 dark:text-green-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
          Lead creado exitosamente
        </h3>
        <p className="text-sm text-green-700 dark:text-green-200 mb-2">
          {nombre || `Lead WhatsApp ${contact.phone.slice(-4)}`}
        </p>
        {vendedorAsignado && (
          <p className="text-sm text-green-700 dark:text-green-200 mb-2 font-medium">
            Asignado a: {vendedorAsignado}
          </p>
        )}
        <p className="text-xs text-green-600 dark:text-green-300">
          Cargando datos del cliente...
        </p>
        <div className="mt-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600 dark:border-green-300 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Crear nuevo lead
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nombre del contacto
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-crm-primary text-sm"
            placeholder="Nombre del lead"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Teléfono
          </label>
          <input
            type="text"
            value={contact.phone}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
            disabled
          />
        </div>

        {/* Selector de Origen del Lead */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Origen del lead
          </label>
          <select
            value={origenLead}
            onChange={(e) => setOrigenLead(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-crm-primary text-sm"
          >
            {ORIGENES_LEAD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Selector de Proyecto de Interés */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Proyecto de interés (opcional)
          </label>
          <select
            value={selectedProyecto}
            onChange={(e) => setSelectedProyecto(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-crm-primary text-sm"
            disabled={loadingProyectos}
          >
            <option value="">-- Seleccionar proyecto --</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
          {loadingProyectos && (
            <p className="text-xs text-gray-500 mt-1">Cargando proyectos...</p>
          )}
        </div>

        {/* Selector de Lote */}
        {selectedProyecto && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Lote de interés
            </label>
            <select
              value={selectedLote}
              onChange={(e) => setSelectedLote(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-crm-primary text-sm"
              disabled={loadingLotes}
            >
              <option value="">-- Seleccionar lote --</option>
              {lotes.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.codigo} - {l.estado} {l.precio ? `(${l.moneda || '$'} ${l.precio.toLocaleString()})` : ''}
                </option>
              ))}
            </select>
            {loadingLotes && (
              <p className="text-xs text-gray-500 mt-1">Cargando lotes...</p>
            )}
            {!loadingLotes && lotes.length === 0 && (
              <p className="text-xs text-yellow-600 mt-1">No hay lotes disponibles para este proyecto</p>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Mensaje inicial (opcional)
          </label>
          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-crm-primary text-sm"
            rows={3}
            placeholder="Primer mensaje del contacto..."
          />
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-md p-3">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {warning && (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-md p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">{warning}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-crm-primary text-white py-2 px-4 rounded-md hover:bg-crm-primary-hover disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium text-sm"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Creando lead...
            </span>
          ) : (
            'Crear Lead en CRM'
          )}
        </button>
      </form>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          El lead será asignado automáticamente a un vendedor disponible
        </p>
      </div>
    </div>
  );
}
