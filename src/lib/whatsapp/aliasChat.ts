/**
 * Apertura del chat de WhatsApp de un contacto que solo tiene alias.
 *
 * `wa.me` acepta únicamente números en formato internacional, y de un contacto
 * que escribió por username WhatsApp NO expone el teléfono: no existe deep
 * link posible para ese chat. El puente es la extensión AmersurChat, que corre
 * como content script dentro de web.whatsapp.com: el CRM abre WhatsApp Web con
 * el alias en el hash y la extensión lo busca y abre el chat.
 *
 * Sin la extensión instalada el link sigue siendo útil — abre WhatsApp Web — y
 * el alias queda a la vista en el CRM para buscarlo a mano.
 *
 * El nombre del parámetro debe coincidir con `PARAM_CHAT` en
 * chrome-extension/src/content.ts.
 */
const PARAM_CHAT = 'amersur-chat';

/**
 * Nombre de ventana para que todos los clicks caigan SIEMPRE en la misma
 * pestaña de WhatsApp Web, en vez de abrir una nueva por cliente. En la
 * pestaña ya abierta el navegador solo cambia el hash — sin recarga — y la
 * extensión reacciona por `hashchange`.
 */
export const WHATSAPP_WEB_TARGET = 'amersur-whatsapp-web';

export function construirUrlChatPorAlias(alias: string): string {
  const limpio = alias.replace(/^@/, '').trim();
  return `https://web.whatsapp.com/#${PARAM_CHAT}=${encodeURIComponent(limpio)}`;
}
