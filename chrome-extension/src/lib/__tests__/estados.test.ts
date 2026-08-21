import { describe, expect, it } from 'vitest';
import {
  ESTADOS_CLIENTE,
  ESTADOS_EDITABLES,
  HUE_POR_ESTADO,
  esEstadoEditable,
  estadoMeta,
} from '@/lib/estados';

/**
 * Estos dos arrays son copias de fuentes que viven en el CRM. Si allá cambian
 * y acá no, el sidebar vuelve a romperse en silencio (badge vacío) o a ofrecer
 * un estado que el backend rechaza con 400.
 */
// src/lib/types/clientes.ts -> ESTADOS_CLIENTE_OPTIONS
const CATALOGO_CRM = [
  'por_contactar', 'contactado', 'intermedio', 'potencial',
  'en_proceso', 'propietario', 'desestimado', 'transferido',
];
// src/app/api/clientes/[id]/estado/route.ts -> estadosValidos
const ALLOWLIST_BACKEND = [
  'por_contactar', 'contactado', 'intermedio', 'potencial', 'desestimado', 'transferido',
];

describe('catálogo de estados', () => {
  it('muestra los 8 estados del CRM, en el mismo orden', () => {
    expect(ESTADOS_CLIENTE.map((e) => e.value)).toEqual(CATALOGO_CRM);
  });

  it('ofrece como editables sólo los que acepta el endpoint de estado', () => {
    expect(ESTADOS_EDITABLES.map((e) => e.value)).toEqual(ALLOWLIST_BACKEND);
  });

  it('en_proceso y propietario se muestran pero no se pueden setear', () => {
    for (const value of ['en_proceso', 'propietario']) {
      const meta = estadoMeta(value);
      expect(meta.label).not.toBe('Sin estado');
      expect(meta.icon).toBeTruthy();
      expect(meta.panel).toBeTruthy();
      expect(esEstadoEditable(value)).toBe(false);
    }
  });

  it('cada estado trae label, ícono y clases completas', () => {
    for (const e of ESTADOS_CLIENTE) {
      expect(e.label, e.value).toBeTruthy();
      expect(e.icon, e.value).toBeTruthy();
      expect(e.chip, e.value).toMatch(/^bg-\S+ text-\S+$/);
      expect(e.panel, e.value).toMatch(/^bg-\S+ text-\S+ border-\S+$/);
    }
  });

  it('usa el mismo hue que el campo color del CRM', () => {
    for (const e of ESTADOS_CLIENTE) {
      const hue = HUE_POR_ESTADO[e.value];
      expect(e.chip, `${e.value} debería ser ${hue}`).toBe(`bg-${hue}-100 text-${hue}-800`);
      expect(e.panel, `${e.value} debería ser ${hue}`).toBe(`bg-${hue}-100 text-${hue}-800 border-${hue}-300`);
    }
  });
});

describe('estadoMeta', () => {
  it('nunca devuelve undefined para un estado desconocido', () => {
    const meta = estadoMeta('estado_que_no_existe_todavia');
    expect(meta.panel).toBeTruthy();
    expect(meta.icon).toBeTruthy();
    // El valor crudo se muestra: es preferible a un badge vacío.
    expect(meta.label).toBe('estado_que_no_existe_todavia');
  });

  it('tolera null y undefined', () => {
    expect(estadoMeta(null).label).toBe('Sin estado');
    expect(estadoMeta(undefined).label).toBe('Sin estado');
    expect(estadoMeta(null).panel).toBeTruthy();
  });

  it('un estado desconocido no es editable', () => {
    expect(esEstadoEditable('estado_que_no_existe_todavia')).toBe(false);
    expect(esEstadoEditable(null)).toBe(false);
  });
});
