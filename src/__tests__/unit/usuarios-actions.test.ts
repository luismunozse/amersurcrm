import { describe, it, expect, vi, beforeEach } from "vitest";

// ==================== HOISTED MOCKS ====================

const {
  mockGetUser,
  mockServerActionClient,
  mockServiceRoleClient,
  createChainMock,
} = vi.hoisted(() => {
  function createChainMock(finalResult: any = { data: null, error: null }) {
    const chain: any = {};
    const methods = ["select", "insert", "update", "eq", "neq", "is", "or", "order", "range", "single", "in", "limit", "head"];
    for (const method of methods) {
      chain[method] = vi.fn().mockReturnValue(chain);
    }
    chain.single.mockImplementation(() => Promise.resolve(finalResult));
    chain.limit.mockImplementation(() => Promise.resolve(finalResult));
    // Allows a chain to be awaited directly (no .single()/.limit()) — needed
    // for plain list/update queries like the team fetch and the atomic
    // coordinador_id UPDATE added in Task 1.
    chain.then = (resolve: any, reject: any) => Promise.resolve(finalResult).then(resolve, reject);
    return chain;
  }

  const mockGetUser = vi.fn();

  const mockServerActionClient = {
    auth: { getUser: mockGetUser },
    schema: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(createChainMock()) }),
  };

  const mockServiceRoleClient = {
    auth: {
      admin: {
        getUserById: vi.fn(),
        updateUserById: vi.fn(),
        signOut: vi.fn().mockResolvedValue({}),
        createUser: vi.fn(),
        deleteUser: vi.fn(),
      },
    },
    schema: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(createChainMock()) }),
  };

  return { mockGetUser, mockServerActionClient, mockServiceRoleClient, createChainMock };
});

vi.mock("@/lib/supabase.server-actions", () => ({
  createServerActionClient: vi.fn().mockImplementation(() => Promise.resolve(mockServerActionClient)),
}));

vi.mock("@/lib/supabase.server", () => ({
  createServiceRoleClient: vi.fn().mockReturnValue(mockServiceRoleClient),
}));

vi.mock("@/lib/permissions/server", () => ({
  esAdmin: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/auditoria-usuarios", () => ({
  registrarAuditoriaUsuario: vi.fn().mockResolvedValue(undefined),
}));

// Import after mocks
import {
  cambiarEstadoUsuario,
  eliminarUsuario,
  restaurarUsuario,
  reasignarClientes,
  contarClientesAsignados,
  resetearPasswordUsuario,
} from "@/app/dashboard/admin/usuarios/_actions";
import { esAdmin } from "@/lib/permissions/server";
import { registrarAuditoriaUsuario } from "@/lib/auditoria-usuarios";

