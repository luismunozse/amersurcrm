import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================
// Hoisted mocks
// ============================================================

const { mockGetUser, mockPerfilSingle, mockServiceRoleClient, mockSessionUser } =
  vi.hoisted(() => {
    const mockGetUser = vi.fn();
    const mockPerfilSingle = vi.fn();
    const mockSessionUser = vi.fn(); // for web-session path

    const mockServiceRoleClient: any = {
      auth: { getUser: mockGetUser },
      schema: vi.fn(),
    };

    return { mockGetUser, mockPerfilSingle, mockServiceRoleClient, mockSessionUser };
  });

// Web-session client (createServerOnlyClient) has a separate getUser that uses cookies
const mockCookieClient: any = {
  auth: { getUser: vi.fn() },
  schema: vi.fn(),
};

vi.mock("@/lib/supabase.server", () => ({
  createServiceRoleClient: vi.fn(() => mockServiceRoleClient),
  createServerOnlyClient: vi.fn(() => Promise.resolve(mockCookieClient)),
}));

// Import after mocks
import { POST } from "@/app/api/clientes/create-lead/route";

// ============================================================
// Test setup
// ============================================================

function buildSchemaForClient(perfilSingleMock: ReturnType<typeof vi.fn>) {
  const perfilChain: any = {};
  perfilChain.select = vi.fn().mockReturnThis();
  perfilChain.eq = vi.fn().mockReturnThis();
  perfilChain.single = perfilSingleMock;

  // Generic chain for all other tables (dedup, post-insert, etc.)
  const genericChain: any = {};
  genericChain.select = vi.fn().mockReturnThis();
  genericChain.or = vi.fn().mockReturnThis();
  genericChain.limit = vi.fn().mockReturnThis();
  genericChain.eq = vi.fn().mockReturnThis();
  genericChain.single = vi.fn().mockResolvedValue({ data: null, error: null });
  genericChain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "usuario_perfil") return perfilChain;
      return genericChain;
    }),
    rpc: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  // Bearer path: service-role client handles both auth and profile gate
  mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } }, error: null });
  mockServiceRoleClient.schema.mockReturnValue(buildSchemaForClient(mockPerfilSingle));

  // Web-session path: cookie client handles auth
  (mockCookieClient.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
    data: { user: { id: "uid-web" } },
    error: null,
  });
  mockCookieClient.schema.mockReturnValue(buildSchemaForClient(mockPerfilSingle));

  // Default: no CRM profile (guard should fire)
  mockPerfilSingle.mockResolvedValue({ data: null, error: null });
});

function bearerPostRequest(body: Record<string, unknown> = { telefono: "+51999999999" }) {
  return new NextRequest("http://localhost/api/clientes/create-lead", {
    method: "POST",
    headers: {
      Authorization: "Bearer valid-token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function webSessionPostRequest(body: Record<string, unknown> = { telefono: "+51999999999" }) {
  return new NextRequest("http://localhost/api/clientes/create-lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ============================================================
// Tests — profile gate (PR1 extension)
// ============================================================

describe("POST /api/clientes/create-lead — CRM profile gate", () => {
  it("valid-profile caller proceeds past gate and reaches dedup/RPC (not 403)", async () => {
    // Use array form of rol to guard against the array-normalization regression (FIX 1).
    // If the route reverts to plain `.rol?.nombre` without normalization, callerRol will
    // be undefined and the gate will fire 403 — making this test RED.
    mockPerfilSingle.mockResolvedValue({
      data: { username: "vendor1", rol: [{ nombre: "ROL_VENDEDOR" }] },
      error: null,
    });

    // Override schema so dedup finds an existing client → route short-circuits with 200
    // (the existente branch), proving it got past the profile gate.
    const dedupeChain: any = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "existing-123", nombre: "Test Client", estado_cliente: "activo" },
        error: null,
      }),
    };
    const perfilChain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockPerfilSingle,
    };
    mockServiceRoleClient.schema.mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "usuario_perfil") return perfilChain;
        return dedupeChain;
      }),
      rpc: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });

    const res = await POST(bearerPostRequest({ telefono: "+51999999999", nombre: "Test Lead" }));

    // Must NOT be 403 — profile gate was passed.
    expect(res.status).not.toBe(403);
    const body = await res.json();
    // Reached the dedup/existing-client branch, confirming the gate was cleared.
    expect(body.existente).toBe(true);
  });

  it("returns 403 for Bearer caller with no CRM profile", async () => {
    // mockPerfilSingle default: { data: null } — no profile

    const res = await POST(bearerPostRequest());

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Permiso insuficiente");
  });

  it("returns 403 for web-session caller with no CRM profile", async () => {
    // Cookie client also returns null profile

    const res = await POST(webSessionPostRequest());

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Permiso insuficiente");
  });
});
