import { useCallback, useEffect, useState } from 'react';
import { WhatsAppContact } from '@/types/crm';
import { CRMApiClient } from '@/lib/api';
import { WHATSAPP_WEB_ORIGIN } from '@/lib/constants';
import { InlineAlert } from './InlineAlert';
import { SOLICITAR_NUMERO_TEMPLATE } from './MessageTemplates';
import { createLogger } from '@/lib/logger';

const logger = createLogger('SharedPhoneBanner');

interface SharedPhoneDetection {
  phone: string;
  sourceText: string;
}

interface SharedPhoneBannerProps {
  contact: WhatsAppContact;
  clienteId: string;
  apiClient: CRMApiClient;
  /** Nombre del vendedor, para reemplazar {vendedor} en la plantilla de solicitud. */
  userName?: string | null;
  /** Se llama tras guardar con éxito, para refrescar el cliente en el sidebar. */
  onPhoneSaved: () => void;
  /** Inserta un mensaje en WhatsApp — mismo handler que usa MessageTemplates
   *  (flujo AMERSURCHAT_INSERT_TEMPLATE), reusado acá para no duplicar el
   *  protocolo de postMessage. */
  onInsertMessage: (mensaje: string) => void;
}

/**
 * Estado de la sugerencia mostrada:
 * - "revelado": WhatsApp ya muestra `contact.phone` directamente (chat
 *   clásico, o un chat por username donde el número quedó visible — ver
 *   docstring del componente). No hace falta detectar nada en el chat.
 * - "buscando"/"encontrado"/"no-encontrado": resultado de detectSharedPhone
 *   sobre los mensajes, solo aplica cuando `contact.phone` sigue oculto.
 */
type EstadoBanner = 'revelado' | 'buscando' | 'encontrado' | 'no-encontrado';

/**
 * Sugerencia relacionada con el teléfono del contacto cuando el cliente
 * todavía no tiene uno registrado. Cubre dos orígenes distintos del número:
 *
 * - "revelado": Meta revela el teléfono real de un contacto por username
 *   después de cierta interacción (excepción de ~30 días) o si el contacto
 *   agendó una cita — en ese momento `contact.phone` deja de ser null sin
 *   que el vendedor haga nada. Si el cliente en el CRM sigue sin teléfono
 *   (se creó por username, antes de la revelación), se lo ofrecemos
 *   directamente: sin escanear mensajes, el número ya viene en el contacto.
 * - "encontrado"/"no-encontrado": cuando `contact.phone` sigue oculto,
 *   detectSharedPhone (content script, ver lib/whatsapp.ts) escanea los
 *   mensajes por si el contacto lo compartió voluntariamente en el chat.
 *   Si no encuentra nada, se ofrece un hint para pedírselo con una plantilla.
 *
 * En todos los casos el vendedor confirma o descarta — el número NUNCA se
 * guarda automáticamente.
 *
 * Se monta con `key={contact.chatId}` desde el Sidebar, así que cada chat
 * arranca con su propio estado (descartar/insertar en un chat no afecta a
 * otro).
 */
