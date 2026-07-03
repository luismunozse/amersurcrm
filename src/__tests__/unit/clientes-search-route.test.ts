import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================
// Hoisted mocks
// ============================================================

const {
  mockGetUser,
  mockPerfilSingle,
  mockClienteMaybeSingle,
  mockClienteEq,
  mockServiceRoleClient,
} = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  const mockPerfilSingle = vi.fn();
  const mockClienteMaybeSingle = vi.fn();
  const mockClienteEq = vi.fn();

  const mockServiceRoleClient: any = {
    auth: { getUser: mockGetUser },
    schema: vi.fn(),
  };

  return {
    mockGetUser,
    mockPerfilSingle,
    mockClienteMaybeSingle,
    mockClienteEq,
    mockServiceRoleClient,
  };
});

vi.mock("@/lib/supabase.server", () => ({
  createServiceRoleClient: vi.fn(() => mockServiceRoleClient),
  createServerOnlyClient: vi.fn(() => Promise.resolve(mockServiceRoleClient)),
}));

// Import after mocks
import { GET } from "@/app/api/clientes/search/route";

// ============================================================
// Test setup
// ============================================================

beforeEach(() => {
  vi.clearAllMocks();

  // Rebuild cliente chain (keeps mockClienteEq and mockClienteMaybeSingle references)
  const clienteChain: any = {};
  clienteChain.select = vi.fn().mockReturnValue(clienteChain);
  clienteChain.or = vi.fn().mockReturnValue(clienteChain);
  clienteChain.eq = mockClienteEq;
  clienteChain.order = vi.fn().mockReturnValue(clienteChain);
  clienteChain.limit = vi.fn().mockReturnValue(clienteChain);
  clienteChain.maybeSingle = mockClienteMaybeSingle;
  // eq must return the chain itself so further chaining works
  mockClienteEq.mockReturnValue(clienteChain);

  // Rebuild perfil chain
  const perfilChain: any = {};
  perfilChain.select = vi.fn().mockReturnThis();
  perfilChain.eq = vi.fn().mockReturnThis();
  perfilChain.single = mockPerfilSingle;

  mockServiceRoleClient.schema.mockReturnValue({
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "usuario_perfil") return perfilChain;
      return clienteChain;
    }),
  });

  // Safe defaults
  mockGetUser.mockResolvedValue({ data: { user: { id: "uid-test" } }, error: null });
  mockPerfilSingle.mockResolvedValue({ data: null, error: null }); // no profile by default
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

    it("ROL_COORDINADOR_VENTAS: returns 200 without applying vendedor_asignado filter", async () => {
      mockPerfilSingle.mockResolvedValue({
        data: { username: "coord1", rol: { nombre: "ROL_COORDINADOR_VENTAS" } },
        error: null,
      });

      const res = await GET(bearerRequest("+51999999999"));

      expect(res.status).toBe(200);

      const vendedorFilterApplied = mockClienteEq.mock.calls.some(
        (call: any[]) => call[0] === "vendedor_asignado"
      );
      expect(vendedorFilterApplied).toBe(false);
    });
  });
});