describe("cambiarEstadoUsuario", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (esAdmin as any).mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1", email: "admin@test.com" } } });

    // Default: getAdminInfo succeeds
    mockServerActionClient.schema.mockReturnValue({
      from: vi.fn().mockReturnValue(
        createChainMock({ data: { nombre_completo: "Admin Test" }, error: null })
      ),
    });

    // Default: serviceRole operations succeed
    const srChain = createChainMock({ data: { activo: true }, error: null });
    mockServiceRoleClient.schema.mockReturnValue({
      from: vi.fn().mockReturnValue(srChain),
    });
  });

  it("rechaza si no es admin", async () => {
    (esAdmin as any).mockResolvedValue(false);

    const result = await cambiarEstadoUsuario("user-1", false, "Motivo de prueba suficiente");
    expect(result.success).toBe(false);
    expect(result.error).toContain("permisos");
  });

  it("rechaza motivo con menos de 10 caracteres", async () => {
    const result = await cambiarEstadoUsuario("user-1", false, "corto");
    expect(result.success).toBe(false);
    expect(result.error).toContain("10 caracteres");
  });

  it("rechaza motivo con más de 500 caracteres", async () => {
    const result = await cambiarEstadoUsuario("user-1", false, "a".repeat(501));
    expect(result.success).toBe(false);
    expect(result.error).toContain("500 caracteres");
  });

  it("rechaza motivo vacío", async () => {
    const result = await cambiarEstadoUsuario("user-1", false, "");
    expect(result.success).toBe(false);
    expect(result.error).toContain("10 caracteres");
  });

  it("invalida sesión al desactivar usuario", async () => {
    const srChain = createChainMock({ data: { id: "user-1", nombre_completo: "Test" }, error: null });
    mockServiceRoleClient.schema.mockReturnValue({
      from: vi.fn().mockReturnValue(srChain),
    });

    await cambiarEstadoUsuario("user-1", false, "El usuario ya no trabaja aquí");

    expect(mockServiceRoleClient.auth.admin.signOut).toHaveBeenCalledWith("user-1");
  });

  it("NO invalida sesión al activar usuario", async () => {
    const srChain = createChainMock({ data: { id: "user-1", nombre_completo: "Test" }, error: null });
    mockServiceRoleClient.schema.mockReturnValue({
      from: vi.fn().mockReturnValue(srChain),
    });

    await cambiarEstadoUsuario("user-1", true, "El usuario vuelve a trabajar");

    expect(mockServiceRoleClient.auth.admin.signOut).not.toHaveBeenCalled();
  });

  it("registra auditoría al cambiar estado", async () => {
    const srChain = createChainMock({ data: { id: "user-1", nombre_completo: "Test" }, error: null });
    mockServiceRoleClient.schema.mockReturnValue({
      from: vi.fn().mockReturnValue(srChain),
    });

    await cambiarEstadoUsuario("user-1", false, "Motivo de prueba para desactivar");

    expect(registrarAuditoriaUsuario).toHaveBeenCalledWith(
      mockServiceRoleClient,
      expect.objectContaining({
        accion: "desactivar",
        detalles: expect.objectContaining({ motivo: expect.any(String) }),
      })
    );
  });
});

