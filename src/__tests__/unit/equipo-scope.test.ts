import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockOptimizedClient, mockServiceRoleClient, chains, serviceChains, createChainMock } = vi.hoisted(() => {
  function createChainMock(finalResult: any = { data: null, error: null }) {
    const chain: any = {};
    const methods = ["select", "eq", "single"];
    for (const method of methods) chain[method] = vi.fn().mockReturnValue(chain);
    chain.then = (resolve: any, reject: any) => Promise.resolve(finalResult).then(resolve, reject);
    return chain;
  }

  const chains: Record<string, any> = {};
  const serviceChains: Record<string, any> = {};

  const mockOptimizedClient: any = {
    schema: vi.fn(() => ({
      from: vi.fn((table: string) => chains[table] ?? createChainMock()),
    })),
    from: vi.fn((table: string) => chains[table] ?? createChainMock()),
  };
  const mockServiceRoleClient: any = {
    schema: vi.fn(() => ({
      from: vi.fn((table: string) => serviceChains[table] ?? createChainMock()),
    })),
  };

  return { mockOptimizedClient, mockServiceRoleClient, chains, serviceChains, createChainMock };
});

vi.mock("@/lib/supabase.server", () => ({
  createOptimizedServerClient: vi.fn().mockResolvedValue(mockOptimizedClient),
  createServiceRoleClient: vi.fn(() => mockServiceRoleClient),
  getCachedUserId: vi.fn().mockResolvedValue("user-1"),
}));

import { getEquipoScope, resolveEquipoScope, equipoOrFilter } from "@/lib/auth/equipo-scope.server";

function setupPerfil(rolNombre: string | null, username = "coord1") {
  chains.usuario_perfil = createChainMock({
    data: rolNombre ? { username, rol: { nombre: rolNombre } } : null,
    error: null,
  });
}

