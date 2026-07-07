import { describe, it, expect, vi, beforeEach } from "vitest";
import { EXCLUIR_IMPORTACION_NUNCA_CONTACTADO } from "@/lib/dashboard/aging";

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

import { obtenerMetricasRendimiento } from "@/app/dashboard/admin/reportes/actions/ventas";
import { obtenerReporteClientes, obtenerReporteGestionClientes } from "@/app/dashboard/admin/reportes/actions/clientes";
import { calcularFechas } from "@/app/dashboard/admin/reportes/actions/shared";

beforeEach(() => {
  vi.clearAllMocks();
  mockServerOnlyClient.__reset();
  mockGetUser.mockResolvedValue({ data: { user: { id: "uid-admin" } } });
  mockEsAdmin.mockResolvedValue(true);
});

// ============================================================
// obtenerMetricasRendimiento
// ============================================================

describe("obtenerMetricasRendimiento", () => {
  function setup(opts: { leadsPeriodo?: any[]; ventasClienteId?: any[] } = {}) {
    const clienteChain = createChainMock({ data: opts.leadsPeriodo ?? [], error: null });
    const ventaClienteIdChain = createChainMock({ data: opts.ventasClienteId ?? [], error: null });
    const ventaConClienteChain = createChainMock({ data: [], error: null });

    let ventaCallCount = 0;
    mockServerOnlyClient.schema = vi.fn((schemaName: string) => ({
      from: vi.fn((table: string) => {
        if (schemaName === "crm" && table === "cliente") return clienteChain;
        if (schemaName === "crm" && table === "venta") {
          ventaCallCount += 1;
          return ventaCallCount === 1 ? ventaClienteIdChain : ventaConClienteChain;
        }
        return createChainMock();
      }),
    }));

    return { clienteChain, ventaClienteIdChain };
  }

  it("totalLeads cuenta clientes del período excluyendo el backlog de importación nunca contactado", async () => {
    const { clienteChain } = setup({
      leadsPeriodo: [{ id: "c1" }, { id: "c2" }, { id: "c3" }],
    });

    const res = await obtenerMetricasRendimiento("30");
    expect(res.error).toBeNull();
    expect(res.data?.totalLeads).toBe(3);
    // Nunca filtra por un valor fuera del set válido de EstadoCliente.
    expect(clienteChain.in).not.toHaveBeenCalled();
    expect(clienteChain.or).toHaveBeenCalledWith(EXCLUIR_IMPORTACION_NUNCA_CONTACTADO);
  });

  it("clientesConvertidos sólo cuenta ventas cuyo cliente_id está en el set de leads del período", async () => {
    setup({
      leadsPeriodo: [{ id: "c1" }, { id: "c2" }],
      ventasClienteId: [{ cliente_id: "c1" }, { cliente_id: "c-fuera-de-periodo" }],
    });

    const res = await obtenerMetricasRendimiento("30");
    expect(res.error).toBeNull();
    expect(res.data?.clientesConvertidos).toBe(1);
  });

  it("la conversión es distinta de cero cuando existen ventas en el período", async () => {
    setup({
      leadsPeriodo: [{ id: "c1" }, { id: "c2" }],
      ventasClienteId: [{ cliente_id: "c1" }],
    });

    const res = await obtenerMetricasRendimiento("30");
    expect(res.error).toBeNull();
    expect(res.data?.tasaConversion).toBeGreaterThan(0);
  });
});

// ============================================================
// obtenerReporteClientes
// ============================================================

describe("obtenerReporteClientes", () => {
  function setup(opts: { todosClientes?: any[] } = {}) {
    const clientesNuevosChain = createChainMock({ data: [], error: null });
    const todosClientesChain = createChainMock({ data: opts.todosClientes ?? [], error: null });
    const topClientesChain = createChainMock({ data: [], error: null });
    const ventasClientesChain = createChainMock({ data: [], error: null });

    let clienteCallCount = 0;
    mockServerOnlyClient.schema = vi.fn((schemaName: string) => ({
      from: vi.fn((table: string) => {
        if (schemaName === "crm" && table === "cliente") {
          clienteCallCount += 1;
          if (clienteCallCount === 1) return clientesNuevosChain;
          if (clienteCallCount === 2) return todosClientesChain;
          return topClientesChain;
        }
        if (schemaName === "crm" && table === "venta") return ventasClientesChain;
        return createChainMock();
      }),
    }));
  }

  it('"Clientes Activos" usa pipeline-membership (esEstadoActivo), no === "activo"', async () => {
    setup({
      todosClientes: [
        { id: "c1", estado_cliente: "por_contactar", origen_lead: "web", propiedades_compradas: 0, propiedades_reservadas: 0 },
        { id: "c2", estado_cliente: "en_proceso", origen_lead: "web", propiedades_compradas: 0, propiedades_reservadas: 0 },
        { id: "c3", estado_cliente: "desestimado", origen_lead: "web", propiedades_compradas: 0, propiedades_reservadas: 0 },
      ],
    });

    const res = await obtenerReporteClientes("30");
    expect(res.error).toBeNull();
    const clientesActivosStat = res.data?.clientStats.find((s: any) => s.label === "Clientes Activos");
    // c1 (por_contactar) y c2 (en_proceso) están activos; c3 (desestimado) no.
    expect(clientesActivosStat?.value).toBe(2);
  });
});

// ============================================================
// obtenerReporteGestionClientes
// ============================================================

describe("obtenerReporteGestionClientes", () => {
  it("excluye clientes cuya fecha_alta es posterior a fechaFin en un rango pasado personalizado", async () => {
    const clientesChain = createChainMock({ data: [], error: null });
    const interaccionesChain = createChainMock({ data: [], error: null });

    mockServerOnlyClient.schema = vi.fn((schemaName: string) => ({
      from: vi.fn((table: string) => {
        if (schemaName === "crm" && table === "cliente") return clientesChain;
        if (schemaName === "crm" && table === "cliente_interaccion") return interaccionesChain;
        return createChainMock();
      }),
    }));

    const { endDate } = calcularFechas("30", "2020-01-01", "2020-01-31");
    const res = await obtenerReporteGestionClientes("30", "2020-01-01", "2020-01-31");

    expect(res.error).toBeNull();
    expect(clientesChain.lte).toHaveBeenCalledWith("fecha_alta", endDate.toISOString());
  });
});
