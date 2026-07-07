import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockServerOnlyClient, createChainMock, mockEsAdmin } = vi.hoisted(() => {
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

  return { mockGetUser, mockServerOnlyClient, createChainMock, mockEsAdmin };
});

vi.mock("@/lib/supabase.server", () => ({
  createServerOnlyClient: vi.fn().mockImplementation(() => Promise.resolve(mockServerOnlyClient)),
  // PR1b wraps both fetchers with `buildCachedReportFetcher`, which runs the
  // pure `_fetch*` on a service-role client. Reusing `mockServerOnlyClient`
  // here means the existing `setupCuotasYPagos`/`setupComisiones` helpers
  // (which reassign `mockServerOnlyClient.schema`) keep working unchanged.
  createServiceRoleClient: vi.fn().mockImplementation(() => mockServerOnlyClient),
}));

vi.mock("@/lib/permissions/server", () => ({
  esAdmin: mockEsAdmin,
}));

// `buildCachedReportFetcher` calls `unstable_cache` from `next/cache` at
// module top-level (via `cobranza.ts`/`comisiones.ts`'s `fetch*Cached`
// constants). The global `vitest.setup.ts` mock only stubs
// `revalidatePath`/`revalidateTag`, so this file needs its own
// identity-passthrough override (documented gotcha from PR1a apply-progress,
// precedent: `cobranza-gestion-action.test.ts`).
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (fn: any) => fn,
}));

import { obtenerReporteCobranza } from "@/app/dashboard/admin/reportes/actions/cobranza";
import { obtenerReporteComisiones } from "@/app/dashboard/admin/reportes/actions/comisiones";

// `fetchAllRows` rebuilds the whole query chain on every `.range()` retry,
// so a single logical paginated query needs a chain whose OWN `.range()`
// call count decides which page to return — regardless of how many times
// the enclosing `.from(table)` router hands this same chain back out.
function createPagedChainMock(pages: any[][]) {
  const chain: any = {};
  const methods = [
    "select", "insert", "update", "delete", "eq", "neq", "is", "or",
    "order", "single", "in", "limit", "head", "maybeSingle", "not", "gte", "lte",
  ];
  for (const method of methods) chain[method] = vi.fn().mockReturnValue(chain);
  let pageIdx = 0;
  chain.range = vi.fn().mockImplementation(() => {
    const page = pages[pageIdx] ?? [];
    pageIdx += 1;
    return Promise.resolve({ data: page, error: null });
  });
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockServerOnlyClient.__reset();
  mockGetUser.mockResolvedValue({ data: { user: { id: "uid-admin" } } });
  mockEsAdmin.mockResolvedValue(true);
});

// ============================================================
// obtenerReporteCobranza
// ============================================================

describe("obtenerReporteCobranza: autorizacion", () => {
  it("rechaza si no autenticado", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await obtenerReporteCobranza("30");
    expect(res.error).toMatch(/autorizado/i);
  });

  it("rechaza si no es admin", async () => {
    mockEsAdmin.mockResolvedValue(false);
    const res = await obtenerReporteCobranza("30");
    expect(res.error).toMatch(/admin/i);
  });
});

