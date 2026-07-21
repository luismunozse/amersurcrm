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

vi.mock("@/lib/utils/username-generator", () => ({
  generarUsername: vi.fn().mockReturnValue("jperez"),
  generarUsernameConNumero: vi.fn().mockImplementation((base: string, num: number) => `${base}${num}`),
  validarUsername: vi.fn().mockReturnValue({ valido: true }),
}));

vi.mock("@/app/_actionsNotifications", () => ({
  crearNotificacion: vi.fn().mockResolvedValue(undefined),
}));

import { PATCH, POST } from "@/app/api/admin/usuarios/route";

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
    data: { username: "vend1", nombre_completo: "Vendedor Uno", dni: "12345678", telefono: null, email: "v@test.com", rol_id: "rol-vend", coordinador_id: null, meta_mensual_ventas: 0, comision_porcentaje: 0, activo: true, rol: { nombre: "ROL_VENDEDOR" } },
    error: null,
  });
});

describe("PATCH /api/admin/usuarios — coordinador_id validation", () => {
  it("rejects a coordinador_id that does not resolve to an active ROL_COORDINADOR_VENTAS user", async () => {
    const chains = (mockServerOnlyClient as any).__chains;
    chains.rol = createChainMock({ data: { id: "rol-vend", nombre: "ROL_VENDEDOR" }, error: null });
    chains.usuario_perfil.single = vi.fn()
      .mockResolvedValueOnce({ data: { username: "vend1", nombre_completo: "Vendedor Uno", dni: "12345678", telefono: null, email: "v@test.com", rol_id: "rol-vend", coordinador_id: null, meta_mensual_ventas: 0, comision_porcentaje: 0, activo: true, rol: { nombre: "ROL_VENDEDOR" } }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "not found" } }); // coordinador lookup fails

    const res = await PATCH(req({ id: "vend-1", coordinador_id: "not-a-coordinador" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/coordinador/i);
  });

  it("rejects a coordinador_id that resolves to an inactive user", async () => {
    const chains = (mockServerOnlyClient as any).__chains;
    chains.usuario_perfil.single = vi.fn()
      .mockResolvedValueOnce({ data: { username: "vend1", nombre_completo: "Vendedor Uno", dni: "12345678", telefono: null, email: "v@test.com", rol_id: "rol-vend", coordinador_id: null, meta_mensual_ventas: 0, comision_porcentaje: 0, activo: true, rol: { nombre: "ROL_VENDEDOR" } }, error: null })
      .mockResolvedValueOnce({ data: { id: "coord-1", activo: false, rol: { nombre: "ROL_COORDINADOR_VENTAS" } }, error: null });

    const res = await PATCH(req({ id: "vend-1", coordinador_id: "coord-1" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/coordinador/i);
  });

  it("rejects a coordinador_id that resolves to a user who is not ROL_COORDINADOR_VENTAS", async () => {
    const chains = (mockServerOnlyClient as any).__chains;
    chains.usuario_perfil.single = vi.fn()
      .mockResolvedValueOnce({ data: { username: "vend1", nombre_completo: "Vendedor Uno", dni: "12345678", telefono: null, email: "v@test.com", rol_id: "rol-vend", coordinador_id: null, meta_mensual_ventas: 0, comision_porcentaje: 0, activo: true, rol: { nombre: "ROL_VENDEDOR" } }, error: null })
      .mockResolvedValueOnce({ data: { id: "vend-2", activo: true, rol: { nombre: "ROL_VENDEDOR" } }, error: null });

    const res = await PATCH(req({ id: "vend-1", coordinador_id: "vend-2" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/coordinador/i);
  });

  it("accepts a valid active ROL_COORDINADOR_VENTAS, persists coordinador_id and calls update with it", async () => {
    const chains = (mockServerOnlyClient as any).__chains;
    chains.usuario_perfil.single = vi.fn()
      .mockResolvedValueOnce({ data: { username: "vend1", nombre_completo: "Vendedor Uno", dni: "12345678", telefono: null, email: "v@test.com", rol_id: "rol-vend", coordinador_id: null, meta_mensual_ventas: 0, comision_porcentaje: 0, activo: true, rol: { nombre: "ROL_VENDEDOR" } }, error: null })
      .mockResolvedValueOnce({ data: { id: "coord-1", activo: true, rol: { nombre: "ROL_COORDINADOR_VENTAS" } }, error: null })
      .mockResolvedValue({ data: { nombre_completo: "Admin Uno" }, error: null }); // admin profile lookup for audit trail

    const res = await PATCH(req({ id: "vend-1", coordinador_id: "coord-1" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    // Regression guard: previously this only asserted status/success without
    // proving the value actually reached the DB update call.
    expect(chains.usuario_perfil.update).toHaveBeenCalledWith(
      expect.objectContaining({ coordinador_id: "coord-1" })
    );
  });

  it("allows clearing coordinador_id by passing null (no lookup needed)", async () => {
    const chains = (mockServerOnlyClient as any).__chains;
    chains.usuario_perfil.single = vi.fn()
      .mockResolvedValueOnce({ data: { username: "vend1", nombre_completo: "Vendedor Uno", dni: "12345678", telefono: null, email: "v@test.com", rol_id: "rol-vend", coordinador_id: "coord-old", meta_mensual_ventas: 0, comision_porcentaje: 0, activo: true, rol: { nombre: "ROL_VENDEDOR" } }, error: null })
      .mockResolvedValue({ data: { nombre_completo: "Admin Uno" }, error: null }); // admin profile lookup for audit trail

    const res = await PATCH(req({ id: "vend-1", coordinador_id: null }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("rejects assigning a coordinador_id when the subject's current role is not ROL_VENDEDOR (no rol_id change in this request)", async () => {
    const chains = (mockServerOnlyClient as any).__chains;
    chains.usuario_perfil.single = vi.fn()
      .mockResolvedValueOnce({ data: { username: "coord1", nombre_completo: "Coordinador Uno", dni: "87654321", telefono: null, email: "c@test.com", rol_id: "rol-coord", coordinador_id: null, meta_mensual_ventas: 0, comision_porcentaje: 0, activo: true, rol: { nombre: "ROL_COORDINADOR_VENTAS" } }, error: null });

    const res = await PATCH(req({ id: "coord-1", coordinador_id: "some-coord" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/solo los vendedores/i);
  });

  it("auto-clears coordinador_id to null when a PATCH promotes a vendedor away from ROL_VENDEDOR, and records it in history", async () => {
    const chains = (mockServerOnlyClient as any).__chains;
    chains.rol = createChainMock({ data: { id: "rol-admin", nombre: "ROL_ADMIN" }, error: null });
    chains.historial_cambios_usuario = createChainMock({ error: null });
    chains.usuario_perfil.single = vi.fn()
      .mockResolvedValueOnce({ data: { username: "vend1", nombre_completo: "Vendedor Uno", dni: "12345678", telefono: null, email: "v@test.com", rol_id: "rol-vend", coordinador_id: "coord-old", meta_mensual_ventas: 0, comision_porcentaje: 0, activo: true, rol: { nombre: "ROL_VENDEDOR" } }, error: null })
      .mockResolvedValue({ data: { nombre_completo: "Admin Uno" }, error: null }); // admin profile lookup for audit trail

    // Client only sends rol_id — no coordinador_id — yet the stale link must
    // not survive the promotion.
    const res = await PATCH(req({ id: "vend-1", rol_id: "rol-admin" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(chains.usuario_perfil.update).toHaveBeenCalledWith(
      expect.objectContaining({ rol_id: "rol-admin", coordinador_id: null })
    );
    expect(chains.historial_cambios_usuario.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ campo: "coordinador_id", valor_anterior: "coord-old", valor_nuevo: null }),
      ])
    );
  });

  it("records the real previous coordinador_id (not null) in history when it changes", async () => {
    const chains = (mockServerOnlyClient as any).__chains;
    chains.historial_cambios_usuario = createChainMock({ error: null });
    chains.usuario_perfil.single = vi.fn()
      .mockResolvedValueOnce({ data: { username: "vend1", nombre_completo: "Vendedor Uno", dni: "12345678", telefono: null, email: "v@test.com", rol_id: "rol-vend", coordinador_id: "coord-old", meta_mensual_ventas: 0, comision_porcentaje: 0, activo: true, rol: { nombre: "ROL_VENDEDOR" } }, error: null })
      .mockResolvedValueOnce({ data: { id: "coord-new", activo: true, rol: { nombre: "ROL_COORDINADOR_VENTAS" } }, error: null })
      .mockResolvedValue({ data: { nombre_completo: "Admin Uno" }, error: null }); // admin profile lookup for audit trail

    const res = await PATCH(req({ id: "vend-1", coordinador_id: "coord-new" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    // Proves the currentUser select actually requests coordinador_id — without
    // it, the route's oldVal lookup silently reads undefined regardless of
    // what this mock returns, and the assertion below would pass for the
    // wrong reason.
    expect(chains.usuario_perfil.select.mock.calls[0][0]).toContain("coordinador_id");
    expect(chains.historial_cambios_usuario.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ campo: "coordinador_id", valor_anterior: "coord-old", valor_nuevo: "coord-new" }),
      ])
    );
  });
});

describe("POST /api/admin/usuarios — coordinador_id role consistency", () => {
  it("rejects coordinador_id when the target role does not resolve to ROL_VENDEDOR", async () => {
    const chains = (mockServerOnlyClient as any).__chains;
    chains.rol = createChainMock({ data: { id: "rol-admin", nombre: "ROL_ADMIN" }, error: null });

    const formData = new FormData();
    formData.append("username", "admin2");
    formData.append("password", "password123");
    formData.append("email", "admin2@gmail.com");
    formData.append("rol_id", "rol-admin");
    formData.append("coordinador_id", "coord-1");

    const request = new Request("http://localhost/api/admin/usuarios", {
      method: "POST",
      body: formData,
    }) as any;

    const res = await POST(request);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/solo los vendedores/i);
  });
});
