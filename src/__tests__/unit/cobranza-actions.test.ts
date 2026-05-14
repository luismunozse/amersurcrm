import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockServerActionClient, createChainMock } = vi.hoisted(() => {
  function createChainMock(finalResult: any = { data: null, error: null }) {
    const chain: any = {};
    const methods = ["select", "insert", "update", "delete", "eq", "neq", "is", "or", "order", "range", "single", "in", "limit", "head", "maybeSingle", "not", "gte", "lte"];
    for (const method of methods) { chain[method] = vi.fn().mockReturnValue(chain); }
    chain.single.mockImplementation(() => Promise.resolve(finalResult));
    chain.order.mockImplementation(() => Promise.resolve(finalResult));
    chain.range.mockImplementation(() => Promise.resolve(finalResult));
    return chain;
  }
  const mockGetUser = vi.fn();
  const mockServerActionClient = {
    auth: { getUser: mockGetUser },
    from: vi.fn().mockReturnValue(createChainMock()),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return { mockGetUser, mockServerActionClient, createChainMock };
});

vi.mock("@/lib/supabase.server-actions", () => ({
  createServerActionClient: vi.fn().mockImplementation(() => Promise.resolve(mockServerActionClient)),
}));
vi.mock("@/lib/permissions/server", () => ({
  requierePermiso: vi.fn().mockResolvedValue(undefined),
  tienePermiso: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/lib/permissions", () => ({
  PERMISOS: { PAGOS: { VER_TODOS: "pagos.ver_todos" }, MORA: { CALCULAR: "mora.calcular" } },
}));
vi.mock("@/app/dashboard/clientes/_actions-crm-helpers", () => ({
  obtenerUsernameActual: vi.fn().mockResolvedValue({ success: true, username: "admin1", userId: "uid-1" }),
  revalidarCliente: vi.fn(),
}));

import { obtenerCobranza, obtenerResumenCobranza, ejecutarActualizacionMora } from "@/app/dashboard/cobranza/_actions-cobranza";

describe("obtenerCobranza", () => {
  beforeEach(() => { vi.clearAllMocks(); mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } }); });

  it("llama a from para obtener datos de cobranza", async () => {
    const chain = createChainMock();
    chain.range.mockImplementation(() => Promise.resolve({ data: [], error: null }));
    chain.order.mockReturnValue(chain);
    mockServerActionClient.from.mockReturnValue(chain);

    await obtenerCobranza();
    expect(mockServerActionClient.from).toHaveBeenCalled();
  });

  it("maneja error de BD al obtener cobranza", async () => {
    const chain = createChainMock();
    chain.range.mockImplementation(() => Promise.resolve({ data: null, error: { message: "View error" } }));
    chain.order.mockReturnValue(chain);
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await obtenerCobranza();
    expect(result.success).toBe(false);
  });
});

describe("obtenerResumenCobranza", () => {
  beforeEach(() => { vi.clearAllMocks(); mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } }); });

  it("obtiene resumen de cobranza", async () => {
    mockServerActionClient.rpc.mockResolvedValue({
      data: { total_por_cobrar: 500000, total_morosos: 3, total_al_dia: 25 },
      error: null,
    });

    const result = await obtenerResumenCobranza();
    expect(result.success).toBe(true);
  });
});

describe("ejecutarActualizacionMora", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("ejecuta actualización de mora correctamente", async () => {
    mockServerActionClient.rpc.mockResolvedValue({ data: { cuotas_actualizadas: 15 }, error: null });

    const result = await ejecutarActualizacionMora();
    expect(result.success).toBe(true);
  });

  it("maneja error en actualización de mora", async () => {
    mockServerActionClient.rpc.mockResolvedValue({ data: null, error: { message: "RPC error" } });

    const result = await ejecutarActualizacionMora();
    expect(result.success).toBe(false);
  });
});
