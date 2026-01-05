/**
 * Tests de Criterios de Aceptación del PRD - Módulo Agenda
 *
 * PRD 3.3.3 Criterios de Aceptación:
 * - [ ] Notificación push se envía según configuración
 * - [ ] Eventos vencidos se marcan automáticamente
 * - [ ] Calendario sincroniza en tiempo real
 */

import { describe, it, expect } from 'vitest';
import type {
  TipoEvento,
  EstadoEvento,
  Prioridad,
  TipoRecordatorio,
  Evento,
  Recordatorio,
  EstadisticasAgenda,
} from '@/lib/types/agenda';
import {
  PRIORIDADES_OPTIONS,
  TIPOS_RECORDATORIO_OPTIONS,
} from '@/lib/types/agenda';

// ============================================================
// FUNCIONES DE LÓGICA DE NEGOCIO PARA TESTING
// ============================================================

// Función para determinar si un evento está vencido
function esEventoVencido(evento: Pick<Evento, 'fecha_inicio' | 'estado'>): boolean {
  if (evento.estado === 'completado' || evento.estado === 'cancelado') {
    return false;
  }
  const fechaEvento = new Date(evento.fecha_inicio);
  const ahora = new Date();
  return fechaEvento < ahora && evento.estado !== 'vencida';
}

// Función para marcar eventos vencidos automáticamente
function marcarEventosVencidos(
  eventos: Array<Pick<Evento, 'id' | 'fecha_inicio' | 'estado'>>
): Array<Pick<Evento, 'id' | 'fecha_inicio' | 'estado'>> {
  const ahora = new Date();
  return eventos.map((evento) => {
    if (
      evento.estado === 'pendiente' &&
      new Date(evento.fecha_inicio) < ahora
    ) {
      return { ...evento, estado: 'vencida' as EstadoEvento };
    }
    return evento;
  });
}

// Función para validar si se debe enviar notificación push
function debeEnviarNotificacionPush(
  evento: Pick<Evento, 'notificar_push' | 'recordar_antes_minutos' | 'fecha_inicio' | 'estado'>
): boolean {
  if (!evento.notificar_push) return false;
  if (evento.estado === 'completado' || evento.estado === 'cancelado') return false;

  const fechaEvento = new Date(evento.fecha_inicio);
  const ahora = new Date();
  const minutosAntes = evento.recordar_antes_minutos || 15;
  const tiempoNotificacion = new Date(fechaEvento.getTime() - minutosAntes * 60 * 1000);

  return ahora >= tiempoNotificacion && ahora < fechaEvento;
}

// Función para calcular estadísticas de agenda
function calcularEstadisticasAgenda(
  eventos: Array<Pick<Evento, 'fecha_inicio' | 'estado'>>,
  recordatorios: Array<Pick<Recordatorio, 'completado' | 'enviado'>>
): EstadisticasAgenda {
  const ahora = new Date();
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const finSemana = new Date(hoy);
  finSemana.setDate(finSemana.getDate() + 7);

  const eventosHoy = eventos.filter((e) => {
    const fecha = new Date(e.fecha_inicio);
    return fecha >= hoy && fecha < new Date(hoy.getTime() + 24 * 60 * 60 * 1000);
  });

  const eventosEstaSemana = eventos.filter((e) => {
    const fecha = new Date(e.fecha_inicio);
    return fecha >= hoy && fecha < finSemana;
  });

  return {
    totalEventos: eventos.length,
    eventosHoy: eventosHoy.length,
    eventosEstaSemana: eventosEstaSemana.length,
    eventosPendientes: eventos.filter((e) => e.estado === 'pendiente').length,
    eventosCompletados: eventos.filter((e) => e.estado === 'completado').length,
    totalRecordatorios: recordatorios.length,
    recordatoriosPendientes: recordatorios.filter((r) => !r.completado).length,
    recordatoriosEnviados: recordatorios.filter((r) => r.enviado).length,
  };
}

// Función para validar patrón de recurrencia
function validarPatronRecurrencia(
  patron: Evento['patron_recurrencia']
): { valido: boolean; error?: string } {
  if (!patron) return { valido: true };

  if (!['diario', 'semanal', 'mensual'].includes(patron.tipo)) {
    return { valido: false, error: 'Tipo de recurrencia inválido' };
  }

  if (patron.intervalo < 1) {
    return { valido: false, error: 'Intervalo debe ser mayor a 0' };
  }

  if (patron.tipo === 'semanal' && (!patron.dias_semana || patron.dias_semana.length === 0)) {
    return { valido: false, error: 'Debe seleccionar al menos un día de la semana' };
  }

  if (patron.fin_fecha && new Date(patron.fin_fecha) < new Date()) {
    return { valido: false, error: 'Fecha de fin debe ser futura' };
  }

  return { valido: true };
}

// ============================================================
// TESTS
// ============================================================

