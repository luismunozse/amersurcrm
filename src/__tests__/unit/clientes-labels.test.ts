import { describe, it, expect } from 'vitest';
import {
  getEstadoClienteLabel,
  getEstadoClienteColor,
  ESTADOS_CLIENTE_OPTIONS,
  type EstadoCliente,
} from '@/lib/types/clientes';

const TODOS_LOS_ESTADOS: EstadoCliente[] = [
  'por_contactar',
  'contactado',
  'transferido',
  'intermedio',
  'desestimado',
  'potencial',
];

describe('getEstadoClienteLabel', () => {
  it.each([
    ['por_contactar', 'Por Contactar'],
    ['contactado', 'Contactado'],
    ['transferido', 'Transferido'],
    ['intermedio', 'Intermedio'],
    ['potencial', 'Potencial'],
    ['desestimado', 'Desestimado'],
  ] as [EstadoCliente, string][])('mapea "%s" a "%s"', (estado, expected) => {
    expect(getEstadoClienteLabel(estado)).toBe(expected);
  });

  it('todos los EstadoCliente tienen label definido (no caen al default)', () => {
    for (const estado of TODOS_LOS_ESTADOS) {
      const label = getEstadoClienteLabel(estado);
      expect(label).not.toBe(estado); // No debe retornar el valor crudo
      expect(label.length).toBeGreaterThan(0);
    }
  });
});

describe('getEstadoClienteColor', () => {
  it('todos los EstadoCliente tienen color definido', () => {
    for (const estado of TODOS_LOS_ESTADOS) {
      const color = getEstadoClienteColor(estado);
      expect(color).toBeTruthy();
      expect(color).not.toBe('');
    }
  });
});

describe('ESTADOS_CLIENTE_OPTIONS', () => {
  it('cubre todos los valores de EstadoCliente', () => {
    const valoresEnOptions = ESTADOS_CLIENTE_OPTIONS.map(o => o.value);
    for (const estado of TODOS_LOS_ESTADOS) {
      expect(valoresEnOptions).toContain(estado);
    }
  });

  it('cada opcion tiene label y color', () => {
    for (const opt of ESTADOS_CLIENTE_OPTIONS) {
      expect(opt.label).toBeTruthy();
      expect(opt.color).toBeTruthy();
    }
  });
});
