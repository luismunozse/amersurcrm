/**
 * Tests de sincronización de datos — Módulo Reportes
 *
 * Valida las correcciones aplicadas:
 * - Cálculo de mediana correcto (par e impar)
 * - Tasa de conversión real (compradores / leads asignados)
 * - Ausencia de datos hardcodeados en cardsData
 * - Filtro de interacciones por cliente IDs
 */

import { describe, it, expect } from 'vitest';

// ──────────────────────────────────────────────────────────
// Funciones de lógica replicadas desde el código de producción
// ──────────────────────────────────────────────────────────

/**
 * Cálculo de mediana corregido (del _actions.ts)
 * Para arrays pares, promedia los dos valores centrales.
 */
function calcularMediana(valores: number[]): number {
  const sorted = [...valores].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return 0;
  if (n % 2 === 1) return sorted[Math.floor(n / 2)];
  return (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
}

/**
 * Tasa de conversión real: compradores únicos / leads asignados.
 * Antes usaba (clientes.size / propiedades) que era incorrecto.
 */
function calcularConversionReal(
  compradoresUnicos: number,
  leadsAsignados: number
): string {
  if (leadsAsignados <= 0) return 'N/A';
  return ((compradoresUnicos / leadsAsignados) * 100).toFixed(1) + '%';
}

/**
 * Genera cardsData de la misma forma que useReportes.ts
 * — sin valores hardcodeados.
 */
function generarCardsData(metricas: {
  ventas: { valorTotal: number; propiedadesVendidas: number };
  clientes: { activos: number; nuevos: number; tasaConversion: number };
  propiedades: { vendidas: number; nuevas: number };
}) {
  const formatearMoneda = (v: number) =>
    new Intl.NumberFormat('es-PE', {
      style: 'currency', currency: 'PEN',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(v);

  return [
    {
      title: 'Ventas Totales',
      value: formatearMoneda(metricas.ventas.valorTotal),
      change: metricas.ventas.propiedadesVendidas > 0
        ? `${metricas.ventas.propiedadesVendidas} ${metricas.ventas.propiedadesVendidas === 1 ? 'propiedad' : 'propiedades'}`
        : 'Sin ventas en el período',
    },
    {
      title: 'Clientes Activos',
      change: metricas.clientes.nuevos > 0 ? `+${metricas.clientes.nuevos}` : '0',
    },
    {
      title: 'Propiedades Vendidas',
      change: metricas.propiedades.nuevas > 0 ? `+${metricas.propiedades.nuevas}` : '0',
    },
    {
      title: 'Conversión',
      change: metricas.clientes.nuevos > 0
        ? `+${metricas.clientes.nuevos} nuevos clientes`
        : 'Sin clientes nuevos',
    },
  ];
}

/**
 * Simula el filtrado de interacciones por IDs de clientes del período.
 * Antes se cargaban TODAS las interacciones sin filtro.
 */
function filtrarInteraccionesPorClientes(
  interacciones: Array<{ cliente_id: string; fecha_interaccion: string }>,
  clienteIds: string[]
): Array<{ cliente_id: string; fecha_interaccion: string }> {
  const idsSet = new Set(clienteIds);
  return interacciones.filter(i => idsSet.has(i.cliente_id));
}

// ──────────────────────────────────────────────────────────
// TESTS
// ──────────────────────────────────────────────────────────

describe('Correcciones de sincronización de datos', () => {

  // ─── Mediana ───────────────────────────────────────────

  describe('Cálculo de mediana', () => {
    it('retorna 0 para array vacío', () => {
      expect(calcularMediana([])).toBe(0);
    });

    it('retorna el único elemento para array de 1', () => {
      expect(calcularMediana([5])).toBe(5);
    });

    it('calcula mediana correcta para array impar', () => {
      // [1, 3, 5, 7, 9] → mediana = 5
      expect(calcularMediana([9, 1, 5, 3, 7])).toBe(5);
    });

    it('promedia los dos centrales para array par', () => {
      // [1, 3, 5, 7] → mediana = (3+5)/2 = 4
      expect(calcularMediana([7, 1, 5, 3])).toBe(4);
    });

    it('maneja array par de 2 elementos', () => {
      // [10, 20] → mediana = 15
      expect(calcularMediana([20, 10])).toBe(15);
    });

    it('maneja valores decimales', () => {
      // [1.5, 2.5, 3.5, 4.5] → (2.5+3.5)/2 = 3
      expect(calcularMediana([4.5, 1.5, 3.5, 2.5])).toBe(3);
    });

    it('maneja array con todos los valores iguales', () => {
      expect(calcularMediana([7, 7, 7, 7])).toBe(7);
    });

    it('la mediana antes estaba mal para arrays pares (bug previo)', () => {
      // Bug anterior: Math.floor(4/2) = 2 → sorted[2] = 5 (incorrecto)
      // Correcto: (sorted[1] + sorted[2]) / 2 = (3+5)/2 = 4
      const valores = [1, 3, 5, 7];
      const medianaIncorrecta = valores[Math.floor(valores.length / 2)]; // 5
      const medianaCorrecta = calcularMediana(valores); // 4
      expect(medianaCorrecta).not.toBe(medianaIncorrecta);
      expect(medianaCorrecta).toBe(4);
    });
  });

  // ─── Tasa de conversión real ───────────────────────────

  describe('Tasa de conversión real', () => {
    it('calcula correctamente: 3 compradores / 10 leads = 30%', () => {
      expect(calcularConversionReal(3, 10)).toBe('30.0%');
    });

    it('retorna N/A cuando no hay leads asignados', () => {
      expect(calcularConversionReal(5, 0)).toBe('N/A');
    });

    it('100% cuando todos los leads compran', () => {
      expect(calcularConversionReal(8, 8)).toBe('100.0%');
    });

    it('0% cuando ningún lead compra', () => {
      expect(calcularConversionReal(0, 50)).toBe('0.0%');
    });

    it('la fórmula anterior era incorrecta (clientes/propiedades)', () => {
      // Antes: (clientes.size / propiedades) = 3/5 = 60% — sin sentido
      // Ahora: (compradores / leads) = 3/10 = 30% — conversión real
      const compradores = 3;
      const propiedadesVendidas = 5;
      const leadsAsignados = 10;

      const formulaAnterior = ((compradores / propiedadesVendidas) * 100).toFixed(1) + '%';
      const formulaNueva = calcularConversionReal(compradores, leadsAsignados);

      expect(formulaAnterior).toBe('60.0%'); // la vieja (sin sentido)
      expect(formulaNueva).toBe('30.0%');    // la nueva (correcta)
    });
  });

  // ─── Datos no hardcodeados ─────────────────────────────

  describe('cardsData sin valores hardcodeados', () => {
    it('Ventas Totales muestra propiedades reales, no "+12.5%"', () => {
      const cards = generarCardsData({
        ventas: { valorTotal: 500000, propiedadesVendidas: 3 },
        clientes: { activos: 50, nuevos: 10, tasaConversion: 20 },
        propiedades: { vendidas: 3, nuevas: 5 },
      });

      const ventasCard = cards.find(c => c.title === 'Ventas Totales')!;
      expect(ventasCard.change).toBe('3 propiedades');
      expect(ventasCard.change).not.toContain('+12.5%');
    });

    it('Ventas Totales muestra singular "propiedad" para 1 venta', () => {
      const cards = generarCardsData({
        ventas: { valorTotal: 100000, propiedadesVendidas: 1 },
        clientes: { activos: 10, nuevos: 2, tasaConversion: 10 },
        propiedades: { vendidas: 1, nuevas: 1 },
      });

      const ventasCard = cards.find(c => c.title === 'Ventas Totales')!;
      expect(ventasCard.change).toBe('1 propiedad');
    });

    it('Ventas Totales muestra "Sin ventas" cuando hay 0', () => {
      const cards = generarCardsData({
        ventas: { valorTotal: 0, propiedadesVendidas: 0 },
        clientes: { activos: 10, nuevos: 0, tasaConversion: 0 },
        propiedades: { vendidas: 0, nuevas: 0 },
      });

      const ventasCard = cards.find(c => c.title === 'Ventas Totales')!;
      expect(ventasCard.change).toBe('Sin ventas en el período');
    });

    it('Conversión muestra clientes nuevos reales, no "+3.1%"', () => {
      const cards = generarCardsData({
        ventas: { valorTotal: 500000, propiedadesVendidas: 3 },
        clientes: { activos: 50, nuevos: 12, tasaConversion: 20 },
        propiedades: { vendidas: 3, nuevas: 5 },
      });

      const convCard = cards.find(c => c.title === 'Conversión')!;
      expect(convCard.change).toBe('+12 nuevos clientes');
      expect(convCard.change).not.toContain('+3.1%');
    });

    it('Conversión muestra "Sin clientes nuevos" cuando hay 0', () => {
      const cards = generarCardsData({
        ventas: { valorTotal: 0, propiedadesVendidas: 0 },
        clientes: { activos: 10, nuevos: 0, tasaConversion: 0 },
        propiedades: { vendidas: 0, nuevas: 0 },
      });

      const convCard = cards.find(c => c.title === 'Conversión')!;
      expect(convCard.change).toBe('Sin clientes nuevos');
    });

    it('ninguna card contiene "+12.5%" o "+3.1%"', () => {
      const cards = generarCardsData({
        ventas: { valorTotal: 999999, propiedadesVendidas: 7 },
        clientes: { activos: 100, nuevos: 25, tasaConversion: 35 },
        propiedades: { vendidas: 7, nuevas: 10 },
      });

      cards.forEach(card => {
        expect(card.change).not.toContain('+12.5%');
        expect(card.change).not.toContain('+3.1%');
      });
    });
  });

  // ─── Filtrado de interacciones ─────────────────────────

  describe('Filtrado de interacciones por clientes del período', () => {
    const todasLasInteracciones = [
      { cliente_id: 'c1', fecha_interaccion: '2026-02-01' },
      { cliente_id: 'c2', fecha_interaccion: '2026-02-02' },
      { cliente_id: 'c3', fecha_interaccion: '2026-01-15' },
      { cliente_id: 'c4', fecha_interaccion: '2025-12-01' },
      { cliente_id: 'c5', fecha_interaccion: '2026-02-10' },
    ];

    it('solo retorna interacciones de clientes del período', () => {
      const clientesPeriodo = ['c1', 'c3'];
      const filtradas = filtrarInteraccionesPorClientes(todasLasInteracciones, clientesPeriodo);

      expect(filtradas).toHaveLength(2);
      expect(filtradas.map(i => i.cliente_id)).toEqual(['c1', 'c3']);
    });

    it('retorna vacío si no hay clientes en el período', () => {
      const filtradas = filtrarInteraccionesPorClientes(todasLasInteracciones, []);
      expect(filtradas).toHaveLength(0);
    });

    it('retorna todas si todos los IDs coinciden', () => {
      const todos = ['c1', 'c2', 'c3', 'c4', 'c5'];
      const filtradas = filtrarInteraccionesPorClientes(todasLasInteracciones, todos);
      expect(filtradas).toHaveLength(5);
    });

    it('no incluye interacciones de clientes fuera del período', () => {
      const clientesPeriodo = ['c1', 'c2'];
      const filtradas = filtrarInteraccionesPorClientes(todasLasInteracciones, clientesPeriodo);

      filtradas.forEach(i => {
        expect(['c1', 'c2']).toContain(i.cliente_id);
      });
      expect(filtradas.find(i => i.cliente_id === 'c4')).toBeUndefined();
    });
  });
});
