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
  // `_fetchScorecard` runs behind `buildCachedReportFetcher`, which calls
  // `createServiceRoleClient()` internally (PR1b/PR2 precedent). Reusing
  // `mockServerOnlyClient` here means the direct `_fetchPorVendedor(...)`
  // reconciliation call (against the same mock) and the cached scorecard
  // path share identical underlying data.
  createServiceRoleClient: vi.fn().mockImplementation(() => mockServerOnlyClient),
}));

vi.mock("@/lib/permissions/server", () => ({
  esAdmin: mockEsAdmin,
}));

// `buildCachedReportFetcher` calls `unstable_cache` from `next/cache` at
// module top-level. The global `vitest.setup.ts` mock only stubs
// `revalidatePath`/`revalidateTag` — same documented gotcha as
// `reportes-cobranza-comisiones.test.ts` (PR1a/PR1b precedent).
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (fn: any) => fn,
}));

// Cross-module action (design.md ADR4 pattern, confirmed in PR2 apply-progress):
// mock the whole `_actions-metas` module so none of its transitive
// dependencies (createServerActionClient, permissions, etc.) load.
vi.mock("@/app/dashboard/admin/metas/_actions-metas", () => ({
  obtenerMetas: mockObtenerMetas,
}));

import { obtenerScorecardVendedores } from "@/app/dashboard/admin/reportes/actions/scorecard";
import { _fetchPorVendedor } from "@/app/dashboard/admin/reportes/actions/por-vendedor";
import { calcularFechas } from "@/app/dashboard/admin/reportes/actions/shared";

beforeEach(() => {
  vi.clearAllMocks();
  mockServerOnlyClient.__reset();
  mockGetUser.mockResolvedValue({ data: { user: { id: "uid-admin" } } });
  mockEsAdmin.mockResolvedValue(true);
  mockObtenerMetas.mockResolvedValue({ success: true, data: [] });
});

/**
 * Single active vendedor ("v1") on purpose: `_fetchScorecard` calls
 * `_fetchPorVendedor` once with no filter (catalog) and once per vendedor
 * (row breakdown). With exactly one vendedor whose data is the whole
 * fixture, both calls return identical numbers regardless of whether the
 * mock chain actually honors `.eq('vendedor_username', ...)` — so a single
 * shared chain per table is enough; no call-count routing needed (unlike
 * the same-table multi-query cases in PR1b).
 */
function setupScorecardFixture(opts: {
  clientes?: any[];
  interaccionesPorVendedor?: any[];
  ventas?: any[];
  comisiones?: any[];
  perfiles?: any[];
} = {}) {
  const perfiles = opts.perfiles ?? [{ username: "v1", nombre_completo: "Vendedor Uno" }];
  const usuarioPerfilChain = createChainMock({ data: perfiles, error: null });
  const clienteChain = createChainMock({ data: opts.clientes ?? [], error: null });
  const clienteInteraccionChain = createChainMock({
    data: opts.interaccionesPorVendedor ?? [],
    error: null,
  });
  const clientePropiedadInteresChain = createChainMock({ data: [], error: null });
  const ventaChain = createChainMock({ data: opts.ventas ?? [], error: null });
  const comisionChain = createChainMock({ data: opts.comisiones ?? [], error: null });

  mockServerOnlyClient.schema = vi.fn((schemaName: string) => ({
    from: vi.fn((table: string) => {
      if (schemaName !== "crm") return createChainMock();
      switch (table) {
        case "usuario_perfil": return usuarioPerfilChain;
        case "cliente": return clienteChain;
        case "cliente_interaccion": return clienteInteraccionChain;
        case "cliente_propiedad_interes": return clientePropiedadInteresChain;
        case "venta": return ventaChain;
        case "comision": return comisionChain;
        default: return createChainMock();
      }
    }),
  }));

  return { usuarioPerfilChain, clienteChain, clienteInteraccionChain, ventaChain, comisionChain };
}

describe("obtenerScorecardVendedores: autorizacion", () => {
  it("rechaza si no autenticado", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await obtenerScorecardVendedores("30");
    expect(res.error).toMatch(/autorizado/i);
  });

  it("rechaza si no es admin", async () => {
    mockEsAdmin.mockResolvedValue(false);
    const res = await obtenerScorecardVendedores("30");
    expect(res.error).toMatch(/admin/i);
  });
});

