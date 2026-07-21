import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockServerOnlyClient, mockServiceRoleClient, createChainMock } = vi.hoisted(() => {
  function createChainMock(finalResult: any = { data: null, error: null }) {
    const chain: any = {};
    const methods = ["select", "eq", "neq", "is", "single", "insert", "update"];
    for (const method of methods) chain[method] = vi.fn().mockReturnValue(chain);
    chain.then = (resolve: any, reject: any) => Promise.resolve(finalResult).then(resolve, reject);
    return chain;
  }

  const mockGetUser = vi.fn();
  const chains: Record<string, any> = {};
  const serviceRoleChains: Record<string, any> = {};
  const mockServerOnlyClient: any = {
    auth: { getUser: mockGetUser },
    schema: vi.fn(() => ({
      from: vi.fn((table: string) => {
        const chain = chains[table] ?? createChainMock();
        // Regression guard: the RLS-bound client must never UPDATE
        // crm.usuario_perfil. Production root cause: "admins_ven_todos_perfiles"
        // was gated on a permission name ('gestionar_usuarios') deleted by the
        // permissions-matrix rewrite (20250326000008_permissions_matrix.sql),
        // so RLS silently matched 0 rows on cross-user writes via this client —
        // no error, but nothing persisted. The fix routes this write through
        // the service-role client instead; throwing here turns a regression
        // back to the RLS-bound client into a loud test failure.
        if (table === "usuario_perfil") {
          chain.update = vi.fn(() => {
            throw new Error(
              "RLS-bound client must not UPDATE crm.usuario_perfil — use createServiceRoleClient().schema('crm') instead"
            );
          });
        }
        return chain;
      }),
    })),
  };
  const mockServiceRoleClient: any = {
    auth: { admin: { createUser: vi.fn(), updateUserById: vi.fn(), listUsers: vi.fn() } },
    // Falls back to the RLS client's chains dict when a test hasn't
    // explicitly populated a dedicated service-role chain for this table —
    // this lets the currentUser fetch (now on the service-role client) keep
    // consuming the SAME .single() sequence most tests already configure on
    // `chains.usuario_perfil`, without needing every test in this file
    // updated. Tests that specifically assert "which client" ran the UPDATE
    // populate `serviceRoleChains.usuario_perfil` explicitly, which then
    // takes precedence over this fallback for ALL usuario_perfil calls in
    // that test (both the read and the write).
    schema: vi.fn(() => ({ from: vi.fn((table: string) => serviceRoleChains[table] ?? chains[table] ?? createChainMock()) })),
  };

  (mockServerOnlyClient as any).__chains = chains;
  (mockServiceRoleClient as any).__chains = serviceRoleChains;

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
  const svChains = (mockServiceRoleClient as any).__chains;
  delete svChains.usuario_perfil;
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

  it("rejects a coordinador_id that resolves to a soft-deleted user (deleted_at set, activo still true)", async () => {
    const chains = (mockServerOnlyClient as any).__chains;
    chains.usuario_perfil.single = vi.fn()
      .mockResolvedValueOnce({ data: { username: "vend1", nombre_completo: "Vendedor Uno", dni: "12345678", telefono: null, email: "v@test.com", rol_id: "rol-vend", coordinador_id: null, meta_mensual_ventas: 0, comision_porcentaje: 0, activo: true, rol: { nombre: "ROL_VENDEDOR" } }, error: null })
      // Soft-deleted coordinador: activo is still true (deleted_at is set
      // instead), so a lookup that only checks .activo would wrongly accept
      // it. The route's coordinador query must add .is("deleted_at", null),
      // which — in this mock — filters the row out entirely (data: null).
      .mockResolvedValueOnce({ data: null, error: null });

    const res = await PATCH(req({ id: "vend-1", coordinador_id: "deleted-coord" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/coordinador/i);
    expect(chains.usuario_perfil.is).toHaveBeenCalledWith("deleted_at", null);
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
    const svChains = (mockServiceRoleClient as any).__chains;
    svChains.usuario_perfil = createChainMock({ data: null, error: null }); // service-role update
    // Populating svChains.usuario_perfil makes it take precedence over the
    // chains[table] fallback for ALL usuario_perfil calls in this test — so
    // the currentUser fetch (now on the service-role client) needs its OWN
    // .single() configured here too, not on the RLS chains dict.
    svChains.usuario_perfil.single = vi.fn().mockResolvedValue({
      data: { username: "vend1", nombre_completo: "Vendedor Uno", dni: "12345678", telefono: null, email: "v@test.com", rol_id: "rol-vend", coordinador_id: null, meta_mensual_ventas: 0, comision_porcentaje: 0, activo: true, rol: { nombre: "ROL_VENDEDOR" } },
      error: null,
    }); // currentUser fetch — now via service-role client
    chains.usuario_perfil.single = vi.fn()
      .mockResolvedValueOnce({ data: { id: "coord-1", activo: true, rol: { nombre: "ROL_COORDINADOR_VENTAS" } }, error: null }) // coordinador lookup
      .mockResolvedValue({ data: { nombre_completo: "Admin Uno" }, error: null }); // admin profile lookup for audit trail

    const res = await PATCH(req({ id: "vend-1", coordinador_id: "coord-1" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    // Regression guard: previously this only asserted status/success without
    // proving the value actually reached the DB update call. The update must
    // run on the service-role client (RLS's admins_ven_todos_perfiles is
    // stale — see supabase.server mock guard above).
    expect(svChains.usuario_perfil.update).toHaveBeenCalledWith(
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
    const svChains = (mockServiceRoleClient as any).__chains;
    svChains.usuario_perfil = createChainMock({ data: null, error: null }); // service-role update
    svChains.usuario_perfil.single = vi.fn().mockResolvedValue({
      data: { username: "vend1", nombre_completo: "Vendedor Uno", dni: "12345678", telefono: null, email: "v@test.com", rol_id: "rol-vend", coordinador_id: "coord-old", meta_mensual_ventas: 0, comision_porcentaje: 0, activo: true, rol: { nombre: "ROL_VENDEDOR" } },
      error: null,
    }); // currentUser fetch — now via service-role client
    chains.rol = createChainMock({ data: { id: "rol-admin", nombre: "ROL_ADMIN" }, error: null });
    chains.historial_cambios_usuario = createChainMock({ error: null });
    // Body only sends rol_id (no coordinador_id), so validarCoordinadorId is
    // never invoked — the only remaining RLS call here is the admin profile
    // lookup for the audit trail.
    chains.usuario_perfil.single = vi.fn().mockResolvedValue({ data: { nombre_completo: "Admin Uno" }, error: null }); // admin profile lookup for audit trail

    // Client only sends rol_id — no coordinador_id — yet the stale link must
    // not survive the promotion.
    const res = await PATCH(req({ id: "vend-1", rol_id: "rol-admin" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(svChains.usuario_perfil.update).toHaveBeenCalledWith(
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
    const svChains = (mockServiceRoleClient as any).__chains;
    chains.historial_cambios_usuario = createChainMock({ error: null });
    // Populating svChains.usuario_perfil makes it take precedence over the
    // chains[table] fallback for ALL usuario_perfil calls in this test — so
    // the currentUser fetch (now on the service-role client) needs its OWN
    // .single() configured here, and coordinador validation + the audit
    // lookup move to the FRONT of the RLS chain's sequence (currentUser is
    // no longer the first call there).
    svChains.usuario_perfil = createChainMock({ data: null, error: null }); // service-role update
    svChains.usuario_perfil.single = vi.fn().mockResolvedValue({
      data: { username: "vend1", nombre_completo: "Vendedor Uno", dni: "12345678", telefono: null, email: "v@test.com", rol_id: "rol-vend", coordinador_id: "coord-old", meta_mensual_ventas: 0, comision_porcentaje: 0, activo: true, rol: { nombre: "ROL_VENDEDOR" } },
      error: null,
    }); // currentUser fetch — now via service-role client
    chains.usuario_perfil.single = vi.fn()
      .mockResolvedValueOnce({ data: { id: "coord-new", activo: true, rol: { nombre: "ROL_COORDINADOR_VENTAS" } }, error: null }) // coordinador lookup
      .mockResolvedValue({ data: { nombre_completo: "Admin Uno" }, error: null }); // admin profile lookup for audit trail

    const res = await PATCH(req({ id: "vend-1", coordinador_id: "coord-new" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    // Proves the currentUser select actually requests coordinador_id — without
    // it, the route's oldVal lookup silently reads undefined regardless of
    // what this mock returns, and the assertion below would pass for the
    // wrong reason. The currentUser fetch now runs on the service-role client.
    expect(svChains.usuario_perfil.select.mock.calls[0][0]).toContain("coordinador_id");
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
