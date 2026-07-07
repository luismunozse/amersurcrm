import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockServerOnlyClient, createChainMock, mockEsAdmin, mockObtenerMetas } =
  vi.hoisted(() => {
    function createChainMock(finalResult: any = { data: null, error: null }) {
      const chain: any = {};
      const methods = [
        "select", "insert", "update", "delete", "eq", "neq", "is", "or",
        "order", "range", "single", "in", "limit", "head", "maybeSingle", "not", "gte", "lte",
      ];
      for (const method of methods) chain[method] = vi.fn().mockReturnValue(chain);
      chain.then = (resolve: any, reject: any) =>
        Promise.resolve(finalResult).then(resolve, reject);
      return chain;
    }

    const mockGetUser = vi.fn();
    const mockEsAdmin = vi.fn();
    const mockObtenerMetas = vi.fn();

    const schemaChains: Record<string, Record<string, any>> = {};

    const mockServerOnlyClient: any = {
      auth: { getUser: mockGetUser },
      schema: vi.fn((schemaName: string) => ({
        from: vi.fn((table: string) => schemaChains[schemaName]?.[table] ?? createChainMock()),
      })),
      from: vi.fn((_table: string) => createChainMock()),
      __setSchemaChain(schemaName: string, table: string, chain: any) {
        if (!schemaChains[schemaName]) schemaChains[schemaName] = {};
        schemaChains[schemaName][table] = chain;
      },
      __reset() {
        for (const k of Object.keys(schemaChains)) delete schemaChains[k];
      },
    };

    return { mockGetUser, mockServerOnlyClient, createChainMock, mockEsAdmin, mockObtenerMetas };
  });

vi.mock("@/lib/supabase.server", () => ({
  createServerOnlyClient: vi.fn().mockImplementation(() => Promise.resolve(mockServerOnlyClient)),
}));

vi.mock("@/lib/permissions/server", () => ({
  esAdmin: mockEsAdmin,
}));

vi.mock("@/app/dashboard/admin/metas/_actions-metas", () => ({
  obtenerMetas: mockObtenerMetas,
}));

import { obtenerReporteVentas, obtenerObjetivosVsRealidad } from "@/app/dashboard/admin/reportes/actions/ventas";
import { obtenerReporteRendimiento } from "@/app/dashboard/admin/reportes/actions/rendimiento";
import { calcularFechas, calcularVentanaAnterior } from "@/app/dashboard/admin/reportes/actions/shared";

beforeEach(() => {
  vi.clearAllMocks();
  mockServerOnlyClient.__reset();
  mockGetUser.mockResolvedValue({ data: { user: { id: "uid-admin" } } });
  mockEsAdmin.mockResolvedValue(true);
});

// ============================================================
// obtenerReporteVentas — real ventasPeriodoAnterior
// ============================================================

describe("obtenerReporteVentas — ventasPeriodoAnterior", () => {
  it("equals the real prior-window venta.precio_total sum, not the hardcoded 0", async () => {
    const { startDate, endDate } = calcularFechas("30", "2026-06-01", "2026-06-30");
    const { prevStart, prevEnd } = calcularVentanaAnterior(startDate, endDate);

    const ventaChain = createChainMock({
      data: [{ id: "v1", precio_total: 50000, moneda: "PEN", fecha_venta: "2026-06-10", forma_pago: "contado", vendedor_username: "u1" }],
      error: null,
    });
    const ventaPrevChain = createChainMock({
      data: [{ precio_total: 12000 }, { precio_total: 8000 }],
      error: null,
    });

    let ventaCallCount = 0;
    mockServerOnlyClient.schema = vi.fn((schemaName: string) => ({
      from: vi.fn((table: string) => {
        if (schemaName === "crm" && table === "venta") {
          ventaCallCount += 1;
          return ventaCallCount === 1 ? ventaChain : ventaPrevChain;
        }
        return createChainMock();
      }),
    }));

    const res = await obtenerReporteVentas("30", "2026-06-01", "2026-06-30");

    expect(res.error).toBeNull();
    expect(res.data?.resumen.ventasPeriodoAnterior).toBe(20000);
    expect(ventaPrevChain.gte).toHaveBeenCalledWith("fecha_venta", prevStart.toISOString());
    expect(ventaPrevChain.lte).toHaveBeenCalledWith("fecha_venta", prevEnd.toISOString());
  });
});

// ============================================================
// obtenerObjetivosVsRealidad — meta_vendedor wiring
// ============================================================

