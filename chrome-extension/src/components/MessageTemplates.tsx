import { useEffect, useMemo, useState } from 'react';
import { CRMApiClient } from '@/lib/api';

export interface MessageTemplate {
  id: string;
  titulo: string;
  mensaje: string;
  categoria: string;
}

/**
 * Plantilla para pedirle el número al contacto cuando WhatsApp lo oculta
 * (chat por username). Exportada aparte porque SharedPhoneBanner la reusa
 * para el botón "Insertar mensaje" del hint de solicitud — mismo texto,
 * una sola fuente de verdad.
 */
export const SOLICITAR_NUMERO_TEMPLATE: MessageTemplate = {
  id: '9',
  titulo: 'Solicitar número de contacto',
  mensaje: 'Para coordinar mejor y enviarte la información completa, ¿me compartes tu número de contacto? Soy {vendedor} de Amersur Inmobiliaria.',
  categoria: 'consulta',
};

// Plantillas por defecto (fallback si el backend no responde)
const TEMPLATES_DEFAULT: MessageTemplate[] = [
  { id: '1', titulo: 'Saludo inicial', mensaje: 'Hola {cliente}! Gracias por contactarnos. Soy {vendedor} de Amersur Inmobiliaria. ¿En qué puedo ayudarte hoy?', categoria: 'saludo' },
  { id: '2', titulo: 'Información de terreno', mensaje: 'Hola {cliente}! Tenemos excelentes terrenos disponibles. ¿Te interesa alguna zona en particular? Puedo enviarte información detallada sobre ubicación, precios y facilidades de pago.', categoria: 'consulta' },
  { id: '3', titulo: 'Solicitar datos', mensaje: 'Para enviarte la información completa, ¿podrías compartirme tu nombre completo y email?', categoria: 'consulta' },
  { id: '4', titulo: 'Agendar visita', mensaje: 'Perfecto {cliente}! ¿Te gustaría agendar una visita al terreno? Tengo disponibilidad esta semana. ¿Qué día te viene mejor?', categoria: 'seguimiento' },
  { id: '5', titulo: 'Envío de información', mensaje: 'Hola {cliente}! Te acabo de enviar la información detallada del proyecto por WhatsApp. Cualquier duda que tengas, estoy a tu disposición. Soy {vendedor}.', categoria: 'seguimiento' },
  { id: '6', titulo: 'Seguimiento post-visita', mensaje: 'Hola {cliente}! ¿Qué te pareció el terreno que visitamos? ¿Te gustaría que conversemos sobre las opciones de financiamiento?', categoria: 'seguimiento' },
  { id: '7', titulo: 'Propuesta comercial', mensaje: 'Hola {cliente}! Tengo una excelente propuesta para ti. El terreno que te interesa tiene una promoción especial este mes con facilidades de pago. ¿Conversamos los detalles?', categoria: 'cierre' },
  { id: '8', titulo: 'Despedida', mensaje: 'Gracias por tu tiempo {cliente}! Cualquier consulta adicional, no dudes en escribirme. Soy {vendedor}, estoy disponible de Lunes a Sábado de 9am a 6pm. ¡Saludos!', categoria: 'cierre' },
  SOLICITAR_NUMERO_TEMPLATE,
];

interface MessageTemplatesProps {
  onSelectTemplate: (mensaje: string) => void;
  userName?: string;
  clientName?: string;
  proyectoInteres?: { nombre?: string; lote?: string };
  apiClient?: CRMApiClient;
}

