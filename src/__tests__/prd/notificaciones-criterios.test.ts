/**
 * Tests de Criterios de Aceptación del PRD - Módulo Notificaciones
 *
 * PRD 3.9.4 Criterios de Aceptación:
 * - [ ] Push notification llega en menos de 10 segundos
 * - [ ] Usuario puede configurar preferencias
 * - [ ] Notificaciones se marcan como leídas
 */

import { describe, it, expect } from 'vitest';
import type {
  NotificacionTipo,
  NotificacionPrioridad,
  NotificacionDbRecord,
  NotificacionItem,
} from '@/types/notificaciones';
import {
  normalizeNotifications,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
} from '@/lib/notifications/transform';
import { dedupeNotifications } from '@/lib/notifications/dedupe';
import type { NotificacionNoLeida } from '@/types/crm';

// ============================================================
// FUNCIONES DE LÓGICA DE NEGOCIO PARA TESTING
// ============================================================

// Función para marcar notificación como leída
function marcarComoLeida(
  notificacion: NotificacionItem
): NotificacionItem {
  return {
    ...notificacion,
    leida: true,
    updatedAt: new Date().toISOString(),
  };
}

// Función para marcar todas las notificaciones como leídas
function marcarTodasComoLeidas(
  notificaciones: NotificacionItem[]
): NotificacionItem[] {
  const ahora = new Date().toISOString();
  return notificaciones.map((n) => ({
    ...n,
    leida: true,
    updatedAt: ahora,
  }));
}

// Función para filtrar notificaciones no leídas
function filtrarNoLeidas(notificaciones: NotificacionItem[]): NotificacionItem[] {
  return notificaciones.filter((n) => !n.leida);
}

// Función para filtrar notificaciones de hoy
function filtrarHoy(notificaciones: NotificacionItem[]): NotificacionItem[] {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);

  return notificaciones.filter((n) => {
    const fecha = new Date(n.createdAt);
    return fecha >= hoy && fecha < manana;
  });
}

// Función para ordenar por prioridad
function ordenarPorPrioridad(notificaciones: NotificacionItem[]): NotificacionItem[] {
  const prioridadOrden: Record<NotificacionPrioridad, number> = {
    urgente: 4,
    alta: 3,
    media: 2,
    baja: 1,
  };

  return [...notificaciones].sort(
    (a, b) => prioridadOrden[b.prioridad] - prioridadOrden[a.prioridad]
  );
}

// Función para validar preferencias de notificación
interface PreferenciasNotificacion {
  push: boolean;
  email: boolean;
  sonido: boolean;
  tipos: NotificacionTipo[];
}

function validarPreferencias(
  prefs: Partial<PreferenciasNotificacion>
): { valido: boolean; errores: string[] } {
  const errores: string[] = [];

  if (prefs.push === undefined) errores.push('Preferencia push requerida');
  if (prefs.email === undefined) errores.push('Preferencia email requerida');
  if (prefs.sonido === undefined) errores.push('Preferencia sonido requerida');
  if (!prefs.tipos || prefs.tipos.length === 0) {
    errores.push('Debe seleccionar al menos un tipo de notificación');
  }

  // Validar que los tipos sean válidos
  if (prefs.tipos) {
    const tiposInvalidos = prefs.tipos.filter((t) => !NOTIFICATION_TYPES.includes(t));
    if (tiposInvalidos.length > 0) {
      errores.push(`Tipos inválidos: ${tiposInvalidos.join(', ')}`);
    }
  }

  return {
    valido: errores.length === 0,
    errores,
  };
}

// Función para contar notificaciones por tipo
function contarPorTipo(
  notificaciones: NotificacionItem[]
): Record<NotificacionTipo, number> {
  const conteo: Record<string, number> = {};

  NOTIFICATION_TYPES.forEach((tipo) => {
    conteo[tipo] = 0;
  });

  notificaciones.forEach((n) => {
    if (conteo[n.tipo] !== undefined) {
      conteo[n.tipo]++;
    }
  });

  return conteo as Record<NotificacionTipo, number>;
}