describe("cambiarEstadoUsuario — equipo decision (coordinador with a team)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (esAdmin as any).mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1", email: "admin@test.com" } } });
    mockServerActionClient.schema.mockReturnValue({
      from: vi.fn().mockReturnValue(createChainMock({ data: { nombre_completo: "Admin Test" }, error: null })),
    });
  });

  it("returns needsEquipoDecision without deactivating when the coordinador has an active team and no decision was given", async () => {
    const srFrom = vi.fn();
    const chains = [
      // 1. usuarioExistente fetch (coordinador being deactivated)
      createChainMock({ data: { id: "coord-1", nombre_completo: "Coord Uno", rol: { nombre: "ROL_COORDINADOR_VENTAS" } }, error: null }),
      // 2. team fetch — 2 team members
      createChainMock({ data: [{ id: "v1", nombre_completo: "Vendedor Uno" }, { id: "v2", nombre_completo: "Vendedor Dos" }], error: null }),
    ];
    let callCount = 0;
    srFrom.mockImplementation(() => chains[callCount++]);
    mockServiceRoleClient.schema.mockReturnValue({ from: srFrom });

    const result = await cambiarEstadoUsuario("coord-1", false, "El coordinador deja la empresa");

    expect(result.success).toBe(false);
    expect((result as any).needsEquipoDecision).toBe(true);
    expect((result as any).equipoSize).toBe(2);
    // Deactivation must NOT have happened — only 2 serviceRole calls, no
    // final activo update.
    expect(callCount).toBe(2);
  });

  it("transfers the whole team to the chosen coordinador atomically and audits each moved vendedor", async () => {
    const srFrom = vi.fn();
    const chains = [
      createChainMock({ data: { id: "coord-1", nombre_completo: "Coord Uno", rol: { nombre: "ROL_COORDINADOR_VENTAS" } }, error: null }), // 1. usuarioExistente
      createChainMock({ data: [{ id: "v1", nombre_completo: "Vendedor Uno" }], error: null }), // 2. team fetch
      createChainMock({ data: { id: "coord-2", activo: true, rol: { nombre: "ROL_COORDINADOR_VENTAS" } }, error: null }), // 3. validarCoordinadorId lookup
      createChainMock({ data: null, error: null }), // 4. atomic team UPDATE
      createChainMock({ data: null, error: null }), // 5. historial_cambios_usuario insert
      createChainMock({ data: { activo: false }, error: null }), // 6. final activo UPDATE
    ];
    let callCount = 0;
    srFrom.mockImplementation(() => chains[callCount++]);
    mockServiceRoleClient.schema.mockReturnValue({ from: srFrom });

    const result = await cambiarEstadoUsuario("coord-1", false, "El coordinador deja la empresa", { transferirA: "coord-2" });

    expect(result.success).toBe(true);
    expect(chains[3].update).toHaveBeenCalledWith({ coordinador_id: "coord-2" });
    expect(chains[3].eq).toHaveBeenCalledWith("coordinador_id", "coord-1");
    expect(chains[4].insert).toHaveBeenCalledWith([
      { usuario_id: "v1", campo: "coordinador_id", valor_anterior: "coord-1", valor_nuevo: "coord-2", modificado_por: "admin-1" },
    ]);
    expect(registrarAuditoriaUsuario).toHaveBeenCalledWith(
      mockServiceRoleClient,
      expect.objectContaining({ usuarioId: "v1", accion: "editar", detalles: expect.objectContaining({ campos_modificados: ["coordinador_id"] }) }),
    );
  });

  it("sets coordinador_id to NULL for the whole team when dejarSinCoordinador is chosen", async () => {
    const srFrom = vi.fn();
    const chains = [
      createChainMock({ data: { id: "coord-1", nombre_completo: "Coord Uno", rol: { nombre: "ROL_COORDINADOR_VENTAS" } }, error: null }),
      createChainMock({ data: [{ id: "v1", nombre_completo: "Vendedor Uno" }], error: null }),
      createChainMock({ data: null, error: null }), // atomic UPDATE (no validarCoordinadorId call — dejarSinCoordinador skips it)
      createChainMock({ data: null, error: null }), // historial insert
      createChainMock({ data: { activo: false }, error: null }), // final activo UPDATE
    ];
    let callCount = 0;
    srFrom.mockImplementation(() => chains[callCount++]);
    mockServiceRoleClient.schema.mockReturnValue({ from: srFrom });

    const result = await cambiarEstadoUsuario("coord-1", false, "El coordinador deja la empresa", { dejarSinCoordinador: true });

    expect(result.success).toBe(true);
    expect(chains[2].update).toHaveBeenCalledWith({ coordinador_id: null });
    expect(chains[3].insert).toHaveBeenCalledWith([
      { usuario_id: "v1", campo: "coordinador_id", valor_anterior: "coord-1", valor_nuevo: null, modificado_por: "admin-1" },
    ]);
  });

  it("rejects transferring the team to the same coordinador being deactivated", async () => {
    const srFrom = vi.fn();
    const chains = [
      createChainMock({ data: { id: "coord-1", nombre_completo: "Coord Uno", rol: { nombre: "ROL_COORDINADOR_VENTAS" } }, error: null }),
      createChainMock({ data: [{ id: "v1", nombre_completo: "Vendedor Uno" }], error: null }),
    ];
    let callCount = 0;
    srFrom.mockImplementation(() => chains[callCount++]);
    mockServiceRoleClient.schema.mockReturnValue({ from: srFrom });

    const result = await cambiarEstadoUsuario("coord-1", false, "El coordinador deja la empresa", { transferirA: "coord-1" });

    expect(result.success).toBe(false);
    expect((result as any).needsEquipoDecision).toBeUndefined();
    expect(result.error).toMatch(/mismo coordinador/i);
  });

  it("rejects an empty-string transferirA and leaves the team untouched", async () => {
    const srFrom = vi.fn();
    const chains = [
      createChainMock({ data: { id: "coord-1", nombre_completo: "Coord Uno", rol: { nombre: "ROL_COORDINADOR_VENTAS" } }, error: null }),
      createChainMock({ data: [{ id: "v1", nombre_completo: "Vendedor Uno" }], error: null }),
    ];
    let callCount = 0;
    srFrom.mockImplementation(() => chains[callCount++]);
    mockServiceRoleClient.schema.mockReturnValue({ from: srFrom });

    const result = await cambiarEstadoUsuario("coord-1", false, "El coordinador deja la empresa", { transferirA: "" });

    expect(result.success).toBe(false);
    expect((result as any).needsEquipoDecision).toBeUndefined();
    expect(result.error).toMatch(/debe seleccionar un coordinador/i);
    expect(callCount).toBe(2); // never reached validarCoordinadorId or the UPDATE
  });

  it("rejects an invalid transfer target and leaves the team untouched", async () => {
    const srFrom = vi.fn();
    const chains = [
      createChainMock({ data: { id: "coord-1", nombre_completo: "Coord Uno", rol: { nombre: "ROL_COORDINADOR_VENTAS" } }, error: null }),
      createChainMock({ data: [{ id: "v1", nombre_completo: "Vendedor Uno" }], error: null }),
      createChainMock({ data: null, error: { message: "not found" } }), // validarCoordinadorId lookup fails
    ];
    let callCount = 0;
    srFrom.mockImplementation(() => chains[callCount++]);
    mockServiceRoleClient.schema.mockReturnValue({ from: srFrom });

    const result = await cambiarEstadoUsuario("coord-1", false, "El coordinador deja la empresa", { transferirA: "not-a-coordinador" });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/coordinador/i);
    expect(callCount).toBe(3); // never reached the UPDATE
  });

  it("does not check for a team when deactivating a non-coordinador (unchanged behavior)", async () => {
    const srFrom = vi.fn();
    const chains = [
      createChainMock({ data: { id: "vend-1", nombre_completo: "Vendedor Uno", rol: { nombre: "ROL_VENDEDOR" } }, error: null }), // usuarioExistente
      createChainMock({ data: { activo: false }, error: null }), // final activo UPDATE — no team fetch in between
    ];
    let callCount = 0;
    srFrom.mockImplementation(() => chains[callCount++]);
    mockServiceRoleClient.schema.mockReturnValue({ from: srFrom });

    const result = await cambiarEstadoUsuario("vend-1", false, "Ya no trabaja aquí");

    expect(result.success).toBe(true);
    expect(callCount).toBe(2);
  });

  it("fails closed (no team UPDATE, no audit) when the acting admin cannot be resolved", async () => {
    // getAdminInfo() returns null when supabase.auth.getUser() has no user —
    // e.g. a session race. Previously resolverEquipoDelCoordinador silently
    // fell back to `admin?.id || coordinadorId` for modificado_por and
    // skipped registrarAuditoriaUsuario entirely instead of refusing the move.
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const srFrom = vi.fn();
    const chains = [
      createChainMock({ data: { id: "coord-1", nombre_completo: "Coord Uno", rol: { nombre: "ROL_COORDINADOR_VENTAS" } }, error: null }), // usuarioExistente
      createChainMock({ data: [{ id: "v1", nombre_completo: "Vendedor Uno" }], error: null }), // team fetch
    ];
    let callCount = 0;
    srFrom.mockImplementation(() => chains[callCount++]);
    mockServiceRoleClient.schema.mockReturnValue({ from: srFrom });

    const result = await cambiarEstadoUsuario("coord-1", false, "El coordinador deja la empresa", { dejarSinCoordinador: true });

    expect(result.success).toBe(false);
    expect((result as any).needsEquipoDecision).toBeUndefined();
    expect(result.error).toMatch(/administrador/i);
    // Only the usuarioExistente fetch + team fetch happened — the fail-closed
    // check must run BEFORE the atomic team UPDATE, so no further
    // serviceRole call (UPDATE/insert/final activo UPDATE) was ever made.
    expect(callCount).toBe(2);
    expect(registrarAuditoriaUsuario).not.toHaveBeenCalled();
  });
});

