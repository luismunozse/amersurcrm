import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockServerActionClient, mockSchemaClient, createChainMock, mockEsAdminOCoordinador, mockRequierePermiso, mockNotificar } = vi.hoisted(() => {
  function createChainMock(finalResult: any = { data: null, error: null }) {
    const chain: any = {};
    const methods = [
      "select",
      "insert",
      "update",
      "delete",
      "eq",
      "neq",
      "is",
      "or",
      "order",
      "range",
      "single",
      "in",
      "limit",
      "head",
      "maybeSingle",
      "not",
      "gte",
      "lte",
    ];
    for (const method of methods) {
      chain[method] = vi.fn().mockReturnValue(chain);
    }
    chain.single.mockImplementation(() => Promise.resolve(finalResult));
    chain.maybeSingle.mockImplementation(() => Promise.resolve(finalResult));
    chain.order.mockImplementation(() => Promise.resolve(finalResult));
    chain.in.mockReturnValue(chain);
    return chain;
  }

  const mockGetUser = vi.fn();
  const mockSchemaClient = {
    from: vi.fn().mockReturnValue(createChainMock()),
  };
  const mockServerActionClient = {
    auth: { getUser: mockGetUser },
    schema: vi.fn().mockReturnValue(mockSchemaClient),
    from: vi.fn().mockReturnValue(createChainMock()),
    storage: { from: vi.fn().mockReturnValue({ remove: vi.fn().mockResolvedValue({ error: null }) }) },
  };

  return {
    mockGetUser,
    mockServerActionClient,
    mockSchemaClient,
    createChainMock,
    mockEsAdminOCoordinador: vi.fn(),
    mockRequierePermiso: vi.fn().mockResolvedValue(undefined),
    mockNotificar: vi.fn().mockResolvedValue({ enviadas: 1, errores: 0 }),
  };
});

vi.mock("@/lib/supabase.server-actions", () => ({
  createServerActionClient: vi.fn().mockImplementation(() => Promise.resolve(mockServerActionClient)),
}));

vi.mock("@/lib/permissions/server", () => ({
  requierePermiso: mockRequierePermiso,
  esAdmin: vi.fn().mockResolvedValue(true),
  esAdminOCoordinador: mockEsAdminOCoordinador,
  obtenerPermisosUsuario: vi.fn().mockResolvedValue({
    id: "uid-1",
    email: "admin@test.com",
    nombre_completo: "Admin Test",
    username: "admin",
    rol: "ROL_ADMIN",
    permisos: [],
    activo: true,
  }),
  tieneRol: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/permissions", () => ({
  PERMISOS: {
    LOTES: { EDITAR: "lotes.editar", CREAR: "lotes.crear", ELIMINAR: "lotes.eliminar" },
    PROYECTOS: { EDITAR: "proyectos.editar", CREAR: "proyectos.crear", ELIMINAR: "proyectos.eliminar" },
    PRECIOS: { MODIFICAR: "precios.modificar" },
  },
}));

vi.mock("@/app/_actionsNotifications", () => ({
  notificarUsuariosPorRoles: mockNotificar,
  crearNotificacion: vi.fn().mockResolvedValue({ id: "n-1" }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  liberarLote,
  cambiarEstadoMasivoLotes,
  asignarVendedorMasivoLotes,
  listarVendedoresActivos,
} from "@/app/dashboard/proyectos/[id]/_actions";

describe("liberarLote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } });
    mockEsAdminOCoordinador.mockResolvedValue(true);
  });

  it("rechaza ID inválido", async () => {
    const result = await liberarLote("", "motivo válido");
    expect(result.success).toBe(false);
    expect(result.error).toContain("inválido");
  });

  it("rechaza motivo corto", async () => {
    const result = await liberarLote("lote-1", "no");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Motivo");
  });

  it("rechaza si no es admin/coordinador", async () => {
    mockEsAdminOCoordinador.mockResolvedValueOnce(false);
    const result = await liberarLote("lote-1", "motivo válido extenso");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Solo administradores");
  });

  it("rechaza lote ya disponible", async () => {
    const chain = createChainMock({
      data: { id: "lote-1", codigo: "L-001", estado: "disponible", proyecto_id: "p-1" },
      error: null,
    });
    mockSchemaClient.from.mockReturnValueOnce(chain);

    const result = await liberarLote("lote-1", "motivo válido extenso");
    expect(result.success).toBe(false);
    expect(result.error).toContain("disponible");
  });

  it("libera lote reservado exitosamente", async () => {
    const selectChain = createChainMock({
      data: { id: "lote-1", codigo: "L-001", estado: "reservado", proyecto_id: "p-1" },
      error: null,
    });
    const reservasChain = createChainMock();
    reservasChain.eq.mockReturnValueOnce(reservasChain);
    reservasChain.eq.mockImplementationOnce(() => Promise.resolve({ data: [{ id: "r-1" }], error: null }));
    const updateLoteChain = createChainMock();
    updateLoteChain.eq.mockImplementationOnce(() => Promise.resolve({ data: null, error: null }));
    const updateReservaChain = createChainMock();
    updateReservaChain.in.mockImplementationOnce(() => Promise.resolve({ data: null, error: null }));

    mockSchemaClient.from
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(reservasChain)
      .mockReturnValueOnce(updateLoteChain)
      .mockReturnValueOnce(updateReservaChain);

    const result = await liberarLote("lote-1", "motivo válido extenso");
    expect(result.success).toBe(true);
  });
});

describe("cambiarEstadoMasivoLotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } });
    mockEsAdminOCoordinador.mockResolvedValue(true);
    mockRequierePermiso.mockResolvedValue(undefined);
  });

  it("rechaza parámetros vacíos", async () => {
    const result = await cambiarEstadoMasivoLotes("p-1", [], "disponible");
    expect(result.success).toBe(false);
  });

  it("rechaza estado inválido", async () => {
    const result = await cambiarEstadoMasivoLotes("p-1", ["l-1"], "borrado" as any);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Estado inválido");
  });

  it("rechaza si no es admin/coordinador", async () => {
    mockEsAdminOCoordinador.mockResolvedValueOnce(false);
    const result = await cambiarEstadoMasivoLotes("p-1", ["l-1"], "disponible");
    expect(result.success).toBe(false);
  });

  it("actualiza estado de múltiples lotes", async () => {
    const chain = createChainMock();
    chain.select.mockImplementationOnce(() =>
      Promise.resolve({ data: [{ id: "l-1" }, { id: "l-2" }], error: null }),
    );
    mockSchemaClient.from.mockReturnValueOnce(chain);

    const result = await cambiarEstadoMasivoLotes("p-1", ["l-1", "l-2"], "vendido");
    expect(result.success).toBe(true);
    expect(result.actualizados).toBe(2);
  });
});

describe("asignarVendedorMasivoLotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } });
    mockEsAdminOCoordinador.mockResolvedValue(true);
    mockRequierePermiso.mockResolvedValue(undefined);
  });

  it("rechaza parámetros vacíos", async () => {
    const result = await asignarVendedorMasivoLotes("p-1", [], "vendedor1");
    expect(result.success).toBe(false);
  });

  it("rechaza vendedor inexistente", async () => {
    const checkChain = createChainMock({ data: null, error: null });
    mockSchemaClient.from.mockReturnValueOnce(checkChain);

    const result = await asignarVendedorMasivoLotes("p-1", ["l-1"], "fantasma");
    expect(result.success).toBe(false);
    expect(result.error).toContain("no existe");
  });

  it("asigna vendedor a múltiples lotes", async () => {
    const checkChain = createChainMock({
      data: { id: "v-1", username: "vendedor1", activo: true },
      error: null,
    });
    const updateChain = createChainMock();
    updateChain.select.mockImplementationOnce(() =>
      Promise.resolve({ data: [{ id: "l-1" }, { id: "l-2" }], error: null }),
    );

    mockSchemaClient.from.mockReturnValueOnce(checkChain).mockReturnValueOnce(updateChain);

    const result = await asignarVendedorMasivoLotes("p-1", ["l-1", "l-2"], "vendedor1");
    expect(result.success).toBe(true);
    expect(result.actualizados).toBe(2);
  });

  it("permite limpiar vendedor (null)", async () => {
    const updateChain = createChainMock();
    updateChain.select.mockImplementationOnce(() =>
      Promise.resolve({ data: [{ id: "l-1" }], error: null }),
    );
    mockSchemaClient.from.mockReturnValueOnce(updateChain);

    const result = await asignarVendedorMasivoLotes("p-1", ["l-1"], null);
    expect(result.success).toBe(true);
  });
});

describe("listarVendedoresActivos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } });
  });

  it("retorna solo usuarios con roles válidos", async () => {
    const chain = createChainMock();
    chain.order.mockImplementationOnce(() =>
      Promise.resolve({
        data: [
          { username: "v1", nombre_completo: "Vendedor 1", rol: { nombre: "ROL_VENDEDOR" } },
          { username: "admin1", nombre_completo: "Admin 1", rol: { nombre: "ROL_ADMIN" } },
          { username: "ext1", nombre_completo: "Externo", rol: { nombre: "ROL_EXTERNO" } },
        ],
        error: null,
      }),
    );
    mockSchemaClient.from.mockReturnValueOnce(chain);

    const result = await listarVendedoresActivos();
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);
    expect(result.data.map((v) => v.username)).toContain("v1");
    expect(result.data.map((v) => v.username)).not.toContain("ext1");
  });

  it("retorna error si supabase falla", async () => {
    const chain = createChainMock();
    chain.order.mockImplementationOnce(() =>
      Promise.resolve({ data: null, error: { message: "DB down" } }),
    );
    mockSchemaClient.from.mockReturnValueOnce(chain);

    const result = await listarVendedoresActivos();
    expect(result.error).toBeTruthy();
    expect(result.data).toHaveLength(0);
  });
});
