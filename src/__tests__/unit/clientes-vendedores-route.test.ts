import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockServerOnlyClient, mockServiceRoleClient, createChainMock } = vi.hoisted(() => {
  function createChainMock(finalResult: any = { data: null, error: null }) {
    const chain: any = {};
    const methods = ["select", "eq", "or"];
    for (const method of methods) chain[method] = vi.fn().mockReturnValue(chain);
    chain.then = (resolve: any, reject: any) => Promise.resolve(finalResult).then(resolve, reject);
    return chain;
  }

  const mockGetUser = vi.fn();
  const mockServerOnlyClient: any = { auth: { getUser: mockGetUser } };
  const mockServiceRoleClient: any = { from: vi.fn() };

  return { mockGetUser, mockServerOnlyClient, mockServiceRoleClient, createChainMock };
});

vi.mock("@/lib/supabase.server", () => ({
  createServerOnlyClient: vi.fn(() => Promise.resolve(mockServerOnlyClient)),
  createServiceRoleClient: vi.fn(() => mockServiceRoleClient),
}));

vi.mock("@/lib/permissions/server", () => ({
  esAdminOCoordinador: vi.fn(),
  esCoordinador: vi.fn(),
}));

import { GET } from "@/app/api/clientes/vendedores/route";
import { esAdminOCoordinador, esCoordinador } from "@/lib/permissions/server";

function rows() {
  return [
    { id: "v1", username: "vend1", nombre_completo: "Vendedor Uno", telefono: null, email: "v1@test.com", coordinador_id: "coord-1", activo: true, rol: { nombre: "ROL_VENDEDOR" } },
    { id: "v2", username: "vend2", nombre_completo: "Vendedor Dos", telefono: null, email: "v2@test.com", coordinador_id: "coord-2", activo: true, rol: { nombre: "ROL_VENDEDOR" } },
    { id: "coord-1", username: "coord1", nombre_completo: "Coordinador Uno", telefono: null, email: "c1@test.com", coordinador_id: null, activo: true, rol: { nombre: "ROL_COORDINADOR_VENTAS" } },
    { id: "coord-2", username: "coord2", nombre_completo: "Coordinador Dos", telefono: null, email: "c2@test.com", coordinador_id: null, activo: true, rol: { nombre: "ROL_COORDINADOR_VENTAS" } },
  ];
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: "coord-1" } }, error: null });
});

describe("GET /api/clientes/vendedores", () => {
  it("returns the full vendedor+coordinador list for admin/gerente", async () => {
    vi.mocked(esAdminOCoordinador).mockResolvedValue(true);
    vi.mocked(esCoordinador).mockResolvedValue(false);
    const chain = createChainMock({ data: rows(), error: null });
    mockServiceRoleClient.from = vi.fn(() => chain);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.vendedores.map((v: any) => v.username).sort()).toEqual(["coord1", "coord2", "vend1", "vend2"]);
  });

  it("scopes the list to the caller's own team PLUS the caller themselves when the caller is a coordinador", async () => {
    vi.mocked(esAdminOCoordinador).mockResolvedValue(true);
    vi.mocked(esCoordinador).mockResolvedValue(true);
    // pre-filtered by .or('coordinador_id.eq.coord-1,id.eq.coord-1') — includes
    // team member v1 AND the caller's own coord-1 row, excludes v2 (belongs to
    // coord-2's team) and coord-2 (a different coordinador's own row).
    const chain = createChainMock({ data: [rows()[0], rows()[2]], error: null });
    mockServiceRoleClient.from = vi.fn(() => chain);

    const res = await GET();
    const body = await res.json();

    expect(chain.or).toHaveBeenCalledWith("coordinador_id.eq.coord-1,id.eq.coord-1");
    expect(body.vendedores.map((v: any) => v.username).sort()).toEqual(["coord1", "vend1"]);
  });

  it("excludes other coordinadores' own rows from the equipo-tier list", async () => {
    vi.mocked(esAdminOCoordinador).mockResolvedValue(true);
    vi.mocked(esCoordinador).mockResolvedValue(true);
    // Simulate the DB *not* pre-filtering (defensive check on the app-level
    // post-filter): even if coord-2's row somehow came back, it must never
    // appear in coord-1's list.
    const chain = createChainMock({ data: rows(), error: null });
    mockServiceRoleClient.from = vi.fn(() => chain);

    const res = await GET();
    const body = await res.json();

    expect(body.vendedores.map((v: any) => v.username)).not.toContain("coord2");
  });

  it("returns 403 when the caller has neither admin nor coordinador role", async () => {
    vi.mocked(esAdminOCoordinador).mockResolvedValue(false);

    const res = await GET();

    expect(res.status).toBe(403);
  });
});
