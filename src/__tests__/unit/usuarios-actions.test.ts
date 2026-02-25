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

  it("retorna password temporal si todo sale bien", async () => {
    mockServiceRoleClient.auth.admin.getUserById.mockResolvedValue({
      data: { user: { id: "user-1", email: "test@test.com" } },
      error: null,
    });
    mockServiceRoleClient.auth.admin.updateUserById.mockResolvedValue({ error: null });

    // getAdminInfo reads profile (single), then resetear updates profile (update.eq)
    const adminChain = createChainMock({ data: { nombre_completo: "Admin Test" }, error: null });
    const updateChain = createChainMock({ error: null });
    updateChain.eq.mockReturnValue(Promise.resolve({ error: null }));

    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation(() => {
      callCount++;
      return callCount === 1 ? adminChain : updateChain;
    });
    mockServerActionClient.schema.mockReturnValue({ from: mockFrom });

    const result = await resetearPasswordUsuario("user-1");
    expect(result.success).toBe(true);
    expect(result.passwordTemporal).toBeDefined();
    expect(typeof result.passwordTemporal).toBe("string");
    expect(result.passwordTemporal!.length).toBeGreaterThanOrEqual(12);
  });

  it("registra auditoría al resetear password", async () => {
    mockServiceRoleClient.auth.admin.getUserById.mockResolvedValue({
      data: { user: { id: "user-1", email: "test@test.com" } },
      error: null,
    });
    mockServiceRoleClient.auth.admin.updateUserById.mockResolvedValue({ error: null });

    const adminChain = createChainMock({ data: { nombre_completo: "Admin Test" }, error: null });
    const updateChain = createChainMock({ error: null });
    updateChain.eq.mockReturnValue(Promise.resolve({ error: null }));

    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation(() => {
      callCount++;
      return callCount === 1 ? adminChain : updateChain;
    });
    mockServerActionClient.schema.mockReturnValue({ from: mockFrom });

    await resetearPasswordUsuario("user-1");

    expect(registrarAuditoriaUsuario).toHaveBeenCalledWith(
      mockServiceRoleClient,
      expect.objectContaining({ accion: "resetear_password" })
    );
  });
});
