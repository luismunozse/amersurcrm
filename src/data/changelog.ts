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
    version: "1.10.0",
    date: "2026-07-24",
    title: "Coordinadores en la extensión y estabilidad",
    changes: [
      { type: "feature", description: "Asigne los leads de WhatsApp a un coordinador directamente desde la extensión AmersurChat" },
      { type: "feature", description: "Selector de coordinador en el formulario de captura de leads de la extensión" },
      { type: "improvement", description: "El desplegable para asignar responsable ahora agrupa a las personas por rol (coordinadores y vendedores)" },
      { type: "improvement", description: "AmersurChat v1.2.4: su sesión se mantiene abierta aunque cierre y vuelva a abrir el navegador" },
      { type: "fix", description: "Correcciones de estabilidad en importación de clientes, sincronización con Google Drive y plantillas de la extensión" },
    ],
  },
  {
    version: "1.9.0",
    date: "2026-07-21",
    title: "Equipos de coordinador",
    changes: [
      { type: "feature", description: "Asigne vendedores a un coordinador para formar equipos de trabajo" },
      { type: "feature", description: "Cada coordinador ve únicamente los clientes, ventas y cobranzas de su equipo" },
      { type: "feature", description: "Asignación masiva: seleccione varios vendedores a la vez y asígnelos a un coordinador en un solo paso" },
      { type: "feature", description: "Al desactivar o eliminar a un coordinador, decida qué hacer con su equipo: transferirlo a otro coordinador o dejarlo sin asignar" },
      { type: "improvement", description: "Nueva columna de coordinador y filtro por equipo en la lista de usuarios" },
      { type: "improvement", description: "La selección de vendedores se mantiene aunque busque, filtre o cambie de página" },
      { type: "improvement", description: "Notificaciones más confiables: un mismo evento avisa a las mismas personas sin importar desde dónde se registre" },
      { type: "fix", description: "Se reparó el envío de notificaciones push al navegador de extremo a extremo" },
    ],
  },
  {
    version: "1.8.0",
    date: "2026-07-07",
    title: "Centro de comando y Reportes renovados",
    changes: [
      { type: "feature", description: "Nuevo inicio según su rol: tablero de comando para administradores y panel de trabajo diario para vendedores, con tareas y prioridades a la vista" },
      { type: "feature", description: "Reportes con tabla de rendimiento por vendedor (scorecard), ordenable por cada indicador" },
      { type: "feature", description: "Cobranza con alertas automáticas: recordatorios de cuotas por WhatsApp y registro de cada gestión" },
      { type: "feature", description: "Panel de mora del sistema y seguimiento de la gestión de cobranza dentro de Reportes" },
      { type: "feature", description: "Modo presentación del plano a pantalla completa y sin precios, ideal para mostrar el proyecto al cliente" },
      { type: "feature", description: "Los Gerentes pueden consultar la Gestión de Usuarios en modo de solo lectura" },
      { type: "improvement", description: "Comparación real contra el período anterior y metas tomadas de la meta asignada a cada vendedor" },
      { type: "improvement", description: "Embudo de conversión con las 8 etapas completas y conteos exactos incluso con grandes volúmenes de datos" },
      { type: "improvement", description: "Editor del plano mejorado: cárguelo en imagen o PDF, con zoom, desplazamiento y edición de puntos" },
      { type: "fix", description: "Asignación de clientes por turnos (round-robin) sin duplicados, y teléfonos normalizados a formato internacional" },
    ],
  },
  {
    version: "1.7.0",
    date: "2026-06-29",
    title: "Plano interactivo y seguridad reforzada",
    changes: [
      { type: "feature", description: "Plano interactivo del proyecto: visualice el masterplan con cada lote marcado sobre el plano" },
      { type: "feature", description: "Editor de plano para administradores: suba el plano y dibuje el contorno de cada lote para asignarlo" },
      { type: "security", description: "Refuerzo de los permisos de acceso en todos los módulos: cada usuario ve solo la información que le corresponde" },
      { type: "security", description: "Protección reforzada del acceso desde la extensión AmersurChat" },
      { type: "security", description: "Se protegieron los tokens de Google y se ocultaron credenciales sensibles del sistema" },
    ],
  },
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
