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
      { type: "feature", description: "Sistema de reservas y ventas" },
      { type: "feature", description: "Dashboard con métricas en tiempo real" },
    ],
  },
];

export const CURRENT_VERSION = changelog[0].version;
export const CHANGELOG_STORAGE_KEY = "crm_changelog_seen_version";
