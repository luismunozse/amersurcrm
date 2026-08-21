/**
 * Catálogo de estados de cliente para la UI del sidebar.
 *
 * Fuente de verdad: `src/lib/types/clientes.ts` (ESTADOS_CLIENTE_OPTIONS) del
 * CRM. Vive acá duplicado porque la extensión es un bundle independiente y no
 * puede importar del proyecto Next.
 *
 * OJO — dos listas distintas a propósito:
 *
 * - `ESTADOS_CLIENTE` (8) es para MOSTRAR. Un cliente puede estar en
 *   `en_proceso` o `propietario` porque alguien lo movió desde el CRM web, y
 *   el sidebar tiene que saber pintarlo. Antes estos dos faltaban en los mapas
 *   de color/ícono/label de ContactInfo y UpdateLeadStatus, así que el badge
 *   salía vacío (`border-2 undefined`, sin texto ni ícono).
 *
 * - `ESTADOS_EDITABLES` (6) es para OFRECER como botón. Es exactamente el
 *   allowlist de `estadosValidos` en `src/app/api/clientes/[id]/estado/route.ts`:
 *   `en_proceso` y `propietario` los gobierna el flujo de venta
 *   (separación/cierre) y el endpoint responde 400 "Estado inválido" si se
 *   mandan desde acá. Si algún día el backend los habilita, agregarlos a
 *   EDITABLES — no hace falta tocar nada más.
 */

import type { EstadoCliente } from '@/types/crm';

export interface EstadoMeta {
  value: EstadoCliente;
  label: string;
  icon: string;
  /** Clases para el chip chico (fondo + texto). */
  chip: string;
  /** Clases para el bloque destacado (fondo + texto + borde). */
  panel: string;
}

/**
 * Los hues siguen el campo `color` de ESTADOS_CLIENTE_OPTIONS
 * (`src/lib/types/clientes.ts`), no los colores que tenía la extensión — que
 * estaban invertidos respecto del CRM (por_contactar salía amarillo acá y azul
 * allá, contactado al revés) y usaban rojo/gris para desestimado/transferido.
 *
 * OJO: el CRM web NO es consistente consigo mismo — `EstadoClienteButton` y
 * `ClienteQuickViewSheet` tienen sus propios mapas y se contradicen entre sí y
 * con este. Se tomó ESTADOS_CLIENTE_OPTIONS como fuente porque es el único que
 * cubre los 8 estados y expone el color como dato. Si algún día se unifican los
 * mapas del CRM, este archivo se actualiza contra el mismo `color`.
 *
 * Sin variantes `dark:` a propósito: el sidebar declara `darkMode: "class"`
 * pero nadie agrega la clase `dark`, así que hoy siempre renderiza en claro.
 */
export const ESTADOS_CLIENTE: readonly EstadoMeta[] = [
  { value: 'por_contactar', label: 'Por Contactar', icon: '📋', chip: 'bg-blue-100 text-blue-800', panel: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'contactado', label: 'Contactado', icon: '📞', chip: 'bg-yellow-100 text-yellow-800', panel: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'intermedio', label: 'Intermedio', icon: '🔄', chip: 'bg-cyan-100 text-cyan-800', panel: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
  { value: 'potencial', label: 'Potencial', icon: '⭐', chip: 'bg-purple-100 text-purple-800', panel: 'bg-purple-100 text-purple-800 border-purple-300' },
  { value: 'en_proceso', label: 'En Proceso', icon: '🤝', chip: 'bg-orange-100 text-orange-800', panel: 'bg-orange-100 text-orange-800 border-orange-300' },
  { value: 'propietario', label: 'Propietario', icon: '🏡', chip: 'bg-green-100 text-green-800', panel: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'desestimado', label: 'Desestimado', icon: '❌', chip: 'bg-gray-100 text-gray-800', panel: 'bg-gray-100 text-gray-800 border-gray-300' },
  { value: 'transferido', label: 'Transferido', icon: '↗️', chip: 'bg-teal-100 text-teal-800', panel: 'bg-teal-100 text-teal-800 border-teal-300' },
] as const;

/**
 * Hue esperado por estado, según el campo `color` de ESTADOS_CLIENTE_OPTIONS.
 * Exportado para que el test de regresión falle si alguien toca las clases de
 * arriba sin actualizar el CRM (o al revés).
 */
export const HUE_POR_ESTADO: Readonly<Record<EstadoCliente, string>> = {
  por_contactar: 'blue',
  contactado: 'yellow',
  intermedio: 'cyan',
  potencial: 'purple',
  en_proceso: 'orange',
  propietario: 'green',
  desestimado: 'gray',
  transferido: 'teal',
};

/** Estados que la extensión puede setear (ver allowlist del endpoint de estado). */
const VALORES_EDITABLES = new Set<string>([
  'por_contactar',
  'contactado',
  'intermedio',
  'potencial',
  'desestimado',
  'transferido',
]);

export const ESTADOS_EDITABLES: readonly EstadoMeta[] = ESTADOS_CLIENTE.filter((e) =>
  VALORES_EDITABLES.has(e.value),
);

/** True si el estado se puede cambiar desde el sidebar (vs. gestionado por el flujo de venta). */
export function esEstadoEditable(value: string | null | undefined): boolean {
  return !!value && VALORES_EDITABLES.has(value);
}

/**
 * Metadata de un estado, SIEMPRE definida: un valor desconocido (estado nuevo
 * agregado en el CRM que la extensión todavía no conoce) cae a un chip neutro
 * con el valor crudo como label, en vez de renderizar un badge vacío.
 */
export function estadoMeta(value: string | null | undefined): EstadoMeta {
  const conocido = ESTADOS_CLIENTE.find((e) => e.value === value);
  if (conocido) return conocido;

  return {
    value: (value || 'desconocido') as EstadoCliente,
    label: value || 'Sin estado',
    icon: '•',
    chip: 'bg-gray-100 text-gray-800',
    panel: 'bg-gray-100 text-gray-800 border-gray-300',
  };
}
