import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetUser, mockSchemaFrom, mockSchema, mockSupabase, mockServiceRole, createChainMock } = vi.hoisted(() => {
  function createChainMock(finalResult: any = { data: [], error: null, count: 0 }) {
    const chain: any = {};
    const methods = ["select", "insert", "update", "eq", "neq", "is", "or", "order", "range", "single", "in", "limit"];
    for (const method of methods) chain[method] = vi.fn().mockReturnValue(chain);
    chain.range.mockImplementation(() => Promise.resolve(finalResult));
    chain.single.mockImplementation(() => Promise.resolve(finalResult));
    chain.limit.mockImplementation(() => Promise.resolve(finalResult));
    chain.then = (resolve: any, reject: any) => Promise.resolve(finalResult).then(resolve, reject);
    return chain;
  }

  const mockGetUser = vi.fn();
  const mockSchemaFrom = vi.fn();
  const mockSchema = vi.fn().mockReturnValue({ from: mockSchemaFrom });
  const mockSupabase = { auth: { getUser: mockGetUser }, schema: mockSchema };
  const mockServiceRole = {
    auth: { admin: { listUsers: vi.fn().mockResolvedValue({ data: { users: [] } }) } },
    schema: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(createChainMock()) }),
  };

  return { mockGetUser, mockSchemaFrom, mockSchema, mockSupabase, mockServiceRole, createChainMock };
});

vi.mock("@/lib/supabase.server", () => ({
  createServerOnlyClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase)),
  createServiceRoleClient: vi.fn().mockReturnValue(mockServiceRole),
}));

vi.mock("@/lib/permissions/server", () => ({
  esAdmin: vi.fn().mockResolvedValue(true),
  esGerente: vi.fn().mockResolvedValue(false),
}));

import { GET } from "@/app/api/admin/usuarios/route";

describe("GET /api/admin/usuarios — coordinador visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1", email: "admin@test.com" } } });
  });

  it("resolves coordinador {id, nombre_completo} for vendedores with a coordinador_id, batching the name lookup (no N+1)", async () => {
    const listChain = createChainMock({
      data: [
        { id: "v1", nombre_completo: "Vendedor Uno", coordinador_id: "coord-1" },
        { id: "v2", nombre_completo: "Vendedor Dos", coordinador_id: "coord-1" },
        { id: "v3", nombre_completo: "Vendedor Tres", coordinador_id: null },
      ],
      error: null,
      count: 3,
    });
    const coordinadorChain = createChainMock({
      data: [{ id: "coord-1", nombre_completo: "Coordinador Uno" }],
      error: null,
    });

    let callCount = 0;
    mockSchemaFrom.mockImplementation(() => (callCount++ === 0 ? listChain : coordinadorChain));

    const req = new NextRequest("http://localhost:3000/api/admin/usuarios");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    // Exactly ONE extra query for coordinador names, regardless of how
    // many usuarios share a coordinador — proves no N+1.
    expect(coordinadorChain.in).toHaveBeenCalledWith("id", ["coord-1"]);
    expect(body.usuarios[0].coordinador).toEqual({ id: "coord-1", nombre_completo: "Coordinador Uno" });
    expect(body.usuarios[1].coordinador).toEqual({ id: "coord-1", nombre_completo: "Coordinador Uno" });
    expect(body.usuarios[2].coordinador).toBeNull();
  });

  it("filters by coordinador id when ?coordinador=<id> is passed", async () => {
    const listChain = createChainMock({ data: [], error: null, count: 0 });
    mockSchemaFrom.mockReturnValue(listChain);

    const req = new NextRequest("http://localhost:3000/api/admin/usuarios?coordinador=coord-1");
    await GET(req);

    expect(listChain.eq).toHaveBeenCalledWith("coordinador_id", "coord-1");
  });

  it('filters orphan vendedores when ?coordinador=sin is passed', async () => {
    const listChain = createChainMock({ data: [], error: null, count: 0 });
    mockSchemaFrom.mockReturnValue(listChain);

    const req = new NextRequest("http://localhost:3000/api/admin/usuarios?coordinador=sin");
    await GET(req);

    expect(listChain.is).toHaveBeenCalledWith("coordinador_id", null);
  });

  it('scopes the "sin" filter to ROL_VENDEDOR rows so admins/gerentes (whose coordinador_id is always null) are excluded', async () => {
    const listChain = createChainMock({ data: [], error: null, count: 0 });
    const rolChain = createChainMock({ data: { id: "rol-vendedor-id", nombre: "ROL_VENDEDOR" }, error: null });

    let callCount = 0;
    // First .from() call builds the main usuario_perfil query; the second is
    // the ROL_VENDEDOR id lookup used to scope the orphan filter.
    mockSchemaFrom.mockImplementation(() => (callCount++ === 0 ? listChain : rolChain));

    const req = new NextRequest("http://localhost:3000/api/admin/usuarios?coordinador=sin");
    await GET(req);

    expect(listChain.is).toHaveBeenCalledWith("coordinador_id", null);
    expect(listChain.eq).toHaveBeenCalledWith("rol_id", "rol-vendedor-id");
  });
});
