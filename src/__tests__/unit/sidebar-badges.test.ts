import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockServerOnlyClient, createChainMock } = vi.hoisted(() => {
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

  const mockServerOnlyClient: any = {
    auth: { getUser: mockGetUser },
    schema: vi.fn(() => ({ from: vi.fn(() => createChainMock()) })),
  };

  return { mockGetUser, mockServerOnlyClient, createChainMock };
});

vi.mock("@/lib/supabase.server", () => ({
  createServerOnlyClient: vi.fn().mockImplementation(() => Promise.resolve(mockServerOnlyClient)),
}));

import { getSidebarBadges } from "@/app/dashboard/actions/sidebar-badges";

function setupChains(opts: {
  rolNombre: string;
  username?: string;
  cuotasCount?: number;
}) {
  const username = opts.username ?? "vend1";

  const perfilChain = createChainMock({
    data: { username, rol: { nombre: opts.rolNombre } },
    error: null,
  });
  const clienteChain = createChainMock({ data: null, error: null, count: 0 });
  const interaccionChain = createChainMock({ data: [], error: null });
  const eventoChain = createChainMock({ data: null, error: null, count: 0 });
  const recordatorioChain = createChainMock({ data: null, error: null, count: 0 });
  const cobranzaChain = createChainMock({ data: null, error: null, count: opts.cuotasCount ?? 0 });

  mockServerOnlyClient.schema = vi.fn((schemaName: string) => ({
    from: vi.fn((table: string) => {
      if (schemaName !== "crm") return createChainMock();
      switch (table) {
        case "usuario_perfil":
          return perfilChain;
        case "cliente":
          return clienteChain;
        case "cliente_interaccion":
          return interaccionChain;
        case "evento":
          return eventoChain;
        case "recordatorio":
          return recordatorioChain;
        case "v_cobranza":
          return cobranzaChain;
        default:
          return createChainMock();
      }
    }),
  }));

  return { cobranzaChain, username };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
});

describe("getSidebarBadges: badge de pagos (cobranza)", () => {
  it("filtra por vendedor_username para un vendedor (rol no privilegiado)", async () => {
    const { cobranzaChain, username } = setupChains({ rolNombre: "ROL_VENDEDOR", cuotasCount: 3 });

    const res = await getSidebarBadges();

    expect(cobranzaChain.in).toHaveBeenCalledWith("estado_cobranza", ["vencida", "en_mora"]);
    expect(cobranzaChain.eq).toHaveBeenCalledWith("vendedor_username", username);
    expect(res.pagos).toBe(3);
  });

  it.each(["ROL_ADMIN", "ROL_GERENTE", "ROL_COORDINADOR_VENTAS"])(
    "omite el filtro de vendedor_username para %s (conteo global)",
    async (rolNombre) => {
      const { cobranzaChain } = setupChains({ rolNombre, cuotasCount: 12 });

      const res = await getSidebarBadges();

      expect(cobranzaChain.in).toHaveBeenCalledWith("estado_cobranza", ["vencida", "en_mora"]);
      expect(cobranzaChain.eq).not.toHaveBeenCalled();
      expect(res.pagos).toBe(12);
    },
  );
});
