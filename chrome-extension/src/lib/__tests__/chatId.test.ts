import { describe, expect, it } from 'vitest';
import { esChatIdReal } from '@/lib/chatId';

/**
 * Guarda contra el duplicado de leads: si un username se persiste como
 * whatsapp_chat_id y más tarde WhatsApp expone el LID real, el dedup por
 * chat_id no matchea el valor viejo y se crea un cliente repetido.
 */
describe('esChatIdReal', () => {
  it('acepta un LID', () => {
    expect(esChatIdReal('123456789012345@lid')).toBe(true);
  });

  it('acepta los dígitos de un teléfono', () => {
    expect(esChatIdReal('51987654321')).toBe(true);
  });

  it('rechaza un username usado como relleno', () => {
    expect(esChatIdReal('maria.quispe')).toBe(false);
    expect(esChatIdReal('usuario_123')).toBe(false);
  });

  it('rechaza el sentinel y los vacíos', () => {
    expect(esChatIdReal('unknown')).toBe(false);
    expect(esChatIdReal('')).toBe(false);
    expect(esChatIdReal(null)).toBe(false);
    expect(esChatIdReal(undefined)).toBe(false);
  });

  it('rechaza formas casi válidas', () => {
    expect(esChatIdReal('abc@lid')).toBe(false);
    expect(esChatIdReal('123@lid extra')).toBe(false);
    expect(esChatIdReal('+51987654321')).toBe(false); // con "+" no son sólo dígitos
    expect(esChatIdReal('123@c.us')).toBe(false);
  });
});
