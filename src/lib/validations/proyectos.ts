/**
 * Zod validation schemas for Proyectos module
 */

import { z } from 'zod';

// ============================================================================
// BASE SCHEMAS
// ============================================================================

const coordenadasSchema = z.object({
  type: z.literal('polygon'),
  coordinates: z.array(z.array(z.array(z.number()))),
});

const overlayBoundsSchema = z.object({
  north: z.number(),
  south: z.number(),
  east: z.number(),
  west: z.number(),
});

// ============================================================================
// PROYECTO SCHEMAS
// ============================================================================

export const proyectoFormSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre del proyecto es requerido')
    .max(255, 'El nombre no puede exceder 255 caracteres')
    .trim(),
  descripcion: z
    .string()
    .max(2000, 'La descripción no puede exceder 2000 caracteres')
    .optional()
    .nullable(),
  ubicacion: z
    .string()
    .max(500, 'La ubicación no puede exceder 500 caracteres')
    .optional()
    .nullable(),
  latitud: z
    .number()
    .min(-90, 'Latitud debe estar entre -90 y 90')
    .max(90, 'Latitud debe estar entre -90 y 90')
    .optional()
    .nullable(),
  longitud: z
    .number()
    .min(-180, 'Longitud debe estar entre -180 y 180')
    .max(180, 'Longitud debe estar entre -180 y 180')
    .optional()
    .nullable(),
  tipo_terreno: z
    .enum(['residencial', 'comercial', 'industrial', 'agricola', 'mixto'] as const)
    .optional()
    .nullable(),
  area_total: z
    .number()
    .positive('El área total debe ser un valor positivo')
    .optional()
    .nullable(),
  precio_desde: z
    .number()
    .nonnegative('El precio mínimo no puede ser negativo')
    .optional()
    .nullable(),
  precio_hasta: z
    .number()
    .nonnegative('El precio máximo no puede ser negativo')
    .optional()
    .nullable(),
  estado: z
    .enum(['activo', 'pausado', 'completado', 'cancelado'] as const)
    .default('activo'),
  overlay_image_url: z.string().url('Debe ser una URL válida').optional().nullable(),
  overlay_bounds: overlayBoundsSchema.optional().nullable(),
  overlay_rotation: z.number().min(0).max(360).optional().nullable(),
}).refine(
  (data) => {
    // Si se proporciona precio_desde y precio_hasta, validar que precio_desde <= precio_hasta
    if (data.precio_desde !== null && data.precio_desde !== undefined &&
        data.precio_hasta !== null && data.precio_hasta !== undefined) {
      return data.precio_desde <= data.precio_hasta;
    }
    return true;
  },
  {
    message: 'El precio mínimo debe ser menor o igual al precio máximo',
    path: ['precio_hasta'],
  }
).refine(
  (data) => {
    // Si se proporciona latitud, también debe proporcionarse longitud y viceversa
    const hasLat = data.latitud !== null && data.latitud !== undefined;
    const hasLng = data.longitud !== null && data.longitud !== undefined;
    return hasLat === hasLng;
  },
  {
    message: 'Debe proporcionar latitud y longitud juntas',
    path: ['latitud'],
  }
);

export const proyectoUpdateSchema = proyectoFormSchema.partial();

// ============================================================================
// LOTE SCHEMAS
// ============================================================================

export const loteFormSchema = z.object({
  numero_lote: z
    .string()
    .min(1, 'El número de lote es requerido')
    .max(50, 'El número de lote no puede exceder 50 caracteres')
    .trim(),
  etapa: z
    .string()
    .max(50, 'La etapa no puede exceder 50 caracteres')
    .optional()
    .nullable(),
  manzana: z
    .string()
    .max(50, 'La manzana no puede exceder 50 caracteres')
    .optional()
    .nullable(),
  area: z
    .number()
    .positive('El área debe ser un valor positivo')
    .optional()
    .nullable(),
  precio_lista: z
    .number()
    .nonnegative('El precio de lista no puede ser negativo')
    .optional()
    .nullable(),
  precio_venta: z
    .number()
    .nonnegative('El precio de venta no puede ser negativo')
    .optional()
    .nullable(),
  estado: z
    .enum(['disponible', 'reservado', 'vendido'] as const)
    .default('disponible'),
  descripcion: z
    .string()
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .optional()
    .nullable(),
  caracteristicas: z.record(z.string(), z.any()).optional().nullable(),
  coordenadas: coordenadasSchema.optional().nullable(),
}).refine(
  (data) => {
    // Si se proporciona precio_venta, debe ser menor o igual al precio_lista
    if (data.precio_lista !== null && data.precio_lista !== undefined &&
        data.precio_venta !== null && data.precio_venta !== undefined) {
      return data.precio_venta <= data.precio_lista;
    }
    return true;
  },
  {
    message: 'El precio de venta debe ser menor o igual al precio de lista',
    path: ['precio_venta'],
  }
);

