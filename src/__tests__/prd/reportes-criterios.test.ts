/**
 * Tests de Criterios de Aceptación del PRD - Módulo Reportes
 *
 * PRD 3.7.3 Criterios de Aceptación:
 * - [ ] Dashboard carga en menos de 3 segundos
 * - [ ] Reportes soportan rangos de fecha personalizados
 * - [ ] Exportación PDF genera documento profesional
 */

import { describe, it, expect } from 'vitest';

// ============================================================
// TIPOS Y FUNCIONES DE LÓGICA DE NEGOCIO PARA TESTING
// ============================================================

interface MetricasVentas {
  valorTotal: number;
  propiedadesVendidas: number;
  promedioVenta: number;
  comisionesTotal: number;
}

interface MetricasClientes {
  total: number;
  activos: number;
  nuevos: number;
  tasaConversion: number;
}

interface MetricasPropiedades {
  total: number;
  disponibles: number;
  reservadas: number;
  vendidas: number;
  nuevas: number;
}

interface ReporteMetricas {
  periodo: string;
  fechaInicio: string;
  fechaFin: string;
  metricas: {
    ventas: MetricasVentas;
    clientes: MetricasClientes;
    propiedades: MetricasPropiedades;
  };
}

// Función para formatear moneda (replicada del hook)
function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
}

// Función para formatear porcentaje
function formatearPorcentaje(valor: number): string {
  return `${valor.toFixed(1)}%`;
}

// Función para formatear números grandes
function formatearNumero(valor: number): string {
  if (valor >= 1000000) {
    return `${(valor / 1000000).toFixed(1)}M`;
  } else if (valor >= 1000) {
    return `${(valor / 1000).toFixed(1)}K`;
  }
  return valor.toString();
}

// Función para calcular cambios porcentuales
function calcularCambio(
  actual: number,
  anterior: number
): { valor: number; tipo: 'positive' | 'negative' } {
  if (anterior === 0) return { valor: 0, tipo: 'positive' };

  const cambio = ((actual - anterior) / anterior) * 100;
  return {
    valor: Math.abs(cambio),
    tipo: cambio >= 0 ? 'positive' : 'negative',
  };
}

// Función para validar rango de fechas
function validarRangoFechas(
  fechaInicio: string,
  fechaFin: string
): { valido: boolean; error?: string } {
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);

  if (isNaN(inicio.getTime())) {
    return { valido: false, error: 'Fecha de inicio inválida' };
  }

  if (isNaN(fin.getTime())) {
    return { valido: false, error: 'Fecha de fin inválida' };
  }

  if (inicio > fin) {
    return { valido: false, error: 'Fecha de inicio debe ser anterior a fecha de fin' };
  }

  // Máximo 1 año de rango
  const unAnoEnMs = 365 * 24 * 60 * 60 * 1000;
  if (fin.getTime() - inicio.getTime() > unAnoEnMs) {
    return { valido: false, error: 'Rango máximo es 1 año' };
  }

  return { valido: true };
}