describe("obtenerScorecardVendedores: composicion (ADR5)", () => {
  it("una fila por vendedor activo; conversionPct reconcilia con _fetchPorVendedor (mismos datos, mismo filtro)", async () => {
    setupScorecardFixture({
      clientes: [
        { id: "c1", vendedor_username: "v1", fecha_alta: "2026-06-05T00:00:00.000Z" },
        { id: "c2", vendedor_username: "v1", fecha_alta: "2026-06-10T00:00:00.000Z" },
      ],
      interaccionesPorVendedor: [
        { id: "i1", cliente_id: "c1", vendedor_username: "v1", tipo: "llamada", resultado: "contactado", duracion_minutos: 10, fecha_interaccion: "2026-06-06T00:00:00.000Z", proxima_accion: null },
      ],
      ventas: [
        { id: "vt1", cliente_id: "c1", vendedor_username: "v1", fecha_venta: "2026-06-15T00:00:00.000Z", precio_total: 50000 },
      ],
    });

    const res = await obtenerScorecardVendedores("30", "2026-06-01", "2026-06-30");
    expect(res.error).toBeNull();
    expect(res.data?.filas).toHaveLength(1);

    const fila = res.data!.filas[0];
    expect(fila.username).toBe("v1");
    expect(fila.nombre).toBe("Vendedor Uno");
    expect(fila.leadsAsignados).toBe(2);
    expect(fila.contactados).toBe(1);

    // Reconciliation (spec: "Scorecard reconciles with single-metric tabs"):
    // call the exact same pure fetcher directly, with the exact same filter
    // the scorecard used internally, against the identical mocked data.
    const { startDate, endDate, days } = calcularFechas("30", "2026-06-01", "2026-06-30");
    const directo = await _fetchPorVendedor(
      mockServerOnlyClient,
      startDate.toISOString(),
      endDate.toISOString(),
      days,
      "v1",
    );

    expect(fila.conversionPct).toBe(Number(directo.resumen.conversionGlobal));
    expect(fila.leadsAsignados).toBe(directo.resumen.totalLeads);
    expect(fila.contactados).toBe(directo.resumen.totalContactados);
  });

  it("ventasMonto/ventasCantidad vienen de fetchMetricasVentas.ventasPorVendedor", async () => {
    setupScorecardFixture({
      clientes: [{ id: "c1", vendedor_username: "v1", fecha_alta: "2026-06-05T00:00:00.000Z" }],
      ventas: [
        { id: "vt1", cliente_id: "c1", vendedor_username: "v1", fecha_venta: "2026-06-15T00:00:00.000Z", precio_total: 30000 },
        { id: "vt2", cliente_id: "c1", vendedor_username: "v1", fecha_venta: "2026-06-20T00:00:00.000Z", precio_total: 20000 },
      ],
    });

    const res = await obtenerScorecardVendedores("30", "2026-06-01", "2026-06-30");
    const fila = res.data!.filas[0];
    expect(fila.ventasMonto).toBe(50000);
    expect(fila.ventasCantidad).toBe(2);
  });

  it("comisionGenerada/comisionPagada vienen de _fetchComisiones.porVendedor", async () => {
    setupScorecardFixture({
      clientes: [{ id: "c1", vendedor_username: "v1", fecha_alta: "2026-06-05T00:00:00.000Z" }],
      comisiones: [
        { beneficiario_username: "v1", monto: 1000, estado: "pendiente", fecha_generacion: "2026-06-01", fecha_pago: null, moneda: "PEN" },
        { beneficiario_username: "v1", monto: 2000, estado: "pagada", fecha_generacion: "2026-06-02", fecha_pago: "2026-06-10", moneda: "PEN" },
      ],
    });

    const res = await obtenerScorecardVendedores("30", "2026-06-01", "2026-06-30");
    const fila = res.data!.filas[0];
    expect(fila.comisionGenerada).toBe(3000);
    expect(fila.comisionPagada).toBe(2000);
  });

  it("interacciones viene de _fetchInteracciones.rankingVendedores", async () => {
    setupScorecardFixture({
      clientes: [{ id: "c1", vendedor_username: "v1", fecha_alta: "2026-06-05T00:00:00.000Z" }],
      interaccionesPorVendedor: [
        { id: "i1", cliente_id: "c1", vendedor_username: "v1", tipo: "llamada", resultado: "contactado", duracion_minutos: 5, fecha_interaccion: "2026-06-06T00:00:00.000Z", proxima_accion: null },
        { id: "i2", cliente_id: "c1", vendedor_username: "v1", tipo: "whatsapp", resultado: null, duracion_minutos: 0, fecha_interaccion: "2026-06-07T00:00:00.000Z", proxima_accion: null },
      ],
    });

    const res = await obtenerScorecardVendedores("30", "2026-06-01", "2026-06-30");
    const fila = res.data!.filas[0];
    expect(fila.interacciones).toBe(2);
  });

  it("metaMonto es null (Sin meta asignada) cuando no hay fila meta_vendedor para el período", async () => {
    mockObtenerMetas.mockResolvedValue({ success: true, data: [] });
    setupScorecardFixture({
      clientes: [{ id: "c1", vendedor_username: "v1", fecha_alta: "2026-06-05T00:00:00.000Z" }],
    });

    const res = await obtenerScorecardVendedores("30", "2026-06-01", "2026-06-30");
    const fila = res.data!.filas[0];
    expect(fila.metaMonto).toBeNull();
    expect(fila.metaCumplimientoPct).toBeNull();
  });

  it("metaMonto suma meta_vendedor.meta_ventas_monto del vendedor para el mes solapado; metaCumplimientoPct usa ventasMonto real", async () => {
    mockObtenerMetas.mockResolvedValue({
      success: true,
      data: [{ vendedor_username: "v1", periodo_anio: 2026, periodo_mes: 6, meta_ventas_monto: 40000, meta_ventas_cantidad: 4 }],
    });
    setupScorecardFixture({
      clientes: [{ id: "c1", vendedor_username: "v1", fecha_alta: "2026-06-05T00:00:00.000Z" }],
      ventas: [
        { id: "vt1", cliente_id: "c1", vendedor_username: "v1", fecha_venta: "2026-06-15T00:00:00.000Z", precio_total: 20000 },
      ],
    });

    const res = await obtenerScorecardVendedores("30", "2026-06-01", "2026-06-30");
    const fila = res.data!.filas[0];
    expect(fila.metaMonto).toBe(40000);
    expect(fila.metaCumplimientoPct).toBe(50);
    expect(mockObtenerMetas).toHaveBeenCalledWith({ periodoAnio: 2026, periodoMes: 6 });
  });

  /**
   * WARNING 1 follow-up (verify-report.md, archived reportes-confiables):
   * `tiempo-respuesta.ts` buckets its ranking by `cliente.vendedor_asignado`
   * (a `usuario_perfil.id` UUID), while the scorecard's own row order comes
   * from `_fetchPorVendedor`'s catalog (sorted by `nombre_completo`). This
   * fixture deliberately makes those two orderings DIVERGE — v1 ("Ana Uno")
   * sorts first alphabetically but has the SLOWER response time, v2 ("Beto
   * Dos") sorts second alphabetically but has the FASTER response time — so
   * `rankingVendedores` (sorted "mejor tiempo primero") comes back as
   * [v2, v1], the reverse of `vendedoresActivos` ([v1, v2]). A positional
   * join (`rankingVendedores[i]` assigned to `filas[i]`) would silently swap
   * the two vendedores' values; a correct key-based join (UUID -> username)
   * must not.
   */
  it("tiempoRespuestaHoras resuelve vendedor_asignado (UUID) a username por clave, no por posición", async () => {
    setupScorecardFixture({
      perfiles: [
        { id: "11111111-1111-1111-1111-111111111111", username: "v1", nombre_completo: "Ana Uno" },
        { id: "22222222-2222-2222-2222-222222222222", username: "v2", nombre_completo: "Beto Dos" },
      ],
      clientes: [
        {
          id: "c1", vendedor_username: "v1",
          vendedor_asignado: "11111111-1111-1111-1111-111111111111",
          fecha_alta: "2026-06-05T00:00:00.000Z", estado_cliente: "nuevo",
          telefono: null, email: null,
        },
        {
          id: "c2", vendedor_username: "v2",
          vendedor_asignado: "22222222-2222-2222-2222-222222222222",
          fecha_alta: "2026-06-05T00:00:00.000Z", estado_cliente: "nuevo",
          telefono: null, email: null,
        },
      ],
      interaccionesPorVendedor: [
        // v1: contacted 72h after captación (slow).
        { id: "i1", cliente_id: "c1", vendedor_username: "v1", tipo: "llamada", resultado: "contactado", duracion_minutos: 5, fecha_interaccion: "2026-06-08T00:00:00.000Z", proxima_accion: null },
        // v2: contacted 1h after captación (fast).
        { id: "i2", cliente_id: "c2", vendedor_username: "v2", tipo: "llamada", resultado: "contactado", duracion_minutos: 5, fecha_interaccion: "2026-06-05T01:00:00.000Z", proxima_accion: null },
      ],
    });

    const res = await obtenerScorecardVendedores("30", "2026-06-01", "2026-06-30");
    expect(res.error).toBeNull();
    const filas = res.data!.filas;
    expect(filas).toHaveLength(2);

    const filaV1 = filas.find((f) => f.username === "v1")!;
    const filaV2 = filas.find((f) => f.username === "v2")!;

    expect(filaV1.tiempoRespuestaHoras).toBeCloseTo(72, 1);
    expect(filaV2.tiempoRespuestaHoras).toBeCloseTo(1, 1);
  });

  it("tiempoRespuestaHoras es null (Sin datos) cuando el vendedor no tiene interacciones en el período", async () => {
    setupScorecardFixture({
      perfiles: [{ id: "11111111-1111-1111-1111-111111111111", username: "v1", nombre_completo: "Vendedor Uno" }],
      clientes: [
        {
          id: "c1", vendedor_username: "v1",
          vendedor_asignado: "11111111-1111-1111-1111-111111111111",
          fecha_alta: "2026-06-05T00:00:00.000Z", estado_cliente: "nuevo",
          telefono: null, email: null,
        },
      ],
      interaccionesPorVendedor: [],
    });

    const res = await obtenerScorecardVendedores("30", "2026-06-01", "2026-06-30");
    const fila = res.data!.filas[0];
    expect(fila.tiempoRespuestaHoras).toBeNull();
  });
});