export function SharedPhoneBanner({ contact, clienteId, apiClient, userName, onPhoneSaved, onInsertMessage }: SharedPhoneBannerProps) {
  const [estado, setEstado] = useState<EstadoBanner>(() => (contact.phone ? 'revelado' : 'buscando'));
  const [detection, setDetection] = useState<SharedPhoneDetection | null>(null);
  const [discarded, setDiscarded] = useState(false);
  const [mensajeInsertado, setMensajeInsertado] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const solicitarDeteccion = useCallback(() => {
    setEstado('buscando');
    window.parent.postMessage({ type: 'AMERSURCHAT_DETECT_SHARED_PHONE' }, WHATSAPP_WEB_ORIGIN);
  }, []);

  // Listener del content script — se suscribe una sola vez (el componente
  // ya remonta por completo en cada cambio de chat vía key={contact.chatId}).
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== WHATSAPP_WEB_ORIGIN) return;
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'AMERSURCHAT_SHARED_PHONE') {
        const detectado = event.data.detection || null;
        setDetection(detectado);
        setEstado(detectado ? 'encontrado' : 'no-encontrado');
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Decide el camino según contact.phone: si WhatsApp ya lo reveló, no hay
  // nada que detectar. Corre también si contact.phone cambia DESPUÉS del
  // montaje (el safety-net poll del Sidebar puede revelarlo sin cambiar de
  // chat, ya que la revelación no cambia el chatId/LID).
  useEffect(() => {
    if (contact.phone) {
      setEstado('revelado');
      return;
    }
    solicitarDeteccion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact.chatId, contact.phone]);

  async function handleGuardar() {
    const telefono = estado === 'revelado' ? contact.phone : detection?.phone;
    if (!telefono) return;
    setSaving(true);
    setError(null);
    try {
      const result = await apiClient.updateClientePhone(clienteId, telefono);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
      onPhoneSaved();
    } catch (err) {
      logger.error('Error guardando teléfono', err instanceof Error ? err : undefined);
      setError('No se pudo guardar el número. Intente nuevamente.');
    } finally {
      setSaving(false);
    }
  }

  function handleVolverABuscar() {
    setDetection(null);
    setError(null);
    solicitarDeteccion();
  }

  function handleInsertarMensaje() {
    const mensaje = SOLICITAR_NUMERO_TEMPLATE.mensaje.replace(/{vendedor}/g, userName || 'tu asesor');
    onInsertMessage(mensaje);
    setMensajeInsertado(true);
  }

  if (discarded || mensajeInsertado) return null;

  if (saved) {
    return (
      <div
        role="status"
        className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-3 text-sm text-green-800 dark:text-green-200 animate-fade-in"
      >
        Número guardado correctamente.
      </div>
    );
  }

  // Buscando (o esperando el primer handshake con el content script): no
  // mostrar nada todavía — evita un flash del hint antes de tener resultado.
  if (estado === 'buscando') return null;

  if (estado === 'no-encontrado') {
    return (
      <div
        role="status"
        className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-3 space-y-2 animate-fade-in"
      >
        <p className="text-sm text-gray-700 dark:text-gray-300">
          WhatsApp oculta el número de este contacto. Puede solicitárselo al cliente.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleInsertarMensaje}
            className="flex-1 bg-crm-primary text-white py-1.5 px-3 rounded-md hover:bg-crm-primary-hover transition ease-out-strong active:scale-[0.98] text-sm font-medium"
          >
            Insertar mensaje
          </button>
          <button
            type="button"
            onClick={handleVolverABuscar}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition"
          >
            Volver a buscar
          </button>
        </div>
      </div>
    );
  }

  if (estado === 'revelado') {
    return (
      <div
        role="status"
        className="bg-crm-accent/10 dark:bg-crm-secondary/20 border border-crm-accent/30 rounded-lg p-4 space-y-3 animate-fade-in"
      >
        <p className="text-sm font-medium text-crm-primary dark:text-crm-secondary">
          El número de este contacto ahora es visible: {contact.phone}. ¿Desea guardarlo en el cliente?
        </p>

        {error && <InlineAlert variant="error" message={error} onDismiss={() => setError(null)} />}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleGuardar}
            disabled={saving}
            className="flex-1 bg-crm-primary text-white py-2 px-3 rounded-md hover:bg-crm-primary-hover disabled:bg-gray-400 disabled:cursor-not-allowed transition ease-out-strong active:scale-[0.98] text-sm font-medium"
          >
            {saving ? 'Guardando...' : 'Guardar número'}
          </button>
          <button
            type="button"
            onClick={() => setDiscarded(true)}
            disabled={saving}
            className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition"
          >
            Descartar
          </button>
        </div>
      </div>
    );
  }

  // estado === 'encontrado'
  return (
    <div
      role="status"
      className="bg-crm-accent/10 dark:bg-crm-secondary/20 border border-crm-accent/30 rounded-lg p-4 space-y-3 animate-fade-in"
    >
      <div>
        <p className="text-sm font-medium text-crm-primary dark:text-crm-secondary">
          Se detectó un posible número en la conversación: {detection?.phone}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">
          "{detection?.sourceText}"
        </p>
      </div>

      {error && <InlineAlert variant="error" message={error} onDismiss={() => setError(null)} />}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleGuardar}
          disabled={saving}
          className="flex-1 bg-crm-primary text-white py-2 px-3 rounded-md hover:bg-crm-primary-hover disabled:bg-gray-400 disabled:cursor-not-allowed transition ease-out-strong active:scale-[0.98] text-sm font-medium"
        >
          {saving ? 'Guardando...' : 'Guardar número'}
        </button>
        <button
          type="button"
          onClick={() => setDiscarded(true)}
          disabled={saving}
          className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition"
        >
          Descartar
        </button>
      </div>

      <button
        type="button"
        onClick={handleVolverABuscar}
        className="text-xs text-gray-500 dark:text-gray-400 underline-offset-2 hover:underline"
      >
        Volver a buscar
      </button>
    </div>
  );
}