export const loteUpdateSchema = loteFormSchema.partial();

export const loteCoordinatesSchema = z.object({
  lote_id: z.string().uuid('Debe ser un UUID válido'),
  coordenadas: coordenadasSchema,
});

export const batchCoordinatesSchema = z.object({
  updates: z.array(loteCoordinatesSchema).min(1, 'Debe proporcionar al menos una actualización'),
});

// ============================================================================
// RESERVA SCHEMAS
// ============================================================================

export const reservaFormSchema = z.object({
  cliente_id: z.string().uuid('Debe seleccionar un cliente válido'),
  lote_id: z.string().uuid('Debe seleccionar un lote válido'),
  monto_reserva: z
    .number()
    .positive('El monto de reserva debe ser un valor positivo')
    .optional()
    .nullable(),
  fecha_vencimiento: z
    .string()
    .datetime('Debe ser una fecha válida')
    .optional()
    .nullable()
    .or(z.date().optional().nullable()),
  notas: z
    .string()
    .max(1000, 'Las notas no pueden exceder 1000 caracteres')
    .optional()
    .nullable(),
}).refine(
  (data) => {
    // Si se proporciona fecha_vencimiento, debe ser futura
    if (data.fecha_vencimiento) {
      const vencimiento = typeof data.fecha_vencimiento === 'string'
        ? new Date(data.fecha_vencimiento)
        : data.fecha_vencimiento;
      return vencimiento > new Date();
    }
    return true;
  },
  {
    message: 'La fecha de vencimiento debe ser futura',
    path: ['fecha_vencimiento'],
  }
);

export const reservaUpdateSchema = reservaFormSchema.partial().omit({ cliente_id: true, lote_id: true });

// ============================================================================
// VENTA SCHEMAS
// ============================================================================

export const ventaFormSchema = z.object({
  cliente_id: z.string().uuid('Debe seleccionar un cliente válido'),
  lote_id: z.string().uuid('Debe seleccionar un lote válido'),
  precio_venta: z
    .number()
    .positive('El precio de venta debe ser un valor positivo'),
  modalidad_pago: z.enum(['contado', 'financiado', 'mixto'] as const),
  cuota_inicial: z
    .number()
    .nonnegative('La cuota inicial no puede ser negativa')
    .optional()
    .nullable(),
  numero_cuotas: z
    .number()
    .int('El número de cuotas debe ser un entero')
    .positive('El número de cuotas debe ser positivo')
    .optional()
    .nullable(),
  monto_cuota: z
    .number()
    .positive('El monto de cuota debe ser un valor positivo')
    .optional()
    .nullable(),
  fecha_venta: z
    .string()
    .datetime('Debe ser una fecha válida')
    .optional()
    .or(z.date().optional()),
  notas: z
    .string()
    .max(1000, 'Las notas no pueden exceder 1000 caracteres')
    .optional()
    .nullable(),
}).refine(
  (data) => {
    // Si la modalidad es financiado, debe proporcionar cuota_inicial, numero_cuotas y monto_cuota
    if (data.modalidad_pago === 'financiado') {
      return (
        data.cuota_inicial !== null &&
        data.cuota_inicial !== undefined &&
        data.numero_cuotas !== null &&
        data.numero_cuotas !== undefined &&
        data.monto_cuota !== null &&
        data.monto_cuota !== undefined
      );
    }
    return true;
  },
  {
    message: 'Para venta financiada debe proporcionar cuota inicial, número de cuotas y monto de cuota',
    path: ['modalidad_pago'],
  }
).refine(
  (data) => {
    // Si la modalidad es contado, cuota_inicial debe ser igual a precio_venta
    if (data.modalidad_pago === 'contado' && data.cuota_inicial !== null && data.cuota_inicial !== undefined) {
      return data.cuota_inicial === data.precio_venta;
    }
    return true;
  },
  {
    message: 'Para venta al contado, la cuota inicial debe ser igual al precio de venta',
    path: ['cuota_inicial'],
  }
).refine(
  (data) => {
    // Validar que cuota_inicial + (numero_cuotas * monto_cuota) = precio_venta (con margen de error por redondeo)
    if (
      data.modalidad_pago === 'financiado' &&
      data.cuota_inicial !== null &&
      data.cuota_inicial !== undefined &&
      data.numero_cuotas !== null &&
      data.numero_cuotas !== undefined &&
      data.monto_cuota !== null &&
      data.monto_cuota !== undefined
    ) {
      const totalCalculado = data.cuota_inicial + (data.numero_cuotas * data.monto_cuota);
      const diferencia = Math.abs(totalCalculado - data.precio_venta);
      return diferencia < 1; // Margen de error de 1 peso/dólar por redondeo
    }
    return true;
  },
  {
    message: 'La suma de cuota inicial y cuotas debe ser igual al precio de venta',
    path: ['monto_cuota'],
  }
);

