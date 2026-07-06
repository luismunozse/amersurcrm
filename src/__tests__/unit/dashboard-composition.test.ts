import { describe, it, expect } from 'vitest';
import { resolveComposition } from '@/lib/dashboard/composition';
import type { RolNombre } from '@/lib/permissions/types';

describe('resolveComposition', () => {
  it('resuelve ROL_VENDEDOR a "cockpit"', () => {
    expect(resolveComposition('ROL_VENDEDOR')).toBe('cockpit');
  });

  it.each(['ROL_ADMIN', 'ROL_GERENTE', 'ROL_COORDINADOR_VENTAS'] as RolNombre[])(
    'resuelve %s a "command-center"',
    (rol) => {
      expect(resolveComposition(rol)).toBe('command-center');
    },
  );
});