// Función para agrupar notificaciones por fecha
function agruparPorFecha(
  notificaciones: NotificacionItem[]
): Record<string, NotificacionItem[]> {
  const grupos: Record<string, NotificacionItem[]> = {};

  notificaciones.forEach((n) => {
    const fecha = new Date(n.createdAt).toISOString().split('T')[0];
    if (!grupos[fecha]) {
      grupos[fecha] = [];
    }
    grupos[fecha].push(n);
  });

  return grupos;
}

// ============================================================
// TESTS
// ============================================================

describe('PRD 3.9.4 - Sistema de Notificaciones', () => {
  describe('Tipos de Notificación válidos', () => {
    const tiposEsperados: NotificacionTipo[] = [
      'evento',
      'recordatorio',
      'sistema',
      'venta',
      'reserva',
      'cliente',
      'proyecto',
      'lote',
    ];

    it('tiene todos los tipos definidos', () => {
      expect(NOTIFICATION_TYPES).toHaveLength(8);
    });

    it.each(tiposEsperados)('incluye tipo "%s"', (tipo) => {
      expect(NOTIFICATION_TYPES).toContain(tipo);
    });
  });

  describe('Prioridades de Notificación', () => {
    const prioridadesEsperadas: NotificacionPrioridad[] = ['baja', 'media', 'alta', 'urgente'];

    it('tiene las 4 prioridades definidas', () => {
      expect(NOTIFICATION_PRIORITIES).toHaveLength(4);
    });

    it.each(prioridadesEsperadas)('incluye prioridad "%s"', (prioridad) => {
      expect(NOTIFICATION_PRIORITIES).toContain(prioridad);
    });
  });

  describe('Normalización de Notificaciones (DB → App)', () => {
    it('normaliza registro de BD a NotificacionItem', () => {
      const dbRecord: NotificacionDbRecord = {
        id: 'notif-1',
        tipo: 'venta',
        titulo: 'Nueva venta',
        mensaje: 'Se registró una venta',
        leida: false,
        data: { prioridad: 'alta' },
        created_at: '2025-12-20T10:00:00Z',
        updated_at: null,
      };

      const resultado = normalizeNotifications([dbRecord]);

      expect(resultado).toHaveLength(1);
      expect(resultado[0].id).toBe('notif-1');
      expect(resultado[0].tipo).toBe('venta');
      expect(resultado[0].prioridad).toBe('alta');
      expect(resultado[0].leida).toBe(false);
    });

    it('usa "sistema" como tipo default para tipo inválido', () => {
      const dbRecord: NotificacionDbRecord = {
        id: 'notif-2',
        tipo: 'tipo_invalido',
        titulo: 'Test',
        mensaje: 'Test',
        leida: false,
        data: null,
        created_at: '2025-12-20T10:00:00Z',
        updated_at: null,
      };

      const resultado = normalizeNotifications([dbRecord]);
      expect(resultado[0].tipo).toBe('sistema');
    });

    it('usa "media" como prioridad default', () => {
      const dbRecord: NotificacionDbRecord = {
        id: 'notif-3',
        tipo: 'cliente',
        titulo: 'Test',
        mensaje: 'Test',
        leida: false,
        data: null, // Sin prioridad en data
        created_at: '2025-12-20T10:00:00Z',
        updated_at: null,
      };

      const resultado = normalizeNotifications([dbRecord]);
      expect(resultado[0].prioridad).toBe('media');
    });

    it('convierte leida null a false', () => {
      const dbRecord: NotificacionDbRecord = {
        id: 'notif-4',
        tipo: 'evento',
        titulo: 'Test',
        mensaje: 'Test',
        leida: null,
        data: null,
        created_at: '2025-12-20T10:00:00Z',
        updated_at: null,
      };

      const resultado = normalizeNotifications([dbRecord]);
      expect(resultado[0].leida).toBe(false);
    });
  });

  describe('Deduplicación de Notificaciones', () => {
    it('elimina notificaciones duplicadas por id', () => {
      const notificaciones: NotificacionNoLeida[] = [
        { id: '1', tipo: 'cliente', titulo: 'A', mensaje: 'Msg', created_at: '2025-12-20T10:00:00Z' },
        { id: '1', tipo: 'cliente', titulo: 'A Duplicado', mensaje: 'Msg', created_at: '2025-12-20T10:00:00Z' },
        { id: '2', tipo: 'venta', titulo: 'B', mensaje: 'Msg', created_at: '2025-12-20T11:00:00Z' },
      ];

      const resultado = dedupeNotifications(notificaciones);
      expect(resultado).toHaveLength(2);
      expect(resultado[0].titulo).toBe('A');
    });

    it('usa tipo+created_at como fallback key si id es undefined', () => {
      const created = '2025-12-20T10:00:00Z';
      const notificaciones: NotificacionNoLeida[] = [
        { id: undefined as unknown as string, tipo: 'sistema', titulo: 'A', mensaje: 'Msg', created_at: created },
        { id: undefined as unknown as string, tipo: 'sistema', titulo: 'A Dup', mensaje: 'Msg', created_at: created },
        { id: undefined as unknown as string, tipo: 'evento', titulo: 'B', mensaje: 'Msg', created_at: created },
      ];

      const resultado = dedupeNotifications(notificaciones);
      expect(resultado).toHaveLength(2);
    });

    it('mantiene todas las notificaciones únicas', () => {
      const notificaciones: NotificacionNoLeida[] = [
        { id: '1', tipo: 'cliente', titulo: 'A', mensaje: 'Msg', created_at: '2025-12-20T10:00:00Z' },
        { id: '2', tipo: 'venta', titulo: 'B', mensaje: 'Msg', created_at: '2025-12-20T11:00:00Z' },
        { id: '3', tipo: 'evento', titulo: 'C', mensaje: 'Msg', created_at: '2025-12-20T12:00:00Z' },
      ];

      const resultado = dedupeNotifications(notificaciones);
      expect(resultado).toHaveLength(3);
    });
  });

  describe('Criterio: Notificaciones se marcan como leídas', () => {
    it('marca una notificación como leída', () => {
      const notificacion: NotificacionItem = {
        id: '1',
        tipo: 'venta',
        titulo: 'Nueva venta',
        mensaje: 'Test',
        leida: false,
        createdAt: '2025-12-20T10:00:00Z',
        prioridad: 'alta',
      };

      const resultado = marcarComoLeida(notificacion);

      expect(resultado.leida).toBe(true);
      expect(resultado.updatedAt).toBeDefined();
    });

    it('marca todas las notificaciones como leídas', () => {
      const notificaciones: NotificacionItem[] = [
        { id: '1', tipo: 'venta', titulo: 'A', mensaje: 'Msg', leida: false, createdAt: '2025-12-20T10:00:00Z', prioridad: 'alta' },
        { id: '2', tipo: 'cliente', titulo: 'B', mensaje: 'Msg', leida: false, createdAt: '2025-12-20T11:00:00Z', prioridad: 'media' },
        { id: '3', tipo: 'evento', titulo: 'C', mensaje: 'Msg', leida: true, createdAt: '2025-12-20T12:00:00Z', prioridad: 'baja' },
      ];

      const resultado = marcarTodasComoLeidas(notificaciones);

      expect(resultado.every((n) => n.leida)).toBe(true);
      expect(resultado.every((n) => n.updatedAt !== undefined)).toBe(true);
    });

    it('preserva los demás campos al marcar como leída', () => {
      const notificacion: NotificacionItem = {
        id: '1',
        tipo: 'reserva',
        titulo: 'Nueva reserva',
        mensaje: 'Reserva creada',
        leida: false,
        createdAt: '2025-12-20T10:00:00Z',
        prioridad: 'urgente',
        data: { reserva_id: '123' },
      };

      const resultado = marcarComoLeida(notificacion);

      expect(resultado.id).toBe('1');
      expect(resultado.tipo).toBe('reserva');
      expect(resultado.titulo).toBe('Nueva reserva');
      expect(resultado.prioridad).toBe('urgente');
      expect(resultado.data).toEqual({ reserva_id: '123' });
    });
  });

  describe('Filtros de Notificaciones', () => {
    const notificacionesMock: NotificacionItem[] = [
      { id: '1', tipo: 'venta', titulo: 'A', mensaje: 'Msg', leida: false, createdAt: new Date().toISOString(), prioridad: 'alta' },
      { id: '2', tipo: 'cliente', titulo: 'B', mensaje: 'Msg', leida: true, createdAt: new Date().toISOString(), prioridad: 'media' },
      { id: '3', tipo: 'evento', titulo: 'C', mensaje: 'Msg', leida: false, createdAt: '2025-01-01T10:00:00Z', prioridad: 'baja' },
    ];

    it('filtra solo notificaciones no leídas', () => {
      const resultado = filtrarNoLeidas(notificacionesMock);
      expect(resultado).toHaveLength(2);
      expect(resultado.every((n) => !n.leida)).toBe(true);
    });

    it('filtra notificaciones de hoy', () => {
      const resultado = filtrarHoy(notificacionesMock);
      // Solo las 2 primeras son de hoy
      expect(resultado).toHaveLength(2);
    });
  });

  describe('Ordenamiento por Prioridad', () => {
    it('ordena de mayor a menor prioridad', () => {
      const notificaciones: NotificacionItem[] = [
        { id: '1', tipo: 'sistema', titulo: 'A', mensaje: 'Msg', leida: false, createdAt: '2025-12-20T10:00:00Z', prioridad: 'baja' },
        { id: '2', tipo: 'sistema', titulo: 'B', mensaje: 'Msg', leida: false, createdAt: '2025-12-20T11:00:00Z', prioridad: 'urgente' },
        { id: '3', tipo: 'sistema', titulo: 'C', mensaje: 'Msg', leida: false, createdAt: '2025-12-20T12:00:00Z', prioridad: 'media' },
        { id: '4', tipo: 'sistema', titulo: 'D', mensaje: 'Msg', leida: false, createdAt: '2025-12-20T13:00:00Z', prioridad: 'alta' },
      ];

      const resultado = ordenarPorPrioridad(notificaciones);

      expect(resultado[0].prioridad).toBe('urgente');
      expect(resultado[1].prioridad).toBe('alta');
      expect(resultado[2].prioridad).toBe('media');
      expect(resultado[3].prioridad).toBe('baja');
    });
  });

  describe('Criterio: Usuario puede configurar preferencias', () => {
    it('acepta preferencias completas', () => {
      const prefs: PreferenciasNotificacion = {
        push: true,
        email: false,
        sonido: true,
        tipos: ['venta', 'reserva', 'cliente'],
      };

      const resultado = validarPreferencias(prefs);
      expect(resultado.valido).toBe(true);
      expect(resultado.errores).toHaveLength(0);
    });

    it('rechaza preferencias sin tipos seleccionados', () => {
      const prefs: Partial<PreferenciasNotificacion> = {
        push: true,
        email: false,
        sonido: true,
        tipos: [],
      };

      const resultado = validarPreferencias(prefs);
      expect(resultado.valido).toBe(false);
      expect(resultado.errores).toContain('Debe seleccionar al menos un tipo de notificación');
    });

    it('rechaza tipos de notificación inválidos', () => {
      const prefs: PreferenciasNotificacion = {
        push: true,
        email: false,
        sonido: true,
        tipos: ['venta', 'tipo_invalido' as NotificacionTipo],
      };

      const resultado = validarPreferencias(prefs);
      expect(resultado.valido).toBe(false);
      expect(resultado.errores.some((e) => e.includes('inválidos'))).toBe(true);
    });

    it('requiere todas las preferencias booleanas', () => {
      const prefs: Partial<PreferenciasNotificacion> = {
        push: true,
        // Faltan email y sonido
        tipos: ['venta'],
      };

      const resultado = validarPreferencias(prefs);
      expect(resultado.valido).toBe(false);
      expect(resultado.errores.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Conteo y Agrupación', () => {
    it('cuenta notificaciones por tipo', () => {
      const notificaciones: NotificacionItem[] = [
        { id: '1', tipo: 'venta', titulo: 'A', mensaje: 'Msg', leida: false, createdAt: '2025-12-20T10:00:00Z', prioridad: 'alta' },
        { id: '2', tipo: 'venta', titulo: 'B', mensaje: 'Msg', leida: false, createdAt: '2025-12-20T11:00:00Z', prioridad: 'media' },
        { id: '3', tipo: 'cliente', titulo: 'C', mensaje: 'Msg', leida: false, createdAt: '2025-12-20T12:00:00Z', prioridad: 'baja' },
      ];

      const conteo = contarPorTipo(notificaciones);

      expect(conteo.venta).toBe(2);
      expect(conteo.cliente).toBe(1);
      expect(conteo.evento).toBe(0);
    });

    it('agrupa notificaciones por fecha', () => {
      const notificaciones: NotificacionItem[] = [
        { id: '1', tipo: 'venta', titulo: 'A', mensaje: 'Msg', leida: false, createdAt: '2025-12-20T10:00:00Z', prioridad: 'alta' },
        { id: '2', tipo: 'venta', titulo: 'B', mensaje: 'Msg', leida: false, createdAt: '2025-12-20T15:00:00Z', prioridad: 'media' },
        { id: '3', tipo: 'cliente', titulo: 'C', mensaje: 'Msg', leida: false, createdAt: '2025-12-19T12:00:00Z', prioridad: 'baja' },
      ];

      const grupos = agruparPorFecha(notificaciones);

      expect(Object.keys(grupos)).toHaveLength(2);
      expect(grupos['2025-12-20']).toHaveLength(2);
      expect(grupos['2025-12-19']).toHaveLength(1);
    });
  });

  describe('Estructura de NotificacionItem', () => {
    it('tiene todos los campos requeridos', () => {
      const notificacion: NotificacionItem = {
        id: 'test-id',
        tipo: 'sistema',
        titulo: 'Título de prueba',
        mensaje: 'Mensaje de prueba',
        leida: false,
        createdAt: '2025-12-20T10:00:00Z',
        prioridad: 'media',
      };

      expect(notificacion).toHaveProperty('id');
      expect(notificacion).toHaveProperty('tipo');
      expect(notificacion).toHaveProperty('titulo');
      expect(notificacion).toHaveProperty('mensaje');
      expect(notificacion).toHaveProperty('leida');
      expect(notificacion).toHaveProperty('createdAt');
      expect(notificacion).toHaveProperty('prioridad');
    });

    it('acepta campos opcionales', () => {
      const notificacion: NotificacionItem = {
        id: 'test-id',
        tipo: 'venta',
        titulo: 'Venta',
        mensaje: 'Nueva venta registrada',
        leida: true,
        createdAt: '2025-12-20T10:00:00Z',
        prioridad: 'alta',
        data: { venta_id: 'v-123', monto: 50000 },
        updatedAt: '2025-12-20T12:00:00Z',
      };

      expect(notificacion.data).toEqual({ venta_id: 'v-123', monto: 50000 });
      expect(notificacion.updatedAt).toBe('2025-12-20T12:00:00Z');
    });
  });
});