describe("eliminarUsuario", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (esAdmin as any).mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1", email: "admin@test.com" } } });

    mockServerActionClient.schema.mockReturnValue({
      from: vi.fn().mockReturnValue(
        createChainMock({ data: { nombre_completo: "Admin Test" }, error: null })
      ),
    });

    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("rechaza si no es admin", async () => {
    (esAdmin as any).mockResolvedValue(false);

    const result = await eliminarUsuario("user-1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("administradores");
  });

  it("no permite eliminarse a sí mismo", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } } });

    const srChain = createChainMock({ data: { id: "admin-1", username: "admin", nombre_completo: "Admin", deleted_at: null }, error: null });
    mockServiceRoleClient.schema.mockReturnValue({
      from: vi.fn().mockReturnValue(srChain),
    });

    const result = await eliminarUsuario("admin-1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("ti mismo");
  });

  it("rechaza si el usuario ya fue eliminado (soft delete)", async () => {
    const srChain = createChainMock({
      data: { id: "user-1", username: "test", nombre_completo: "Test", deleted_at: "2026-01-01T00:00:00Z" },
      error: null,
    });
    mockServiceRoleClient.schema.mockReturnValue({
      from: vi.fn().mockReturnValue(srChain),
    });

    const result = await eliminarUsuario("user-1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("ya fue eliminado");
  });

  it("invalida sesión al eliminar usuario", async () => {
    const srFrom = vi.fn();
    const srChainSelect = createChainMock({
      data: { id: "user-1", username: "test", nombre_completo: "Test", deleted_at: null },
      error: null,
    });
    const srChainUpdate = createChainMock({ error: null });
    srChainUpdate.eq.mockReturnValue(Promise.resolve({ error: null }));

    let callCount = 0;
    srFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? srChainSelect : srChainUpdate;
    });

    mockServiceRoleClient.schema.mockReturnValue({ from: srFrom });

    await eliminarUsuario("user-1", "Ya no trabaja");

    expect(mockServiceRoleClient.auth.admin.signOut).toHaveBeenCalledWith("user-1");
  });
});

