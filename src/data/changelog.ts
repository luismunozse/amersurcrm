export type ChangeType = "feature" | "improvement" | "fix" | "security";

export interface ChangelogEntry {
  type: ChangeType;
  description: string;
}

export interface ChangelogVersion {
  version: string;
  date: string;
  title: string;
  changes: ChangelogEntry[];
}

// Agregar nuevas versiones al inicio del array
export const changelog: ChangelogVersion[] = [
  {
    version: "1.6.0",
    date: "2026-05-07",
    title: "Flujo unificado de separación y eliminación de procesos",
    changes: [
      { type: "feature", description: "Flujo unificado: el botón Nueva Separación ahora abre el modal de Registrar Separación y crea automáticamente el proceso de adquisición con sus 4 etapas" },
      { type: "feature", description: "Calificación bancaria se omite automáticamente cuando la forma de pago es contado, transferencia o depósito" },
      { type: "feature", description: "Forma de pago en la separación: contado, transferencia, depósito, crédito hipotecario o crédito directo" },
      { type: "feature", description: "Acciones de admin sobre separaciones activas: anular con motivo (libera lote, cancela proceso, revierte cliente a potencial) y extender vencimiento" },
      { type: "feature", description: "Eliminar proceso de adquisición permanentemente (solo admin), borrando etapas, checklist y documentos adjuntos" },
      { type: "feature", description: "Constancia de separación en PDF con firma del Gerente General y datos bancarios de AMERSUR" },
      { type: "feature", description: "Convertir proforma aprobada en separación con datos prellenados (lote, monto, moneda, forma de pago)" },
      { type: "improvement", description: "Tooltips de ayuda en cada item del checklist del proceso de adquisición" },
      { type: "improvement", description: "Etapas omitidas se muestran en gris con borde punteado y badge claro; etapas completadas con badge verde" },
      { type: "improvement", description: "Pipeline avanza saltando correctamente las etapas marcadas como omitidas" },
      { type: "improvement", description: "Días de vigencia de la separación configurables por proyecto" },
      { type: "improvement", description: "Textos de la interfaz unificados a español peruano formal (usted)" },
      { type: "fix", description: "Checkboxes del checklist en el proceso de adquisición ahora se guardan correctamente" },
      { type: "fix", description: "Avanzar etapa ya no activa accidentalmente etapas omitidas" },
      { type: "security", description: "Asignación de vendedor por round-robin protegida contra race conditions con bloqueo de fila" },
      { type: "security", description: "Auditoría de operaciones críticas con IP y user-agent del solicitante" },
    ],
  },
  {
    version: "1.5.0",
    date: "2026-05-06",
    title: "Flujo de adquisición, cobranza y mejoras de UI",
    changes: [
      { type: "feature", description: "Cierre de venta desde la ficha del cliente con generación automática de cronograma" },
      { type: "feature", description: "Registro de pagos por cuota e historial detallado en módulo de Cobranza" },
      { type: "feature", description: "Anulación de pagos con auditoría (motivo, usuario y restauración de saldo)" },
      { type: "feature", description: "Seguimiento de mora con listado de cuotas vencidas en Control de Pagos" },
      { type: "improvement", description: "Pipeline de Adquisición: orden por urgencia y avance de etapas con validaciones" },
      { type: "improvement", description: "Tabs de Cronograma y Procesos en la ficha de cliente" },
      { type: "improvement", description: "Logo y nombre del CRM en el sidebar ahora redirigen al inicio" },
      { type: "fix", description: "Corrección del modal de novedades en modo oscuro (contraste y legibilidad)" },
      { type: "fix", description: "Ajustes responsive en sidebar para vista móvil" },
    ],
  },
  {
    version: "1.4.0",
    date: "2025-02-25",
    title: "Optimización general del CRM y nuevas funcionalidades",
    changes: [
      { type: "improvement", description: "Optimización de todos los módulos del CRM para mayor rendimiento" },
      { type: "feature", description: "Nuevas funcionalidades en los módulos principales" },
      { type: "improvement", description: "Mejoras significativas de performance en toda la plataforma" },
      { type: "improvement", description: "Optimización de AmersurChat con mejoras de estabilidad y velocidad" },
      { type: "fix", description: "Correcciones generales y mejoras de estabilidad" },
    ],
  },
  {
    version: "1.3.0",
    date: "2025-01-15",
    title: "Nueva versión de AmersurChat y mejoras generales",
    changes: [
      { type: "feature", description: "AmersurChat v1.1.6 disponible para descargar desde el menú Extensión" },
      { type: "improvement", description: "Mejoras de rendimiento y estabilidad general" },
      { type: "improvement", description: "Optimización de la interfaz de usuario" },
      { type: "fix", description: "Correcciones de errores menores" },
    ],
  },
  {
    version: "1.2.1",
    date: "2024-12-16",
    title: "Nueva versión de AmersurChat disponible",
    changes: [
      { type: "feature", description: "AmersurChat v1.1.3 disponible para descargar desde el menú Extensión" },
      { type: "improvement", description: "Mejoras en la detección de contactos en WhatsApp Web" },
      { type: "improvement", description: "Interfaz mejorada del sidebar integrado" },
      { type: "fix", description: "Corrección en la autenticación con el CRM" },
    ],
  },
  {
    version: "1.2.0",
    date: "2024-12-16",
    title: "Sistema de novedades",
    changes: [
      { type: "feature", description: "Modal de changelog para notificar novedades del sistema" },
    ],
  },
  {
    version: "1.1.0",
    date: "2024-12-10",
    title: "Nuevas funcionalidades de reportes",
    changes: [
      { type: "feature", description: "Nuevos reportes de rendimiento de vendedores" },
      { type: "feature", description: "Exportación de datos a Excel" },
      { type: "improvement", description: "Interfaz de usuario mejorada en dashboard" },
    ],
  },
  {
    version: "1.0.0",
    date: "2024-12-01",
    title: "Lanzamiento inicial",
    changes: [
      { type: "feature", description: "Sistema completo de gestión de clientes" },
      { type: "feature", description: "Gestión de proyectos y lotes" },
      { type: "feature", description: "Sistema de separaciones y ventas" },
      { type: "feature", description: "Dashboard con métricas en tiempo real" },
    ],
  },
];

export const CURRENT_VERSION = changelog[0].version;
export const CHANGELOG_STORAGE_KEY = "crm_changelog_seen_version";
