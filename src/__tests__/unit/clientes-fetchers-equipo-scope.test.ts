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

function setupVendedor(username = "vend1") {
  chains.usuario_perfil = createChainMock({
    data: { username, rol: { nombre: "ROL_VENDEDOR" } },
    error: null,
  });
}

const PROPIO_FILTRO =
  "created_by.eq.user-1,vendedor_username.eq.vend1,vendedor_asignado.eq.vend1";

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

  it("queries cliente (never the cliente_accesible view) for an individual vendedor", async () => {
    setupVendedor();
    chains.cliente = createChainMock({ data: [], count: 0, error: null });

    await getCachedClientes({});

    // La vista es un UNION ALL: duplicaba filas e inflaba el count, y su
    // `SELECT c.*` congelado se quedaba sin las columnas nuevas de cliente.
    expect(fromSpy).not.toHaveBeenCalledWith("cliente_accesible");
    expect(fromSpy).toHaveBeenCalledWith("cliente");
  });

  it("scopes an individual vendedor with the three-arm propio filter", async () => {
    setupVendedor();
    chains.cliente = createChainMock({ data: [], count: 0, error: null });

    await getCachedClientes({});

    const propioCalls = chains.cliente.or.mock.calls.filter(([f]: [string]) => f === PROPIO_FILTRO);
    expect(propioCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("reports the row count as the total, without deduplicating", async () => {
    setupVendedor();
    const filas = [{ id: "c-1" }, { id: "c-2" }];
    chains.cliente = createChainMock({ data: filas, count: 2, error: null });

    const resultado = await getCachedClientes({});

    expect(resultado.data).toHaveLength(2);
    expect(resultado.total).toBe(2);
  });

  it("searches every field for an individual vendedor, same as a coordinador", async () => {
    setupVendedor();
    chains.cliente = createChainMock({ data: [], count: 0, error: null });

    await getCachedClientes({ searchTerm: "ana@mail.com" });

    const searchCall = chains.cliente.or.mock.calls
      .map(([f]: [string]) => f)
      .find((f: string) => f.includes("email.ilike."));
    expect(searchCall).toContain("nombre.ilike.%ana@mail.com%");
    expect(searchCall).toContain("email.ilike.%ana@mail.com%");
    expect(searchCall).toContain("codigo_cliente.ilike.%ana@mail.com%");
    expect(searchCall).toContain("whatsapp_username.ilike.%ana@mail.com%");
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
