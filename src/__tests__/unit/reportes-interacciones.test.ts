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

import { obtenerReporteInteracciones } from "@/app/dashboard/admin/reportes/actions/interacciones";
import { calcularFechas } from "@/app/dashboard/admin/reportes/actions/shared";

beforeEach(() => {
  vi.clearAllMocks();
  mockServerOnlyClient.__reset();
  mockGetUser.mockResolvedValue({ data: { user: { id: "uid-admin" } } });
  mockEsAdmin.mockResolvedValue(true);
});

describe("obtenerReporteInteracciones", () => {
  it("excluye interacciones posteriores a fechaFin en un rango pasado personalizado", async () => {
    const interaccionesChain = createChainMock({ data: [], error: null });
    const vendedoresChain = createChainMock({ data: [], error: null });

    mockServerOnlyClient.schema = vi.fn((schemaName: string) => ({
      from: vi.fn((table: string) => {
        if (schemaName === "crm" && table === "cliente_interaccion") return interaccionesChain;
        if (schemaName === "crm" && table === "usuario_perfil") return vendedoresChain;
        return createChainMock();
      }),
    }));

    const { endDate } = calcularFechas("30", "2020-01-01", "2020-01-31");
    const res = await obtenerReporteInteracciones("30", "2020-01-01", "2020-01-31");

    expect(res.error).toBeNull();
    expect(interaccionesChain.lte).toHaveBeenCalledWith("fecha_interaccion", endDate.toISOString());
  });
});
