import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetUser,
  mockEsAdmin,
  mockServerOnlyClient,
  mockServiceRoleClient,
  mockRegistrarAuditoria,
  createChainMock,
} = vi.hoisted(() => {
  // Two independent, per-chain result queues: one consumed by `.single()`
  // calls (in the order they happen), one consumed by plain `await chain`
  // calls that never call `.single()` (select+.in() fetches, update, insert).
  // This mirrors the real Supabase client, where each query is awaited
  // exactly once, but lets a single mocked table (`usuario_perfil`) serve
  // several different queries within one request without the mock
  // confusing "the coordinador lookup" with "the vendedores fetch".
  function createChainMock(options?: { thenResults?: any[]; singleResults?: any[] }) {
    const thenResults = options?.thenResults ?? [];
    const singleResults = options?.singleResults ?? [];
    let thenIndex = 0;
    let singleIndex = 0;
    const chain: any = {};
    const methods = ["select", "eq", "neq", "is", "in", "insert", "update"];
    for (const method of methods) chain[method] = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn(() => Promise.resolve(singleResults[singleIndex++] ?? { data: null, error: null }));
    chain.then = (resolve: any, reject: any) =>
      Promise.resolve(thenResults[thenIndex++] ?? { data: null, error: null }).then(resolve, reject);
    return chain;
  }

  const mockGetUser = vi.fn();
  const mockEsAdmin = vi.fn();
  const chains: Record<string, any> = {};
  const mockServerOnlyClient: any = {
    auth: { getUser: mockGetUser },
    schema: vi.fn(() => ({ from: vi.fn((table: string) => chains[table] ?? createChainMock()) })),
  };
  (mockServerOnlyClient as any).__chains = chains;
  const mockServiceRoleClient: any = {};
  const mockRegistrarAuditoria = vi.fn().mockResolvedValue(undefined);

  return {
    mockGetUser,
    mockEsAdmin,
    mockServerOnlyClient,
    mockServiceRoleClient,
    mockRegistrarAuditoria,
    createChainMock,
  };
});

vi.mock("@/lib/supabase.server", () => ({
  createServerOnlyClient: vi.fn(() => Promise.resolve(mockServerOnlyClient)),
  createServiceRoleClient: vi.fn(() => mockServiceRoleClient),
}));

vi.mock("@/lib/permissions/server", () => ({
  esAdmin: mockEsAdmin,
}));

vi.mock("@/lib/auditoria-usuarios", () => ({
  registrarAuditoriaUsuario: mockRegistrarAuditoria,
}));

import { PATCH } from "@/app/api/admin/usuarios/bulk-coordinador/route";

function req(body: any) {
  return new Request("http://localhost/api/admin/usuarios/bulk-coordinador", {
    method: "PATCH",
    body: JSON.stringify(body),
  }) as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1", email: "admin@test.com" } }, error: null });
  mockEsAdmin.mockResolvedValue(true);
  const chains = (mockServerOnlyClient as any).__chains;
  delete chains.usuario_perfil;
  delete chains.historial_cambios_usuario;
});

