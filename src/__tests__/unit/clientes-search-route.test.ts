import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================
// Hoisted mocks
// ============================================================

const {
  mockGetUser,
  mockPerfilSingle,
  mockPerfilThen,
  mockClienteMaybeSingle,
  mockClienteEq,
  mockClienteOr,
  mockServiceRoleClient,
} = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  const mockPerfilSingle = vi.fn();
  const mockPerfilThen = vi.fn();
  const mockClienteMaybeSingle = vi.fn();
  const mockClienteEq = vi.fn();
  const mockClienteOr = vi.fn();

  const mockServiceRoleClient: any = {
    auth: { getUser: mockGetUser },
    schema: vi.fn(),
  };

  return {
    mockGetUser,
    mockPerfilSingle,
    mockPerfilThen,
    mockClienteMaybeSingle,
    mockClienteEq,
    mockClienteOr,
    mockServiceRoleClient,
  };
});

vi.mock("@/lib/supabase.server", () => ({
  createServiceRoleClient: vi.fn(() => mockServiceRoleClient),
  createServerOnlyClient: vi.fn(() => Promise.resolve(mockServiceRoleClient)),
}));

// Import after mocks — resolveEquipoScope/equipoOrFilter are NOT mocked here,
// so the real filter contract (created_by/vendedor_username/vendedor_asignado
// arms, username sanitization) is exercised end-to-end.
import { GET } from "@/app/api/clientes/search/route";
import { equipoOrFilter } from "@/lib/auth/equipo-scope.server";

// ============================================================
// Test setup
// ============================================================

beforeEach(() => {
  vi.clearAllMocks();

  // Rebuild cliente chain (keeps mockClienteEq/mockClienteOr/mockClienteMaybeSingle references)
  const clienteChain: any = {};
  clienteChain.select = vi.fn().mockReturnValue(clienteChain);
  clienteChain.or = mockClienteOr;
  clienteChain.eq = mockClienteEq;
  clienteChain.order = vi.fn().mockReturnValue(clienteChain);
  clienteChain.limit = vi.fn().mockReturnValue(clienteChain);
  clienteChain.maybeSingle = mockClienteMaybeSingle;
  // eq/or must return the chain itself so further chaining works
  mockClienteEq.mockReturnValue(clienteChain);
  mockClienteOr.mockReturnValue(clienteChain);

  // Rebuild perfil chain
  const perfilChain: any = {};
  perfilChain.select = vi.fn().mockReturnThis();
  perfilChain.eq = vi.fn().mockReturnThis();
  perfilChain.single = mockPerfilSingle;
  perfilChain.then = (resolve: any, reject: any) => Promise.resolve(mockPerfilThen()).then(resolve, reject);

  mockServiceRoleClient.schema.mockReturnValue({
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "usuario_perfil") return perfilChain;
      return clienteChain;
    }),
  });

  // Safe defaults
  mockGetUser.mockResolvedValue({ data: { user: { id: "uid-test" } }, error: null });
  mockPerfilSingle.mockResolvedValue({ data: null, error: null }); // no profile by default
  mockPerfilThen.mockReturnValue({ data: [], error: null }); // no team by default
  mockClienteMaybeSingle.mockResolvedValue({ data: null, error: null }); // no client found
});

// ============================================================
// Helpers
// ============================================================

function bearerRequest(phone: string) {
  return new NextRequest(
    `http://localhost/api/clientes/search?phone=${encodeURIComponent(phone)}`,
    { headers: { Authorization: "Bearer valid-token" } }
  );
}

// ============================================================
// Tests — authorization hardening (PR1 extension)
// ============================================================

