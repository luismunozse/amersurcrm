import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockServerActionClient, createChainMock, mockClienteChain } = vi.hoisted(() => {
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
  // Separate chain for `supabase.schema('crm').from('cliente')` — the
  // linked-cliente team-arm lookup (`getClienteIdsEquipo`, reused from
  // command-center.server.ts) queries `cliente` through `.schema()`, never
  // through the bare `.from()` the v_cobranza queries use below.
  const mockClienteChain = createChainMock({ data: [], error: null });
  const mockServerActionClient = {
    auth: { getUser: mockGetUser },
    from: vi.fn().mockReturnValue(createChainMock()),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    schema: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(mockClienteChain) }),
  };
  return { mockGetUser, mockServerActionClient, createChainMock, mockClienteChain };
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

import { obtenerCobranza, obtenerResumenCobranza, obtenerResumenCobranzaScoped, ejecutarActualizacionMora } from "@/app/dashboard/cobranza/_actions-cobranza";
import type { EquipoScope } from "@/lib/auth/equipo-scope.server";

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

describe("obtenerResumenCobranzaScoped", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: team owns no clientes — tests that only care about the
    // vendedor_username arm don't need to set this up explicitly.
    (mockClienteChain as any).then = (resolve: any) =>
      Promise.resolve({ data: [], error: null }).then(resolve);
  });

  it("returns a zeroed summary without querying for propio/anonimo tiers (MoraAlertasBlock is never rendered for them)", async () => {
    const propio: EquipoScope = { tier: "propio", userId: "u1", username: "vend1" };
    const resultado = await obtenerResumenCobranzaScoped(propio);

    expect(resultado.success).toBe(true);
    expect(resultado.data).toEqual({
      total_cuotas: 0, por_vencer: 0, vencidas: 0, en_mora: 0, monto_por_cobrar: 0, monto_mora_total: 0,
    });
    expect(mockServerActionClient.from).not.toHaveBeenCalled();
  });

  it("queries without a vendedor_username filter for tier: global", async () => {
    const selectChain = createChainMock();
    mockServerActionClient.from.mockReturnValue(selectChain);
    (selectChain as any).then = (resolve: any) => Promise.resolve({
      data: [{ estado_cobranza: "en_mora", monto_programado: 1000, monto_pagado: 200, monto_mora: 50, dias_atraso: 10 }],
      error: null,
    }).then(resolve);

    const global: EquipoScope = { tier: "global" };
    const resultado = await obtenerResumenCobranzaScoped(global);

    expect(resultado.success).toBe(true);
    expect(resultado.data!.en_mora).toBe(1);
    expect(resultado.data!.monto_mora_total).toBe(50);
    // The only team-scoping mechanism this function has is `.in()` (used by
    // the equipo tier below) — asserting it was never called on this chain
    // is the real proof that tier: "global" ran unfiltered, unlike the old
    // `.eq('vendedor_username', ...)` assertion which no tier ever uses (a
    // tautology that would pass even if the global branch were broken).
    expect(selectChain.in).not.toHaveBeenCalled();
  });

  it("filters by the team's usernames for tier: equipo", async () => {
    const selectChain = createChainMock();
    (selectChain as any).then = (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve);
    mockServerActionClient.from.mockReturnValue(selectChain);

    const equipo: EquipoScope = { tier: "equipo", userId: "coord-1", username: "coord1", equipoUsernames: ["coord1", "vend1"], equipoUserIds: ["coord-1", "vend-1"] };
    await obtenerResumenCobranzaScoped(equipo);

    // The team filter is now an `.or()` (vendedor_username arm plus the
    // linked-cliente arm below), not a bare `.in()` — mirrors
    // getAlertasSinGestionarCount/getVentasMensuales in command-center.server.ts.
    expect(selectChain.or).toHaveBeenCalledWith('vendedor_username.in.("coord1","vend1")');
    expect(selectChain.in).not.toHaveBeenCalled();
  });

  it("includes the linked-cliente team arm in the mora total for tier: equipo", async () => {
    (mockClienteChain as any).then = (resolve: any) =>
      Promise.resolve({ data: [{ id: "c1" }, { id: "c2" }], error: null }).then(resolve);

    const selectChain = createChainMock();
    (selectChain as any).then = (resolve: any) =>
      Promise.resolve({
        data: [{ estado_cobranza: "en_mora", monto_programado: 1000, monto_pagado: 200, monto_mora: 50, dias_atraso: 10 }],
        error: null,
      }).then(resolve);
    mockServerActionClient.from.mockReturnValue(selectChain);

    const equipo: EquipoScope = { tier: "equipo", userId: "coord-1", username: "coord1", equipoUsernames: ["coord1", "vend1"], equipoUserIds: ["coord-1", "vend-1"] };
    const resultado = await obtenerResumenCobranzaScoped(equipo);

    expect(selectChain.or).toHaveBeenCalledWith(
      'vendedor_username.in.("coord1","vend1"),cliente_id.in.("c1","c2")',
    );
    expect(resultado.success).toBe(true);
    expect(resultado.data!.monto_mora_total).toBe(50);
  });

  it("fails CLOSED to a zeroed summary without querying v_cobranza when the team has no valid usernames and owns no clientes", async () => {
    (mockClienteChain as any).then = (resolve: any) =>
      Promise.resolve({ data: [], error: null }).then(resolve);

    const selectChain = createChainMock();
    mockServerActionClient.from.mockReturnValue(selectChain);

    const equipoSinUsernames: EquipoScope = {
      tier: "equipo",
      userId: "coord-1",
      username: "",
      equipoUsernames: [],
      equipoUserIds: ["coord-1"],
    };
    const resultado = await obtenerResumenCobranzaScoped(equipoSinUsernames);

    expect(resultado.success).toBe(true);
    expect(resultado.data).toEqual({
      total_cuotas: 0, por_vencer: 0, vencidas: 0, en_mora: 0, monto_por_cobrar: 0, monto_mora_total: 0,
    });
    // v_cobranza must never be queried unfiltered — proves the doubly-empty
    // team filter short-circuits BEFORE the query is built (same fail-closed
    // guarantee as getAlertasSinGestionarCount/getVentasMensuales).
    expect(mockServerActionClient.from).not.toHaveBeenCalled();
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
