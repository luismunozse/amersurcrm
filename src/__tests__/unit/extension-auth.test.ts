import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// Hoisted mocks — available inside vi.mock() factories
// ============================================================

const { mockGetUser, mockSingle, mockServiceRoleClient } = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  const mockSingle = vi.fn();

  const mockServiceRoleClient: any = {
    auth: { getUser: mockGetUser },
    schema: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: mockSingle,
      }),
    }),
  };

  return { mockGetUser, mockSingle, mockServiceRoleClient };
});

vi.mock("@/lib/supabase.server", () => ({
  createServiceRoleClient: vi.fn(() => mockServiceRoleClient),
}));

// Import AFTER mocks (module resolution depends on mocks being registered first)
import { validateBearerAndEnsureGlobalRole, GLOBAL_ROLES } from "@/lib/auth/extension-auth";

// ============================================================
// Test setup
// ============================================================

beforeEach(() => {
  vi.clearAllMocks();
  // Re-setup schema chain (clearAllMocks clears call history but not implementations;
  // we do this explicitly to guarantee clean state for each test)
  mockServiceRoleClient.schema.mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingle,
    }),
  });
  // Safe defaults for each test
  mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "Invalid JWT" } });
  mockSingle.mockResolvedValue({ data: null, error: null });
});

// ============================================================
// Tests
// ============================================================

describe("validateBearerAndEnsureGlobalRole", () => {
  it("returns 401 when token is null — no DB calls made", async () => {
    const result = await validateBearerAndEnsureGlobalRole(null);

    expect(result).toEqual({ ok: false, status: 401, error: "No autenticado" });
    expect(mockServiceRoleClient.auth.getUser).not.toHaveBeenCalled();
  });

  it("returns 401 when token is invalid or expired", async () => {
    // mockGetUser default already returns error with user: null
    const result = await validateBearerAndEnsureGlobalRole("bad-token");

    expect(result).toEqual({ ok: false, status: 401, error: "Token inválido" });
  });

  it("returns 403 when valid token maps to ROL_VENDEDOR", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } }, error: null });
    mockSingle.mockResolvedValue({
      data: { username: "vendor1", rol: { nombre: "ROL_VENDEDOR" } },
      error: null,
    });

    const result = await validateBearerAndEnsureGlobalRole("valid-vendor-token");

    expect(result).toEqual({ ok: false, status: 403, error: "Permiso insuficiente" });
  });

  it("returns 403 when valid token has no CRM profile or no assigned role", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } }, error: null });
    // mockSingle default returns { data: null } — no profile

    const result = await validateBearerAndEnsureGlobalRole("valid-no-role-token");

    expect(result).toEqual({ ok: false, status: 403, error: "Permiso insuficiente" });
  });

  it("returns 403 fail-closed when perfil DB query returns an error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } }, error: null });
    mockSingle.mockResolvedValue({ data: null, error: { message: "DB unavailable" } });

    const result = await validateBearerAndEnsureGlobalRole("valid-token");

    expect(result).toEqual({ ok: false, status: 403, error: "Permiso insuficiente" });
  });

  it("returns 401 when token is empty string — no DB calls made", async () => {
    const result = await validateBearerAndEnsureGlobalRole("");

    expect(result).toEqual({ ok: false, status: 401, error: "No autenticado" });
    expect(mockServiceRoleClient.auth.getUser).not.toHaveBeenCalled();
  });

  it("returns 403 Perfil incompleto when username is null", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } }, error: null });
    mockSingle.mockResolvedValue({
      data: { username: null, rol: { nombre: "ROL_ADMIN" } },
      error: null,
    });

    const result = await validateBearerAndEnsureGlobalRole("valid-token");

    expect(result).toEqual({ ok: false, status: 403, error: "Perfil incompleto" });
  });

  it("returns 403 Perfil incompleto when username is empty string", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } }, error: null });
    mockSingle.mockResolvedValue({
      data: { username: "", rol: { nombre: "ROL_ADMIN" } },
      error: null,
    });

    const result = await validateBearerAndEnsureGlobalRole("valid-token");

    expect(result).toEqual({ ok: false, status: 403, error: "Perfil incompleto" });
  });

  describe("GLOBAL_ROLES export", () => {
    it("exports the three global-visibility role names", () => {
      expect(GLOBAL_ROLES).toEqual([
        "ROL_ADMIN",
        "ROL_GERENTE",
        "ROL_COORDINADOR_VENTAS",
      ]);
    });

    it("does not include ROL_VENDEDOR", () => {
      expect((GLOBAL_ROLES as readonly string[]).includes("ROL_VENDEDOR")).toBe(false);
    });
  });

  it.each(["ROL_ADMIN", "ROL_GERENTE", "ROL_COORDINADOR_VENTAS"])(
    "returns ok: true with user/username/rol/supabase for global role %s",
    async (rolNombre) => {
      const mockUser = { id: "uid-global" };
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockSingle.mockResolvedValue({
        data: { username: "admin-user", rol: { nombre: rolNombre } },
        error: null,
      });

      const result = await validateBearerAndEnsureGlobalRole("valid-global-token");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.user).toBe(mockUser);
        expect(result.username).toBe("admin-user");
        expect(result.rol).toBe(rolNombre);
        expect(result.supabase).toBe(mockServiceRoleClient);
      }
    },
  );
});