export function MessageTemplates({ onSelectTemplate, userName, clientName, proyectoInteres, apiClient }: MessageTemplatesProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCategoria, setSelectedCategoria] = useState<string>('todas');
  const [templates, setTemplates] = useState<MessageTemplate[]>(TEMPLATES_DEFAULT);
  const [isRemote, setIsRemote] = useState(false);

  // Cargar plantillas del backend al expandir por primera vez
  useEffect(() => {
    if (!isExpanded || !apiClient || isRemote) return;

    let cancelled = false;
    apiClient.getTemplates().then((remoteTemplates) => {
      if (cancelled) return;
      if (remoteTemplates.length > 0) {
        setTemplates(remoteTemplates);
        setIsRemote(true);
      }
    });

    return () => { cancelled = true; };
  }, [isExpanded, apiClient, isRemote]);

  const filteredTemplates = useMemo(() => {
    if (selectedCategoria === 'todas') return templates;
    return templates.filter((t) => t.categoria === selectedCategoria);
  }, [selectedCategoria, templates]);

  // Categorías dinámicas basadas en las plantillas cargadas
  const categorias = useMemo(() => {
    const cats = Array.from(new Set(templates.map(t => t.categoria)));
    const catLabels: Record<string, { label: string; icon: string }> = {
      saludo: { label: 'Saludos', icon: '👋' },
      consulta: { label: 'Consultas', icon: '❓' },
      seguimiento: { label: 'Seguimiento', icon: '📞' },
      cierre: { label: 'Cierre', icon: '🤝' },
    };
    return [
      { value: 'todas', label: 'Todas', icon: '📋' },
      ...cats.map(c => ({
        value: c,
        label: catLabels[c]?.label || c.charAt(0).toUpperCase() + c.slice(1),
        icon: catLabels[c]?.icon || '📌',
      })),
    ];
  }, [templates]);

  const replaceVariables = (mensaje: string): string => {
    let result = mensaje;
    if (userName) {
      result = result.replace(/{vendedor}/g, userName);
      result = result.replace(/{nombre}/g, userName);
    }
    if (clientName) {
      result = result.replace(/{cliente}/g, clientName);
    } else {
      result = result.replace(/{cliente}!\s?/g, '');
      result = result.replace(/{cliente}\s?/g, '');
    }
    if (proyectoInteres?.nombre) {
      result = result.replace(/{proyecto}/g, proyectoInteres.nombre);
    }
    if (proyectoInteres?.lote) {
      result = result.replace(/{lote}/g, proyectoInteres.lote);
    }
    return result;
  };

  const getPreviewMessage = (mensaje: string): string => {
    let preview = mensaje;
    preview = preview.replace(/{vendedor}/g, userName || '[Tu nombre]');
    preview = preview.replace(/{nombre}/g, userName || '[Tu nombre]');
    preview = preview.replace(/{cliente}/g, clientName || '[Cliente]');
    preview = preview.replace(/{proyecto}/g, proyectoInteres?.nombre || '[Proyecto]');
    preview = preview.replace(/{lote}/g, proyectoInteres?.lote || '[Lote]');
    return preview;
  };

  const handleSelectTemplate = (template: MessageTemplate) => {
    const mensaje = replaceVariables(template.mensaje);
    onSelectTemplate(mensaje);
    setIsExpanded(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition"
      >
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span className="font-semibold text-gray-900 dark:text-white">Plantillas de mensajes</span>
          {isRemote && (
            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">CRM</span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {/* Filtros por categoría */}
          <div className="p-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-2">
              {categorias.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategoria(cat.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                    selectedCategoria === cat.value
                      ? 'bg-crm-primary text-white'
                      : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500'
                  }`}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de plantillas */}
          <div className="max-h-96 overflow-y-auto">
            {filteredTemplates.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                No hay plantillas en esta categoría
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className="w-full p-4 text-left hover:bg-crm-accent/10 dark:hover:bg-gray-700 transition group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-crm-primary dark:group-hover:text-crm-secondary transition">
                          {template.titulo}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {getPreviewMessage(template.mensaje)}
                        </p>
                      </div>
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-crm-primary transition flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isRemote
                ? '✓ Plantillas sincronizadas desde el CRM'
                : '💡 Tip: Las plantillas se copiarán directamente. Puedes editarlas antes de enviar.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
