import { useMemo, useState } from 'react';

interface MessageTemplate {
  id: string;
  titulo: string;
  mensaje: string;
  categoria: 'saludo' | 'consulta' | 'seguimiento' | 'cierre';
}

const TEMPLATES_DEFAULT: MessageTemplate[] = [
  {
    id: '1',
    titulo: 'Saludo inicial',
    mensaje: 'Hola! Gracias por contactarnos. Soy {nombre} de Amersur Inmobiliaria. ¿En qué puedo ayudarte hoy?',
    categoria: 'saludo',
  },
  {
    id: '2',
    titulo: 'Información de terreno',
    mensaje: 'Tenemos excelentes terrenos disponibles. ¿Te interesa alguna zona en particular? Puedo enviarte información detallada sobre ubicación, precios y facilidades de pago.',
    categoria: 'consulta',
  },
  {
    id: '3',
    titulo: 'Solicitar datos',
    mensaje: 'Para enviarte la información completa, ¿podrías compartirme tu nombre completo y email?',
    categoria: 'consulta',
  },
  {
    id: '4',
    titulo: 'Agendar visita',
    mensaje: 'Perfecto! ¿Te gustaría agendar una visita al terreno? Tengo disponibilidad esta semana. ¿Qué día te viene mejor?',
    categoria: 'seguimiento',
  },
  {
    id: '5',
    titulo: 'Envío de información',
    mensaje: 'Te acabo de enviar la información detallada del proyecto por WhatsApp. Cualquier duda que tengas, estoy a tu disposición.',
    categoria: 'seguimiento',
  },
  {
    id: '6',
    titulo: 'Seguimiento post-visita',
    mensaje: '¿Qué te pareció el terreno que visitamos? ¿Te gustaría que conversemos sobre las opciones de financiamiento?',
    categoria: 'seguimiento',
  },
  {
    id: '7',
    titulo: 'Propuesta comercial',
    mensaje: 'Tengo una excelente propuesta para ti. El terreno que te interesa tiene una promoción especial este mes con facilidades de pago. ¿Conversamos los detalles?',
    categoria: 'cierre',
  },
  {
    id: '8',
    titulo: 'Despedida',
    mensaje: 'Gracias por tu tiempo! Cualquier consulta adicional, no dudes en escribirme. Estoy disponible de Lunes a Sábado de 9am a 6pm. Saludos!',
    categoria: 'cierre',
  },
];

interface MessageTemplatesProps {
  onSelectTemplate: (mensaje: string) => void;
  userName?: string;
}

export function MessageTemplates({ onSelectTemplate, userName }: MessageTemplatesProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCategoria, setSelectedCategoria] = useState<string>('todas');

  const filteredTemplates = useMemo(() => {
    if (selectedCategoria === 'todas') return TEMPLATES_DEFAULT;
    return TEMPLATES_DEFAULT.filter((t) => t.categoria === selectedCategoria);
  }, [selectedCategoria]);

  const handleSelectTemplate = (template: MessageTemplate) => {
    // Reemplazar variables
    let mensaje = template.mensaje;
    if (userName) {
      mensaje = mensaje.replace('{nombre}', userName);
    }
    onSelectTemplate(mensaje);
    setIsExpanded(false);
  };

  const categorias = [
    { value: 'todas', label: 'Todas', icon: '📋' },
    { value: 'saludo', label: 'Saludos', icon: '👋' },
    { value: 'consulta', label: 'Consultas', icon: '❓' },
    { value: 'seguimiento', label: 'Seguimiento', icon: '📞' },
    { value: 'cierre', label: 'Cierre', icon: '🤝' },
  ];

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
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          <span className="font-semibold text-gray-900 dark:text-white">Plantillas de mensajes</span>
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
                    className="w-full p-4 text-left hover:bg-blue-50 dark:hover:bg-gray-700 transition group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-crm-primary dark:group-hover:text-crm-secondary transition">
                          {template.titulo}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {template.mensaje.replace('{nombre}', userName || '[Tu nombre]')}
                        </p>
                      </div>
                      <svg
                        className="w-4 h-4 text-gray-400 group-hover:text-crm-primary transition flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer con tip */}
          <div className="p-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              💡 Tip: Las plantillas se copiarán directamente. Puedes editarlas antes de enviar.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
