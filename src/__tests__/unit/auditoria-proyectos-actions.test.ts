import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetUser,
  mockServerActionClient,
  mockSchemaClient,
  createChainMock,
  mockEsAdminOCoordinador,
  mockRequierePermiso,
} = vi.hoisted(() => {
  function createChainMock(finalResult: any = { data: null, error: null, count: 0 }) {
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
    chain.order.mockReturnValue(chain);
    chain.range.mockImplementation(() => Promise.resolve(finalResult));
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
  };

  return {
    mockGetUser,
    mockServerActionClient,
    mockSchemaClient,
    createChainMock,
    mockEsAdminOCoordinador: vi.fn(),
    mockRequierePermiso: vi.fn().mockResolvedValue(undefined),
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
    LOTES: { VER: "lotes.ver", EDITAR: "lotes.editar", CREAR: "lotes.crear", ELIMINAR: "lotes.eliminar" },
    PROYECTOS: { VER: "proyectos.ver", EDITAR: "proyectos.editar", CREAR: "proyectos.crear", ELIMINAR: "proyectos.eliminar" },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  obtenerAuditoriaProyecto,
  type AuditoriaEntry,
} from "@/app/dashboard/proyectos/[id]/_auditoria-actions";

const VALID_PROYECTO_ID = "11111111-1111-1111-1111-111111111111";

describe("obtenerAuditoriaProyecto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } });
    mockEsAdminOCoordinador.mockResolvedValue(true);
    mockRequierePermiso.mockResolvedValue(undefined);
  });

  it("rechaza si no hay usuario autenticado", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });

    const result = await obtenerAuditoriaProyecto(VALID_PROYECTO_ID);
    expect(result.error).toBeTruthy();
    expect(result.error).toContain("autenticado");
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("rechaza si no es admin ni coordinador", async () => {
    mockEsAdminOCoordinador.mockResolvedValueOnce(false);

    const result = await obtenerAuditoriaProyecto(VALID_PROYECTO_ID);
    expect(result.error).toBeTruthy();
    expect(result.error).toContain("administradores");
    expect(result.data).toEqual([]);
  });

  it("rechaza UUID de proyecto inválido", async () => {
    const result = await obtenerAuditoriaProyecto("no-es-uuid");
    expect(result.error).toBeTruthy();
    expect(result.error).toContain("inválido");
  });

  it("propaga error si requierePermiso falla", async () => {
    mockRequierePermiso.mockRejectedValueOnce(new Error("Permiso denegado: proyectos.ver"));

    const result = await obtenerAuditoriaProyecto(VALID_PROYECTO_ID);
    expect(result.error).toBeTruthy();
    expect(result.error).toContain("Permiso denegado");
  });

  it("retorna data paginada con total", async () => {
    const fakeRows: AuditoriaEntry[] = [
      {
        id: "a-1",
        entidad_tipo: "proyecto",
        entidad_id: VALID_PROYECTO_ID,
        accion: "update",
        usuario_username: "admin",
        cambios: { nombre: { old: "Antiguo", new: "Nuevo" } },
        proyecto_id: VALID_PROYECTO_ID,
        created_at: "2026-05-19T10:00:00Z",
      },
      {
        id: "a-2",
        entidad_tipo: "lote",
        entidad_id: "22222222-2222-2222-2222-222222222222",
        accion: "insert",
        usuario_username: "admin",
        cambios: { codigo: "L-001", estado: "disponible" },
        proyecto_id: VALID_PROYECTO_ID,
        created_at: "2026-05-19T09:00:00Z",
      },
    ];
    const chain = createChainMock({ data: fakeRows, error: null, count: 42 });
    mockSchemaClient.from.mockReturnValueOnce(chain);

    const result = await obtenerAuditoriaProyecto(VALID_PROYECTO_ID, { limit: 10, offset: 0 });

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(42);
    expect(result.data[0].entidad_tipo).toBe("proyecto");
    expect(result.data[1].entidad_tipo).toBe("lote");
    expect(chain.eq).toHaveBeenCalledWith("proyecto_id", VALID_PROYECTO_ID);
    expect(chain.range).toHaveBeenCalledWith(0, 9);
  });

  it("usa default limit 50 y aplica cap 200", async () => {
    const chain1 = createChainMock({ data: [], error: null, count: 0 });
    mockSchemaClient.from.mockReturnValueOnce(chain1);
    await obtenerAuditoriaProyecto(VALID_PROYECTO_ID);
    expect(chain1.range).toHaveBeenCalledWith(0, 49);

    const chain2 = createChainMock({ data: [], error: null, count: 0 });
    mockSchemaClient.from.mockReturnValueOnce(chain2);
    await obtenerAuditoriaProyecto(VALID_PROYECTO_ID, { limit: 999, offset: 100 });
    expect(chain2.range).toHaveBeenCalledWith(100, 100 + 200 - 1);
  });

  it("retorna error si supabase devuelve error", async () => {
    const chain = createChainMock({ data: null, error: { message: "DB explotó" }, count: null });
    mockSchemaClient.from.mockReturnValueOnce(chain);

    const result = await obtenerAuditoriaProyecto(VALID_PROYECTO_ID);
    expect(result.error).toBe("DB explotó");
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("preserva forma de cambios para update (campo: {old, new})", async () => {
    const cambios = {
      precio: { old: 100000, new: 120000 },
      estado: { old: "disponible", new: "reservado" },
    };
    const fakeRow: AuditoriaEntry = {
      id: "a-3",
      entidad_tipo: "lote",
      entidad_id: "33333333-3333-3333-3333-333333333333",
      accion: "update",
      usuario_username: "coordinador1",
      cambios,
      proyecto_id: VALID_PROYECTO_ID,
      created_at: "2026-05-19T11:00:00Z",
    };
    const chain = createChainMock({ data: [fakeRow], error: null, count: 1 });
    mockSchemaClient.from.mockReturnValueOnce(chain);

    const result = await obtenerAuditoriaProyecto(VALID_PROYECTO_ID);
    expect(result.error).toBeNull();
    expect(result.data[0].cambios).toEqual(cambios);
    const precioCambio = (result.data[0].cambios as Record<string, { old: unknown; new: unknown }>)
      .precio;
    expect(precioCambio.old).toBe(100000);
    expect(precioCambio.new).toBe(120000);
  });
});
