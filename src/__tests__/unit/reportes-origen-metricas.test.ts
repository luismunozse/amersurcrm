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
}));

vi.mock("@/lib/permissions/server", () => ({
  esAdmin: mockEsAdmin,
}));

import { obtenerReporteOrigenLead } from "@/app/dashboard/admin/reportes/actions/origen-lead";
import { fetchMetricasClientes } from "@/app/dashboard/admin/reportes/actions/metricas-fetchers";

beforeEach(() => {
  vi.clearAllMocks();
  mockServerOnlyClient.__reset();
  mockGetUser.mockResolvedValue({ data: { user: { id: "uid-admin" } } });
  mockEsAdmin.mockResolvedValue(true);
});

// ============================================================
// obtenerReporteOrigenLead
// ============================================================

describe("obtenerReporteOrigenLead", () => {
  it("avanzados sólo cuenta estado_cliente en ESTADOS_AVANZADOS (un solo 'contactado' cuenta, estados inválidos no)", async () => {
    const clientesPeriodoChain = createChainMock({
      data: [
        { id: "c1", nombre: "A", origen_lead: "web", estado_cliente: "contactado", fecha_alta: "2026-01-01", vendedor_asignado: "v1" },
        { id: "c2", nombre: "B", origen_lead: "web", estado_cliente: "activo", fecha_alta: "2026-01-02", vendedor_asignado: "v1" },
        { id: "c3", nombre: "C", origen_lead: "web", estado_cliente: "en_seguimiento", fecha_alta: "2026-01-03", vendedor_asignado: "v1" },
        { id: "c4", nombre: "D", origen_lead: "web", estado_cliente: "interesado", fecha_alta: "2026-01-04", vendedor_asignado: "v1" },
        { id: "c5", nombre: "E", origen_lead: "web", estado_cliente: "reserva", fecha_alta: "2026-01-05", vendedor_asignado: "v1" },
        { id: "c6", nombre: "F", origen_lead: "web", estado_cliente: "comprador", fecha_alta: "2026-01-06", vendedor_asignado: "v1" },
      ],
      error: null,
    });
    const totalClientesChain = createChainMock({ data: null, error: null, count: 6 });
    const todosClientesChain = createChainMock({ data: [], error: null });

    let clienteCallCount = 0;
    mockServerOnlyClient.schema = vi.fn((schemaName: string) => ({
      from: vi.fn((table: string) => {
        if (schemaName === "crm" && table === "cliente") {
          clienteCallCount += 1;
          if (clienteCallCount === 1) return clientesPeriodoChain;
          if (clienteCallCount === 2) return totalClientesChain;
          return todosClientesChain;
        }
        return createChainMock();
      }),
    }));

    const res = await obtenerReporteOrigenLead("30");
    expect(res.error).toBeNull();

    const web = res.data?.tasaConversionPorOrigen.find((o: any) => o.origen === "web");
    // sólo 'contactado' es un estado avanzado válido; los otros 5 no lo son.
    expect(web?.avanzados).toBe(1);
    expect(web?.total).toBe(6);
  });
});

// ============================================================
// fetchMetricasClientes
// ============================================================

describe("fetchMetricasClientes", () => {
  function buildSupabase(opts: { leads?: any[]; total?: number; interacciones?: any[]; ventas?: any[] }) {
    const nuevosChain = createChainMock({ data: opts.leads ?? [], error: null });
    const totalChain = createChainMock({ data: null, error: null, count: opts.total ?? 0 });
    const interaccionChain = createChainMock({ data: opts.interacciones ?? [], error: null });
    const ventaChain = createChainMock({ data: opts.ventas ?? [], error: null });

    let clienteCallCount = 0;
    return {
      schema: (schemaName: string) => ({
        from: (table: string) => {
          if (schemaName === "crm" && table === "cliente") {
            clienteCallCount += 1;
            return clienteCallCount === 1 ? nuevosChain : totalChain;
          }
          if (schemaName === "crm" && table === "cliente_interaccion") return interaccionChain;
          if (schemaName === "crm" && table === "venta") return ventaChain;
          return createChainMock();
        },
      }),
    } as any;
  }

  it("convertidos sólo cuenta estado_cliente === 'propietario' (ESTADOS_CONVERTIDOS), no el literal inválido 'cliente'", async () => {
    const supabase = buildSupabase({
      leads: [
        { id: "c1", estado_cliente: "propietario", fecha_alta: "2026-01-01", vendedor_asignado: "v1" },
        { id: "c2", estado_cliente: "propietario", fecha_alta: "2026-01-02", vendedor_asignado: "v1" },
        { id: "c3", estado_cliente: "cliente", fecha_alta: "2026-01-03", vendedor_asignado: "v1" },
        { id: "c4", estado_cliente: "en_proceso", fecha_alta: "2026-01-04", vendedor_asignado: "v1" },
      ],
    });

    const result = await fetchMetricasClientes(supabase, "2026-01-01T00:00:00.000Z", "2026-01-31T23:59:59.999Z");
    // c1+c2 (propietario) cuentan como convertidos = 2/4 = 50%; c3 tiene el
    // literal inválido 'cliente' y NO debe contar (bug: contaba solo c3 → 25%).
    expect(result.tasaConversion).toBe(50);
  });
});