describe("obtenerObjetivosVsRealidad", () => {
  function setup(opts: { ventasReales?: any[]; clientesNuevos?: any[] } = {}) {
    const ventaChain = createChainMock({ data: opts.ventasReales ?? [], error: null });
    const clienteChain = createChainMock({ data: opts.clientesNuevos ?? [], error: null });

    mockServerOnlyClient.schema = vi.fn((schemaName: string) => ({
      from: vi.fn((table: string) => {
        if (schemaName === "crm" && table === "venta") return ventaChain;
        if (schemaName === "crm" && table === "cliente") return clienteChain;
        return createChainMock();
      }),
    }));

    return { ventaChain, clienteChain };
  }

  it("ventasMensuales.meta / propiedades.meta sum meta_vendedor across vendedores for the overlapped month", async () => {
    mockObtenerMetas.mockResolvedValue({
      success: true,
      data: [
        { vendedor_username: "u1", periodo_anio: 2026, periodo_mes: 6, meta_ventas_monto: 10000, meta_ventas_cantidad: 5 },
        { vendedor_username: "u2", periodo_anio: 2026, periodo_mes: 6, meta_ventas_monto: 20000, meta_ventas_cantidad: 10 },
      ],
    });
    setup();

    const res = await obtenerObjetivosVsRealidad("30", "2026-06-05", "2026-06-20");

    expect(res.error).toBeNull();
    expect(res.data?.ventasMensuales.meta).toBe(30000);
    expect(res.data?.ventasMensuales.esEstimado).toBe(false);
    expect(res.data?.propiedades.meta).toBe(15);
    expect(res.data?.propiedades.esEstimado).toBe(false);
    expect(mockObtenerMetas).toHaveBeenCalledWith({ periodoAnio: 2026, periodoMes: 6 });
  });

  it("sums meta_vendedor across every overlapped month for a multi-month period", async () => {
    mockObtenerMetas.mockImplementation(({ periodoMes }: { periodoAnio: number; periodoMes: number }) => {
      if (periodoMes === 6) {
        return Promise.resolve({ success: true, data: [{ vendedor_username: "u1", meta_ventas_monto: 10000, meta_ventas_cantidad: 5 }] });
      }
      return Promise.resolve({ success: true, data: [{ vendedor_username: "u1", meta_ventas_monto: 15000, meta_ventas_cantidad: 6 }] });
    });
    setup();

    const res = await obtenerObjetivosVsRealidad("45", "2026-06-20", "2026-07-05");

    expect(res.error).toBeNull();
    expect(res.data?.ventasMensuales.meta).toBe(25000);
    expect(res.data?.propiedades.meta).toBe(11);
    expect(mockObtenerMetas).toHaveBeenCalledWith({ periodoAnio: 2026, periodoMes: 6 });
    expect(mockObtenerMetas).toHaveBeenCalledWith({ periodoAnio: 2026, periodoMes: 7 });
  });

  it("flags esEstimado true (never a bare heuristic number) when zero meta_vendedor rows exist for the period", async () => {
    mockObtenerMetas.mockResolvedValue({ success: true, data: [] });
    setup({ ventasReales: [{ precio_total: 5000 }] });

    const res = await obtenerObjetivosVsRealidad("30", "2026-06-01", "2026-06-30");

    expect(res.error).toBeNull();
    expect(res.data?.ventasMensuales.meta).toBe(0);
    expect(res.data?.ventasMensuales.esEstimado).toBe(true);
    expect(res.data?.propiedades.meta).toBe(0);
    expect(res.data?.propiedades.esEstimado).toBe(true);
  });

  it("clientesNuevos.meta is always null — meta_vendedor has no clientes-nuevos target column", async () => {
    mockObtenerMetas.mockResolvedValue({
      success: true,
      data: [{ vendedor_username: "u1", meta_ventas_monto: 10000, meta_ventas_cantidad: 5 }],
    });
    setup({ clientesNuevos: [{ id: "c1" }, { id: "c2" }] });

    const res = await obtenerObjetivosVsRealidad("30", "2026-06-01", "2026-06-30");

    expect(res.error).toBeNull();
    expect(res.data?.clientesNuevos.meta).toBeNull();
    expect(res.data?.clientesNuevos.esEstimado).toBe(false);
    expect(res.data?.clientesNuevos.realizado).toBe(2);
  });
});

// ============================================================
// obtenerReporteRendimiento — topPerformers meta from meta_vendedor
// ============================================================