describe("eliminarUsuario — equipo decision (coordinador with a team)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (esAdmin as any).mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1", email: "admin@test.com" } } });
    mockServerActionClient.schema.mockReturnValue({
      from: vi.fn().mockReturnValue(createChainMock({ data: { nombre_completo: "Admin Test" }, error: null })),
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("returns needsEquipoDecision without deleting when the coordinador has an active team and no decision was given", async () => {
    const srFrom = vi.fn();
    const chains = [
      createChainMock({ data: { id: "coord-1", username: "coord1", nombre_completo: "Coord Uno", deleted_at: null, rol: { nombre: "ROL_COORDINADOR_VENTAS" } }, error: null }), // usuarioExistente
      createChainMock({ data: [{ id: "v1", nombre_completo: "Vendedor Uno" }], error: null }), // team fetch
    ];
    let callCount = 0;
    srFrom.mockImplementation(() => chains[callCount++]);
    mockServiceRoleClient.schema.mockReturnValue({ from: srFrom });

    const result = await eliminarUsuario("coord-1");

    expect(result.success).toBe(false);
    expect((result as any).needsEquipoDecision).toBe(true);
    expect((result as any).equipoSize).toBe(1);
    expect(mockServiceRoleClient.auth.admin.signOut).not.toHaveBeenCalled();
  });

  it("transfers the team then soft-deletes the coordinador when a transfer decision is given", async () => {
    const srFrom = vi.fn();
    const chains = [
      createChainMock({ data: { id: "coord-1", username: "coord1", nombre_completo: "Coord Uno", deleted_at: null, rol: { nombre: "ROL_COORDINADOR_VENTAS" } }, error: null }), // usuarioExistente
      createChainMock({ data: [{ id: "v1", nombre_completo: "Vendedor Uno" }], error: null }), // team fetch
      createChainMock({ data: { id: "coord-2", activo: true, rol: { nombre: "ROL_COORDINADOR_VENTAS" } }, error: null }), // validarCoordinadorId
      createChainMock({ data: null, error: null }), // atomic team UPDATE
      createChainMock({ data: null, error: null }), // historial insert
      createChainMock({ data: null, error: null }), // soft-delete UPDATE (existing code path)
    ];
    let callCount = 0;
    srFrom.mockImplementation(() => chains[callCount++]);
    mockServiceRoleClient.schema.mockReturnValue({ from: srFrom });

    const result = await eliminarUsuario("coord-1", "Renuncia", { transferirA: "coord-2" });

    expect(result.success).toBe(true);
    expect(chains[3].update).toHaveBeenCalledWith({ coordinador_id: "coord-2" });
    expect(mockServiceRoleClient.auth.admin.signOut).toHaveBeenCalledWith("coord-1");
  });

  it("fails closed (no team UPDATE, no soft-delete, no signOut) when the acting admin cannot be resolved", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const srFrom = vi.fn();
    const chains = [
      createChainMock({ data: { id: "coord-1", username: "coord1", nombre_completo: "Coord Uno", deleted_at: null, rol: { nombre: "ROL_COORDINADOR_VENTAS" } }, error: null }), // usuarioExistente
      createChainMock({ data: [{ id: "v1", nombre_completo: "Vendedor Uno" }], error: null }), // team fetch
    ];
    let callCount = 0;
    srFrom.mockImplementation(() => chains[callCount++]);
    mockServiceRoleClient.schema.mockReturnValue({ from: srFrom });

    const result = await eliminarUsuario("coord-1", "Renuncia", { dejarSinCoordinador: true });

    expect(result.success).toBe(false);
    expect((result as any).needsEquipoDecision).toBeUndefined();
    expect(result.error).toMatch(/administrador/i);
    // Fail-closed check runs before the atomic team UPDATE — no further
    // serviceRole calls (UPDATE/insert/soft-delete) were made.
    expect(callCount).toBe(2);
    expect(mockServiceRoleClient.auth.admin.signOut).not.toHaveBeenCalled();
  });
});

