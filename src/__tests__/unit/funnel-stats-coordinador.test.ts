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

import { getCachedFunnelClientes, getCachedImportadosSinTrabajar } from "@/lib/cache.server";
import { getCachedUserId } from "@/lib/supabase.server";
import { EXCLUIR_IMPORTACION_NUNCA_CONTACTADO } from "@/lib/dashboard/aging";

// The current displayed stage set (unchanged by fix 1 — verified against the
// pre-existing implementation, not assumed): 6 estados. `en_proceso` and
// `propietario` are not part of this funnel's displayed distribution today.
const ESTADOS_FUNNEL = ["por_contactar", "contactado", "intermedio", "potencial", "desestimado", "transferido"];

function setupPerfil(rolNombre: string, username = "user1") {
  chains.usuario_perfil = createChainMock({
    data: { username, rol: { nombre: rolNombre } },
    error: null,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  delete chains.cliente;
});

describe("getCachedFunnelClientes — fix 1: per-estado head-count queries (no bulk fetch)", () => {
  it("issues one head-count query per estado instead of a single bulk row fetch", async () => {
    setupPerfil("ROL_ADMIN");
    chains.cliente = createChainMock({ data: null, count: 5, error: null });

    await getCachedFunnelClientes();

    // One .select(...) + .eq('estado_cliente', ...) pair per estado in the
    // funnel — never a plain `.select('estado_cliente')` bulk fetch.
    expect(chains.cliente.select).toHaveBeenCalledTimes(ESTADOS_FUNNEL.length);
    expect(chains.cliente.select).toHaveBeenCalledWith("id", { count: "exact", head: true });
    expect(chains.cliente.select).not.toHaveBeenCalledWith("estado_cliente");

    const estadosConsultados = chains.cliente.eq.mock.calls
      .filter(([campo]: [string]) => campo === "estado_cliente")
      .map(([, valor]: [string, string]) => valor)
      .sort();
    expect(estadosConsultados).toEqual([...ESTADOS_FUNNEL].sort());
  });

  it("returns a count per estado sourced from each head-count query", async () => {
    setupPerfil("ROL_ADMIN");
    chains.cliente = createChainMock({ data: null, count: 42, error: null });

    const resultado = await getCachedFunnelClientes();

    for (const estado of ESTADOS_FUNNEL) {
      expect(resultado[estado]).toBe(42);
    }
  });

  it("falls back to 0 for an estado whose count query errors", async () => {
    setupPerfil("ROL_ADMIN");
    chains.cliente = createChainMock({ data: null, count: null, error: new Error("boom") });

    const resultado = await getCachedFunnelClientes();

    for (const estado of ESTADOS_FUNNEL) {
      expect(resultado[estado]).toBe(0);
    }
  });
});

describe("getCachedFunnelClientes — ADR-2 coordinador global scope", () => {
  // NOTE: since the data-provenance fix, `.or()` is called at least once per
  // estado for EVERY role (the imported-never-contacted exclusion below), so
  // these no longer assert "`.or` not called at all" — they assert the
  // OWNERSHIP `.or()` group specifically is absent for privileged roles.
  it("does not scope any per-estado query by ownership for ROL_COORDINADOR_VENTAS (spec: coordinador sees global funnel, not own-only)", async () => {
    setupPerfil("ROL_COORDINADOR_VENTAS", "coord1");
    chains.cliente = createChainMock({ data: null, count: 0, error: null });

    await getCachedFunnelClientes();

    const ownershipCalls = chains.cliente.or.mock.calls.filter(([filtro]: [string]) =>
      filtro.includes("created_by"),
    );
    expect(ownershipCalls).toHaveLength(0);
  });

  it.each(["ROL_ADMIN", "ROL_GERENTE"])(
    "still does not scope any per-estado query by ownership for %s (unchanged global branch)",
    async (rolNombre) => {
      setupPerfil(rolNombre);
      chains.cliente = createChainMock({ data: null, count: 0, error: null });

      await getCachedFunnelClientes();

      const ownershipCalls = chains.cliente.or.mock.calls.filter(([filtro]: [string]) =>
        filtro.includes("created_by"),
      );
      expect(ownershipCalls).toHaveLength(0);
    },
  );

  it("scopes EVERY per-estado query by ownership for ROL_VENDEDOR (unchanged own-only predicate, applied per estado)", async () => {
    setupPerfil("ROL_VENDEDOR", "vend1");
    chains.cliente = createChainMock({ data: null, count: 0, error: null });

    await getCachedFunnelClientes();

    const ownershipCalls = chains.cliente.or.mock.calls.filter(([filtro]: [string]) =>
      filtro.includes("created_by"),
    );
    expect(ownershipCalls).toHaveLength(ESTADOS_FUNNEL.length);
    for (const [filtro] of ownershipCalls) {
      expect(filtro).toBe("created_by.eq.user-1,vendedor_username.eq.vend1");
    }
  });
});

describe("getCachedFunnelClientes — data-provenance fix: exclude imported clientes never contacted", () => {
  it.each(["ROL_ADMIN", "ROL_GERENTE", "ROL_COORDINADOR_VENTAS", "ROL_VENDEDOR"])(
    "applies the imported-never-contacted exclusion filter to every per-estado query for %s",
    async (rolNombre) => {
      setupPerfil(rolNombre, "user1");
      chains.cliente = createChainMock({ data: null, count: 0, error: null });

      await getCachedFunnelClientes();

      const exclusionCalls = chains.cliente.or.mock.calls.filter(
        ([filtro]: [string]) => filtro === EXCLUIR_IMPORTACION_NUNCA_CONTACTADO,
      );
      expect(exclusionCalls).toHaveLength(ESTADOS_FUNNEL.length);
    },
  );
});

describe("getCachedImportadosSinTrabajar — imported backlog stat (complement of EXCLUIR_IMPORTACION_NUNCA_CONTACTADO)", () => {
  it.each(["ROL_ADMIN", "ROL_GERENTE", "ROL_COORDINADOR_VENTAS"])(
    "counts imported clientes never contacted, without an ownership scope, for %s",
    async (rolNombre) => {
      setupPerfil(rolNombre, "user1");
      chains.cliente = createChainMock({ data: null, count: 22000, error: null });

      const resultado = await getCachedImportadosSinTrabajar();

      expect(chains.cliente.eq).toHaveBeenCalledWith("origen_lead", "importacion");
      expect(chains.cliente.is).toHaveBeenCalledWith("ultimo_contacto", null);
      const ownershipCalls = chains.cliente.or.mock.calls.filter(([filtro]: [string]) =>
        filtro.includes("created_by"),
      );
      expect(ownershipCalls).toHaveLength(0);
      expect(resultado).toBe(22000);
    },
  );

  it("scopes the count by ownership for ROL_VENDEDOR (own-scope predicate, same as getCachedFunnelClientes)", async () => {
    setupPerfil("ROL_VENDEDOR", "vend1");
    chains.cliente = createChainMock({ data: null, count: 3, error: null });

    const resultado = await getCachedImportadosSinTrabajar();

    expect(chains.cliente.or).toHaveBeenCalledWith("created_by.eq.user-1,vendedor_username.eq.vend1");
    expect(resultado).toBe(3);
  });

  it("returns 0 when the count query errors", async () => {
    setupPerfil("ROL_ADMIN");
    chains.cliente = createChainMock({ data: null, count: null, error: new Error("boom") });

    const resultado = await getCachedImportadosSinTrabajar();

    expect(resultado).toBe(0);
  });

  it("returns 0 without querying anything when there is no authenticated user", async () => {
    vi.mocked(getCachedUserId).mockResolvedValueOnce(null as unknown as string);

    const resultado = await getCachedImportadosSinTrabajar();

    expect(resultado).toBe(0);
    expect(mockSupabase.schema).not.toHaveBeenCalled();
  });
});