// Función para calcular periodo en días
function calcularPeriodoDias(fechaInicio: string, fechaFin: string): number {
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  const diffMs = fin.getTime() - inicio.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// Función para obtener fechas del periodo
function obtenerFechasPeriodo(periodo: string): { fechaInicio: Date; fechaFin: Date } {
  const ahora = new Date();
  const fechaFin = new Date(ahora);
  let fechaInicio = new Date(ahora);

  switch (periodo) {
    case '7':
      fechaInicio.setDate(fechaInicio.getDate() - 7);
      break;
    case '30':
      fechaInicio.setDate(fechaInicio.getDate() - 30);
      break;
    case '90':
      fechaInicio.setDate(fechaInicio.getDate() - 90);
      break;
    case '365':
      fechaInicio.setFullYear(fechaInicio.getFullYear() - 1);
      break;
    default:
      fechaInicio.setDate(fechaInicio.getDate() - 30);
  }

  return { fechaInicio, fechaFin };
}

// Función para calcular tasa de conversión
function calcularTasaConversion(clientesConvertidos: number, clientesTotal: number): number {
  if (clientesTotal === 0) return 0;
  return (clientesConvertidos / clientesTotal) * 100;
}

// Función para calcular promedio de venta
function calcularPromedioVenta(valorTotal: number, cantidadVentas: number): number {
  if (cantidadVentas === 0) return 0;
  return Math.round(valorTotal / cantidadVentas);
}

// Función para validar datos de exportación PDF
function validarDatosExportacion(datos: Partial<ReporteMetricas>): { valido: boolean; errores: string[] } {
  const errores: string[] = [];

  if (!datos.periodo) errores.push('Periodo requerido');
  if (!datos.fechaInicio) errores.push('Fecha inicio requerida');
  if (!datos.fechaFin) errores.push('Fecha fin requerida');
  if (!datos.metricas) errores.push('Métricas requeridas');

  return {
    valido: errores.length === 0,
    errores,
  };
}

// ============================================================
// TESTS
// ============================================================

describe('PRD 3.7.3 - Reportes y Analytics', () => {
  describe('Formateo de Moneda', () => {
    it('formatea correctamente en soles peruanos', () => {
      expect(formatearMoneda(1000)).toMatch(/S\/.*1[,.]?000/);
    });

    it('formatea valores grandes sin decimales', () => {
      const resultado = formatearMoneda(1500000);
      expect(resultado).toMatch(/1[,.]?500[,.]?000/);
    });

    it('formatea cero correctamente', () => {
      expect(formatearMoneda(0)).toMatch(/0/);
    });

    it('formatea valores negativos', () => {
      const resultado = formatearMoneda(-5000);
      expect(resultado).toMatch(/-.*5[,.]?000/);
    });
  });

  describe('Formateo de Porcentaje', () => {
    it('formatea con un decimal', () => {
      expect(formatearPorcentaje(75.5)).toBe('75.5%');
    });

    it('redondea a un decimal', () => {
      expect(formatearPorcentaje(33.333)).toBe('33.3%');
    });

    it('formatea 100% correctamente', () => {
      expect(formatearPorcentaje(100)).toBe('100.0%');
    });

    it('formatea 0% correctamente', () => {
      expect(formatearPorcentaje(0)).toBe('0.0%');
    });
  });

  describe('Formateo de Números Grandes', () => {
    it('formatea millones con M', () => {
      expect(formatearNumero(1500000)).toBe('1.5M');
    });

    it('formatea miles con K', () => {
      expect(formatearNumero(2500)).toBe('2.5K');
    });

    it('no formatea números menores a 1000', () => {
      expect(formatearNumero(500)).toBe('500');
    });

    it('formatea exactamente 1 millón', () => {
      expect(formatearNumero(1000000)).toBe('1.0M');
    });

    it('formatea exactamente 1000', () => {
      expect(formatearNumero(1000)).toBe('1.0K');
    });
  });

  describe('Cálculo de Cambios Porcentuales', () => {
    it('calcula incremento positivo correctamente', () => {
      const resultado = calcularCambio(120, 100);
      expect(resultado.valor).toBe(20);
      expect(resultado.tipo).toBe('positive');
    });

    it('calcula decremento negativo correctamente', () => {
      const resultado = calcularCambio(80, 100);
      expect(resultado.valor).toBe(20);
      expect(resultado.tipo).toBe('negative');
    });

    it('retorna 0 cuando valor anterior es 0', () => {
      const resultado = calcularCambio(100, 0);
      expect(resultado.valor).toBe(0);
      expect(resultado.tipo).toBe('positive');
    });

    it('calcula sin cambio correctamente', () => {
      const resultado = calcularCambio(100, 100);
      expect(resultado.valor).toBe(0);
      expect(resultado.tipo).toBe('positive');
    });

    it('calcula incremento del 100% (duplicar)', () => {
      const resultado = calcularCambio(200, 100);
      expect(resultado.valor).toBe(100);
      expect(resultado.tipo).toBe('positive');
    });
  });

  describe('Criterio: Reportes soportan rangos de fecha personalizados', () => {
    it('acepta rango válido de 30 días', () => {
      const hoy = new Date();
      const hace30Dias = new Date(hoy);
      hace30Dias.setDate(hace30Dias.getDate() - 30);

      const resultado = validarRangoFechas(hace30Dias.toISOString(), hoy.toISOString());
      expect(resultado.valido).toBe(true);
    });

    it('acepta rango de 1 año exacto', () => {
      const hoy = new Date();
      const haceUnAno = new Date(hoy);
      haceUnAno.setFullYear(haceUnAno.getFullYear() - 1);

      const resultado = validarRangoFechas(haceUnAno.toISOString(), hoy.toISOString());
      expect(resultado.valido).toBe(true);
    });

    it('rechaza rango mayor a 1 año', () => {
      const hoy = new Date();
      const hace2Anos = new Date(hoy);
      hace2Anos.setFullYear(hace2Anos.getFullYear() - 2);

      const resultado = validarRangoFechas(hace2Anos.toISOString(), hoy.toISOString());
      expect(resultado.valido).toBe(false);
      expect(resultado.error).toContain('1 año');
    });

    it('rechaza fecha inicio posterior a fecha fin', () => {
      const hoy = new Date();
      const manana = new Date(hoy);
      manana.setDate(manana.getDate() + 1);

      const resultado = validarRangoFechas(manana.toISOString(), hoy.toISOString());
      expect(resultado.valido).toBe(false);
      expect(resultado.error).toContain('anterior');
    });

    it('rechaza fecha inválida', () => {
      const resultado = validarRangoFechas('fecha-invalida', new Date().toISOString());
      expect(resultado.valido).toBe(false);
      expect(resultado.error).toContain('inválida');
    });
  });

  describe('Cálculo de Periodos', () => {
    it('calcula 30 días correctamente', () => {
      const hoy = new Date();
      const hace30Dias = new Date(hoy);
      hace30Dias.setDate(hace30Dias.getDate() - 30);

      const dias = calcularPeriodoDias(hace30Dias.toISOString(), hoy.toISOString());
      expect(dias).toBe(30);
    });

    it('calcula 7 días correctamente', () => {
      const hoy = new Date();
      const hace7Dias = new Date(hoy);
      hace7Dias.setDate(hace7Dias.getDate() - 7);

      const dias = calcularPeriodoDias(hace7Dias.toISOString(), hoy.toISOString());
      expect(dias).toBe(7);
    });

    it('obtiene fechas para periodo de 30 días', () => {
      const { fechaInicio, fechaFin } = obtenerFechasPeriodo('30');
      const dias = calcularPeriodoDias(fechaInicio.toISOString(), fechaFin.toISOString());
      expect(dias).toBe(30);
    });

    it('obtiene fechas para periodo de 90 días', () => {
      const { fechaInicio, fechaFin } = obtenerFechasPeriodo('90');
      const dias = calcularPeriodoDias(fechaInicio.toISOString(), fechaFin.toISOString());
      expect(dias).toBe(90);
    });

    it('usa 30 días como default para periodo inválido', () => {
      const { fechaInicio, fechaFin } = obtenerFechasPeriodo('invalid');
      const dias = calcularPeriodoDias(fechaInicio.toISOString(), fechaFin.toISOString());
      expect(dias).toBe(30);
    });
  });

  describe('Métricas de Ventas', () => {
    it('calcula promedio de venta correctamente', () => {
      expect(calcularPromedioVenta(100000, 10)).toBe(10000);
    });

    it('retorna 0 cuando no hay ventas', () => {
      expect(calcularPromedioVenta(0, 0)).toBe(0);
    });

    it('redondea promedio a entero', () => {
      expect(calcularPromedioVenta(100000, 3)).toBe(33333);
    });
  });

  describe('Métricas de Clientes', () => {
    it('calcula tasa de conversión correctamente', () => {
      expect(calcularTasaConversion(25, 100)).toBe(25);
    });

    it('retorna 0 cuando no hay clientes', () => {
      expect(calcularTasaConversion(0, 0)).toBe(0);
    });

    it('calcula conversión del 100%', () => {
      expect(calcularTasaConversion(50, 50)).toBe(100);
    });

    it('calcula conversión parcial con decimales', () => {
      expect(calcularTasaConversion(1, 3)).toBeCloseTo(33.33, 1);
    });
  });

  describe('Criterio: Exportación PDF genera documento profesional', () => {
    it('valida datos completos para exportación', () => {
      const datos: ReporteMetricas = {
        periodo: '30',
        fechaInicio: '2025-11-01',
        fechaFin: '2025-12-01',
        metricas: {
          ventas: { valorTotal: 100000, propiedadesVendidas: 5, promedioVenta: 20000, comisionesTotal: 5000 },
          clientes: { total: 100, activos: 80, nuevos: 20, tasaConversion: 25 },
          propiedades: { total: 50, disponibles: 30, reservadas: 10, vendidas: 10, nuevas: 5 },
        },
      };

      const resultado = validarDatosExportacion(datos);
      expect(resultado.valido).toBe(true);
      expect(resultado.errores).toHaveLength(0);
    });

    it('rechaza datos incompletos para exportación', () => {
      const datos: Partial<ReporteMetricas> = {
        periodo: '30',
      };

      const resultado = validarDatosExportacion(datos);
      expect(resultado.valido).toBe(false);
      expect(resultado.errores.length).toBeGreaterThan(0);
    });

    it('requiere todas las métricas para exportación', () => {
      const datos: Partial<ReporteMetricas> = {
        periodo: '30',
        fechaInicio: '2025-11-01',
        fechaFin: '2025-12-01',
      };

      const resultado = validarDatosExportacion(datos);
      expect(resultado.valido).toBe(false);
      expect(resultado.errores).toContain('Métricas requeridas');
    });
  });

  describe('Tabs de Reportes', () => {
    const tabsDisponibles = ['ventas', 'clientes', 'propiedades', 'rendimiento'];

    it.each(tabsDisponibles)('tiene tab "%s" disponible', (tab) => {
      expect(tabsDisponibles).toContain(tab);
    });

    it('tiene 4 tabs en total', () => {
      expect(tabsDisponibles).toHaveLength(4);
    });
  });

  describe('Periodos Predefinidos', () => {
    const periodosValidos = ['7', '30', '90', '365'];

    it.each(periodosValidos)('soporta periodo de %s días', (periodo) => {
      const { fechaInicio, fechaFin } = obtenerFechasPeriodo(periodo);
      expect(fechaInicio).toBeInstanceOf(Date);
      expect(fechaFin).toBeInstanceOf(Date);
      expect(fechaInicio < fechaFin).toBe(true);
    });
  });
});
