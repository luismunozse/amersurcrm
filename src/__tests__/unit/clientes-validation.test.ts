import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Recreamos el schema de validación para testing
// (En producción, exportarías esto desde _actions.ts)
const DireccionSchema = z.object({
  calle: z.string().optional(),
  numero: z.string().optional(),
  barrio: z.string().optional(),
  ciudad: z.string().optional(),
  provincia: z.string().optional(),
  pais: z.string().optional(),
  codigo_postal: z.string().optional(),
});

const ClienteSchema = z.object({
  tipo_cliente: z.enum(['persona', 'empresa']),
  nombre: z.string()
    .min(1, "Nombre requerido")
    .refine(val => val.trim().length >= 2, "El nombre debe tener al menos 2 caracteres")
    .refine(val => !/^\d+$/.test(val.trim()), "El nombre no puede contener solo números"),
  tipo_documento: z.enum(['DNI', 'PAS', 'EXT', 'RUC']).optional(),
  documento_identidad: z.string()
    .optional()
    .or(z.literal(""))
    .refine(val => {
      if (!val || val === "") return true;
      return val.trim().length >= 8;
    }, "El documento debe tener al menos 8 caracteres"),
  email: z.string()
    .optional()
    .or(z.literal(""))
    .refine(val => {
      if (!val || val === "") return true;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    }, "Formato de email inválido"),
  telefono: z.string()
    .optional()
    .or(z.literal(""))
    .refine(val => {
      if (!val || val === "") return true;
      const digits = val.replace(/\D/g, '');
      return digits.length >= 6;
    }, "El teléfono debe tener al menos 6 dígitos"),
  direccion: DireccionSchema.optional().default({}),
  estado_cliente: z.enum(['por_contactar', 'contactado', 'transferido', 'intermedio', 'desestimado', 'potencial']),
}).refine(data => {
  if (data.tipo_documento === 'DNI' && data.documento_identidad && data.documento_identidad.trim()) {
    const digits = data.documento_identidad.replace(/\D/g, '');
    return digits.length === 8;
  }
  return true;
}, {
  message: "El DNI debe tener exactamente 8 dígitos",
  path: ["documento_identidad"]
}).refine(data => {
  if (data.tipo_documento === 'RUC' && data.documento_identidad && data.documento_identidad.trim()) {
    const digits = data.documento_identidad.replace(/\D/g, '');
    return digits.length === 11;
  }
  return true;
}, {
  message: "El RUC debe tener exactamente 11 dígitos",
  path: ["documento_identidad"]
});

