import { describe, expect, it } from 'vitest';
import { parseNotasCliente } from '../ContactInfo';

/**
 * El mensaje que dejó el cliente se guarda dentro de `notas` mezclado con el
 * boilerplate del alta automática. ContactInfo lo separa para mostrarlo como
 * bloque propio y dejar en "Notas" sólo lo que escribió el asesor.
 */
const PREFIJO = 'Lead capturado automáticamente desde WhatsApp Web';

describe('parseNotasCliente', () => {
  it('separa el mensaje inicial del boilerplate', () => {
    const { mensajeInicial, notasAdicionales } = parseNotasCliente(
      `${PREFIJO}\n\nMensaje inicial: "Hola, quiero info del lote"`,
    );

    expect(mensajeInicial).toBe('Hola, quiero info del lote');
    expect(notasAdicionales).toBeNull();
  });

  it('conserva las notas que el asesor agregó después', () => {
    const { mensajeInicial, notasAdicionales } = parseNotasCliente(
      `${PREFIJO}\n\nMensaje inicial: "Quiero info"\n\n[12/08/2026] Pidió visita el sábado`,
    );

    expect(mensajeInicial).toBe('Quiero info');
    expect(notasAdicionales).toBe('[12/08/2026] Pidió visita el sábado');
  });

  it('soporta comillas dentro del mensaje del cliente', () => {
    const { mensajeInicial } = parseNotasCliente(
      `${PREFIJO}\n\nMensaje inicial: "Vi el aviso de "Villa Sol" en Facebook"`,
    );

    expect(mensajeInicial).toBe('Vi el aviso de "Villa Sol" en Facebook');
  });

  it('devuelve las notas tal cual si no hay bloque auto-capturado', () => {
    const { mensajeInicial, notasAdicionales } = parseNotasCliente('Cliente referido por Juan');

    expect(mensajeInicial).toBeNull();
    expect(notasAdicionales).toBe('Cliente referido por Juan');
  });

  it('tolera notas vacías', () => {
    expect(parseNotasCliente(null)).toEqual({ mensajeInicial: null, notasAdicionales: null });
    expect(parseNotasCliente('')).toEqual({ mensajeInicial: null, notasAdicionales: null });
  });

  it('no devuelve un mensaje inicial vacío', () => {
    const { mensajeInicial } = parseNotasCliente(`${PREFIJO}\n\nMensaje inicial: ""`);

    expect(mensajeInicial).toBeNull();
  });
});
