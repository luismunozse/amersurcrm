/**
 * Utilidades para generar clases de badges con soporte para modo oscuro
 */

/**
 * Retorna las clases de Tailwind para un badge basado en el color
 * Compatible con modo oscuro
 */
export function getBadgeClasses(color: string): string {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    gray: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
    pink: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300',
    teal: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
  };
  return colorMap[color] || colorMap.gray;
}

/**
 * Retorna las clases para un badge de estado
 */
export function getStatusBadgeClasses(color: string): string {
  return `px-3 py-1 text-xs font-medium rounded-full ${getBadgeClasses(color)}`;
}

/**
 * Retorna las clases para un badge pequeño
 */
export function getSmallBadgeClasses(color: string): string {
  return `px-2 py-0.5 text-xs font-medium rounded ${getBadgeClasses(color)}`;
}

/**
 * Retorna las clases para un icono circular de timeline
 */
export function getTimelineIconClasses(color: string): string {
  const iconColorMap: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    gray: 'bg-gray-500',
    orange: 'bg-orange-500',
    indigo: 'bg-indigo-500',
    pink: 'bg-pink-500',
    teal: 'bg-teal-500',
  };
  return `absolute left-3 top-0 w-6 h-6 rounded-full border-2 border-crm-background flex items-center justify-center ${iconColorMap[color] || iconColorMap.gray} text-white`;
}
