import { useState, useEffect } from 'react';
import { WhatsAppContact, Cliente } from '@/types/crm';
import { CRMApiClient, getCRMConfig } from '@/lib/api';
import { LoginForm } from './LoginForm';
import { ContactInfo } from './ContactInfo';
import { CreateLeadForm } from './CreateLeadForm';
import { MessageTemplates } from './MessageTemplates';
import { ClientHistory } from './ClientHistory';
import { UpdateLeadStatus } from './UpdateLeadStatus';
import { ProjectInterest } from './ProjectInterest';
import { QuickNotes } from './QuickNotes';
import { ConnectionStatus } from './ConnectionStatus';
import { WHATSAPP_WEB_ORIGIN } from '@/lib/constants';
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
  const [lastProcessedPhone, setLastProcessedPhone] = useState<string | null>(null); // Último teléfono procesado
  const [clienteAsignadoAOtro, setClienteAsignadoAOtro] = useState<string | null>(null); // Mensaje si cliente está asignado a otro

  // Inicializar autenticación
  useEffect(() => {
    initAuth();
  }, []);

  // Solicitar info del contacto cuando se autentica y periódicamente para detectar cambios
  useEffect(() => {
    if (!isAuthenticated) return;

    // Solicitar inmediatamente al autenticarse
    requestContactInfo();

    // Luego verificar cambios cada 10 segundos (más eficiente)
    const interval = setInterval(() => {
      requestContactInfo();
    }, 10000); // Cambiado de 2000 a 10000 (10 segundos)

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Buscar cliente cuando cambia el contacto
  useEffect(() => {
    if (contact && apiClient) {
      // Solo buscar si el teléfono cambió (evita búsquedas redundantes)
      if (contact.phone !== lastProcessedPhone) {
        logger.info('Nuevo contacto detectado', { phone: contact.phone });
        setLastProcessedPhone(contact.phone);
        searchCliente(contact.phone);
      }
    } else if (!contact) {
      // Si no hay contacto, limpiar estado
      setCliente(null);
      setLastProcessedPhone(null);
      setClienteAsignadoAOtro(null);
    }
  }, [contact, apiClient, lastProcessedPhone]);

  // Verificar pendientes cuando cambia el cliente
  useEffect(() => {
    async function checkPendientes() {
      if (cliente && apiClient) {
        try {
          const { pendientes } = await apiClient.getPendientes(cliente.id);
          // Enviar mensaje al content script para actualizar badge
        window.parent.postMessage({
          type: 'AMERSURCHAT_UPDATE_BADGE',
          count: pendientes,
        }, WHATSAPP_WEB_ORIGIN);
        } catch (error) {
          logger.error('Error verificando pendientes', error instanceof Error ? error : undefined);
        }
      } else {
        // Sin cliente, limpiar badge
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

  async function searchCliente(phone: string) {
    if (!apiClient || !phone) {
      logger.debug('Búsqueda de cliente cancelada', { hasApiClient: !!apiClient, hasPhone: !!phone });
      return;
    }

    logger.info('Buscando cliente', { phone });
    setSearchingCliente(true);
    setClienteAsignadoAOtro(null); // Limpiar mensaje anterior

    try {
      const result = await apiClient.searchClienteByPhone(phone);

      if (result.cliente) {
        // Cliente existe en el CRM y está asignado a este vendedor (o es admin)
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
        // Cliente existe pero está asignado a otro vendedor
        logger.info('Cliente asignado a otro vendedor', { phone, mensaje: result.mensaje });
        setCliente(null);
        setClienteAsignadoAOtro(result.mensaje || 'Cliente asignado a otro vendedor');
      } else {
        // Cliente NO existe - mostrar formulario para crear lead manualmente
        logger.info('Cliente no encontrado. Mostrar formulario de creación manual.', { phone });
        setCliente(null);
      }
    } catch (error) {
      logger.error('Error buscando cliente', error instanceof Error ? error : undefined, { phone });
      setCliente(null);
    } finally {
      setSearchingCliente(false);
    }
  }

  // Escuchar respuestas del content script
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== WHATSAPP_WEB_ORIGIN) return;
      if (!event.data || typeof event.data !== 'object') return;

      if (event.data.type === 'AMERSURCHAT_CONTACT_INFO') {
        setContact(event.data.contact);
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  async function handleLogin(crmUrl: string, token: string) {
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
    setIsAuthenticated(false);
    setApiClient(null);
    setContact(null);
    setCliente(null);
  }

  async function handleLeadCreated(nuevoCliente?: Cliente) {
    // Si se proporcionan datos del cliente, setearlos directamente
    if (nuevoCliente) {
      logger.info('Lead creado, seteando cliente directamente', { clienteId: nuevoCliente.id });
      setCliente(nuevoCliente);
      setClienteAsignadoAOtro(null);
    } else if (contact && apiClient) {
      // Fallback: buscar el cliente
      logger.info('Lead creado, buscando cliente...');
      await new Promise(resolve => setTimeout(resolve, 500));
      await searchCliente(contact.phone);
    }
  }

  async function handleClientUpdate() {
    // Refrescar información del cliente después de actualización
    if (contact && apiClient) {
      await searchCliente(contact.phone);
    }
  }

  function handleSelectTemplate(mensaje: string) {
    logger.info('Insertando plantilla en WhatsApp', { 
      mensajePreview: mensaje.substring(0, 50) 
    });

    // Enviar mensaje al content script para insertar en WhatsApp
    window.parent.postMessage({
      type: 'AMERSURCHAT_INSERT_TEMPLATE',
      text: mensaje,
    }, WHATSAPP_WEB_ORIGIN);

    // También copiar al portapapeles como fallback
    navigator.clipboard.writeText(mensaje).catch((error) => {
      logger.error('Error copiando plantilla', error instanceof Error ? error : undefined);
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crm-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />;
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
              Selecciona un chat de WhatsApp para ver la información del contacto
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

            {/* Formulario para crear lead (solo si no existe y no está asignado a otro) */}
            {!cliente && !clienteAsignadoAOtro && (
              <CreateLeadForm
                contact={contact}
                apiClient={apiClient!}
                onLeadCreated={handleLeadCreated}
              />
            )}

            {cliente && (
              <>
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
                  onNotaAdded={() => searchCliente(contact.phone)}
                />

                <ClientHistory
                  clienteId={cliente.id}
                  apiClient={apiClient!}
                />
              </>
            )}

            {/* Plantillas de mensajes (siempre disponibles) */}
            <MessageTemplates
              onSelectTemplate={handleSelectTemplate}
              userName={userName || undefined}
              clientName={cliente?.nombre || contact?.name || undefined}
            />
          </>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Amersur CRM v1.0.0
        </p>
      </div>
    </div>
  );
}