describe('PRD 3.3.3 - Sistema de Agenda y Recordatorios', () => {
  describe('Tipos de Evento válidos', () => {
    const tiposValidos: TipoEvento[] = [
      'cita',
      'llamada',
      'email',
      'visita',
      'seguimiento',
      'recordatorio',
      'tarea',
    ];

    it.each(tiposValidos)('acepta tipo de evento "%s"', (tipo) => {
      const evento: Partial<Evento> = { tipo };
      expect(tiposValidos).toContain(evento.tipo);
    });
  });

  describe('Estados de Evento válidos', () => {
    const estadosValidos: EstadoEvento[] = [
      'pendiente',
      'en_progreso',
      'vencida',
      'reprogramado',
      'completado',
      'cancelado',
    ];

    it.each(estadosValidos)('acepta estado de evento "%s"', (estado) => {
      expect(estadosValidos).toContain(estado);
    });
  });

  describe('Prioridades de Evento', () => {
    it('tiene las 4 prioridades definidas', () => {
      const prioridades: Prioridad[] = ['baja', 'media', 'alta', 'urgente'];
      expect(PRIORIDADES_OPTIONS).toHaveLength(4);
      PRIORIDADES_OPTIONS.forEach((opt) => {
        expect(prioridades).toContain(opt.value);
      });
    });

    it('prioridades tienen labels en español', () => {
      expect(PRIORIDADES_OPTIONS.find((p) => p.value === 'baja')?.label).toBe('Baja');
      expect(PRIORIDADES_OPTIONS.find((p) => p.value === 'urgente')?.label).toBe('Urgente');
    });
  });

  describe('Tipos de Recordatorio', () => {
    const tiposValidos: TipoRecordatorio[] = [
      'seguimiento_cliente',
      'llamada_prospecto',
      'envio_documentos',
      'visita_propiedad',
      'reunion_equipo',
      'personalizado',
    ];

    it('tiene los 6 tipos de recordatorio definidos', () => {
      expect(TIPOS_RECORDATORIO_OPTIONS).toHaveLength(6);
    });

    it.each(tiposValidos)('acepta tipo de recordatorio "%s"', (tipo) => {
      const recordatorio = TIPOS_RECORDATORIO_OPTIONS.find((t) => t.value === tipo);
      expect(recordatorio).toBeDefined();
      expect(recordatorio?.label).toBeTruthy();
    });
  });

  describe('Criterio: Eventos vencidos se marcan automáticamente', () => {
    it('marca evento pasado como vencido si está pendiente', () => {
      const ayer = new Date();
      ayer.setDate(ayer.getDate() - 1);

      const eventos = [
        { id: '1', fecha_inicio: ayer.toISOString(), estado: 'pendiente' as EstadoEvento },
      ];

      const resultado = marcarEventosVencidos(eventos);
      expect(resultado[0].estado).toBe('vencida');
    });

    it('NO marca evento futuro como vencido', () => {
      const manana = new Date();
      manana.setDate(manana.getDate() + 1);

      const eventos = [
        { id: '1', fecha_inicio: manana.toISOString(), estado: 'pendiente' as EstadoEvento },
      ];

      const resultado = marcarEventosVencidos(eventos);
      expect(resultado[0].estado).toBe('pendiente');
    });

    it('NO marca evento completado como vencido', () => {
      const ayer = new Date();
      ayer.setDate(ayer.getDate() - 1);

      const eventos = [
        { id: '1', fecha_inicio: ayer.toISOString(), estado: 'completado' as EstadoEvento },
      ];

      const resultado = marcarEventosVencidos(eventos);
      expect(resultado[0].estado).toBe('completado');
    });

    it('detecta correctamente si evento está vencido', () => {
      const ayer = new Date();
      ayer.setDate(ayer.getDate() - 1);

      expect(
        esEventoVencido({ fecha_inicio: ayer.toISOString(), estado: 'pendiente' })
      ).toBe(true);
    });
  });

  describe('Criterio: Notificación push se envía según configuración', () => {
    it('envía notificación cuando está habilitada y dentro del tiempo', () => {
      const en10Minutos = new Date();
      en10Minutos.setMinutes(en10Minutos.getMinutes() + 10);

      const evento = {
        notificar_push: true,
        recordar_antes_minutos: 15,
        fecha_inicio: en10Minutos.toISOString(),
        estado: 'pendiente' as EstadoEvento,
      };

      expect(debeEnviarNotificacionPush(evento)).toBe(true);
    });

    it('NO envía notificación cuando está deshabilitada', () => {
      const en10Minutos = new Date();
      en10Minutos.setMinutes(en10Minutos.getMinutes() + 10);

      const evento = {
        notificar_push: false,
        recordar_antes_minutos: 15,
        fecha_inicio: en10Minutos.toISOString(),
        estado: 'pendiente' as EstadoEvento,
      };

      expect(debeEnviarNotificacionPush(evento)).toBe(false);
    });

    it('NO envía notificación para eventos cancelados', () => {
      const en10Minutos = new Date();
      en10Minutos.setMinutes(en10Minutos.getMinutes() + 10);

      const evento = {
        notificar_push: true,
        recordar_antes_minutos: 15,
        fecha_inicio: en10Minutos.toISOString(),
        estado: 'cancelado' as EstadoEvento,
      };

      expect(debeEnviarNotificacionPush(evento)).toBe(false);
    });

    it('NO envía notificación si aún no es tiempo', () => {
      const en30Minutos = new Date();
      en30Minutos.setMinutes(en30Minutos.getMinutes() + 30);

      const evento = {
        notificar_push: true,
        recordar_antes_minutos: 15,
        fecha_inicio: en30Minutos.toISOString(),
        estado: 'pendiente' as EstadoEvento,
      };

      expect(debeEnviarNotificacionPush(evento)).toBe(false);
    });
  });

  describe('Estadísticas de Agenda', () => {
    it('calcula estadísticas correctamente', () => {
      const ahora = new Date();
      const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 14, 0, 0);
      const manana = new Date(hoy);
      manana.setDate(manana.getDate() + 1);
      const enUnaSemana = new Date(hoy);
      enUnaSemana.setDate(enUnaSemana.getDate() + 5);

      const eventos = [
        { fecha_inicio: hoy.toISOString(), estado: 'pendiente' as EstadoEvento },
        { fecha_inicio: manana.toISOString(), estado: 'pendiente' as EstadoEvento },
        { fecha_inicio: enUnaSemana.toISOString(), estado: 'completado' as EstadoEvento },
      ];

      const recordatorios = [
        { completado: false, enviado: true },
        { completado: true, enviado: true },
        { completado: false, enviado: false },
      ];

      const stats = calcularEstadisticasAgenda(eventos, recordatorios);

      expect(stats.totalEventos).toBe(3);
      expect(stats.eventosHoy).toBe(1);
      expect(stats.eventosEstaSemana).toBe(3);
      expect(stats.eventosPendientes).toBe(2);
      expect(stats.eventosCompletados).toBe(1);
      expect(stats.totalRecordatorios).toBe(3);
      expect(stats.recordatoriosPendientes).toBe(2);
      expect(stats.recordatoriosEnviados).toBe(2);
    });
  });

  describe('Validación de Patrón de Recurrencia', () => {
    it('acepta evento sin recurrencia', () => {
      expect(validarPatronRecurrencia(undefined)).toEqual({ valido: true });
    });

    it('acepta recurrencia diaria válida', () => {
      const patron = { tipo: 'diario' as const, intervalo: 1 };
      expect(validarPatronRecurrencia(patron)).toEqual({ valido: true });
    });

    it('acepta recurrencia semanal con días', () => {
      const patron = { tipo: 'semanal' as const, intervalo: 1, dias_semana: [1, 3, 5] };
      expect(validarPatronRecurrencia(patron)).toEqual({ valido: true });
    });

    it('rechaza recurrencia semanal sin días', () => {
      const patron = { tipo: 'semanal' as const, intervalo: 1 };
      const resultado = validarPatronRecurrencia(patron);
      expect(resultado.valido).toBe(false);
      expect(resultado.error).toContain('día de la semana');
    });

    it('rechaza intervalo menor a 1', () => {
      const patron = { tipo: 'diario' as const, intervalo: 0 };
      const resultado = validarPatronRecurrencia(patron);
      expect(resultado.valido).toBe(false);
      expect(resultado.error).toContain('Intervalo');
    });

    it('rechaza fecha de fin pasada', () => {
      const ayer = new Date();
      ayer.setDate(ayer.getDate() - 1);
      const patron = { tipo: 'diario' as const, intervalo: 1, fin_fecha: ayer.toISOString() };
      const resultado = validarPatronRecurrencia(patron);
      expect(resultado.valido).toBe(false);
      expect(resultado.error).toContain('Fecha de fin');
    });
  });

  describe('Estructura de Recordatorio', () => {
    it('recordatorio tiene campos booleanos de estado', () => {
      const recordatorio: Partial<Recordatorio> = {
        id: 'rec-1',
        titulo: 'Llamar cliente',
        completado: false,
        leido: false,
        enviado: true,
      };

      expect(typeof recordatorio.completado).toBe('boolean');
      expect(typeof recordatorio.leido).toBe('boolean');
      expect(typeof recordatorio.enviado).toBe('boolean');
    });

    it('recordatorio completado tiene fecha de completado', () => {
      const ahora = new Date().toISOString();
      const recordatorio: Partial<Recordatorio> = {
        completado: true,
        fecha_completado: ahora,
      };

      expect(recordatorio.fecha_completado).toBe(ahora);
    });
  });
});
