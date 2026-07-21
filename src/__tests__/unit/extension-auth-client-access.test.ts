import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockServiceRoleClient, chains, createChainMock, createUsuarioPerfilChain } = vi.hoisted(() => {
  function createChainMock(finalResult: any = { data: null, error: null }) {
    const chain: any = {};
    const methods = ["select", "eq", "maybeSingle"];
    for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain);
    chain.then = (resolve: any, reject: any) => Promise.resolve(finalResult).then(resolve, reject);
    return chain;
  }

  // usuario_perfil is queried TWICE per coordinador request, with two
  // different terminal shapes on the SAME table: (a) the caller's own
  // profile, via `.single()` (resolveBearerIdentity AND resolveEquipoScope's
  // own-profile lookup both want this), and (b) the team lookup, via a bare
  // await with no `.single()` (resolveEquipoScope's team query). A single
  // shared `.then` can't serve both different results, so `.single` gets its
  // own independently-resolved mock.
  function createUsuarioPerfilChain(ownProfileResult: any, equipoResult: any) {
    const chain: any = {};
    const methods = ["select", "eq"];
    for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue(ownProfileResult);
    chain.then = (resolve: any, reject: any) => Promise.resolve(equipoResult).then(resolve, reject);
    return chain;
  }

  const mockGetUser = vi.fn();
  const chains: Record<string, any> = {};

  const mockServiceRoleClient: any = {
    auth: { getUser: mockGetUser },
    schema: vi.fn(() => ({ from: vi.fn((table: string) => chains[table] ?? createChainMock()) })),
  };

  return { mockGetUser, mockServiceRoleClient, chains, createChainMock, createUsuarioPerfilChain };
});

vi.mock("@/lib/supabase.server", () => ({
  createServiceRoleClient: vi.fn(() => mockServiceRoleClient),
}));

import { validateBearerAndEnsureClientAccess } from "@/lib/auth/extension-auth";

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of Object.keys(chains)) delete chains[k];
});

describe("validateBearerAndEnsureClientAccess", () => {
  it("returns 401 when token is null", async () => {
    const result = await validateBearerAndEnsureClientAccess(null, "cliente-1");
    expect(result).toEqual({ ok: false, status: 401, error: "No autenticado" });
  });

  it("returns ok: true for ROL_ADMIN regardless of which cliente is targeted", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    chains.usuario_perfil = createUsuarioPerfilChain(
      { data: { username: "admin1", rol: { nombre: "ROL_ADMIN" } }, error: null },
      { data: [], error: null },
    );

    const result = await validateBearerAndEnsureClientAccess("valid-token", "cliente-1");

    expect(result.ok).toBe(true);
  });

  it("returns 403 for ROL_VENDEDOR — unchanged, vendors never had extension access", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "vend-1" } }, error: null });
    chains.usuario_perfil = createUsuarioPerfilChain(
      { data: { username: "vend1", rol: { nombre: "ROL_VENDEDOR" } }, error: null },
      { data: [], error: null },
    );

    const result = await validateBearerAndEnsureClientAccess("valid-token", "cliente-1");

    expect(result).toEqual({ ok: false, status: 403, error: "Permiso insuficiente" });
  });

  describe("ROL_COORDINADOR_VENTAS", () => {
    function setupCoordinador(equipoRows: Array<{ id: string; username: string }>) {
      mockGetUser.mockResolvedValue({ data: { user: { id: "coord-1" } }, error: null });
      chains.usuario_perfil = createUsuarioPerfilChain(
        { data: { username: "coord1", rol: { nombre: "ROL_COORDINADOR_VENTAS" } }, error: null },
        { data: equipoRows, error: null },
      );
    }

    it("allows access when the cliente's vendedor_username is in the coordinador's team", async () => {
      setupCoordinador([{ id: "vend-1", username: "vend1" }]);
      chains.cliente = createChainMock({ data: { vendedor_username: "vend1", created_by: "someone-else" }, error: null });

      const result = await validateBearerAndEnsureClientAccess("valid-token", "cliente-1");

      expect(result.ok).toBe(true);
    });

    it("allows access when the coordinador themself created the cliente, even if vendedor_username belongs to someone else", async () => {
      setupCoordinador([]);
      chains.cliente = createChainMock({ data: { vendedor_username: "otro-equipo", created_by: "coord-1" }, error: null });

      const result = await validateBearerAndEnsureClientAccess("valid-token", "cliente-1");

      expect(result.ok).toBe(true);
    });

    it("returns 403 when the cliente belongs to neither the coordinador nor their team", async () => {
      setupCoordinador([{ id: "vend-1", username: "vend1" }]);
      chains.cliente = createChainMock({ data: { vendedor_username: "otro-vendedor", created_by: "otro-id" }, error: null });

      const result = await validateBearerAndEnsureClientAccess("valid-token", "cliente-1");

      expect(result).toEqual({ ok: false, status: 403, error: "Permiso insuficiente" });
    });

    it("returns 403 (not 404) when the cliente id does not exist, to avoid leaking existence to an unauthorized caller", async () => {
      setupCoordinador([{ id: "vend-1", username: "vend1" }]);
      chains.cliente = createChainMock({ data: null, error: null });

      const result = await validateBearerAndEnsureClientAccess("valid-token", "nonexistent-id");

      expect(result).toEqual({ ok: false, status: 403, error: "Permiso insuficiente" });
    });
  });
});