describe("restaurarUsuario", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (esAdmin as any).mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1", email: "admin@test.com" } } });

    mockServerActionClient.schema.mockReturnValue({
      from: vi.fn().mockReturnValue(
        createChainMock({ data: { nombre_completo: "Admin Test" }, error: null })
      ),
    });
  });

  it("rechaza si no es admin", async () => {
    (esAdmin as any).mockResolvedValue(false);

    const result = await restaurarUsuario("user-1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("administradores");
  });

  it("rechaza si el usuario no está eliminado", async () => {
    const srChain = createChainMock({
      data: { id: "user-1", nombre_completo: "Test", deleted_at: null },
      error: null,
    });
    mockServiceRoleClient.schema.mockReturnValue({
      from: vi.fn().mockReturnValue(srChain),
    });

    const result = await restaurarUsuario("user-1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("no está eliminado");
  });

  it("rechaza si el usuario no existe", async () => {
    const srChain = createChainMock({
      data: null,
      error: { code: "PGRST116", message: "not found" },
    });
    mockServiceRoleClient.schema.mockReturnValue({
      from: vi.fn().mockReturnValue(srChain),
    });

    const result = await restaurarUsuario("nonexistent");
    expect(result.success).toBe(false);
    expect(result.error).toContain("no encontrado");
  });
});

describe("reasignarClientes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (esAdmin as any).mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1", email: "admin@test.com" } } });

    mockServerActionClient.schema.mockReturnValue({
      from: vi.fn().mockReturnValue(
        createChainMock({ data: { nombre_completo: "Admin Test" }, error: null })
      ),
    });
  });

  it("rechaza si no es admin", async () => {
    (esAdmin as any).mockResolvedValue(false);

    const result = await reasignarClientes("from-user", "to-user");
    expect(result.success).toBe(false);
    expect(result.error).toContain("administradores");
  });

  it("rechaza si no se encuentran ambos usuarios", async () => {
    const srChain = createChainMock();
    srChain.in.mockImplementation(() => Promise.resolve({
      data: [{ id: "from-user", username: "fromuser", nombre_completo: "From" }],
      error: null,
    }));

    mockServiceRoleClient.schema.mockReturnValue({ from: vi.fn().mockReturnValue(srChain) });

    const result = await reasignarClientes("from-user", "nonexistent");
    expect(result.success).toBe(false);
    expect(result.error).toContain("ambos usuarios");
  });
});

describe("contarClientesAsignados", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 0 si el usuario no tiene username", async () => {
    const srChain = createChainMock({ data: null, error: null });
    mockServiceRoleClient.schema.mockReturnValue({
      from: vi.fn().mockReturnValue(srChain),
    });

    const count = await contarClientesAsignados("user-without-username");
    expect(count).toBe(0);
  });
});

