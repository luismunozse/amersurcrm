import { Fragment, useState, useEffect, useRef } from 'react';
import { WhatsAppContact, Cliente } from '@/types/crm';
import { CRMApiClient, getCRMConfig, clearCRMConfig } from '@/lib/api';
import { LoginForm } from './LoginForm';
import { ContactInfo } from './ContactInfo';
import { CreateLeadForm } from './CreateLeadForm';
import { SharedPhoneBanner } from './SharedPhoneBanner';
import { MessageTemplates } from './MessageTemplates';
import { ClientHistory } from './ClientHistory';
import { UpdateLeadStatus } from './UpdateLeadStatus';
import { ProjectInterest } from './ProjectInterest';
import { QuickNotes } from './QuickNotes';
import { ConnectionStatus } from './ConnectionStatus';
import { InlineAlert } from './InlineAlert';
import { WHATSAPP_WEB_ORIGIN } from '@/lib/constants';
import { esChatIdReal } from '@/lib/chatId';
import { createLogger } from '@/lib/logger';

const logger = createLogger('Sidebar');

export function Sidebar() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState<WhatsAppContact | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [searchingCliente, setSearchingCliente] = useState(false);
  const [apiClient, setApiClient] = useState<CRMApiClient | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [clienteAsignadoAOtro, setClienteAsignadoAOtro] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [sesionExpirada, setSesionExpirada] = useState(false);
  // Aviso cuando la plantilla no se pudo escribir en el input de WhatsApp.
  const [templateAviso, setTemplateAviso] = useState<string | null>(null);
  // Última plantilla enviada al content script, para el fallback a portapapeles.
  const ultimaPlantillaRef = useRef<string | null>(null);

  // Ref para tracking del último chat procesado (evita re-renders innecesarios).
  // Se usa chatId (LID o teléfono) en vez de phone: phone puede ser null en
  // chats iniciados por username, pero chatId siempre identifica al chat.
  const lastProcessedChatIdRef = useRef<string | null>(null);
  // Ref para saber si el componente está montado (previene memory leaks)
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Inicializar autenticación
  useEffect(() => {
    initAuth();
  }, []);

  // Solicitar info del contacto al autenticarse + safety net cada 30s
  useEffect(() => {
    if (!isAuthenticated) return;

    // Solicitar una vez al autenticarse
    requestContactInfo();

    // Safety net: polling lento cada 30s por si el push del content script falla
    const interval = setInterval(() => {
      if (mountedRef.current) requestContactInfo();
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Buscar cliente cuando cambia el contacto
  useEffect(() => {
    if (contact && apiClient) {
      // Solo buscar si el chat cambió (evita búsquedas redundantes)
      if (contact.chatId !== lastProcessedChatIdRef.current) {
        logger.info('Nuevo contacto detectado', { chatId: contact.chatId, phone: contact.phone, username: contact.username });
        lastProcessedChatIdRef.current = contact.chatId;
        // Limpiar ANTES de buscar: `searchingCliente` solo pone el skeleton en
        // ContactInfo, pero el resto del panel (UpdateLeadStatus, QuickNotes,
        // ProjectInterest, ClientHistory) seguía montado con el cliente del
        // chat ANTERIOR y accionable — se podía cambiarle el estado o cargarle
        // una nota al lead equivocado mientras corría la búsqueda del nuevo.
        // Se limpia acá y no dentro de searchCliente() porque esa función
        // también la usa handleClientUpdate() para refrescar el cliente ACTUAL
        // (tras cambiar estado o agregar nota); ahí desmontar el panel entero
        // sería un parpadeo gratis que además colapsa los acordeones abiertos.
        setCliente(null);
        setClienteAsignadoAOtro(null);
        setSearchError(null);
        searchCliente(contact);
      }
    } else if (!contact) {
      setCliente(null);
      lastProcessedChatIdRef.current = null;
      setClienteAsignadoAOtro(null);
    }
  }, [contact, apiClient]);

  // Verificar pendientes cuando cambia el cliente
  useEffect(() => {
    if (!mountedRef.current) return;

    async function checkPendientes() {
      if (cliente && apiClient) {
        try {
          const { pendientes } = await apiClient.getPendientes(cliente.id);
          if (!mountedRef.current) return;
          window.parent.postMessage({
            type: 'AMERSURCHAT_UPDATE_BADGE',
            count: pendientes,
          }, WHATSAPP_WEB_ORIGIN);
        } catch (error) {
          logger.error('Error verificando pendientes', error instanceof Error ? error : undefined);
        }
      } else {
        window.parent.postMessage({
          type: 'AMERSURCHAT_UPDATE_BADGE',
          count: 0,
        }, WHATSAPP_WEB_ORIGIN);
      }
    }

    checkPendientes();
  }, [cliente, apiClient]);

  async function initAuth() {
    logger.info('Inicializando autenticación...');
    try {
      const config = await getCRMConfig();
      logger.debug('Configuración obtenida', { hasToken: !!config.token, url: config.url });
      
      if (config.token) {
        const client = new CRMApiClient(config.url, config.token);
        setApiClient(client);
        setIsAuthenticated(true);
        logger.info('Autenticación restaurada desde storage');
      } else {
        logger.info('No hay token guardado, requiere login');
      }
    } catch (error) {
      logger.error('Error inicializando auth', error instanceof Error ? error : undefined);
    } finally {
      setLoading(false);
    }
  }

  async function requestContactInfo() {
    // Solicitar información del contacto al content script
    window.parent.postMessage({ type: 'AMERSURCHAT_GET_CONTACT' }, WHATSAPP_WEB_ORIGIN);
  }

  async function searchCliente(contact: WhatsAppContact) {
    const tieneIdentificador = !!(contact.phone || contact.username || (contact.chatId && contact.chatId !== 'unknown'));
    if (!apiClient || !tieneIdentificador) {
      logger.debug('Búsqueda de cliente cancelada', { hasApiClient: !!apiClient, tieneIdentificador });
      return;
    }

    logger.info('Buscando cliente', { phone: contact.phone, chatId: contact.chatId, username: contact.username });
    setSearchingCliente(true);
    setClienteAsignadoAOtro(null);
    setSearchError(null);

    try {
      const result = await apiClient.searchCliente({
        phone: contact.phone,
        // chatId cae a username cuando aún no hay LID/teléfono (ver
        // extractContactInfo); ese valor de relleno nunca debe mandarse
        // como chat_id — se manda username por separado igual.
        chatId: esChatIdReal(contact.chatId) ? contact.chatId : null,
        username: contact.username,
      });
      if (!mountedRef.current) return;

      if (result.error) {
        logger.error('Error buscando cliente (API)', undefined, { phone: contact.phone, chatId: contact.chatId, error: result.error });
        setCliente(null);
        setSearchError(result.error);
      } else if (result.cliente) {
        setCliente(result.cliente);
        logger.info('Cliente encontrado en CRM', { clienteId: result.cliente.id, nombre: result.cliente.nombre });

        // Reflejar nombre del CRM en el contacto para mostrarlo en el encabezado
        setContact((prev) => {
          if (!prev) return prev;
          const normalizedName = (result.cliente?.nombre || '').trim();
          if (!normalizedName) return prev;
          return { ...prev, name: normalizedName };
        });
      } else if (result.asignadoAOtro) {
        logger.info('Cliente asignado a otro vendedor', { chatId: contact.chatId, mensaje: result.mensaje });
        setCliente(null);
        setClienteAsignadoAOtro(result.mensaje || 'Cliente asignado a otro vendedor');
      } else {
        logger.info('Cliente no encontrado, mostrar formulario de creación', { chatId: contact.chatId });
        setCliente(null);
      }
    } catch (error) {
      logger.error('Error buscando cliente', error instanceof Error ? error : undefined, { chatId: contact.chatId });
      if (mountedRef.current) setCliente(null);
    } finally {
      if (mountedRef.current) setSearchingCliente(false);
    }
  }

  // Escuchar respuestas y pushes del content script
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== WHATSAPP_WEB_ORIGIN) return;
      if (!event.data || typeof event.data !== 'object') return;

      // Respuesta a polling (GET_CONTACT)
      if (event.data.type === 'AMERSURCHAT_CONTACT_INFO') {
        setContact(event.data.contact);
      }
      // Push proactivo del content script cuando cambia el chat
      if (event.data.type === 'AMERSURCHAT_CONTACT_CHANGED') {
        setContact(event.data.contact);
      }
      // Resultado real de insertar la plantilla en el input de WhatsApp
      if (event.data.type === 'AMERSURCHAT_TEMPLATE_INSERTED' && !event.data.success) {
        handleInsercionFallida();
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Sesión expirada (refresh token falló): volver al login con aviso claro.
  useEffect(() => {
    function handleSessionExpired() {
      logger.warn('Sesión expirada: volviendo al login');
      setIsAuthenticated(false);
      setApiClient(null);
      setSesionExpirada(true);
    }
    window.addEventListener('amersurchat:session-expired', handleSessionExpired);
    return () => window.removeEventListener('amersurchat:session-expired', handleSessionExpired);
  }, []);

  async function handleLogin(crmUrl: string, token: string) {
    setSesionExpirada(false);
    const client = new CRMApiClient(crmUrl, token);

    try {
      // Obtener información del usuario
      const user = await client.getCurrentUser();
      // Preferir nombre completo para las plantillas, sino usar username
      setUserName(user.nombre_completo || user.username || user.email?.split('@')[0] || 'Usuario');
    } catch (error) {
      logger.error('Error obteniendo usuario', error instanceof Error ? error : undefined);
      setUserName('Usuario');
    }

    setApiClient(client);
    setIsAuthenticated(true);
  }

  async function handleLogout() {
    // Ahora que los tokens persisten en local storage, hay que borrarlos
    // explícitamente o el próximo mount re-autentica solo
    await clearCRMConfig();
    setIsAuthenticated(false);
    setApiClient(null);
    setContact(null);
    setCliente(null);
    lastProcessedChatIdRef.current = null;
  }

  async function handleLeadCreated(nuevoCliente?: Cliente) {
    // Si se proporcionan datos del cliente, setearlos directamente
    if (nuevoCliente) {
      logger.info('Lead creado, seteando cliente directamente', {
        clienteId: nuevoCliente.id,
        vendedor_asignado: nuevoCliente.vendedor_asignado,
        origen_lead: nuevoCliente.origen_lead,
      });
      setCliente(nuevoCliente);
      setClienteAsignadoAOtro(null);
    } else if (contact && apiClient) {
      // Fallback: buscar el cliente
      logger.info('Lead creado, buscando cliente...');
      await new Promise(resolve => setTimeout(resolve, 500));
      await searchCliente(contact);
    }
  }

  async function handleClientUpdate() {
    // Refrescar información del cliente después de actualización
    if (contact && apiClient) {
      await searchCliente(contact);
    }
  }

  function handleSelectTemplate(mensaje: string) {
    logger.info('Insertando plantilla en WhatsApp', {
      mensajePreview: mensaje.substring(0, 50)
    });

    setTemplateAviso(null);
    // Se guarda para el fallback: el content script responde si pudo insertar
    // o no (AMERSURCHAT_TEMPLATE_INSERTED) y ahí recién se decide qué hacer.
    ultimaPlantillaRef.current = mensaje;

    // Enviar mensaje al content script para insertar en WhatsApp
    window.parent.postMessage({
      type: 'AMERSURCHAT_INSERT_TEMPLATE',
      text: mensaje,
    }, WHATSAPP_WEB_ORIGIN);
  }

  /**
   * El content script no pudo escribir la plantilla en el input de WhatsApp:
   * se cae al portapapeles y se avisa. Antes se copiaba SIEMPRE (pisando el
   * portapapeles del vendedor en cada plantilla) y la respuesta del content
   * script no se escuchaba, así que una inserción fallida quedaba muda.
   */
  function handleInsercionFallida() {
    const mensaje = ultimaPlantillaRef.current;
    if (!mensaje) return;

    logger.warn('No se pudo insertar la plantilla en WhatsApp, cayendo a portapapeles');
    navigator.clipboard.writeText(mensaje).then(
      () => setTemplateAviso('No se pudo escribir en el chat. El mensaje se copió al portapapeles: péguelo con Ctrl+V.'),
      (error) => {
        logger.error('Error copiando plantilla', error instanceof Error ? error : undefined);
        setTemplateAviso('No se pudo insertar el mensaje en WhatsApp. Copie el texto de la plantilla manualmente.');
      },
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crm-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} sessionExpired={sesionExpirada} />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-crm-primary text-white p-4 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <img
              src={chrome.runtime.getURL('icons/icon48.png')}
              alt="Amersur Logo"
              className="w-10 h-10"
            />
            <h1 className="text-xl font-bold">AmersurChat</h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm hover:bg-white/20 px-3 py-1 rounded transition"
          >
            Cerrar sesión
          </button>
        </div>
        <p className="text-sm opacity-90 mb-2">CRM WhatsApp Integration</p>
        <ConnectionStatus apiClient={apiClient} />
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!contact && (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Seleccione un chat de WhatsApp para ver la información del contacto
            </p>
          </div>
        )}

        {contact && (
          <>
            <ContactInfo
              contact={contact}
              cliente={cliente}
              loading={searchingCliente}
              apiClient={apiClient!}
            />

            {/* Error de búsqueda en el CRM (red/timeout): no falla mudo y permite reintentar */}
            {searchError && !searchingCliente && (
              <InlineAlert
                variant="error"
                message={searchError}
                onRetry={() => searchCliente(contact)}
              />
            )}

            {/* Cliente asignado a otro vendedor */}
            {clienteAsignadoAOtro && (
              <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-orange-600 dark:text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                      Cliente no disponible
                    </p>
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                      {clienteAsignadoAOtro}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Formulario para crear lead (solo si no existe, no está asignado a
                otro, y la búsqueda en el CRM no falló — así no creamos duplicados
                a ciegas). key por chatId: fuerza un form FRESCO al cambiar de
                contacto, así nombre/mensaje/proyecto no quedan pegados. */}
            {!cliente && !clienteAsignadoAOtro && !searchError && (
              <CreateLeadForm
                key={contact.chatId}
                contact={contact}
                apiClient={apiClient!}
                onLeadCreated={handleLeadCreated}
              />
            )}

            {/* key por cliente.id: ClientHistory y ProjectInterest cargan sus
                datos con useEffect([isExpanded]) y no miran clienteId, así que
                sin key un cambio de cliente con el acordeón abierto dejaba en
                pantalla las interacciones / lotes de interés del cliente
                anterior. El key remonta todo el bloque cuando cambia el
                cliente, y NO remonta cuando handleClientUpdate() refresca el
                mismo cliente (mismo id) — los acordeones quedan como estaban. */}
            {cliente && (
              <Fragment key={cliente.id}>
                {/* Sugerencia de teléfono cuando el cliente todavía no tiene uno
                    registrado: cubre tanto el número ya visible en contact.phone
                    (chat clásico, o revelado por Meta tras la excepción de ~30
                    días) como la detección en mensajes cuando sigue oculto — ver
                    SharedPhoneBanner. key por chatId: estado de "descartado"/
                    detección fresco por cada chat. */}
                {!cliente.telefono && (
                  <SharedPhoneBanner
                    key={contact.chatId}
                    contact={contact}
                    clienteId={cliente.id}
                    apiClient={apiClient!}
                    userName={userName}
                    onPhoneSaved={handleClientUpdate}
                    onInsertMessage={handleSelectTemplate}
                  />
                )}

                {/* Herramientas para cliente existente */}
                <UpdateLeadStatus
                  cliente={cliente}
                  apiClient={apiClient!}
                  onUpdate={handleClientUpdate}
                />

                <ProjectInterest
                  clienteId={cliente.id}
                  apiClient={apiClient!}
                />

                <QuickNotes
                  clienteId={cliente.id}
                  apiClient={apiClient!}
                  onNotaAdded={() => searchCliente(contact)}
                />

                <ClientHistory
                  clienteId={cliente.id}
                  apiClient={apiClient!}
                />
              </Fragment>
            )}

            {/* La inserción de la plantilla falló: se avisa en vez de fallar mudo */}
            {templateAviso && (
              <InlineAlert
                variant="warning"
                message={templateAviso}
                onDismiss={() => setTemplateAviso(null)}
              />
            )}

            {/* Plantillas de mensajes (siempre disponibles) */}
            <MessageTemplates
              onSelectTemplate={handleSelectTemplate}
              userName={userName || undefined}
              clientName={cliente?.nombre || contact?.name || undefined}
              apiClient={apiClient || undefined}
            />
          </>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          AmersurChat v{chrome.runtime.getManifest().version}
        </p>
      </div>
    </div>
  );
}
