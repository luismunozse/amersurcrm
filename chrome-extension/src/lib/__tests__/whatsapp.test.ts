import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WhatsAppContact } from '@/types/crm';

const LID_A = '111111111111111@lid';
const LID_B = '222222222222222@lid';

/**
 * DOM tipo WhatsApp Web. Lo importante: el <header> del panel IZQUIERDO viene
 * ANTES en el documento que el de la conversación, que es lo que hacía que un
 * `'header'` pelado como primer selector resolviera al panel equivocado.
 */
function montarDom(tituloHeader: string, lidEnMain: string | null) {
  document.body.innerHTML = `
    <div id="app">
      <div id="side"><header><span dir="auto">Mis chats</span></header></div>
      <div id="main">
        <header><span dir="auto">${tituloHeader}</span></header>
        <div class="mensajes">
          ${lidEnMain ? `<div data-id="true_${lidEnMain}_ABC"></div>` : ''}
        </div>
        <footer><div contenteditable="true" role="textbox" data-tab="10"></div></footer>
      </div>
    </div>`;
}

function setTituloHeader(texto: string) {
  document.querySelector('#main header span')!.textContent = texto;
}

function setLidEnMain(lid: string) {
  document.querySelector('#main [data-id]')!.setAttribute('data-id', `true_${lid}_ABC`);
}

/** Deja correr los callbacks del MutationObserver (microtask en jsdom). */
const flush = () => new Promise((r) => setTimeout(r, 0));

