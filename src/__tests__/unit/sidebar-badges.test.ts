import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockServerOnlyClient, mockServiceRoleClient, createChainMock } = vi.hoisted(() => {
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
  const mockServiceRoleClient: any = {
    schema: vi.fn(() => ({ from: vi.fn(() => createChainMock({ data: [], error: null })) })),
  };

  return { mockGetUser, mockServerOnlyClient, mockServiceRoleClient, createChainMock };
});

vi.mock("@/lib/supabase.server", () => ({
  createServerOnlyClient: vi.fn().mockImplementation(() => Promise.resolve(mockServerOnlyClient)),
  createServiceRoleClient: vi.fn(() => mockServiceRoleClient),
}));

import { getSidebarBadges } from "@/app/dashboard/actions/sidebar-badges";

function setupChains(opts: {
  rolNombre: string;
  username?: string;
  cuotasCount?: number;
  equipo?: Array<{ id: string; username: string }>;
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

  // resolveEquipoScope's team lookup goes through a SEPARATE service-role
  // client — only relevant when opts.rolNombre is ROL_COORDINADOR_VENTAS.
  mockServiceRoleClient.schema = vi.fn(() => ({
    from: vi.fn(() => createChainMock({ data: opts.equipo ?? [], error: null })),
  }));

  return { cobranzaChain, eventoChain, recordatorioChain, username };
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

  it.each(["ROL_ADMIN", "ROL_GERENTE"])(
    "omite el filtro de vendedor_username para %s (conteo global, sin cambios)",
    async (rolNombre) => {
      const { cobranzaChain } = setupChains({ rolNombre, cuotasCount: 12 });

      const res = await getSidebarBadges();

      expect(cobranzaChain.in).toHaveBeenCalledWith("estado_cobranza", ["vencida", "en_mora"]);
      expect(cobranzaChain.eq).not.toHaveBeenCalled();
      expect(res.pagos).toBe(12);
    },
  );

  it("filtra por el equipo (usernames) para ROL_COORDINADOR_VENTAS, en vez de conteo global u own-scope", async () => {
    const { cobranzaChain } = setupChains({
      rolNombre: "ROL_COORDINADOR_VENTAS",
      username: "coord1",
      cuotasCount: 5,
      equipo: [{ id: "vend-1", username: "vend1" }],
    });

    const res = await getSidebarBadges();

    expect(cobranzaChain.in).toHaveBeenCalledWith("estado_cobranza", ["vencida", "en_mora"]);
    expect(cobranzaChain.in).toHaveBeenCalledWith("vendedor_username", ["vend1", "coord1"]);
    expect(res.pagos).toBe(5);
  });
});

describe("getSidebarBadges: badge de agenda (eventos + recordatorios)", () => {
  it("filtra eventos/recordatorios por vendedor_id del equipo para ROL_COORDINADOR_VENTAS", async () => {
    const { eventoChain, recordatorioChain } = setupChains({
      rolNombre: "ROL_COORDINADOR_VENTAS",
      username: "coord1",
      equipo: [{ id: "vend-1", username: "vend1" }],
    });

    await getSidebarBadges();

    expect(eventoChain.in).toHaveBeenCalledWith("vendedor_id", ["vend-1", "user-1"]);
    expect(recordatorioChain.in).toHaveBeenCalledWith("vendedor_id", ["vend-1", "user-1"]);
  });

  it("filtra eventos/recordatorios por vendedor_id propio para ROL_VENDEDOR (sin cambios)", async () => {
    const { eventoChain, recordatorioChain } = setupChains({ rolNombre: "ROL_VENDEDOR" });

    await getSidebarBadges();

    expect(eventoChain.eq).toHaveBeenCalledWith("vendedor_id", "user-1");
    expect(recordatorioChain.eq).toHaveBeenCalledWith("vendedor_id", "user-1");
  });
});
