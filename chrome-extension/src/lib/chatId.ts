/**
 * Validación de chat_id de WhatsApp para la UI del sidebar (React).
 *
 * OJO bundling: este archivo vive separado de `lib/whatsapp.ts` a propósito.
 * `lib/whatsapp.ts` lo importa SOLO `content.ts` (content script, sin
 * soporte de ES modules — ver el comentario en ese archivo); si un
 * componente del sidebar importara algo de `lib/whatsapp.ts`, Vite/Rollup
 * detecta el módulo como compartido entre el entry `content` y el entry
 * `sidebar` y lo extrae a un chunk separado (`whatsapp.js`) cargado con
 * `import` — eso rompe `content.js` en tiempo de ejecución, porque un
 * content script declarado sin `"type": "module"` en el manifest no puede
 * ejecutar `import`. Mantener esta función acá evita que `lib/whatsapp.ts`
 * quede alcanzable desde el bundle del sidebar.
 */

/**
 * Determina si un chatId es un identificador REAL de WhatsApp — un LID
 * ("<dígitos>@lid") o los dígitos de un teléfono — apto para viajar como
 * `chat_id` a la API y persistirse en `whatsapp_chat_id`.
 *
 * `WhatsAppContact.chatId` cae a `username` cuando todavía no hay LID ni
 * teléfono disponibles (ver extractContactInfo en lib/whatsapp.ts), y ese
 * valor de relleno es válido para keying interno de UI (re-búsqueda, `key`
 * de React), pero JAMÁS debe mandarse como chat_id: si un lead se crea con
 * whatsapp_chat_id = "<username>" y más tarde WhatsApp expone el LID real,
 * el dedup por chat_id no matchea ese valor viejo y se crea un duplicado.
 */
export function esChatIdReal(chatId: string | null | undefined): boolean {
  if (!chatId) return false;
  return /^\d+@lid$/.test(chatId) || /^\d+$/.test(chatId);
}