describe("obtenerReporteCobranza: agregaciones", () => {
  function setupCuotasYPagos(opts: {
    cuotas?: any[];
    pagos?: any[];
    cuotasPagadas?: any[];
    ventas?: any[];
  } = {}) {
    const cuotasChain = createChainMock({ data: opts.cuotas ?? [], error: null });
    const pagosChain = createChainMock({ data: opts.pagos ?? [], error: null });
    const cuotasPagadasChain = createChainMock({ data: opts.cuotasPagadas ?? [], error: null });
    const ventaChain = createChainMock({ data: opts.ventas ?? [], error: null });

    // Hack: mismo nombre 'cuota' se llama 2 veces (cuotas activas + cuotas pagadas).
    // Resolver con override progresivo.
    let cuotaCallCount = 0;
    mockServerOnlyClient.schema = vi.fn((schemaName: string) => ({
      from: vi.fn((table: string) => {
        if (schemaName === "crm" && table === "cuota") {
          cuotaCallCount += 1;
          return cuotaCallCount === 1 ? cuotasChain : cuotasPagadasChain;
        }
        if (schemaName === "crm" && table === "pago") return pagosChain;
        if (schemaName === "crm" && table === "venta") return ventaChain;
        return createChainMock();
      }),
    }));
  }

  it("retorna resumen vacio si no hay cuotas ni pagos", async () => {
    setupCuotasYPagos();
    const res = await obtenerReporteCobranza("30");
    expect(res.error).toBeNull();
    expect(res.data?.resumen.saldoTotalPorCobrar).toBe(0);
    expect(res.data?.resumen.recaudadoEnPeriodo).toBe(0);
    expect(res.data?.resumen.cuotasPendientes).toBe(0);
    expect(res.data?.topDeudores).toEqual([]);
  });

  it("calcula saldo y mora sumando cuotas activas (excluye pagadas)", async () => {
    setupCuotasYPagos({
      cuotas: [
        { id: "c1", venta_id: "v1", monto_programado: 1000, monto_pagado: 200, monto_mora: 50, estado: "vencida", fecha_vencimiento: "2026-01-01", moneda: "PEN" },
        { id: "c2", venta_id: "v1", monto_programado: 1000, monto_pagado: 0, monto_mora: 0, estado: "pendiente", fecha_vencimiento: "2030-01-01", moneda: "PEN" },
        { id: "c3", venta_id: "v2", monto_programado: 500, monto_pagado: 500, monto_mora: 0, estado: "pagada", fecha_vencimiento: "2026-02-01", moneda: "PEN" },
      ],
      ventas: [
        { id: "v1", cliente_id: "cl1", cliente: { nombre: "Cliente Uno" } },
        { id: "v2", cliente_id: "cl2", cliente: { nombre: "Cliente Dos" } },
      ],
    });

    const res = await obtenerReporteCobranza("30");
    expect(res.error).toBeNull();
    // saldo = (1000-200) + (1000-0) = 1800; pagada excluida
    expect(res.data?.resumen.saldoTotalPorCobrar).toBe(1800);
    expect(res.data?.resumen.moraTotal).toBe(50);
    expect(res.data?.resumen.cuotasPendientes).toBe(1);
    expect(res.data?.resumen.cuotasVencidas).toBe(1);
  });

  it("suma saldo y mora correctamente cuando cuota abarca >1000 filas en 2 páginas mockeadas", async () => {
    const page1 = Array.from({ length: 1000 }, (_, i) => ({
      id: `c${i}`, venta_id: "v1", monto_programado: 100, monto_pagado: 0, monto_mora: 1,
      estado: "vencida", fecha_vencimiento: "2020-01-01", moneda: "PEN",
    }));
    const page2 = Array.from({ length: 50 }, (_, i) => ({
      id: `c${1000 + i}`, venta_id: "v1", monto_programado: 100, monto_pagado: 0, monto_mora: 1,
      estado: "vencida", fecha_vencimiento: "2020-01-01", moneda: "PEN",
    }));

    const cuotasActivasChain = createPagedChainMock([page1, page2]);
    const cuotasPagadasChain = createChainMock({ data: [], error: null });
    const pagosChain = createChainMock({ data: [], error: null });
    const ventaChain = createChainMock({
      data: [{ id: "v1", cliente_id: "cl1", cliente: { nombre: "Cliente Uno" } }],
      error: null,
    });

    let cuotaCall = 0;
    mockServerOnlyClient.schema = vi.fn((schemaName: string) => ({
      from: vi.fn((table: string) => {
        if (schemaName === "crm" && table === "cuota") {
          cuotaCall += 1;
          // cuotasActivas paginates internally (2 pages, tracked by its own
          // `.range()` call count); once both pages are consumed, the NEXT
          // `.from('cuota')` call belongs to cuotasPagadasPeriodo.
          return cuotaCall <= 2 ? cuotasActivasChain : cuotasPagadasChain;
        }
        if (schemaName === "crm" && table === "pago") return pagosChain;
        if (schemaName === "crm" && table === "venta") return ventaChain;
        return createChainMock();
      }),
    }));

    const res = await obtenerReporteCobranza("30");

    expect(res.error).toBeNull();
    // 1050 cuotas activas @ saldo=100, mora=1 cada una.
    expect(res.data?.resumen.saldoTotalPorCobrar).toBe(105000);
    expect(res.data?.resumen.moraTotal).toBe(1050);
    expect(res.data?.topDeudores[0]?.cuotas_pendientes).toBe(1050);
    expect(res.data?.topDeudores[0]?.saldo_total).toBe(105000);
  });

  it("agrupa top deudores por cliente y suma saldos + mora", async () => {
    setupCuotasYPagos({
      cuotas: [
        { id: "c1", venta_id: "v1", monto_programado: 1000, monto_pagado: 0, monto_mora: 30, estado: "vencida", fecha_vencimiento: "2026-01-01", moneda: "PEN" },
        { id: "c2", venta_id: "v1", monto_programado: 2000, monto_pagado: 500, monto_mora: 0, estado: "vencida", fecha_vencimiento: "2026-02-01", moneda: "PEN" },
      ],
      ventas: [{ id: "v1", cliente_id: "cl1", cliente: { nombre: "Big Debtor" } }],
    });

    const res = await obtenerReporteCobranza("30");
    expect(res.data?.topDeudores).toHaveLength(1);
    expect(res.data?.topDeudores[0].cliente_nombre).toBe("Big Debtor");
    expect(res.data?.topDeudores[0].cuotas_pendientes).toBe(2);
    expect(res.data?.topDeudores[0].saldo_total).toBe(2500); // 1000 + 1500
    expect(res.data?.topDeudores[0].mora_total).toBe(30);
  });

  it("calcula recaudado en periodo desde tabla pago (no anulados)", async () => {
    setupCuotasYPagos({
      pagos: [
        { id: "p1", monto: 500, fecha_pago: new Date().toISOString(), anulado: false },
        { id: "p2", monto: 750, fecha_pago: new Date().toISOString(), anulado: false },
      ],
    });

    const res = await obtenerReporteCobranza("30");
    expect(res.data?.resumen.recaudadoEnPeriodo).toBe(1250);
  });
});