describe("resetearPasswordUsuario", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (esAdmin as any).mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1", email: "admin@test.com" } } });

    mockServerActionClient.schema.mockReturnValue({
      from: vi.fn().mockReturnValue(
        createChainMock({ data: { nombre_completo: "Admin Test" }, error: null })
      ),
    });
  });

  it("rechaza si no es admin", async () => {
    (esAdmin as any).mockResolvedValue(false);

    await expect(resetearPasswordUsuario("user-1")).rejects.toThrow("permisos");
  });

  it("retorna error si usuario no existe en auth", async () => {
    mockServiceRoleClient.auth.admin.getUserById.mockResolvedValue({
      data: null,
      error: { message: "User not found" },
    });

    const result = await resetearPasswordUsuario("nonexistent");
    expect(result.success).toBe(false);
    expect(result.error).toContain("no encontrado");
  });

  it("actualiza requiere_cambio_password a través del cliente service-role, nunca del cliente RLS", async () => {
    // Regression test for the production RLS bug: "admins_ven_todos_perfiles"
    // was gated on a permission name ('gestionar_usuarios') deleted by the
    // permissions-matrix rewrite (20250326000008_permissions_matrix.sql), so
    // RLS silently matched 0 rows on this cross-user usuario_perfil UPDATE
    // via the RLS-bound client — no error, but nothing persisted. The fix
    // routes this write through the service-role client (already created in
    // this function for the auth password reset) instead. Guarding the
    // RLS-bound chain's update() to throw turns a silent false-green into a
    // loud failure if the action ever regresses back to the RLS-bound client.
    mockServiceRoleClient.auth.admin.getUserById.mockResolvedValue({
      data: { user: { id: "user-1", email: "test@test.com" } },
      error: null,
    });
    mockServiceRoleClient.auth.admin.updateUserById.mockResolvedValue({ error: null });

    // getAdminInfo's own-row lookup (select) uses this client too — only
    // update() is guarded, since that is the call that must move.
    const adminChain = createChainMock({ data: { nombre_completo: "Admin Test" }, error: null });
    adminChain.update = vi.fn(() => {
      throw new Error("RLS-bound client must not UPDATE crm.usuario_perfil — use the service-role client instead");
    });
    mockServerActionClient.schema.mockReturnValue({ from: vi.fn().mockReturnValue(adminChain) });

    const serviceRoleUpdateChain = createChainMock({ error: null });
    const serviceRoleFrom = vi.fn().mockReturnValue(serviceRoleUpdateChain);
    mockServiceRoleClient.schema.mockReturnValue({ from: serviceRoleFrom });

    const result = await resetearPasswordUsuario("user-1");

    expect(result.success).toBe(true);
    expect(result.passwordTemporal).toBeDefined();
    expect(typeof result.passwordTemporal).toBe("string");
    expect(result.passwordTemporal!.length).toBeGreaterThanOrEqual(12);
    expect(serviceRoleFrom).toHaveBeenCalledWith("usuario_perfil");
    expect(serviceRoleUpdateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ requiere_cambio_password: true })
    );
    expect(adminChain.update).not.toHaveBeenCalled();
  });

  it("registra auditoría al resetear password", async () => {
    mockServiceRoleClient.auth.admin.getUserById.mockResolvedValue({
      data: { user: { id: "user-1", email: "test@test.com" } },
      error: null,
    });
    mockServiceRoleClient.auth.admin.updateUserById.mockResolvedValue({ error: null });

    const adminChain = createChainMock({ data: { nombre_completo: "Admin Test" }, error: null });
    mockServerActionClient.schema.mockReturnValue({ from: vi.fn().mockReturnValue(adminChain) });
    mockServiceRoleClient.schema.mockReturnValue({
      from: vi.fn().mockReturnValue(createChainMock({ error: null })),
    });

    await resetearPasswordUsuario("user-1");

    expect(registrarAuditoriaUsuario).toHaveBeenCalledWith(
      mockServiceRoleClient,
      expect.objectContaining({ accion: "resetear_password" })
    );
  });
});
