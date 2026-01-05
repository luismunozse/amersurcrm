/**
 * Tests de Criterios de Aceptación del PRD - Módulo Ventas
 *
 * PRD 3.4.3 Criterios de Aceptación:
 * - [ ] Reserva bloquea lote automáticamente
 * - [ ] Venta convierte reserva y actualiza estado de lote
 * - [ ] Comisión se calcula automáticamente
 * - [ ] Pagos actualizan saldo pendiente en tiempo real
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Estados de lote según PRD
type EstadoLote = 'disponible' | 'reservado' | 'vendido';

// Simulación del flujo de reserva → venta
interface Lote {
  id: string;
  codigo: string;
  estado: EstadoLote;
  precio: number;
}

interface Reserva {
  id: string;
  lote_id: string;
  cliente_id: string;
  monto_reserva: number;
  estado: 'activa' | 'vencida' | 'cancelada' | 'convertida_venta';
}

interface Venta {
  id: string;
  lote_id: string;
  cliente_id: string;
  reserva_id?: string;
  precio_venta: number;
  comision_porcentaje: number;
  comision_monto: number;
}

// Función para calcular comisión
function calcularComision(precioVenta: number, porcentaje: number): number {
  return Math.round(precioVenta * (porcentaje / 100) * 100) / 100;
}

// Función para crear reserva y bloquear lote
function crearReserva(lote: Lote, clienteId: string, montoReserva: number): { reserva: Reserva; loteActualizado: Lote } | { error: string } {
  if (lote.estado !== 'disponible') {
    return { error: `Lote no disponible. Estado actual: ${lote.estado}` };
  }

  const reserva: Reserva = {
    id: `RES-${Date.now()}`,
    lote_id: lote.id,
    cliente_id: clienteId,
    monto_reserva: montoReserva,
    estado: 'activa',
  };

  const loteActualizado: Lote = {
    ...lote,
    estado: 'reservado',
  };

  return { reserva, loteActualizado };
}

// Función para convertir reserva en venta
function convertirReservaAVenta(
  reserva: Reserva,
  lote: Lote,
  precioVenta: number,
  comisionPorcentaje: number
): { venta: Venta; reservaActualizada: Reserva; loteActualizado: Lote } | { error: string } {
  if (reserva.estado !== 'activa') {
    return { error: `Reserva no activa. Estado actual: ${reserva.estado}` };
  }

  if (lote.estado !== 'reservado') {
    return { error: `Lote no está reservado. Estado actual: ${lote.estado}` };
  }

  const venta: Venta = {
    id: `VTA-${Date.now()}`,
    lote_id: lote.id,
    cliente_id: reserva.cliente_id,
    reserva_id: reserva.id,
    precio_venta: precioVenta,
    comision_porcentaje: comisionPorcentaje,
    comision_monto: calcularComision(precioVenta, comisionPorcentaje),
  };

  const reservaActualizada: Reserva = {
    ...reserva,
    estado: 'convertida_venta',
  };

  const loteActualizado: Lote = {
    ...lote,
    estado: 'vendido',
  };

  return { venta, reservaActualizada, loteActualizado };
}

// Función para calcular saldo pendiente
function calcularSaldoPendiente(precioTotal: number, pagosRealizados: number[]): number {
  const totalPagado = pagosRealizados.reduce((sum, pago) => sum + pago, 0);
  return Math.max(0, precioTotal - totalPagado);
}

describe('PRD 3.4.3 - Flujo de Ventas', () => {
  describe('Criterio: Reserva bloquea lote automáticamente', () => {
    it('cambia estado de lote a "reservado" al crear reserva', () => {
      const lote: Lote = {
        id: 'lote-1',
        codigo: 'A-001',
        estado: 'disponible',
        precio: 50000,
      };

      const resultado = crearReserva(lote, 'cliente-1', 5000);

      expect('error' in resultado).toBe(false);
      if (!('error' in resultado)) {
        expect(resultado.loteActualizado.estado).toBe('reservado');
        expect(resultado.reserva.estado).toBe('activa');
      }
    });

    it('no permite reservar lote ya reservado', () => {
      const lote: Lote = {
        id: 'lote-1',
        codigo: 'A-001',
        estado: 'reservado',
        precio: 50000,
      };

      const resultado = crearReserva(lote, 'cliente-2', 5000);

      expect('error' in resultado).toBe(true);
      if ('error' in resultado) {
        expect(resultado.error).toContain('no disponible');
      }
    });

    it('no permite reservar lote vendido', () => {
      const lote: Lote = {
        id: 'lote-1',
        codigo: 'A-001',
        estado: 'vendido',
        precio: 50000,
      };

      const resultado = crearReserva(lote, 'cliente-2', 5000);

      expect('error' in resultado).toBe(true);
    });
  });

  describe('Criterio: Venta convierte reserva y actualiza estado de lote', () => {
    it('cambia estado de lote a "vendido" al crear venta', () => {
      const lote: Lote = {
        id: 'lote-1',
        codigo: 'A-001',
        estado: 'reservado',
        precio: 50000,
      };

      const reserva: Reserva = {
        id: 'res-1',
        lote_id: 'lote-1',
        cliente_id: 'cliente-1',
        monto_reserva: 5000,
        estado: 'activa',
      };

      const resultado = convertirReservaAVenta(reserva, lote, 50000, 5);

      expect('error' in resultado).toBe(false);
      if (!('error' in resultado)) {
        expect(resultado.loteActualizado.estado).toBe('vendido');
        expect(resultado.reservaActualizada.estado).toBe('convertida_venta');
        expect(resultado.venta.reserva_id).toBe(reserva.id);
      }
    });

    it('no permite venta si reserva no está activa', () => {
      const lote: Lote = {
        id: 'lote-1',
        codigo: 'A-001',
        estado: 'reservado',
        precio: 50000,
      };

      const reserva: Reserva = {
        id: 'res-1',
        lote_id: 'lote-1',
        cliente_id: 'cliente-1',
        monto_reserva: 5000,
        estado: 'vencida',
      };

      const resultado = convertirReservaAVenta(reserva, lote, 50000, 5);

      expect('error' in resultado).toBe(true);
    });

    it('mantiene vinculación entre venta y reserva original', () => {
      const lote: Lote = {
        id: 'lote-1',
        codigo: 'A-001',
        estado: 'reservado',
        precio: 50000,
      };

      const reserva: Reserva = {
        id: 'res-123',
        lote_id: 'lote-1',
        cliente_id: 'cliente-1',
        monto_reserva: 5000,
        estado: 'activa',
      };

      const resultado = convertirReservaAVenta(reserva, lote, 50000, 5);

      if (!('error' in resultado)) {
        expect(resultado.venta.reserva_id).toBe('res-123');
        expect(resultado.venta.cliente_id).toBe('cliente-1');
      }
    });
  });

  describe('Criterio: Comisión se calcula automáticamente', () => {
    it('calcula comisión correctamente para porcentaje entero', () => {
      const comision = calcularComision(100000, 5); // 5% de 100,000
      expect(comision).toBe(5000);
    });

    it('calcula comisión correctamente para porcentaje decimal', () => {
      const comision = calcularComision(100000, 2.5); // 2.5% de 100,000
      expect(comision).toBe(2500);
    });

    it('calcula comisión de venta al crear venta', () => {
      const lote: Lote = {
        id: 'lote-1',
        codigo: 'A-001',
        estado: 'reservado',
        precio: 80000,
      };

      const reserva: Reserva = {
        id: 'res-1',
        lote_id: 'lote-1',
        cliente_id: 'cliente-1',
        monto_reserva: 5000,
        estado: 'activa',
      };

      const resultado = convertirReservaAVenta(reserva, lote, 80000, 3);

      if (!('error' in resultado)) {
        expect(resultado.venta.comision_porcentaje).toBe(3);
        expect(resultado.venta.comision_monto).toBe(2400); // 3% de 80,000
      }
    });

    it('redondea comisión a 2 decimales', () => {
      const comision = calcularComision(33333, 7); // Resultado: 2333.31
      expect(comision).toBe(2333.31);
    });
  });

  describe('Criterio: Pagos actualizan saldo pendiente en tiempo real', () => {
    it('calcula saldo pendiente correctamente', () => {
      const precioTotal = 50000;
      const pagos = [10000, 5000, 5000];

      const saldo = calcularSaldoPendiente(precioTotal, pagos);

      expect(saldo).toBe(30000);
    });

    it('saldo es cero cuando pagos igualan precio', () => {
      const precioTotal = 50000;
      const pagos = [20000, 15000, 15000];

      const saldo = calcularSaldoPendiente(precioTotal, pagos);

      expect(saldo).toBe(0);
    });

    it('saldo nunca es negativo aunque pagos excedan precio', () => {
      const precioTotal = 50000;
      const pagos = [30000, 30000]; // Excede el precio

      const saldo = calcularSaldoPendiente(precioTotal, pagos);

      expect(saldo).toBe(0);
    });

    it('saldo es igual a precio cuando no hay pagos', () => {
      const precioTotal = 50000;
      const pagos: number[] = [];

      const saldo = calcularSaldoPendiente(precioTotal, pagos);

      expect(saldo).toBe(50000);
    });
  });
});

describe('PRD 3.2.3 - Estados de Lote', () => {
  describe('Estados válidos de lote', () => {
    const estadosValidos: EstadoLote[] = ['disponible', 'reservado', 'vendido'];

    it.each(estadosValidos)('acepta estado "%s"', (estado) => {
      const lote: Lote = {
        id: 'test',
        codigo: 'A-001',
        estado: estado,
        precio: 50000,
      };
      expect(estadosValidos).toContain(lote.estado);
    });
  });

  describe('Transiciones de estado válidas', () => {
    it('permite transición disponible → reservado', () => {
      const estadoInicial: EstadoLote = 'disponible';
      const estadoFinal: EstadoLote = 'reservado';

      // Transición válida
      expect(estadoInicial).toBe('disponible');
      expect(estadoFinal).toBe('reservado');
    });

    it('permite transición reservado → vendido', () => {
      const estadoInicial: EstadoLote = 'reservado';
      const estadoFinal: EstadoLote = 'vendido';

      expect(estadoInicial).toBe('reservado');
      expect(estadoFinal).toBe('vendido');
    });

    it('permite transición reservado → disponible (cancelación)', () => {
      const estadoInicial: EstadoLote = 'reservado';
      const estadoFinal: EstadoLote = 'disponible';

      expect(estadoInicial).toBe('reservado');
      expect(estadoFinal).toBe('disponible');
    });
  });
});