describe("PATCH /api/admin/usuarios/bulk-coordinador", () => {
  it("processes a valid batch: validates the coordinador once and updates all vendedores", async () => {
    const chains = (mockServerOnlyClient as any).__chains;
    chains.usuario_perfil = createChainMock({
      singleResults: [
        { data: { id: "coord-1", activo: true, rol: { nombre: "ROL_COORDINADOR_VENTAS" } }, error: null }, // coordinador validation
        { data: { nombre_completo: "Admin Uno" }, error: null }, // admin profile lookup for audit trail
      ],
      thenResults: [
        {
          data: [
            { id: "v1", nombre_completo: "Vendedor Uno", coordinador_id: null, activo: true, deleted_at: null, rol: { nombre: "ROL_VENDEDOR" } },
            { id: "v2", nombre_completo: "Vendedor Dos", coordinador_id: null, activo: true, deleted_at: null, rol: { nombre: "ROL_VENDEDOR" } },
          ],
          error: null,
        }, // vendedores fetch
        { data: null, error: null }, // update
      ],
    });
    chains.historial_cambios_usuario = createChainMock({ thenResults: [{ data: null, error: null }] });

    const res = await PATCH(req({ vendedorIds: ["v1", "v2"], coordinadorId: "coord-1" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ actualizados: 2, sinCambios: 0, rechazados: [] });
    expect(chains.usuario_perfil.update).toHaveBeenCalledWith({ coordinador_id: "coord-1" });
    expect(chains.historial_cambios_usuario.insert).toHaveBeenCalledWith([
      { usuario_id: "v1", campo: "coordinador_id", valor_anterior: null, valor_nuevo: "coord-1", modificado_por: "admin-1" },
      { usuario_id: "v2", campo: "coordinador_id", valor_anterior: null, valor_nuevo: "coord-1", modificado_por: "admin-1" },
    ]);
    expect(mockRegistrarAuditoria).toHaveBeenCalledTimes(2);
  });

  it("rejects invalid vendedor ids individually with a specific motivo, without aborting the batch", async () => {
    const chains = (mockServerOnlyClient as any).__chains;
    chains.usuario_perfil = createChainMock({
      singleResults: [
        { data: { id: "coord-1", activo: true, rol: { nombre: "ROL_COORDINADOR_VENTAS" } }, error: null },
        { data: { nombre_completo: "Admin Uno" }, error: null },
      ],
      thenResults: [
        {
          data: [
            { id: "v1", nombre_completo: "Vendedor Uno", coordinador_id: null, activo: true, deleted_at: null, rol: { nombre: "ROL_VENDEDOR" } },
            { id: "v-inactivo", nombre_completo: "Vendedor Inactivo", coordinador_id: null, activo: false, deleted_at: null, rol: { nombre: "ROL_VENDEDOR" } },
            { id: "v-nocoord", nombre_completo: "No Vendedor", coordinador_id: null, activo: true, deleted_at: null, rol: { nombre: "ROL_COORDINADOR_VENTAS" } },
            // "v-missing" is intentionally absent from the DB result set
          ],
          error: null,
        },
        { data: null, error: null },
      ],
    });
    chains.historial_cambios_usuario = createChainMock({ thenResults: [{ data: null, error: null }] });

    const res = await PATCH(req({
      vendedorIds: ["v1", "v-missing", "v-inactivo", "v-nocoord"],
      coordinadorId: "coord-1",
    }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.actualizados).toBe(1);
    expect(body.sinCambios).toBe(0);
    expect(body.rechazados).toEqual(expect.arrayContaining([
      { id: "v-missing", motivo: "Usuario no encontrado" },
      { id: "v-inactivo", motivo: "Usuario inactivo" },
      { id: "v-nocoord", motivo: "El usuario no tiene el rol de vendedor" },
    ]));
    expect(chains.usuario_perfil.update).toHaveBeenCalledWith({ coordinador_id: "coord-1" });
    // Only the valid id reaches the update's .in() call
    expect(chains.usuario_perfil.in).toHaveBeenCalledWith("id", ["v1"]);
    expect(mockRegistrarAuditoria).toHaveBeenCalledTimes(1);
  });

  it("returns 400 when coordinadorId does not resolve to an active ROL_COORDINADOR_VENTAS user, without touching vendedores", async () => {
    const chains = (mockServerOnlyClient as any).__chains;
    chains.usuario_perfil = createChainMock({
      singleResults: [
        { data: null, error: { message: "not found" } },
      ],
    });

    const res = await PATCH(req({ vendedorIds: ["v1"], coordinadorId: "not-a-coordinador" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/coordinador/i);
    // The batch never reached the vendedores fetch/update — .in() was never called
    expect(chains.usuario_perfil.in).not.toHaveBeenCalled();
  });

  it("bulk-unassigns coordinador when coordinadorId is null, skipping coordinador validation entirely", async () => {
    const chains = (mockServerOnlyClient as any).__chains;
    chains.usuario_perfil = createChainMock({
      singleResults: [
        { data: { nombre_completo: "Admin Uno" }, error: null }, // admin profile lookup only — coordinador validation is skipped for null
      ],
      thenResults: [
        {
          data: [
            { id: "v1", nombre_completo: "Vendedor Uno", coordinador_id: "coord-old", activo: true, deleted_at: null, rol: { nombre: "ROL_VENDEDOR" } },
          ],
          error: null,
        },
        { data: null, error: null },
      ],
    });
    chains.historial_cambios_usuario = createChainMock({ thenResults: [{ data: null, error: null }] });

    const res = await PATCH(req({ vendedorIds: ["v1"], coordinadorId: null }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ actualizados: 1, sinCambios: 0, rechazados: [] });
    expect(chains.usuario_perfil.update).toHaveBeenCalledWith({ coordinador_id: null });
    expect(chains.historial_cambios_usuario.insert).toHaveBeenCalledWith([
      { usuario_id: "v1", campo: "coordinador_id", valor_anterior: "coord-old", valor_nuevo: null, modificado_por: "admin-1" },
    ]);
  });

  it("counts vendedores already assigned to the target coordinador as sinCambios, not actualizados", async () => {
    const chains = (mockServerOnlyClient as any).__chains;
    chains.usuario_perfil = createChainMock({
      singleResults: [
        { data: { id: "coord-1", activo: true, rol: { nombre: "ROL_COORDINADOR_VENTAS" } }, error: null },
        { data: { nombre_completo: "Admin Uno" }, error: null },
      ],
      thenResults: [
        {
          data: [
            { id: "v1", nombre_completo: "Vendedor Uno", coordinador_id: null, activo: true, deleted_at: null, rol: { nombre: "ROL_VENDEDOR" } },
            { id: "v2", nombre_completo: "Vendedor Dos", coordinador_id: "coord-1", activo: true, deleted_at: null, rol: { nombre: "ROL_VENDEDOR" } },
          ],
          error: null,
        },
        { data: null, error: null },
      ],
    });
    chains.historial_cambios_usuario = createChainMock({ thenResults: [{ data: null, error: null }] });

    const res = await PATCH(req({ vendedorIds: ["v1", "v2"], coordinadorId: "coord-1" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ actualizados: 1, sinCambios: 1, rechazados: [] });
    // Only the ACTUALLY-changed vendedor gets a historial row + audit entry —
    // v2 was already assigned to coord-1, so it's a no-op (unchanged logic).
    expect(chains.historial_cambios_usuario.insert).toHaveBeenCalledWith([
      { usuario_id: "v1", campo: "coordinador_id", valor_anterior: null, valor_nuevo: "coord-1", modificado_por: "admin-1" },
    ]);
  });

  it("logs a warning when the historial insert errors, without failing the request (historial is best-effort)", async () => {
    const chains = (mockServerOnlyClient as any).__chains;
    chains.usuario_perfil = createChainMock({
      singleResults: [
        { data: { id: "coord-1", activo: true, rol: { nombre: "ROL_COORDINADOR_VENTAS" } }, error: null },
        { data: { nombre_completo: "Admin Uno" }, error: null },
      ],
      thenResults: [
        {
          data: [
            { id: "v1", nombre_completo: "Vendedor Uno", coordinador_id: null, activo: true, deleted_at: null, rol: { nombre: "ROL_VENDEDOR" } },
          ],
          error: null,
        },
        { data: null, error: null },
      ],
    });
    // supabase-js resolves `{ error }` on a failed insert — it does not
    // throw — so a bare try/catch around `await ...insert(...)` can never
    // observe this error. The route must destructure `{ error }` explicitly
    // (same pattern as resolverEquipoDelCoordinador in _actions.ts) to
    // actually surface it via console.warn.
    chains.historial_cambios_usuario = createChainMock({
      thenResults: [{ data: null, error: { message: "insert failed" } }],
    });

    const res = await PATCH(req({ vendedorIds: ["v1"], coordinadorId: "coord-1" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ actualizados: 1, sinCambios: 0, rechazados: [] });
    expect(console.warn).toHaveBeenCalledWith(
      "[bulk-coordinador] Error registrando historial de cambios:",
      { message: "insert failed" },
    );
  });

  it("rejects a non-admin request with 403 before running any query", async () => {
    mockEsAdmin.mockResolvedValue(false);

    const res = await PATCH(req({ vendedorIds: ["v1"], coordinadorId: "coord-1" }));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toMatch(/administrador/i);
  });
});