describe("GET /api/clientes/search — authorization hardening", () => {
  describe("null-profile guard", () => {
    it("returns 403 when Bearer caller has no CRM profile", async () => {
      // mockPerfilSingle default already returns { data: null } — no profile

      const res = await GET(bearerRequest("+51999999999"));

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("Permiso insuficiente");
    });

    it("returns 403 when Bearer caller profile has null role", async () => {
      mockPerfilSingle.mockResolvedValue({
        data: { username: "user1", rol: null },
        error: null,
      });

      const res = await GET(bearerRequest("+51999999999"));

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("Permiso insuficiente");
    });

    it("returns 403 if resolveEquipoScope unexpectedly resolves 'anonimo' despite a resolvable profile (defensive short-circuit)", async () => {
      // Route's own profile fetch succeeds...
      mockPerfilSingle.mockResolvedValueOnce({
        data: { username: "vend1", rol: { nombre: "ROL_VENDEDOR" } },
        error: null,
      });
      // ...but resolveEquipoScope's independent profile fetch does not.
      // equipoOrFilter() returns null for BOTH 'global' and 'anonimo', so an
      // unfiltered null-check alone would silently build an unscoped query —
      // the route must explicitly reject 'anonimo' before querying.
      mockPerfilSingle.mockResolvedValueOnce({ data: null, error: null });

      const res = await GET(bearerRequest("+51999999999"));

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("Permiso insuficiente");
      expect(mockClienteMaybeSingle).not.toHaveBeenCalled();
    });
  });

  describe("ROL_VENDEDOR visibility — must be scoped to own clients", () => {
    it("ROL_VENDEDOR: filters query by vendedor_asignado with caller's username", async () => {
      mockPerfilSingle.mockResolvedValue({
        data: { username: "vendor1", rol: { nombre: "ROL_VENDEDOR" } },
        error: null,
      });

      const res = await GET(bearerRequest("+51999999999"));

      expect(res.status).toBe(200);

      // Core invariant: vendor callers MUST have their query scoped to their own clients.
      const vendedorFilterApplied = mockClienteEq.mock.calls.some(
        (call: any[]) => call[0] === "vendedor_asignado" && call[1] === "vendor1"
      );
      expect(vendedorFilterApplied).toBe(true);
    });
  });

  describe("GLOBAL_ROLES visibility — ROL_GERENTE and ROL_COORDINADOR_VENTAS must not be vendor-scoped", () => {
    it("ROL_GERENTE: returns 200 without applying vendedor_asignado filter", async () => {
      mockPerfilSingle.mockResolvedValue({
        data: { username: "gerente1", rol: { nombre: "ROL_GERENTE" } },
        error: null,
      });

      const res = await GET(bearerRequest("+51999999999"));

      expect(res.status).toBe(200);

      // The vendor-scoping bug: before fix, eq("vendedor_asignado") was called
      // because esAdmin was false for ROL_GERENTE. After fix, it must NOT be called.
      const vendedorFilterApplied = mockClienteEq.mock.calls.some(
        (call: any[]) => call[0] === "vendedor_asignado"
      );
      expect(vendedorFilterApplied).toBe(false);
    });

    it("ROL_COORDINADOR_VENTAS: scopes the query via equipoOrFilter (team), never a bare .eq('vendedor_asignado', ...)", async () => {
      mockPerfilSingle.mockResolvedValue({
        data: { username: "coord1", rol: { nombre: "ROL_COORDINADOR_VENTAS" } },
        error: null,
      });
      // resolveEquipoScope's team lookup (.eq('coordinador_id', ...), no .single())
      mockPerfilThen.mockReturnValue({ data: [{ id: "vend1-id", username: "vend1" }], error: null });

      const res = await GET(bearerRequest("+51999999999"));

      expect(res.status).toBe(200);

      // Never a bare vendor_asignado eq — that would wrongly scope to the
      // coordinador's own username instead of the whole team.
      const eqFilterApplied = mockClienteEq.mock.calls.some(
        (call: any[]) => call[0] === "vendedor_asignado"
      );
      expect(eqFilterApplied).toBe(false);

      // The real equipoOrFilter() output must be applied via .or() —
      // this exercises the actual helper (created_by + vendedor_username +
      // vendedor_asignado arms), not a hand-rolled approximation.
      const expectedFilter = equipoOrFilter({
        tier: "equipo",
        userId: "uid-test",
        username: "coord1",
        equipoUsernames: ["vend1", "coord1"],
        equipoUserIds: ["vend1-id", "uid-test"],
      });
      const equipoFilterApplied = mockClienteOr.mock.calls.some(
        (call: any[]) => call[0] === expectedFilter
      );
      expect(equipoFilterApplied).toBe(true);
    });
  });
});
