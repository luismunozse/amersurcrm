import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSupabase, chains, createChainMock } = vi.hoisted(() => {
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

  const chains: Record<string, any> = {};

  const mockSupabase: any = {
    schema: vi.fn(() => ({
      from: vi.fn((table: string) => chains[table] ?? createChainMock()),
    })),
  };

  return { mockSupabase, chains, createChainMock };
});

vi.mock("@/lib/supabase.server", () => ({
  createOptimizedServerClient: vi.fn().mockResolvedValue(mockSupabase),
  getCachedUserId: vi.fn().mockResolvedValue("user-1"),
}));

import { getCachedFunnelClientes } from "@/lib/cache.server";

function setupPerfil(rolNombre: string, username = "user1") {
  chains.usuario_perfil = createChainMock({
    data: { username, rol: { nombre: rolNombre } },
    error: null,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCachedFunnelClientes — ADR-2 coordinador global scope", () => {
  it("does not scope the funnel query by ownership for ROL_COORDINADOR_VENTAS (spec: coordinador sees global funnel, not own-only)", async () => {
    setupPerfil("ROL_COORDINADOR_VENTAS", "coord1");
    chains.cliente = createChainMock({ data: [{ estado_cliente: "contactado" }], error: null });

    await getCachedFunnelClientes();

    expect(chains.cliente.or).not.toHaveBeenCalled();
  });

  it.each(["ROL_ADMIN", "ROL_GERENTE"])(
    "still does not scope the funnel query by ownership for %s (unchanged global branch)",
    async (rolNombre) => {
      setupPerfil(rolNombre);
      chains.cliente = createChainMock({ data: [], error: null });

      await getCachedFunnelClientes();

      expect(chains.cliente.or).not.toHaveBeenCalled();
    },
  );

  it("still scopes the funnel query by ownership for ROL_VENDEDOR (unchanged own-only branch)", async () => {
    setupPerfil("ROL_VENDEDOR", "vend1");
    chains.cliente = createChainMock({ data: [], error: null });

    await getCachedFunnelClientes();

    expect(chains.cliente.or).toHaveBeenCalledWith("created_by.eq.user-1,vendedor_username.eq.vend1");
  });
});