// ============================================================
// obtenerReporteComisiones
// ============================================================

describe("obtenerReporteComisiones: autorizacion", () => {
  it("rechaza si no admin", async () => {
    mockEsAdmin.mockResolvedValue(false);
    const res = await obtenerReporteComisiones("30");
    expect(res.error).toMatch(/admin/i);
  });
});

describe("obtenerReporteComisiones: agregaciones", () => {
  function setupComisiones(comisiones: any[], perfiles: any[] = []) {
    const comisionChain = createChainMock({ data: comisiones, error: null });
    const perfilChain = createChainMock({ data: perfiles, error: null });

    mockServerOnlyClient.schema = vi.fn((schemaName: string) => ({
      from: vi.fn((table: string) => {
        if (schemaName === "crm" && table === "comision") return comisionChain;
        if (schemaName === "crm" && table === "usuario_perfil") return perfilChain;
        return createChainMock();
      }),
    }));
  }

  it("agrega resumen/porVendedor/porMes correctamente cuando comision abarca >1000 filas en 2 páginas mockeadas", async () => {
    const page1 = Array.from({ length: 1000 }, () => ({
      beneficiario_username: "v1", monto: 10, estado: "pendiente",
      fecha_generacion: "2026-04-01", fecha_pago: null, moneda: "PEN",
    }));
    const page2 = Array.from({ length: 50 }, () => ({
      beneficiario_username: "v2", monto: 20, estado: "aprobada",
      fecha_generacion: "2026-04-01", fecha_pago: null, moneda: "PEN",
    }));

    const comisionChain = createPagedChainMock([page1, page2]);
    const perfilChain = createChainMock({ data: [], error: null });

    mockServerOnlyClient.schema = vi.fn((schemaName: string) => ({
      from: vi.fn((table: string) => {
        if (schemaName === "crm" && table === "comision") return comisionChain;
        if (schemaName === "crm" && table === "usuario_perfil") return perfilChain;
        return createChainMock();
      }),
    }));

    const res = await obtenerReporteComisiones("30");

    expect(res.error).toBeNull();
    expect(res.data?.resumen.pendientes).toEqual({ count: 1000, monto: 10000 });
    expect(res.data?.resumen.aprobadas).toEqual({ count: 50, monto: 1000 });
    // totalGenerado = 10000 + 1000 = 11000 (ninguna anulada)
    expect(res.data?.resumen.totalGenerado).toBe(11000);
    const v1 = res.data?.porVendedor.find((v) => v.username === "v1");
    expect(v1?.pendiente_count).toBe(1000);
    expect(v1?.total_generado).toBe(10000);
  });

  it("agrupa por estado con count + monto", async () => {
    setupComisiones([
      { beneficiario_username: "v1", monto: 1000, estado: "pendiente", fecha_generacion: "2026-04-01", fecha_pago: null, moneda: "PEN" },
      { beneficiario_username: "v1", monto: 500, estado: "aprobada", fecha_generacion: "2026-04-15", fecha_pago: null, moneda: "PEN" },
      { beneficiario_username: "v2", monto: 800, estado: "pagada", fecha_generacion: "2026-03-01", fecha_pago: new Date().toISOString(), moneda: "PEN" },
      { beneficiario_username: "v2", monto: 200, estado: "anulada", fecha_generacion: "2026-02-01", fecha_pago: null, moneda: "PEN" },
    ]);

    const res = await obtenerReporteComisiones("30");
    expect(res.error).toBeNull();
    expect(res.data?.resumen.pendientes).toEqual({ count: 1, monto: 1000 });
    expect(res.data?.resumen.aprobadas).toEqual({ count: 1, monto: 500 });
    expect(res.data?.resumen.pagadas).toEqual({ count: 1, monto: 800 });
    expect(res.data?.resumen.anuladas).toEqual({ count: 1, monto: 200 });
    // totalGenerado excluye anuladas: 1000 + 500 + 800 = 2300
    expect(res.data?.resumen.totalGenerado).toBe(2300);
  });

  it("totalPagadoEnPeriodo solo cuenta comisiones pagadas dentro del rango", async () => {
    const dentroPeriodo = new Date().toISOString();
    const fueraPeriodo = "2020-01-01T00:00:00Z";

    setupComisiones([
      { beneficiario_username: "v1", monto: 1000, estado: "pagada", fecha_generacion: "2025-01-01", fecha_pago: dentroPeriodo, moneda: "PEN" },
      { beneficiario_username: "v1", monto: 500, estado: "pagada", fecha_generacion: "2020-01-01", fecha_pago: fueraPeriodo, moneda: "PEN" },
    ]);

    const res = await obtenerReporteComisiones("30");
    expect(res.data?.resumen.totalPagadoEnPeriodo).toBe(1000);
  });

  it("agrupa por vendedor con detalle de estados", async () => {
    setupComisiones(
      [
        { beneficiario_username: "v1", monto: 1000, estado: "pendiente", fecha_generacion: "2026-04-01", fecha_pago: null, moneda: "PEN" },
        { beneficiario_username: "v1", monto: 2000, estado: "pagada", fecha_generacion: "2026-04-01", fecha_pago: "2026-04-10", moneda: "PEN" },
        { beneficiario_username: "v2", monto: 500, estado: "aprobada", fecha_generacion: "2026-04-01", fecha_pago: null, moneda: "PEN" },
      ],
      [
        { username: "v1", nombre_completo: "Juan Vendedor" },
        { username: "v2", nombre_completo: "Maria Vendedora" },
      ],
    );

    const res = await obtenerReporteComisiones("30");
    expect(res.data?.porVendedor).toHaveLength(2);
    const v1 = res.data?.porVendedor.find((v) => v.username === "v1");
    expect(v1?.nombre_completo).toBe("Juan Vendedor");
    expect(v1?.pendiente_count).toBe(1);
    expect(v1?.pagada_monto).toBe(2000);
    expect(v1?.total_generado).toBe(3000);

    const v2 = res.data?.porVendedor.find((v) => v.username === "v2");
    expect(v2?.aprobada_count).toBe(1);
    expect(v2?.total_generado).toBe(500);
  });

  it("ordena vendedores por total_generado descendente", async () => {
    setupComisiones([
      { beneficiario_username: "low", monto: 100, estado: "pendiente", fecha_generacion: "2026-04-01", fecha_pago: null, moneda: "PEN" },
      { beneficiario_username: "high", monto: 5000, estado: "pendiente", fecha_generacion: "2026-04-01", fecha_pago: null, moneda: "PEN" },
      { beneficiario_username: "mid", monto: 1500, estado: "pendiente", fecha_generacion: "2026-04-01", fecha_pago: null, moneda: "PEN" },
    ]);

    const res = await obtenerReporteComisiones("30");
    expect(res.data?.porVendedor.map((v) => v.username)).toEqual(["high", "mid", "low"]);
  });

  it("genera porMes con generado y pagado", async () => {
    // Fechas a mitad de mes para evitar drift por zona horaria.
    setupComisiones([
      { beneficiario_username: "v1", monto: 1000, estado: "pagada", fecha_generacion: "2026-04-15T12:00:00Z", fecha_pago: "2026-04-20T12:00:00Z", moneda: "PEN" },
      { beneficiario_username: "v1", monto: 500, estado: "pendiente", fecha_generacion: "2026-04-22T12:00:00Z", fecha_pago: null, moneda: "PEN" },
    ]);

    const res = await obtenerReporteComisiones("30");
    expect(res.data?.porMes).toHaveLength(1);
    expect(res.data?.porMes[0].month).toMatch(/Abr 2026/);
    expect(res.data?.porMes[0].generado).toBe(1500);
    expect(res.data?.porMes[0].pagado).toBe(1000);
  });
});
