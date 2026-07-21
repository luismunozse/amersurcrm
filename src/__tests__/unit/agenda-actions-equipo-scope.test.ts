import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocking pattern mirrors clientes-fetchers-equipo-scope.test.ts /
// sidebar-badges.test.ts: obtenerEventos() must be rewired off the inlined
// three-role check (ROL_ADMIN/ROL_GERENTE/ROL_COORDINADOR_VENTAS) onto
// getEquipoScope() so coordinador visibility matches the team-scoped RLS
// policy from 20260720000003_coordinador_teams_agenda_rls.sql instead of
// disagreeing with it.
const { mockGetUser, mockSupabase, fromSpy, createChainMock } = vi.hoisted(() => {
  function createChainMock(finalResult: any = { data: [], error: null }) {
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
  const fromSpy = vi.fn((table: string) => {
    if (table === "usuario_perfil") return createChainMock({ data: [], error: null });
    return createChainMock({ data: [], error: null });
  });

  const mockSupabase: any = {
    auth: { getUser: mockGetUser },
    from: fromSpy,
  };

  return { mockGetUser, mockSupabase, fromSpy, createChainMock };
});

vi.mock("@/lib/supabase.server", () => ({
  createServerOnlyClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase)),
}));

vi.mock("@/lib/auth/equipo-scope.server", () => ({
  getEquipoScope: vi.fn(),
}));

vi.mock("@/lib/permissions/server", () => ({
  obtenerPermisosUsuario: vi.fn().mockResolvedValue({ rol: "ROL_VENDEDOR" }),
}));

import { obtenerEventos } from "@/app/dashboard/agenda/actions";
import { getEquipoScope } from "@/lib/auth/equipo-scope.server";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  fromSpy.mockImplementation((table: string) => createChainMock({ data: [], error: null }));
});

describe("obtenerEventos — equipo scope (no vendedorFiltroId)", () => {
  it("applies no vendedor_id filter for tier 'global' (admin/gerente, org-wide unchanged)", async () => {
    (getEquipoScope as any).mockResolvedValue({ tier: "global" });
    const eventoChain = createChainMock({ data: [], error: null });
    fromSpy.mockImplementation((table: string) => (table === "evento" ? eventoChain : createChainMock({ data: [], error: null })));

    await obtenerEventos(new Date());

    expect(eventoChain.eq).not.toHaveBeenCalledWith("vendedor_id", expect.anything());
    expect(eventoChain.in).not.toHaveBeenCalledWith("vendedor_id", expect.anything());
  });

  it("filters by the team's vendedor_id list for tier 'equipo' (coordinador)", async () => {
    (getEquipoScope as any).mockResolvedValue({
      tier: "equipo",
      userId: "coord-1",
      username: "coord1",
      equipoUsernames: ["vend1", "coord1"],
      equipoUserIds: ["vend-1", "coord-1"],
    });
    const eventoChain = createChainMock({ data: [], error: null });
    fromSpy.mockImplementation((table: string) => (table === "evento" ? eventoChain : createChainMock({ data: [], error: null })));

    await obtenerEventos(new Date());

    expect(eventoChain.in).toHaveBeenCalledWith("vendedor_id", ["vend-1", "coord-1"]);
    expect(eventoChain.eq).not.toHaveBeenCalledWith("vendedor_id", expect.anything());
  });

  it("filters by own vendedor_id for tier 'propio' (unchanged vendedor behavior)", async () => {
    (getEquipoScope as any).mockResolvedValue({ tier: "propio", userId: "user-1", username: "vend1" });
    const eventoChain = createChainMock({ data: [], error: null });
    fromSpy.mockImplementation((table: string) => (table === "evento" ? eventoChain : createChainMock({ data: [], error: null })));

    await obtenerEventos(new Date());

    expect(eventoChain.eq).toHaveBeenCalledWith("vendedor_id", "user-1");
  });

  it("short-circuits to an empty array with NO query at all when tier is 'anonimo'", async () => {
    (getEquipoScope as any).mockResolvedValue({ tier: "anonimo" });

    const resultado = await obtenerEventos(new Date());

    expect(resultado).toEqual([]);
    expect(fromSpy).not.toHaveBeenCalled();
  });
});

describe("obtenerEventos — vendedorFiltroId explicit param (unchanged behavior)", () => {
  it("filters by the explicit vendedorFiltroId regardless of scope tier", async () => {
    (getEquipoScope as any).mockResolvedValue({ tier: "global" });
    const eventoChain = createChainMock({ data: [], error: null });
    fromSpy.mockImplementation((table: string) => (table === "evento" ? eventoChain : createChainMock({ data: [], error: null })));

    await obtenerEventos(new Date(), "mes", "explicit-vendedor-id");

    expect(eventoChain.eq).toHaveBeenCalledWith("vendedor_id", "explicit-vendedor-id");
  });
});
