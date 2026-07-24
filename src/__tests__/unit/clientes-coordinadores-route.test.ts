import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================
// Hoisted mocks
// ============================================================

const { mockGetUser, mockServiceRoleClient, mockCookieGetUser, mockCookieClient } =
  vi.hoisted(() => {
    const mockGetUser = vi.fn();
    const mockServiceRoleClient: any = {
      auth: { getUser: mockGetUser },
      schema: vi.fn(),
    };
    const mockCookieGetUser = vi.fn();
    const mockCookieClient: any = {
      auth: { getUser: mockCookieGetUser },
      schema: vi.fn(),
    };
    return { mockGetUser, mockServiceRoleClient, mockCookieGetUser, mockCookieClient };
  });

vi.mock("@/lib/supabase.server", () => ({
  createServiceRoleClient: vi.fn(() => mockServiceRoleClient),
  createServerOnlyClient: vi.fn(() => Promise.resolve(mockCookieClient)),
}));

import { GET } from "@/app/api/clientes/coordinadores/route";

// ============================================================
// Test setup
// ============================================================

/**
 * Schema mock for usuario_perfil that resolves:
 *   - .single()  → the caller's profile/role (role gate read, .eq("id", ...))
 *   - await chain → the coordinadores list (.eq("activo", true), awaited)
 */
function buildSchema(callerRol: string | null, list: any[]) {
  function usuarioPerfilChain() {
    const chain: any = {};
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.single = vi.fn(() =>
      Promise.resolve(
        callerRol
          ? { data: { rol: [{ nombre: callerRol }] }, error: null }
          : { data: null, error: null },
      ),
    );
    chain.then = (resolve: any, reject: any) =>
      Promise.resolve({ data: list, error: null }).then(resolve, reject);
    return chain;
  }
  return {
    from: vi.fn((table: string) => {
      if (table === "usuario_perfil") return usuarioPerfilChain();
      throw new Error(`Unexpected table "${table}"`);
    }),
  };
}

function bearerRequest() {
  return new NextRequest("http://localhost/api/clientes/coordinadores", {
    method: "GET",
    headers: { Authorization: "Bearer valid-token" },
  });
}

function cookieRequest() {
  return new NextRequest("http://localhost/api/clientes/coordinadores", { method: "GET" });
}

const LIST = [
  { username: "coord1", nombre_completo: "Coordinador Uno", activo: true, rol: [{ nombre: "ROL_COORDINADOR_VENTAS" }] },
  { username: "coord2", nombre_completo: "Coordinador Dos", activo: true, rol: [{ nombre: "ROL_COORDINADOR_VENTAS" }] },
  { username: "vend1", nombre_completo: "Vendedor Uno", activo: true, rol: [{ nombre: "ROL_VENDEDOR" }] },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } }, error: null });
  mockCookieGetUser.mockResolvedValue({ data: { user: { id: "uid-web" } }, error: null });
});

// ============================================================
// Tests
// ============================================================

describe("GET /api/clientes/coordinadores", () => {
  it("returns 401 when unauthenticated", async () => {
    mockCookieGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await GET(cookieRequest());

    expect(res.status).toBe(401);
  });

  it("returns 403 for a vendedor caller", async () => {
    mockServiceRoleClient.schema.mockReturnValue(buildSchema("ROL_VENDEDOR", LIST));

    const res = await GET(bearerRequest());

    expect(res.status).toBe(403);
  });

  it("returns 403 for a coordinador caller", async () => {
    mockServiceRoleClient.schema.mockReturnValue(buildSchema("ROL_COORDINADOR_VENTAS", LIST));

    const res = await GET(bearerRequest());

    expect(res.status).toBe(403);
  });

  it("admin: returns only active coordinadores (username + nombre_completo)", async () => {
    mockServiceRoleClient.schema.mockReturnValue(buildSchema("ROL_ADMIN", LIST));

    const res = await GET(bearerRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.coordinadores).toHaveLength(2);
    expect(body.coordinadores).toEqual(
      expect.arrayContaining([
        { username: "coord1", nombre_completo: "Coordinador Uno" },
        { username: "coord2", nombre_completo: "Coordinador Dos" },
      ]),
    );
    // vendedor must not leak into the coordinadores list
    expect(body.coordinadores.some((c: any) => c.username === "vend1")).toBe(false);
  });

  it("gerente: is also allowed", async () => {
    mockServiceRoleClient.schema.mockReturnValue(buildSchema("ROL_GERENTE", LIST));

    const res = await GET(bearerRequest());

    expect(res.status).toBe(200);
  });
});