function setupEquipo(miembros: Array<{ id: string; username: string }>) {
  serviceChains.usuario_perfil = createChainMock({
    data: miembros,
    error: null,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getEquipoScope", () => {
  it("resolves tier=global for ROL_ADMIN", async () => {
    setupPerfil("ROL_ADMIN", "admin1");
    const scope = await getEquipoScope();
    expect(scope).toEqual({ tier: "global" });
  });

  it("resolves tier=global for ROL_GERENTE", async () => {
    setupPerfil("ROL_GERENTE", "gerente1");
    const scope = await getEquipoScope();
    expect(scope).toEqual({ tier: "global" });
  });

  it("resolves tier=equipo for ROL_COORDINADOR_VENTAS, including own username/id plus team", async () => {
    setupPerfil("ROL_COORDINADOR_VENTAS", "coord1");
    setupEquipo([{ id: "vend-1", username: "vend1" }, { id: "vend-2", username: "vend2" }]);

    const scope = await getEquipoScope();

    expect(scope.tier).toBe("equipo");
    if (scope.tier === "equipo") {
      expect(scope.userId).toBe("user-1");
      expect(scope.username).toBe("coord1");
      expect(scope.equipoUsernames.sort()).toEqual(["coord1", "vend1", "vend2"].sort());
      expect(scope.equipoUserIds.sort()).toEqual(["user-1", "vend-1", "vend-2"].sort());
    }
  });

  it("resolves tier=equipo with only the coordinador's own username/id when the team is empty", async () => {
    setupPerfil("ROL_COORDINADOR_VENTAS", "coord1");
    setupEquipo([]);

    const scope = await getEquipoScope();

    expect(scope.tier).toBe("equipo");
    if (scope.tier === "equipo") {
      expect(scope.equipoUsernames).toEqual(["coord1"]);
      expect(scope.equipoUserIds).toEqual(["user-1"]);
    }
  });

  it("resolves tier=propio for ROL_VENDEDOR", async () => {
    setupPerfil("ROL_VENDEDOR", "vend1");
    const scope = await getEquipoScope();
    expect(scope).toEqual({ tier: "propio", userId: "user-1", username: "vend1" });
  });

  it("resolves tier=anonimo when there is no profile row", async () => {
    setupPerfil(null);
    const scope = await getEquipoScope();
    expect(scope).toEqual({ tier: "anonimo" });
  });
});

describe("resolveEquipoScope (explicit client/userId — Bearer-token flow)", () => {
  it("accepts a pre-resolved supabase client and userId instead of reading cookies", async () => {
    setupPerfil("ROL_COORDINADOR_VENTAS", "coord1");
    setupEquipo([{ id: "vend-1", username: "vend1" }]);

    const scope = await resolveEquipoScope(mockOptimizedClient, "user-1");

    expect(scope.tier).toBe("equipo");
  });
});

describe("equipoOrFilter", () => {
  it("returns null for tier=global (no ownership filter needed)", () => {
    expect(equipoOrFilter({ tier: "global" })).toBeNull();
  });

  it("returns null for tier=anonimo", () => {
    expect(equipoOrFilter({ tier: "anonimo" })).toBeNull();
  });

  it("builds .in() filters over team UUIDs and usernames for tier=equipo (RLS-aligned, Issue #1/#2)", () => {
    const filtro = equipoOrFilter({
      tier: "equipo",
      userId: "coord-uuid",
      username: "coord1",
      equipoUsernames: ["coord1", "vend1", "vend2"],
      equipoUserIds: ["coord-uuid", "vend-1", "vend-2"],
    });
    // Issue #1: created_by must use .in() over ALL team UUIDs (RLS allows any team member as creator)
    expect(filtro).toContain("created_by.in.(coord-uuid,vend-1,vend-2)");
    // Issue #2: must include vendedor_asignado arms alongside vendedor_username
    expect(filtro).toContain('vendedor_username.in.("coord1","vend1","vend2")');
    expect(filtro).toContain('vendedor_asignado.in.("coord1","vend1","vend2")');
  });

  it("falls back to created_by-only when the coordinador's team list is empty (Issue #1)", () => {
    const filtro = equipoOrFilter({
      tier: "equipo",
      userId: "coord-uuid",
      username: "coord1",
      equipoUsernames: [],
      equipoUserIds: ["coord-uuid"],
    });
    // When team is empty, still use .in() for RLS consistency
    expect(filtro).toBe("created_by.in.(coord-uuid)");
  });

  it("builds the own-ownership filter for tier=propio with vendedor_asignado arm (Issue #2)", () => {
    const filtro = equipoOrFilter({ tier: "propio", userId: "vend-uuid", username: "vend1" });
    // Issue #2: propio tier must also include vendedor_asignado arm
    expect(filtro).toContain("created_by.eq.vend-uuid");
    expect(filtro).toContain("vendedor_username.eq.vend1");
    expect(filtro).toContain("vendedor_asignado.eq.vend1");
  });

  it("falls back to created_by-only for tier=propio with no username", () => {
    const filtro = equipoOrFilter({ tier: "propio", userId: "vend-uuid", username: null });
    expect(filtro).toBe("created_by.eq.vend-uuid");
  });

  it("filters out usernames with invalid characters before interpolation (Issue #3)", () => {
    // Issue #3: malicious username with comma/parens/quotes should be excluded & warned
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const filtro = equipoOrFilter({
      tier: "equipo",
      userId: "coord-uuid",
      username: "coord1",
      equipoUsernames: ["coord1", 'evil,or(id.gt.0)', "vend2"], // invalid username in middle
      equipoUserIds: ["coord-uuid", "vend-invalid-1", "vend-2"],
    });
    // Only valid usernames should appear in the filter
    expect(filtro).toContain('"coord1"');
    expect(filtro).toContain('"vend2"');
    expect(filtro).not.toContain("evil"); // malicious username filtered out
    expect(consoleSpy).toHaveBeenCalled(); // warn logged for invalid username
    consoleSpy.mockRestore();
  });

  it("logs perfil-query error before returning anonimo (Issue #4)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // Setup an error response on the perfil query
    chains.usuario_perfil = createChainMock({
      data: null,
      error: { message: "RLS violation" },
    });

    const scope = await resolveEquipoScope(mockOptimizedClient, "user-1");

    // Issue #4: error should be logged with [equipo-scope] context prefix
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[equipo-scope]"),
      expect.anything()
    );
    expect(scope).toEqual({ tier: "anonimo" });
    consoleSpy.mockRestore();
  });
});