describe('Validación de Clientes', () => {
  describe('Nombre', () => {
    it('rechaza nombres vacíos', () => {
      const result = ClienteSchema.safeParse({
        tipo_cliente: 'persona',
        nombre: '',
        estado_cliente: 'por_contactar',
      });
      expect(result.success).toBe(false);
    });

    it('rechaza nombres con solo un caracter', () => {
      const result = ClienteSchema.safeParse({
        tipo_cliente: 'persona',
        nombre: 'A',
        estado_cliente: 'por_contactar',
      });
      expect(result.success).toBe(false);
    });

    it('rechaza nombres que son solo números', () => {
      const result = ClienteSchema.safeParse({
        tipo_cliente: 'persona',
        nombre: '12345',
        estado_cliente: 'por_contactar',
      });
      expect(result.success).toBe(false);
    });

    it('acepta nombres válidos', () => {
      const result = ClienteSchema.safeParse({
        tipo_cliente: 'persona',
        nombre: 'Juan Pérez',
        estado_cliente: 'por_contactar',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('DNI', () => {
    it('acepta DNI vacío (opcional)', () => {
      const result = ClienteSchema.safeParse({
        tipo_cliente: 'persona',
        nombre: 'Juan Pérez',
        tipo_documento: 'DNI',
        documento_identidad: '',
        estado_cliente: 'por_contactar',
      });
      expect(result.success).toBe(true);
    });

    it('acepta DNI con 8 dígitos', () => {
      const result = ClienteSchema.safeParse({
        tipo_cliente: 'persona',
        nombre: 'Juan Pérez',
        tipo_documento: 'DNI',
        documento_identidad: '12345678',
        estado_cliente: 'por_contactar',
      });
      expect(result.success).toBe(true);
    });

    it('rechaza DNI con menos de 8 dígitos', () => {
      const result = ClienteSchema.safeParse({
        tipo_cliente: 'persona',
        nombre: 'Juan Pérez',
        tipo_documento: 'DNI',
        documento_identidad: '1234567',
        estado_cliente: 'por_contactar',
      });
      expect(result.success).toBe(false);
    });

    it('rechaza DNI con más de 8 dígitos', () => {
      const result = ClienteSchema.safeParse({
        tipo_cliente: 'persona',
        nombre: 'Juan Pérez',
        tipo_documento: 'DNI',
        documento_identidad: '123456789',
        estado_cliente: 'por_contactar',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('RUC', () => {
    it('acepta RUC con 11 dígitos', () => {
      const result = ClienteSchema.safeParse({
        tipo_cliente: 'empresa',
        nombre: 'Empresa SAC',
        tipo_documento: 'RUC',
        documento_identidad: '20123456789',
        estado_cliente: 'por_contactar',
      });
      expect(result.success).toBe(true);
    });

    it('rechaza RUC con menos de 11 dígitos', () => {
      const result = ClienteSchema.safeParse({
        tipo_cliente: 'empresa',
        nombre: 'Empresa SAC',
        tipo_documento: 'RUC',
        documento_identidad: '2012345678',
        estado_cliente: 'por_contactar',
      });
      expect(result.success).toBe(false);
    });

    it('rechaza RUC con más de 11 dígitos', () => {
      const result = ClienteSchema.safeParse({
        tipo_cliente: 'empresa',
        nombre: 'Empresa SAC',
        tipo_documento: 'RUC',
        documento_identidad: '201234567890',
        estado_cliente: 'por_contactar',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Email', () => {
    it('acepta email vacío (opcional)', () => {
      const result = ClienteSchema.safeParse({
        tipo_cliente: 'persona',
        nombre: 'Juan Pérez',
        email: '',
        estado_cliente: 'por_contactar',
      });
      expect(result.success).toBe(true);
    });

    it('acepta email válido', () => {
      const result = ClienteSchema.safeParse({
        tipo_cliente: 'persona',
        nombre: 'Juan Pérez',
        email: 'juan@example.com',
        estado_cliente: 'por_contactar',
      });
      expect(result.success).toBe(true);
    });

    it('rechaza email inválido', () => {
      const result = ClienteSchema.safeParse({
        tipo_cliente: 'persona',
        nombre: 'Juan Pérez',
        email: 'juan@',
        estado_cliente: 'por_contactar',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Teléfono', () => {
    it('acepta teléfono vacío (opcional)', () => {
      const result = ClienteSchema.safeParse({
        tipo_cliente: 'persona',
        nombre: 'Juan Pérez',
        telefono: '',
        estado_cliente: 'por_contactar',
      });
      expect(result.success).toBe(true);
    });

    it('acepta teléfono con 6+ dígitos', () => {
      const result = ClienteSchema.safeParse({
        tipo_cliente: 'persona',
        nombre: 'Juan Pérez',
        telefono: '987654321',
        estado_cliente: 'por_contactar',
      });
      expect(result.success).toBe(true);
    });

    it('acepta teléfono con formato internacional', () => {
      const result = ClienteSchema.safeParse({
        tipo_cliente: 'persona',
        nombre: 'Juan Pérez',
        telefono: '+51 987 654 321',
        estado_cliente: 'por_contactar',
      });
      expect(result.success).toBe(true);
    });

    it('rechaza teléfono con menos de 6 dígitos', () => {
      const result = ClienteSchema.safeParse({
        tipo_cliente: 'persona',
        nombre: 'Juan Pérez',
        telefono: '12345',
        estado_cliente: 'por_contactar',
      });
      expect(result.success).toBe(false);
    });
  });
});
