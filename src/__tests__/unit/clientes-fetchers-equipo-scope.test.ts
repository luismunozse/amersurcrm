import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocking pattern mirrors funnel-stats-coordinador.test.ts: a cookie-session
// client (chains) for getEquipoScope()'s own-profile lookup, plus a
// service-role client (serviceChains) for the coordinador's team lookup.
const { mockSupabase, mockServiceRoleClient, chains, serviceChains, fromSpy, createChainMock } = vi.hoisted(() => {
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
  const serviceChains: Record<string, any> = {};

  // A single shared `from` spy (not re-created per `.schema()` call) so tests
  // can assert "table X was never queried" across the whole test, regardless
  // of how many times production code calls `.schema('crm')`.
  const fromSpy = vi.fn((table: string) => chains[table] ?? createChainMock());

  const mockSupabase: any = {
    schema: vi.fn(() => ({ from: fromSpy })),
  };
  const mockServiceRoleClient: any = {
    schema: vi.fn(() => ({
      from: vi.fn((table: string) => serviceChains[table] ?? createChainMock({ data: [], error: null })),
    })),
  };

  return { mockSupabase, mockServiceRoleClient, chains, serviceChains, fromSpy, createChainMock };
});

vi.mock("@/lib/supabase.server", () => ({
  createOptimizedServerClient: vi.fn().mockResolvedValue(mockSupabase),
  createServiceRoleClient: vi.fn(() => mockServiceRoleClient),
  getCachedUserId: vi.fn().mockResolvedValue("user-1"),
}));

import { getCachedClientes, getCachedPipelineClientes } from "@/lib/cache.server";

function setupCoordinador(username = "coord1", equipo: Array<{ id: string; username: string }> = [{ id: "vend-1", username: "vend1" }]) {
  chains.usuario_perfil = createChainMock({
    data: { username, rol: { nombre: "ROL_COORDINADOR_VENTAS" } },
    error: null,
  });
  serviceChains.usuario_perfil = createChainMock({ data: equipo, error: null });
}

function setupAnonimo() {
  chains.usuario_perfil = createChainMock({ data: null, error: null });
}

const TEAM_FILTRO =
  'created_by.in.(vend-1,user-1),vendedor_username.in.("vend1","coord1"),vendedor_asignado.in.("vend1","coord1")';

beforeEach(() => {
  vi.clearAllMocks();
  delete chains.cliente;
  delete chains.cliente_propiedad_interes;
  delete serviceChains.usuario_perfil;
});

describe("getCachedClientes — equipo scope", () => {
  it("applies the coordinador's exact team filter string when no vendedor param is given", async () => {
    setupCoordinador();
    chains.cliente = createChainMock({ data: [], count: 0, error: null });

    await getCachedClientes({});

    const teamCalls = chains.cliente.or.mock.calls.filter(([f]: [string]) => f === TEAM_FILTRO);
    // buildBaseQuery runs twice (data + count query)
    expect(teamCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("short-circuits to an empty result with no cliente query when the caller is anonimo", async () => {
    setupAnonimo();

    const resultado = await getCachedClientes({});

    expect(resultado).toEqual({ data: [], total: 0 });
    expect(fromSpy).not.toHaveBeenCalledWith("cliente");
  });

  it("applies only the vendedor filter (not the team filter) for an in-team vendedor param", async () => {
    setupCoordinador();
    chains.cliente = createChainMock({ data: [], count: 0, error: null });

    await getCachedClientes({ vendedor: "vend1" });

    const vendedorCalls = chains.cliente.or.mock.calls.filter(([f]: [string]) =>
      f === "vendedor_asignado.eq.vend1,vendedor_username.eq.vend1",
    );
    expect(vendedorCalls.length).toBeGreaterThanOrEqual(1);
    const teamCalls = chains.cliente.or.mock.calls.filter(([f]: [string]) => f === TEAM_FILTRO);
    expect(teamCalls).toHaveLength(0);
  });

  it("returns an empty result with NO cliente query for an out-of-team vendedor param (app-layer team bypass fix)", async () => {
    setupCoordinador();
    chains.cliente = createChainMock({ data: [], count: 0, error: null });

    const resultado = await getCachedClientes({ vendedor: "outsider" });

    expect(resultado).toEqual({ data: [], total: 0 });
    expect(fromSpy).not.toHaveBeenCalledWith("cliente");
  });
});

describe("getCachedPipelineClientes — equipo scope", () => {
  it("applies the coordinador's exact team filter string when no vendedor param is given", async () => {
    setupCoordinador();
    chains.cliente = createChainMock({ data: [], count: 0, error: null });
    chains.cliente_interaccion = createChainMock({ data: [], error: null });

    await getCachedPipelineClientes({});

    const teamCalls = chains.cliente.or.mock.calls.filter(([f]: [string]) => f === TEAM_FILTRO);
    expect(teamCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("short-circuits to an empty result with no cliente query when the caller is anonimo", async () => {
    setupAnonimo();

    const resultado = await getCachedPipelineClientes({});

    expect(resultado).toEqual({ clientes: [], totalesPorEstado: {} });
    expect(fromSpy).not.toHaveBeenCalledWith("cliente");
  });

  it("applies only the vendedor filter (not the team filter) for an in-team vendedor param", async () => {
    setupCoordinador();
    chains.cliente = createChainMock({ data: [], count: 0, error: null });
    chains.cliente_interaccion = createChainMock({ data: [], error: null });

    await getCachedPipelineClientes({ vendedor: "vend1" });

    const vendedorCalls = chains.cliente.or.mock.calls.filter(([f]: [string]) =>
      f === "vendedor_asignado.eq.vend1,vendedor_username.eq.vend1",
    );
    expect(vendedorCalls.length).toBeGreaterThanOrEqual(1);
    const teamCalls = chains.cliente.or.mock.calls.filter(([f]: [string]) => f === TEAM_FILTRO);
    expect(teamCalls).toHaveLength(0);
  });

  it("returns an empty result with NO cliente query for an out-of-team vendedor param (app-layer team bypass fix)", async () => {
    setupCoordinador();
    chains.cliente = createChainMock({ data: [], count: 0, error: null });

    const resultado = await getCachedPipelineClientes({ vendedor: "outsider" });

    expect(resultado).toEqual({ clientes: [], totalesPorEstado: {} });
    expect(fromSpy).not.toHaveBeenCalledWith("cliente");
  });
});