export const ventaUpdateSchema = ventaFormSchema.partial().omit({ cliente_id: true, lote_id: true });

// ============================================================================
// FILTER SCHEMAS
// ============================================================================

export const proyectoFiltersSchema = z.object({
  estado: z.array(z.enum(['activo', 'pausado', 'completado', 'cancelado'] as const)).optional(),
  tipo_terreno: z.array(z.enum(['residencial', 'comercial', 'industrial', 'agricola', 'mixto'] as const)).optional(),
  precio_min: z.number().nonnegative().optional(),
  precio_max: z.number().nonnegative().optional(),
  search: z.string().max(255).optional(),
}).refine(
  (data) => {
    if (data.precio_min !== undefined && data.precio_max !== undefined) {
      return data.precio_min <= data.precio_max;
    }
    return true;
  },
  {
    message: 'El precio mínimo debe ser menor o igual al precio máximo',
    path: ['precio_max'],
  }
);

export const loteFiltersSchema = z.object({
  estado: z.array(z.enum(['disponible', 'reservado', 'vendido'] as const)).optional(),
  etapa: z.array(z.string()).optional(),
  manzana: z.array(z.string()).optional(),
  area_min: z.number().positive().optional(),
  area_max: z.number().positive().optional(),
  precio_min: z.number().nonnegative().optional(),
  precio_max: z.number().nonnegative().optional(),
  search: z.string().max(255).optional(),
}).refine(
  (data) => {
    if (data.area_min !== undefined && data.area_max !== undefined) {
      return data.area_min <= data.area_max;
    }
    return true;
  },
  {
    message: 'El área mínima debe ser menor o igual al área máxima',
    path: ['area_max'],
  }
).refine(
  (data) => {
    if (data.precio_min !== undefined && data.precio_max !== undefined) {
      return data.precio_min <= data.precio_max;
    }
    return true;
  },
  {
    message: 'El precio mínimo debe ser menor o igual al precio máximo',
    path: ['precio_max'],
  }
);

// ============================================================================
// PAGINATION AND SORT SCHEMAS
// ============================================================================

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100, 'El tamaño de página no puede exceder 100').default(10),
});

export const proyectoSortSchema = z.object({
  field: z.enum(['nombre', 'created_at', 'updated_at', 'precio_desde'] as const).default('created_at'),
  order: z.enum(['asc', 'desc'] as const).default('desc'),
});

export const loteSortSchema = z.object({
  field: z.enum(['numero_lote', 'area', 'precio_lista', 'estado', 'created_at'] as const).default('numero_lote'),
  order: z.enum(['asc', 'desc'] as const).default('asc'),
});

// ============================================================================
// EXPORT SCHEMAS
// ============================================================================

export const exportConfigSchema = z.object({
  format: z.enum(['excel', 'csv', 'pdf'] as const),
  includeImages: z.boolean().default(false),
  includeStats: z.boolean().default(true),
  filters: loteFiltersSchema.optional(),
});

// ============================================================================
// GOOGLE MAPS SCHEMAS
// ============================================================================

export const mapPointSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export const mapConfigSchema = z.object({
  center: mapPointSchema,
  zoom: z.number().min(1).max(22).default(15),
  mapTypeId: z.string().default('roadmap'),
  styles: z.array(z.any()).optional(),
});

export const groundOverlayOptionsSchema = z.object({
  bounds: overlayBoundsSchema,
  imageUrl: z.string().url(),
  rotation: z.number().min(0).max(360).default(0),
  opacity: z.number().min(0).max(1).default(1),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Valida y parsea datos con un schema de Zod
 * @param schema - Schema de Zod a utilizar
 * @param data - Datos a validar
 * @returns Objeto con success, data (si es exitoso) o error (si falla)
 */
export function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Extrae mensajes de error legibles de un ZodError
 * @param error - Error de Zod
 * @returns Array de mensajes de error
 */
export function getZodErrorMessages(error: z.ZodError<any>): string[] {
  return error.issues.map((err) => {
    const path = err.path.join('.');
    return path ? `${path}: ${err.message}` : err.message;
  });
}

/**
 * Convierte un ZodError en un objeto con mensajes por campo
 * @param error - Error de Zod
 * @returns Objeto con campos como keys y mensajes como values
 */
export function getZodFieldErrors(error: z.ZodError<any>): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  error.issues.forEach((err) => {
    const field = err.path.join('.');
    if (field && !fieldErrors[field]) {
      fieldErrors[field] = err.message;
    }
  });
  return fieldErrors;
}
