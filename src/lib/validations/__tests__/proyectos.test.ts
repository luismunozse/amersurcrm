/**
 * Unit tests for Proyectos validation schemas
 */

import { describe, it, expect } from '@jest/globals';
import {
  proyectoFormSchema,
  loteFormSchema,
  reservaFormSchema,
  ventaFormSchema,
  loteCoordinatesSchema,
  batchCoordinatesSchema,
  validateWithSchema,
  getZodErrorMessages,
  getZodFieldErrors,
} from '../proyectos';

describe('Proyectos Validations', () => {
  describe('proyectoFormSchema', () => {
    it('should validate a valid proyecto', () => {
      const validProyecto = {
        nombre: 'Proyecto Test',
        descripcion: 'Una descripción de prueba',
        ubicacion: 'Lima, Perú',
        latitud: -12.0464,
        longitud: -77.0428,
        tipo_terreno: 'residencial' as const,
        area_total: 1000,
        precio_desde: 50000,
        precio_hasta: 100000,
        estado: 'activo' as const,
      };

      const result = validateWithSchema(proyectoFormSchema, validProyecto);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nombre).toBe('Proyecto Test');
      }
    });

    it('should reject proyecto with empty nombre', () => {
      const invalidProyecto = {
        nombre: '',
        estado: 'activo',
      };

      const result = validateWithSchema(proyectoFormSchema, invalidProyecto);
      expect(result.success).toBe(false);
    });

    it('should reject proyecto with precio_desde > precio_hasta', () => {
      const invalidProyecto = {
        nombre: 'Proyecto Test',
        precio_desde: 100000,
        precio_hasta: 50000,
      };

      const result = validateWithSchema(proyectoFormSchema, invalidProyecto);
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = getZodErrorMessages(result.error);
        expect(messages.some((msg) => msg.includes('precio mínimo'))).toBe(true);
      }
    });

    it('should reject proyecto with latitud without longitud', () => {
      const invalidProyecto = {
        nombre: 'Proyecto Test',
        latitud: -12.0464,
      };

      const result = validateWithSchema(proyectoFormSchema, invalidProyecto);
      expect(result.success).toBe(false);
    });

    it('should reject proyecto with invalid latitud range', () => {
      const invalidProyecto = {
        nombre: 'Proyecto Test',
        latitud: 91, // Out of range
        longitud: -77.0428,
      };

      const result = validateWithSchema(proyectoFormSchema, invalidProyecto);
      expect(result.success).toBe(false);
    });
  });

  describe('loteFormSchema', () => {
    it('should validate a valid lote', () => {
      const validLote = {
        numero_lote: 'A-001',
        etapa: 'Primera',
        manzana: 'A',
        area: 120,
        precio_lista: 80000,
        precio_venta: 75000,
        estado: 'disponible' as const,
      };

      const result = validateWithSchema(loteFormSchema, validLote);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.numero_lote).toBe('A-001');
      }
    });

    it('should reject lote with empty numero_lote', () => {
      const invalidLote = {
        numero_lote: '',
      };

      const result = validateWithSchema(loteFormSchema, invalidLote);
      expect(result.success).toBe(false);
    });

    it('should reject lote with negative area', () => {
      const invalidLote = {
        numero_lote: 'A-001',
        area: -100,
      };

      const result = validateWithSchema(loteFormSchema, invalidLote);
      expect(result.success).toBe(false);
    });

    it('should reject lote with precio_venta > precio_lista', () => {
      const invalidLote = {
        numero_lote: 'A-001',
        precio_lista: 80000,
        precio_venta: 90000,
      };

      const result = validateWithSchema(loteFormSchema, invalidLote);
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = getZodErrorMessages(result.error);
        expect(messages.some((msg) => msg.includes('precio de venta'))).toBe(true);
      }
    });
  });

  describe('loteCoordinatesSchema', () => {
    it('should validate valid coordinates', () => {
      const validCoordinates = {
        lote_id: '123e4567-e89b-12d3-a456-426614174000',
        coordenadas: {
          type: 'polygon' as const,
          coordinates: [
            [
              [-77.0428, -12.0464],
              [-77.0429, -12.0464],
              [-77.0429, -12.0465],
              [-77.0428, -12.0465],
              [-77.0428, -12.0464],
            ],
          ],
        },
      };

      const result = validateWithSchema(loteCoordinatesSchema, validCoordinates);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const invalidCoordinates = {
        lote_id: 'not-a-uuid',
        coordenadas: {
          type: 'polygon' as const,
          coordinates: [[[0, 0]]],
        },
      };

      const result = validateWithSchema(loteCoordinatesSchema, invalidCoordinates);
      expect(result.success).toBe(false);
    });
  });

  describe('reservaFormSchema', () => {
    it('should validate a valid reserva', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const validReserva = {
        cliente_id: '123e4567-e89b-12d3-a456-426614174000',
        lote_id: '123e4567-e89b-12d3-a456-426614174001',
        monto_reserva: 5000,
        fecha_vencimiento: futureDate.toISOString(),
        notas: 'Reserva de prueba',
      };

      const result = validateWithSchema(reservaFormSchema, validReserva);
      expect(result.success).toBe(true);
    });

    it('should reject reserva with past fecha_vencimiento', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);

      const invalidReserva = {
        cliente_id: '123e4567-e89b-12d3-a456-426614174000',
        lote_id: '123e4567-e89b-12d3-a456-426614174001',
        fecha_vencimiento: pastDate.toISOString(),
      };

      const result = validateWithSchema(reservaFormSchema, invalidReserva);
      expect(result.success).toBe(false);
    });

    it('should reject reserva with negative monto', () => {
      const invalidReserva = {
        cliente_id: '123e4567-e89b-12d3-a456-426614174000',
        lote_id: '123e4567-e89b-12d3-a456-426614174001',
        monto_reserva: -5000,
      };

      const result = validateWithSchema(reservaFormSchema, invalidReserva);
      expect(result.success).toBe(false);
    });
  });

  describe('ventaFormSchema', () => {
    it('should validate a valid venta al contado', () => {
      const validVenta = {
        cliente_id: '123e4567-e89b-12d3-a456-426614174000',
        lote_id: '123e4567-e89b-12d3-a456-426614174001',
        precio_venta: 80000,
        modalidad_pago: 'contado' as const,
        cuota_inicial: 80000,
      };

      const result = validateWithSchema(ventaFormSchema, validVenta);
      expect(result.success).toBe(true);
    });

    it('should validate a valid venta financiada', () => {
      const validVenta = {
        cliente_id: '123e4567-e89b-12d3-a456-426614174000',
        lote_id: '123e4567-e89b-12d3-a456-426614174001',
        precio_venta: 80000,
        modalidad_pago: 'financiado' as const,
        cuota_inicial: 20000,
        numero_cuotas: 12,
        monto_cuota: 5000,
      };

      const result = validateWithSchema(ventaFormSchema, validVenta);
      expect(result.success).toBe(true);
    });

    it('should reject venta financiada without cuota details', () => {
      const invalidVenta = {
        cliente_id: '123e4567-e89b-12d3-a456-426614174000',
        lote_id: '123e4567-e89b-12d3-a456-426614174001',
        precio_venta: 80000,
        modalidad_pago: 'financiado' as const,
      };

      const result = validateWithSchema(ventaFormSchema, invalidVenta);
      expect(result.success).toBe(false);
    });

    it('should reject venta when cuota_inicial + cuotas != precio_venta', () => {
      const invalidVenta = {
        cliente_id: '123e4567-e89b-12d3-a456-426614174000',
        lote_id: '123e4567-e89b-12d3-a456-426614174001',
        precio_venta: 80000,
        modalidad_pago: 'financiado' as const,
        cuota_inicial: 20000,
        numero_cuotas: 12,
        monto_cuota: 6000, // 20000 + (12 * 6000) = 92000 != 80000
      };

      const result = validateWithSchema(ventaFormSchema, invalidVenta);
      expect(result.success).toBe(false);
    });
  });

  describe('batchCoordinatesSchema', () => {
    it('should validate batch coordinates update', () => {
      const validBatch = {
        updates: [
          {
            lote_id: '123e4567-e89b-12d3-a456-426614174000',
            coordenadas: {
              type: 'polygon' as const,
              coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
            },
          },
          {
            lote_id: '123e4567-e89b-12d3-a456-426614174001',
            coordenadas: {
              type: 'polygon' as const,
              coordinates: [[[2, 2], [3, 2], [3, 3], [2, 3], [2, 2]]],
            },
          },
        ],
      };

      const result = validateWithSchema(batchCoordinatesSchema, validBatch);
      expect(result.success).toBe(true);
    });

    it('should reject empty batch', () => {
      const invalidBatch = {
        updates: [],
      };

      const result = validateWithSchema(batchCoordinatesSchema, invalidBatch);
      expect(result.success).toBe(false);
    });
  });

  describe('Helper functions', () => {
    describe('getZodErrorMessages', () => {
      it('should extract error messages', () => {
        const invalidData = {
          nombre: '',
          precio_desde: 100000,
          precio_hasta: 50000,
        };

        const result = validateWithSchema(proyectoFormSchema, invalidData);
        if (!result.success) {
          const messages = getZodErrorMessages(result.error);
          expect(messages.length).toBeGreaterThan(0);
          expect(messages.some((msg) => typeof msg === 'string')).toBe(true);
        }
      });
    });

    describe('getZodFieldErrors', () => {
      it('should extract field errors as object', () => {
        const invalidData = {
          nombre: '',
        };

        const result = validateWithSchema(proyectoFormSchema, invalidData);
        if (!result.success) {
          const fieldErrors = getZodFieldErrors(result.error);
          expect(fieldErrors).toHaveProperty('nombre');
          expect(typeof fieldErrors.nombre).toBe('string');
        }
      });
    });
  });
});