describe("obtenerReporteRendimiento — meta source", () => {
  function setup(opts: { vendedores?: any[]; ventas?: any[]; leads?: any[] } = {}) {
    const vendedoresChain = createChainMock({
      data: opts.vendedores ?? [
        { id: "1", username: "u1", nombre_completo: "Ana Perez", activo: true, meta_mensual_ventas: 0 },
      ],
      error: null,
    });
    const ventasChain = createChainMock({ data: opts.ventas ?? [], error: null });
    const leadsChain = createChainMock({ data: opts.leads ?? [], error: null });

    mockServerOnlyClient.schema = vi.fn((schemaName: string) => ({
      from: vi.fn((table: string) => {
        if (schemaName === "crm" && table === "usuario_perfil") return vendedoresChain;
        if (schemaName === "crm" && table === "venta") return ventasChain;
        if (schemaName === "crm" && table === "cliente") return leadsChain;
        return createChainMock();
      }),
    }));

    return { vendedoresChain, ventasChain, leadsChain };
  }

  it("reads meta_vendedor.meta_ventas_monto for the vendedor across mesesEnRango, replacing usuario_perfil.meta_mensual_ventas", async () => {
    mockObtenerMetas.mockResolvedValue({
      success: true,
      data: [{ vendedor_username: "u1", meta_ventas_monto: 40000, meta_ventas_cantidad: 4 }],
    });
    setup({
      vendedores: [{ id: "1", username: "u1", nombre_completo: "Ana Perez", activo: true, meta_mensual_ventas: 999999 }],
      ventas: [{ vendedor_username: "u1", precio_total: 20000, fecha_venta: "2026-06-10", cliente_id: "c1" }],
    });

    const res = await obtenerReporteRendimiento("30", "2026-06-01", "2026-06-30");

    expect(res.error).toBeNull();
    const ana = res.data?.topPerformers.find((p) => p.name === "Ana Perez");
    expect(ana?.meta).toBe(40000);
    expect(ana?.cumplimiento).toBe("50.0");
  });

  it("meta/cumplimiento are null when no meta_vendedor row exists and no usuario_perfil fallback is configured", async () => {
    mockObtenerMetas.mockResolvedValue({ success: true, data: [] });
    setup({
      vendedores: [{ id: "1", username: "u1", nombre_completo: "Ana Perez", activo: true, meta_mensual_ventas: 0 }],
      ventas: [{ vendedor_username: "u1", precio_total: 20000, fecha_venta: "2026-06-10", cliente_id: "c1" }],
    });

    const res = await obtenerReporteRendimiento("30", "2026-06-01", "2026-06-30");

    expect(res.error).toBeNull();
    const ana = res.data?.topPerformers.find((p) => p.name === "Ana Perez");
    expect(ana?.meta).toBeNull();
    expect(ana?.cumplimiento).toBeNull();
  });

  it("falls back to usuario_perfil.meta_mensual_ventas only when no meta_vendedor row exists", async () => {
    mockObtenerMetas.mockResolvedValue({ success: true, data: [] });
    setup({
      vendedores: [{ id: "1", username: "u1", nombre_completo: "Ana Perez", activo: true, meta_mensual_ventas: 15000 }],
      ventas: [{ vendedor_username: "u1", precio_total: 15000, fecha_venta: "2026-06-10", cliente_id: "c1" }],
    });

    const res = await obtenerReporteRendimiento("30", "2026-06-01", "2026-06-30");

    expect(res.error).toBeNull();
    const ana = res.data?.topPerformers.find((p) => p.name === "Ana Perez");
    expect(ana?.meta).toBe(15000);
    expect(ana?.cumplimiento).toBe("100.0");
  });

  it("resumen.vendedoresQueSuperaronMeta only counts vendedores with a non-null meta", async () => {
    mockObtenerMetas.mockResolvedValue({
      success: true,
      data: [{ vendedor_username: "u1", meta_ventas_monto: 10000, meta_ventas_cantidad: 1 }],
    });
    setup({
      vendedores: [
        { id: "1", username: "u1", nombre_completo: "Ana Perez", activo: true, meta_mensual_ventas: 0 },
        { id: "2", username: "u2", nombre_completo: "Beto Ruiz", activo: true, meta_mensual_ventas: 0 },
      ],
      ventas: [
        { vendedor_username: "u1", precio_total: 15000, fecha_venta: "2026-06-10", cliente_id: "c1" },
        { vendedor_username: "u2", precio_total: 99999, fecha_venta: "2026-06-11", cliente_id: "c2" },
      ],
    });

    const res = await obtenerReporteRendimiento("30", "2026-06-01", "2026-06-30");

    expect(res.error).toBeNull();
    // u1 has a real meta (10000) and superó it; u2 has no meta_vendedor row and
    // no usuario_perfil fallback (0), so u2's meta is null and can't "count".
    expect(res.data?.resumen.vendedoresQueSuperaronMeta).toBe(1);
  });
});
