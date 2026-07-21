import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockServerOnlyClient, mockServiceRoleClient, createChainMock } = vi.hoisted(() => {
  function createChainMock(finalResult: any = { data: null, error: null }) {
    const chain: any = {};
    const methods = ["select", "eq", "neq", "single", "insert", "update"];
    for (const method of methods) chain[method] = vi.fn().mockReturnValue(chain);
    chain.then = (resolve: any, reject: any) => Promise.resolve(finalResult).then(resolve, reject);
    return chain;
  }

  const mockGetUser = vi.fn();
  const chains: Record<string, any> = {};
  const mockServerOnlyClient: any = {
    auth: { getUser: mockGetUser },
    schema: vi.fn(() => ({ from: vi.fn((table: string) => chains[table] ?? createChainMock()) })),
  };
  const mockServiceRoleClient: any = {
    auth: { admin: { createUser: vi.fn(), updateUserById: vi.fn(), listUsers: vi.fn() } },
  };

  (mockServerOnlyClient as any).__chains = chains;

  return { mockGetUser, mockServerOnlyClient, mockServiceRoleClient, createChainMock };
});

vi.mock("@/lib/supabase.server", () => ({
  createServerOnlyClient: vi.fn(() => Promise.resolve(mockServerOnlyClient)),
  createServiceRoleClient: vi.fn(() => mockServiceRoleClient),
}));

vi.mock("@/lib/permissions/server", () => ({
  esAdmin: vi.fn().mockResolvedValue(true),
  esGerente: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/auditoria-usuarios", () => ({
  registrarAuditoriaUsuario: vi.fn().mockResolvedValue(undefined),
}));

import { PATCH } from "@/app/api/admin/usuarios/route";

function req(body: any) {
  return new Request("http://localhost/api/admin/usuarios", {
    method: "PATCH",
    body: JSON.stringify(body),
  }) as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
  const chains = (mockServerOnlyClient as any).__chains;
  chains.usuario_perfil = createChainMock({
    data: { username: "vend1", nombre_completo: "Vendedor Uno", dni: "12345678", telefono: null, email: "v@test.com", rol_id: "rol-vend", meta_mensual_ventas: 0, comision_porcentaje: 0, activo: true },
    error: null,
  });
});

describe("PATCH /api/admin/usuarios — coordinador_id validation", () => {
  it("rejects a coordinador_id that does not resolve to an active ROL_COORDINADOR_VENTAS user", async () => {
    const chains = (mockServerOnlyClient as any).__chains;
    chains.rol = createChainMock({ data: { id: "rol-vend", nombre: "ROL_VENDEDOR" }, error: null });
    chains.usuario_perfil.single = vi.fn()
      .mockResolvedValueOnce({ data: { username: "vend1", nombre_completo: "Vendedor Uno", dni: "12345678", telefono: null, email: "v@test.com", rol_id: "rol-vend", meta_mensual_ventas: 0, comision_porcentaje: 0, activo: true }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "not found" } }); // coordinador lookup fails

    const res = await PATCH(req({ id: "vend-1", coordinador_id: "not-a-coordinador" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/coordinador/i);
  });

  it("rejects a coordinador_id that resolves to an inactive user", async () => {
    const chains = (mockServerOnlyClient as any).__chains;
    chains.usuario_perfil.single = vi.fn()
      .mockResolvedValueOnce({ data: { username: "vend1", nombre_completo: "Vendedor Uno", dni: "12345678", telefono: null, email: "v@test.com", rol_id: "rol-vend", meta_mensual_ventas: 0, comision_porcentaje: 0, activo: true }, error: null })
      .mockResolvedValueOnce({ data: { id: "coord-1", activo: false, rol: { nombre: "ROL_COORDINADOR_VENTAS" } }, error: null });

    const res = await PATCH(req({ id: "vend-1", coordinador_id: "coord-1" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/coordinador/i);
  });

  it("rejects a coordinador_id that resolves to a user who is not ROL_COORDINADOR_VENTAS", async () => {
    const chains = (mockServerOnlyClient as any).__chains;
    chains.usuario_perfil.single = vi.fn()
      .mockResolvedValueOnce({ data: { username: "vend1", nombre_completo: "Vendedor Uno", dni: "12345678", telefono: null, email: "v@test.com", rol_id: "rol-vend", meta_mensual_ventas: 0, comision_porcentaje: 0, activo: true }, error: null })
      .mockResolvedValueOnce({ data: { id: "vend-2", activo: true, rol: { nombre: "ROL_VENDEDOR" } }, error: null });

    const res = await PATCH(req({ id: "vend-1", coordinador_id: "vend-2" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/coordinador/i);
  });

  it("accepts a valid active ROL_COORDINADOR_VENTAS and persists coordinador_id", async () => {
    const chains = (mockServerOnlyClient as any).__chains;
    chains.usuario_perfil.single = vi.fn()
      .mockResolvedValueOnce({ data: { username: "vend1", nombre_completo: "Vendedor Uno", dni: "12345678", telefono: null, email: "v@test.com", rol_id: "rol-vend", meta_mensual_ventas: 0, comision_porcentaje: 0, activo: true }, error: null })
      .mockResolvedValueOnce({ data: { id: "coord-1", activo: true, rol: { nombre: "ROL_COORDINADOR_VENTAS" } }, error: null })
      .mockResolvedValue({ data: { nombre_completo: "Admin Uno" }, error: null }); // admin profile lookup for audit trail

    const res = await PATCH(req({ id: "vend-1", coordinador_id: "coord-1" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("allows clearing coordinador_id by passing null (no lookup needed)", async () => {
    const chains = (mockServerOnlyClient as any).__chains;
    chains.usuario_perfil.single = vi.fn()
      .mockResolvedValueOnce({ data: { username: "vend1", nombre_completo: "Vendedor Uno", dni: "12345678", telefono: null, email: "v@test.com", rol_id: "rol-vend", meta_mensual_ventas: 0, comision_porcentaje: 0, activo: true }, error: null })
      .mockResolvedValue({ data: { nombre_completo: "Admin Uno" }, error: null }); // admin profile lookup for audit trail

    const res = await PATCH(req({ id: "vend-1", coordinador_id: null }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });
});
