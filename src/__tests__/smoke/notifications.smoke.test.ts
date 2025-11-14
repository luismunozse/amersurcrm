import { describe, expect, it } from '@jest/globals';
import type { NotificacionNoLeida } from '@/types/crm';
import { dedupeNotifications } from '@/lib/notifications/dedupe';

describe('Notifications smoke utilities', () => {
  it('deduplica notificaciones con el mismo id', () => {
    const duplicated: NotificacionNoLeida[] = [
      { id: '1', tipo: 'cliente', titulo: 'Nuevo lead', mensaje: 'Juan', created_at: new Date().toISOString() },
      { id: '1', tipo: 'cliente', titulo: 'Duplicado', mensaje: 'Juan', created_at: new Date().toISOString() },
      { id: '2', tipo: 'sistema', titulo: 'Sync', mensaje: 'OK', created_at: new Date().toISOString() },
    ];

    const result = dedupeNotifications(duplicated);

    expect(result).toHaveLength(2);
    expect(result.map((n) => n.id)).toEqual(['1', '2']);
  });

  it('usa fallback tipo+fecha cuando falta id', () => {
    const created = new Date().toISOString();
    const duplicated: NotificacionNoLeida[] = [
      { id: undefined as unknown as string, tipo: 'sistema', titulo: 'Ping', mensaje: 'Ready', created_at: created },
      { id: undefined as unknown as string, tipo: 'sistema', titulo: 'Ping duplicado', mensaje: 'Ready', created_at: created },
      { id: undefined as unknown as string, tipo: 'cliente', titulo: 'Otra', mensaje: 'Hola', created_at: created },
    ];

    const result = dedupeNotifications(duplicated);

    expect(result).toHaveLength(2);
    expect(result[0].titulo).toBe('Ping');
  });
});
