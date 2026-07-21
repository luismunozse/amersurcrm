import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSupabase, chains, createChainMock, mockGetCachedUserId } = vi.hoisted(() => {
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
  const mockGetCachedUserId = vi.fn();

  const mockSupabase: any = {
    schema: vi.fn(() => ({
      from: vi.fn((table: string) => chains[table] ?? createChainMock()),
    })),
  };

  return { mockSupabase, chains, createChainMock, mockGetCachedUserId };
});

vi.mock("@/lib/supabase.server", () => ({
  createOptimizedServerClient: vi.fn().mockResolvedValue(mockSupabase),
  getCachedUserId: mockGetCachedUserId,
}));

import { getPerfilRol } from "@/lib/dashboard/scope.server";

function setupPerfil(rolNombre: string | null, username = "user1") {
  chains.usuario_perfil = createChainMock({
    data: rolNombre ? { username, rol: { nombre: rolNombre } } : null,
    error: null,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCachedUserId.mockResolvedValue("user-1");
});

describe("getPerfilRol", () => {
  it("resolves esGlobal=true for ROL_ADMIN", async () => {
    setupPerfil("ROL_ADMIN");
    const perfil = await getPerfilRol();
    expect(perfil.esAdmin).toBe(true);
    expect(perfil.esGlobal).toBe(true);
  });

  it("resolves esGlobal=true for ROL_GERENTE", async () => {
    setupPerfil("ROL_GERENTE");
    const perfil = await getPerfilRol();
    expect(perfil.esGerente).toBe(true);
    expect(perfil.esGlobal).toBe(true);
  });

  it("resolves esGlobal=false for ROL_COORDINADOR_VENTAS (team-scoped, no longer global)", async () => {
    setupPerfil("ROL_COORDINADOR_VENTAS", "coord1");
    const perfil = await getPerfilRol();
    expect(perfil.esCoordinador).toBe(true);
    expect(perfil.esGlobal).toBe(false);
  });

  it("resolves esGlobal=false for ROL_VENDEDOR", async () => {
    setupPerfil("ROL_VENDEDOR", "vend1");
    const perfil = await getPerfilRol();
    expect(perfil.esAdmin).toBe(false);
    expect(perfil.esGerente).toBe(false);
    expect(perfil.esCoordinador).toBe(false);
    expect(perfil.esGlobal).toBe(false);
    expect(perfil.username).toBe("vend1");
  });

  it("returns a neutral, non-global profile when there is no authenticated user", async () => {
    mockGetCachedUserId.mockResolvedValue(null);
    const perfil = await getPerfilRol();
    expect(perfil.esGlobal).toBe(false);
    expect(perfil.username).toBeNull();
  });
});