/** El cache del LID vive a nivel de módulo: hay que recargarlo por test. */
async function cargarWhatsapp() {
  vi.resetModules();
  return import('@/lib/whatsapp');
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('extracción del contacto', () => {
  it('un contacto no agendado tiene name null, no el sentinel "Sin nombre"', async () => {
    const { extractContactInfo } = await cargarWhatsapp();
    montarDom('+51 987 654 321', null);

    const contacto = extractContactInfo();

    // El sentinel era truthy y ganaba a los fallbacks: los leads terminaban
    // creándose llamados literalmente "Sin nombre".
    expect(contacto?.name).toBeNull();
    expect(contacto?.phone).toBe('+51987654321');
  });

  it('lee el nombre guardado del header de la conversación', async () => {
    const { extractContactName } = await cargarWhatsapp();
    montarDom('María Quispe', null);

    expect(extractContactName()).toBe('María Quispe');
  });

  it('no confunde el header del panel izquierdo con el del contacto', async () => {
    const { extractContactName } = await cargarWhatsapp();
    montarDom('+51 987 654 321', null);

    // "Mis chats" vive en el <header> de #side, que aparece primero en el DOM.
    expect(extractContactName()).not.toBe('Mis chats');
    expect(extractContactName()).toBeNull();
  });

  it('extrae el username cuando WhatsApp oculta el teléfono', async () => {
    const { extractContactInfo } = await cargarWhatsapp();
    montarDom('@maria.quispe', null);

    const contacto = extractContactInfo();
    expect(contacto?.username).toBe('maria.quispe');
    expect(contacto?.phone).toBeNull();
    // Sin LID todavía, chatId cae al username para poder keyear la UI.
    expect(contacto?.chatId).toBe('maria.quispe');
  });
});

describe('observeChatChanges', () => {
  it('observa el header de la conversación, no el del panel izquierdo', async () => {
    const { observeChatChanges } = await cargarWhatsapp();
    montarDom('@usuario_a', LID_A);

    const observados: Node[] = [];
    const observeOriginal = MutationObserver.prototype.observe;
    const spy = vi
      .spyOn(MutationObserver.prototype, 'observe')
      .mockImplementation(function (this: MutationObserver, target: Node, opts?: MutationObserverInit) {
        observados.push(target);
        return observeOriginal.call(this, target, opts);
      });

    const stop = observeChatChanges(() => {});
    stop();
    spy.mockRestore();

    expect(observados).toContain(document.querySelector('#main header'));
    expect(observados).not.toContain(document.querySelector('#side header'));
  });

  it('NO entrega el LID del chat anterior cuando #main todavía no repintó', async () => {
    const { observeChatChanges, extractContactInfo } = await cargarWhatsapp();
    montarDom('@usuario_a', LID_A);

    const entregados: (WhatsAppContact | null)[] = [];
    const stop = observeChatChanges((contacto) => entregados.push(contacto));

    // Switch de chat: el header ya es el de B, pero #main sigue con los nodos
    // (y el LID) de A — la ventana exacta del stale read.
    setTituloHeader('@usuario_b');
    await flush();

    const entregado = entregados.at(-1);
    expect(entregado?.chatId).toBe('usuario_b');
    expect(entregado?.chatId).not.toBe(LID_A);

    // Y acá está el motivo por el que content.ts NO debe volver a extraer:
    // una segunda lectura en el mismo tick confirma el cache recién escrito y
    // devuelve el LID viejo. El contacto tiene que viajar por el callback.
    expect(extractContactInfo()?.chatId).toBe(LID_A);

    stop();
  });

  it('entrega el LID real una vez que #main repintó', async () => {
    const { observeChatChanges } = await cargarWhatsapp();
    montarDom('@usuario_a', LID_A);

    const entregados: (WhatsAppContact | null)[] = [];
    const stop = observeChatChanges((contacto) => entregados.push(contacto));

    setTituloHeader('@usuario_b');
    await flush();
    setLidEnMain(LID_B);          // #main termina de repintar
    setTituloHeader('@usuario_b '); // nueva mutación para disparar otra lectura
    await flush();
    setTituloHeader('@usuario_b');
    await flush();

    expect(entregados.at(-1)?.chatId).toBe(LID_B);
    stop();
  });

  it('deja de notificar tras el cleanup', async () => {
    const { observeChatChanges } = await cargarWhatsapp();
    montarDom('@usuario_a', LID_A);

    const entregados: unknown[] = [];
    const stop = observeChatChanges((c) => entregados.push(c));
    const cantidadInicial = entregados.length;
    stop();

    setTituloHeader('@usuario_b');
    await flush();

    expect(entregados).toHaveLength(cantidadInicial);
  });
});

describe('insertTextIntoWhatsApp', () => {
  it('devuelve false si el editor descartó el texto', async () => {
    const { insertTextIntoWhatsApp } = await cargarWhatsapp();
    montarDom('María Quispe', null);

    // El editor de WhatsApp es controlado: descarta la escritura directa.
    const input = document.querySelector('[contenteditable="true"]')!;
    Object.defineProperty(input, 'textContent', { get: () => '', set: () => {}, configurable: true });
    document.execCommand = () => false;

    // Antes devolvía true fijo y el sidebar cantaba éxito con el input vacío.
    expect(insertTextIntoWhatsApp('Hola, le escribo de Amersur')).toBe(false);
  });

  it('devuelve false si no encuentra el input', async () => {
    const { insertTextIntoWhatsApp } = await cargarWhatsapp();
    document.body.innerHTML = '<div id="app"></div>';

    expect(insertTextIntoWhatsApp('Hola')).toBe(false);
  });

  it('devuelve true cuando el texto sí quedó escrito', async () => {
    const { insertTextIntoWhatsApp } = await cargarWhatsapp();
    montarDom('María Quispe', null);

    const input = document.querySelector('[contenteditable="true"]') as HTMLElement;
    document.execCommand = (_cmd: string, _ui?: boolean, valor?: string) => {
      input.textContent = valor ?? '';
      return true;
    };

    expect(insertTextIntoWhatsApp('Hola, le escribo de Amersur')).toBe(true);
  });
});

describe('detectSharedPhone', () => {
  function montarConMensaje(texto: string, remitente = '+51 987 654 321') {
    montarDom(remitente, null);
    const cont = document.querySelector('#main .mensajes')!;
    cont.innerHTML = `
      <div data-pre-plain-text="[10:05, 12/8/2026] ${remitente}: ">
        <span class="selectable-text">${texto}</span>
      </div>`;
  }

  it('detecta un celular peruano de 9 dígitos y le antepone +51', async () => {
    const { detectSharedPhone } = await cargarWhatsapp();
    montarConMensaje('Mi otro numero es 987123456, escribame ahi');

    expect(detectSharedPhone()?.phone).toBe('+51987123456');
  });

  it('detecta el número aunque venga seguido de una coma', async () => {
    const { detectSharedPhone } = await cargarWhatsapp();
    // Una coma de puntuación normal descartaba la detección: el filtro de
    // "separador de miles" miraba cualquier coma en la ventana de contexto.
    montarConMensaje('Anote 987123456, por favor');

    expect(detectSharedPhone()?.phone).toBe('+51987123456');
  });

  it('ignora montos con símbolo de moneda', async () => {
    const { detectSharedPhone } = await cargarWhatsapp();
    montarConMensaje('El lote sale S/ 85000000 al contado');

    expect(detectSharedPhone()).toBeNull();
  });

  it('ignora montos con separador de miles', async () => {
    const { detectSharedPhone } = await cargarWhatsapp();
    montarConMensaje('Quedamos en 12,500,000 por el terreno');

    expect(detectSharedPhone()).toBeNull();
  });

  it('ignora un DNI de 8 dígitos', async () => {
    const { detectSharedPhone } = await cargarWhatsapp();
    montarConMensaje('Mi dni es 45678912');

    expect(detectSharedPhone()).toBeNull();
  });

  it('no mira los mensajes que mandó el vendedor', async () => {
    const { detectSharedPhone } = await cargarWhatsapp();
    montarDom('+51 987 654 321', null);
    document.querySelector('#main .mensajes')!.innerHTML = `
      <div data-pre-plain-text="[10:06, 12/8/2026] Vendedor Amersur: ">
        <span class="selectable-text">Mi numero es 987123456</span>
      </div>`;

    expect(detectSharedPhone()).toBeNull();
  });
});
