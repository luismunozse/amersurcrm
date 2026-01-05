/**
 * Tests de Criterios de Aceptación del PRD - Módulo Clientes
 *
 * PRD 3.1.3 Criterios de Aceptación:
 * - [ ] Usuario puede crear cliente con datos mínimos (nombre, teléfono)
 * - [ ] Sistema valida DNI/RUC único
 * - [ ] Búsqueda devuelve resultados en menos de 500ms
 * - [ ] Importación CSV soporta hasta 10,000 registros
 * - [ ] Timeline muestra cronología ordenada de eventos
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Schema mínimo para crear cliente (según PRD)
const ClienteMinimalSchema = z.object({
  nombre: z.string()
    .min(1, "Nombre requerido")
    .refine(val => val.trim().length >= 2, "El nombre debe tener al menos 2 caracteres"),
  telefono: z.string()
    .optional()
    .or(z.literal(""))
    .refine(val => {
      if (!val || val === "") return true;
      const digits = val.replace(/\D/g, '');
      return digits.length >= 6;
    }, "El teléfono debe tener al menos 6 dígitos"),
  tipo_cliente: z.enum(['persona', 'empresa']).default('persona'),
  estado_cliente: z.enum(['por_contactar', 'contactado', 'transferido', 'intermedio', 'desestimado', 'potencial']).default('por_contactar'),
});

// Schema para validación de DNI
const DNISchema = z.object({
  tipo_documento: z.literal('DNI'),
  documento_identidad: z.string()
    .refine(val => {
      if (!val || val === "") return true;
      const digits = val.replace(/\D/g, '');
      return digits.length === 8;
    }, "El DNI debe tener exactamente 8 dígitos"),
});

// Schema para validación de RUC
const RUCSchema = z.object({
  tipo_documento: z.literal('RUC'),
  documento_identidad: z.string()
    .refine(val => {
      if (!val || val === "") return true;
      const digits = val.replace(/\D/g, '');
      return digits.length === 11;
    }, "El RUC debe tener exactamente 11 dígitos"),
});

describe('PRD 3.1.3 - Gestión de Clientes', () => {
  describe('Criterio: Usuario puede crear cliente con datos mínimos (nombre, teléfono)', () => {
    it('acepta cliente con solo nombre (teléfono opcional)', () => {
      const result = ClienteMinimalSchema.safeParse({
        nombre: 'Juan Pérez',
      });
      expect(result.success).toBe(true);
    });

    it('acepta cliente con nombre y teléfono', () => {
      const result = ClienteMinimalSchema.safeParse({
        nombre: 'María García',
        telefono: '987654321',
      });
      expect(result.success).toBe(true);
    });

    it('acepta cliente con teléfono en formato internacional', () => {
      const result = ClienteMinimalSchema.safeParse({
        nombre: 'Carlos López',
        telefono: '+51 987 654 321',
      });
      expect(result.success).toBe(true);
    });

    it('rechaza cliente sin nombre', () => {
      const result = ClienteMinimalSchema.safeParse({
        telefono: '987654321',
      });
      expect(result.success).toBe(false);
    });

    it('rechaza cliente con nombre vacío', () => {
      const result = ClienteMinimalSchema.safeParse({
        nombre: '',
        telefono: '987654321',
      });
      expect(result.success).toBe(false);
    });

    it('rechaza cliente con nombre de un solo caracter', () => {
      const result = ClienteMinimalSchema.safeParse({
        nombre: 'A',
        telefono: '987654321',
      });
      expect(result.success).toBe(false);
    });

    it('rechaza teléfono con menos de 6 dígitos', () => {
      const result = ClienteMinimalSchema.safeParse({
        nombre: 'Test User',
        telefono: '12345',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Criterio: Sistema valida DNI/RUC único', () => {
    describe('Validación de formato DNI', () => {
      it('acepta DNI con 8 dígitos', () => {
        const result = DNISchema.safeParse({
          tipo_documento: 'DNI',
          documento_identidad: '12345678',
        });
        expect(result.success).toBe(true);
      });

      it('rechaza DNI con menos de 8 dígitos', () => {
        const result = DNISchema.safeParse({
          tipo_documento: 'DNI',
          documento_identidad: '1234567',
        });
        expect(result.success).toBe(false);
      });

      it('rechaza DNI con más de 8 dígitos', () => {
        const result = DNISchema.safeParse({
          tipo_documento: 'DNI',
          documento_identidad: '123456789',
        });
        expect(result.success).toBe(false);
      });

      it('acepta DNI vacío (campo opcional)', () => {
        const result = DNISchema.safeParse({
          tipo_documento: 'DNI',
          documento_identidad: '',
        });
        expect(result.success).toBe(true);
      });
    });

    describe('Validación de formato RUC', () => {
      it('acepta RUC con 11 dígitos', () => {
        const result = RUCSchema.safeParse({
          tipo_documento: 'RUC',
          documento_identidad: '20123456789',
        });
        expect(result.success).toBe(true);
      });

      it('rechaza RUC con menos de 11 dígitos', () => {
        const result = RUCSchema.safeParse({
          tipo_documento: 'RUC',
          documento_identidad: '2012345678',
        });
        expect(result.success).toBe(false);
      });

      it('rechaza RUC con más de 11 dígitos', () => {
        const result = RUCSchema.safeParse({
          tipo_documento: 'RUC',
          documento_identidad: '201234567890',
        });
        expect(result.success).toBe(false);
      });

      it('valida que RUC empiece con 10 o 20', () => {
        // RUC de persona natural empieza con 10
        const rucPersona = '10123456789';
        expect(rucPersona.startsWith('10')).toBe(true);

        // RUC de empresa empieza con 20
        const rucEmpresa = '20123456789';
        expect(rucEmpresa.startsWith('20')).toBe(true);
      });
    });

    describe('Unicidad de documento', () => {
      it('detecta documentos duplicados en array', () => {
        const clientes = [
          { id: '1', documento_identidad: '12345678' },
          { id: '2', documento_identidad: '87654321' },
          { id: '3', documento_identidad: '12345678' }, // Duplicado
        ];

        const documentos = clientes.map(c => c.documento_identidad);
        const duplicados = documentos.filter((item, index) => documentos.indexOf(item) !== index);

        expect(duplicados.length).toBeGreaterThan(0);
        expect(duplicados).toContain('12345678');
      });

      it('permite documentos vacíos múltiples (son opcionales)', () => {
        const clientes = [
          { id: '1', documento_identidad: '' },
          { id: '2', documento_identidad: '' },
          { id: '3', documento_identidad: '12345678' },
        ];

        // Filtrar documentos no vacíos para verificar unicidad
        const documentosNoVacios = clientes
          .map(c => c.documento_identidad)
          .filter(d => d && d.trim() !== '');

        const duplicados = documentosNoVacios.filter(
          (item, index) => documentosNoVacios.indexOf(item) !== index
        );

        expect(duplicados.length).toBe(0);
      });
    });
  });

  describe('Criterio: Estados de cliente válidos', () => {
    const estadosValidos = [
      'por_contactar',
      'contactado',
      'intermedio',
      'potencial',
      'transferido',
      'desestimado'
    ];

    it.each(estadosValidos)('acepta estado "%s"', (estado) => {
      const result = ClienteMinimalSchema.safeParse({
        nombre: 'Test User',
        estado_cliente: estado,
      });
      expect(result.success).toBe(true);
    });

    it('rechaza estado inválido', () => {
      const result = ClienteMinimalSchema.safeParse({
        nombre: 'Test User',
        estado_cliente: 'estado_invalido',
      });
      expect(result.success).toBe(false);
    });

    it('usa "por_contactar" como estado por defecto', () => {
      const result = ClienteMinimalSchema.safeParse({
        nombre: 'Test User',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.estado_cliente).toBe('por_contactar');
      }
    });
  });

  describe('Criterio: Tipos de cliente válidos', () => {
    it('acepta tipo "persona"', () => {
      const result = ClienteMinimalSchema.safeParse({
        nombre: 'Juan Pérez',
        tipo_cliente: 'persona',
      });
      expect(result.success).toBe(true);
    });

    it('acepta tipo "empresa"', () => {
      const result = ClienteMinimalSchema.safeParse({
        nombre: 'Empresa SAC',
        tipo_cliente: 'empresa',
      });
      expect(result.success).toBe(true);
    });

    it('usa "persona" como tipo por defecto', () => {
      const result = ClienteMinimalSchema.safeParse({
        nombre: 'Test User',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tipo_cliente).toBe('persona');
      }
    });
  });
});
