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

// ============================================================
// Tests — coordinador assignment (admin/gerente only)
// ============================================================

/**
 * Builds a service-role schema mock that can distinguish the two kinds of
 * usuario_perfil reads the route performs:
 *   - profile gate:        .eq("id", user.id)  → returns the caller's row/role
 *   - username lookups:    .eq("username", x)  → coordinador validation AND
 *                                                the post-insert name lookup
 * `usernameLookup` is the row returned for username-based reads (or null).
 * Captures the `create_whatsapp_lead` rpc call so tests can assert on
 * `p_vendedor_asignado`.
 */
function buildAssignmentSchema(opts: {
  callerRol: string;
  usernameLookup: any;
  clienteRow?: any;
}) {
  const rpcSingle = vi.fn().mockResolvedValue({ data: { id: "new-lead-1" }, error: null });
  const rpc = vi.fn().mockReturnValue({ single: rpcSingle });

  function usuarioPerfilChain() {
    const eqCalls: Array<[string, unknown]> = [];
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((col: string, val: unknown) => {
        eqCalls.push([col, val]);
        return chain;
      }),
    };
    const resolve = () => {
      const byId = eqCalls.some(([c]) => c === "id");
      if (byId) {
        return Promise.resolve({
          data: { username: "caller", rol: [{ nombre: opts.callerRol }] },
          error: null,
        });
      }
      // username-based read: coordinador validation + post-insert name lookup
      return Promise.resolve({ data: opts.usernameLookup, error: null });
    };
    chain.single = vi.fn(resolve);
    chain.maybeSingle = vi.fn(resolve);
    return chain;
  }

  const clienteChain: any = {
    select: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    // post-insert cliente fetch (vendedor_asignado null → skips name lookup)
    single: vi.fn().mockResolvedValue({
      data: opts.clienteRow ?? { id: "new-lead-1", nombre: "Lead", vendedor_asignado: null },
      error: null,
    }),
    // dedup: no existing client
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  const schema = {
    from: vi.fn((table: string) => {
      if (table === "usuario_perfil") return usuarioPerfilChain();
      return clienteChain;
    }),
    rpc,
  };
  return { schema, rpc, rpcSingle };
}

const ACTIVE_COORDINADOR = {
  username: "coord1",
  nombre_completo: "Coordinador Uno",
  activo: true,
  rol: [{ nombre: "ROL_COORDINADOR_VENTAS" }],
};

describe("POST /api/clientes/create-lead — coordinador assignment", () => {
  it("admin: honors a valid active-coordinador asignado_a (RPC gets that username)", async () => {
    const built = buildAssignmentSchema({
      callerRol: "ROL_ADMIN",
      usernameLookup: ACTIVE_COORDINADOR,
    });
    mockServiceRoleClient.schema.mockReturnValue(built.schema);

    const res = await POST(
      bearerPostRequest({ telefono: "+51999999999", nombre: "Lead", asignado_a: "coord1" }),
    );

    expect(res.status).toBe(200);
    expect(built.rpc).toHaveBeenCalledWith(
      "create_whatsapp_lead",
      expect.objectContaining({ p_vendedor_asignado: "coord1" }),
    );
  });

  it("gerente: honors a valid active-coordinador asignado_a", async () => {
    const built = buildAssignmentSchema({
      callerRol: "ROL_GERENTE",
      usernameLookup: ACTIVE_COORDINADOR,
    });
    mockServiceRoleClient.schema.mockReturnValue(built.schema);

    await POST(bearerPostRequest({ telefono: "+51988888888", asignado_a: "coord1" }));

    expect(built.rpc).toHaveBeenCalledWith(
      "create_whatsapp_lead",
      expect.objectContaining({ p_vendedor_asignado: "coord1" }),
    );
  });

  it("vendedor: ignores asignado_a → falls back to round-robin (null)", async () => {
    const built = buildAssignmentSchema({
      callerRol: "ROL_VENDEDOR",
      usernameLookup: ACTIVE_COORDINADOR,
    });
    mockServiceRoleClient.schema.mockReturnValue(built.schema);

    await POST(bearerPostRequest({ telefono: "+51977777777", asignado_a: "coord1" }));

    expect(built.rpc).toHaveBeenCalledWith(
      "create_whatsapp_lead",
      expect.objectContaining({ p_vendedor_asignado: null }),
    );
  });

  it("admin: rejects asignado_a that is not an active coordinador → round-robin (null)", async () => {
    const built = buildAssignmentSchema({
      callerRol: "ROL_ADMIN",
      usernameLookup: null, // username not found / not a coordinador
    });
    mockServiceRoleClient.schema.mockReturnValue(built.schema);

    await POST(bearerPostRequest({ telefono: "+51966666666", asignado_a: "ghost" }));

    expect(built.rpc).toHaveBeenCalledWith(
      "create_whatsapp_lead",
      expect.objectContaining({ p_vendedor_asignado: null }),
    );
  });

  it("admin: rejects asignado_a pointing to an INACTIVE coordinador → round-robin (null)", async () => {
    const built = buildAssignmentSchema({
      callerRol: "ROL_ADMIN",
      usernameLookup: { ...ACTIVE_COORDINADOR, activo: false },
    });
    mockServiceRoleClient.schema.mockReturnValue(built.schema);

    await POST(bearerPostRequest({ telefono: "+51955555555", asignado_a: "coord1" }));

    expect(built.rpc).toHaveBeenCalledWith(
      "create_whatsapp_lead",
      expect.objectContaining({ p_vendedor_asignado: null }),
    );
  });

  it("admin: empty asignado_a → round-robin (null)", async () => {
    const built = buildAssignmentSchema({
      callerRol: "ROL_ADMIN",
      usernameLookup: null,
    });
    mockServiceRoleClient.schema.mockReturnValue(built.schema);

    await POST(bearerPostRequest({ telefono: "+51944444444", asignado_a: "" }));

    expect(built.rpc).toHaveBeenCalledWith(
      "create_whatsapp_lead",
      expect.objectContaining({ p_vendedor_asignado: null }),
    );
  });
});
