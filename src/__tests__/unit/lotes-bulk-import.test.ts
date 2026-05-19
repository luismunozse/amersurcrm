import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetUser,
  mockServerActionClient,
  mockEsAdminOCoordinador,
  mockRequierePermiso,
  createChainMock,
  mockRevalidatePath,
} = vi.hoisted(() => {
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
    return chain;
  }

  const mockGetUser = vi.fn();
  const mockServerActionClient = {
    auth: { getUser: mockGetUser },
    schema: vi.fn(),
    from: vi.fn(),
    storage: {
      from: vi.fn().mockReturnValue({ remove: vi.fn().mockResolvedValue({ error: null }) }),
    },
  };

  return {
    mockGetUser,
    mockServerActionClient,
    mockEsAdminOCoordinador: vi.fn(),
    mockRequierePermiso: vi.fn().mockResolvedValue(undefined),
    createChainMock,
    mockRevalidatePath: vi.fn(),
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
  notificarUsuariosPorRoles: vi.fn().mockResolvedValue({ enviadas: 0, errores: 0 }),
  crearNotificacion: vi.fn().mockResolvedValue({ id: "n-1" }),
}));

vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));

import {
  importarLotesMasivo,
  type LoteImportRow,
} from "@/app/dashboard/proyectos/[id]/_actions";

const PROYECTO_VALIDO = "11111111-2222-3333-4444-555555555555";

/**
 * Configura un mock de from() que devuelve chains distintos para llamadas sucesivas.
 * Las llamadas siguen este orden en importarLotesMasivo:
 *   1) supabase.from('lote') -- select existentes
 *   2) supabase.from('usuario_perfil') -- validacion vendedor (solo si hay usernames)
 *   3) supabase.from('lote') -- insert (solo si no dryRun y hay filas validas)
 *   (fallback opcional: supabase.from('lote') -- insert fila por fila)
 */
function setupChains(chains: any[]) {
  mockServerActionClient.from.mockReset();
  let i = 0;
  mockServerActionClient.from.mockImplementation(() => {
    const ch = chains[i] ?? createChainMock();
    i++;
    return ch;
  });
}

describe("importarLotesMasivo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } });
    mockEsAdminOCoordinador.mockResolvedValue(true);
    mockRequierePermiso.mockResolvedValue(undefined);
  });

  it("rechaza UUID de proyecto inválido", async () => {
    const result = await importarLotesMasivo("no-es-uuid", [
      { codigo: "L-001" },
    ]);
    expect(result.success).toBe(false);
    expect(result.insertados).toBe(0);
    expect(result.errores[0].mensaje).toContain("inválido");
  });

  it("rechaza si no es admin/coordinador", async () => {
    mockEsAdminOCoordinador.mockResolvedValueOnce(false);
    const result = await importarLotesMasivo(PROYECTO_VALIDO, [
      { codigo: "L-001" },
    ]);
    expect(result.success).toBe(false);
    expect(result.errores[0].mensaje).toContain("administradores");
  });

  it("dryRun retorna errores sin insertar y no llama insert", async () => {
    // select existentes -> vacío
    const selectExistentesChain = createChainMock();
    selectExistentesChain.in.mockImplementationOnce(() =>
      Promise.resolve({ data: [], error: null }),
    );
    setupChains([selectExistentesChain]);

    const filas: LoteImportRow[] = [
      { codigo: "L-001", sup_m2: 100, precio: 50000 },
      { codigo: "L-001", sup_m2: 80, precio: 40000 }, // duplicado batch
      { codigo: "", sup_m2: 50 }, // sin código
      { codigo: "L-002", precio: -100 }, // precio negativo
    ];

    const result = await importarLotesMasivo(PROYECTO_VALIDO, filas, { dryRun: true });

    expect(result.insertados).toBe(0);
    expect(result.errores.length).toBeGreaterThanOrEqual(3);
    expect(result.errores.some((e) => e.mensaje.includes("duplicado"))).toBe(true);
    expect(result.errores.some((e) => e.mensaje.includes("Código requerido"))).toBe(true);
    expect(result.errores.some((e) => e.mensaje.includes("Precio"))).toBe(true);

    // No debe haberse invocado insert
    expect(selectExistentesChain.insert).not.toHaveBeenCalled();
  });

  it("detecta duplicados dentro del batch", async () => {
    const selectExistentesChain = createChainMock();
    selectExistentesChain.in.mockImplementationOnce(() =>
      Promise.resolve({ data: [], error: null }),
    );
    setupChains([selectExistentesChain]);

    const result = await importarLotesMasivo(
      PROYECTO_VALIDO,
      [
        { codigo: "L-001" },
        { codigo: "L-001" },
      ],
      { dryRun: true },
    );

    const dupErrors = result.errores.filter((e) => e.mensaje.includes("duplicado"));
    expect(dupErrors.length).toBe(1);
    expect(dupErrors[0].codigo).toBe("L-001");
  });

  it("detecta lotes existentes en DB y los marca como warning (skip)", async () => {
    const selectExistentesChain = createChainMock();
    selectExistentesChain.in.mockImplementationOnce(() =>
      Promise.resolve({ data: [{ codigo: "L-001" }], error: null }),
    );
    setupChains([selectExistentesChain]);

    const result = await importarLotesMasivo(
      PROYECTO_VALIDO,
      [
        { codigo: "L-001" }, // ya existe
        { codigo: "L-002" }, // nuevo, pero como dryRun no se inserta
      ],
      { dryRun: true },
    );

    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0]).toContain("L-001");
    expect(result.warnings[0]).toContain("omitido");
    expect(result.errores).toHaveLength(0);
  });

  it("inserta bulk exitosamente cuando no hay errores", async () => {
    const selectExistentesChain = createChainMock();
    selectExistentesChain.in.mockImplementationOnce(() =>
      Promise.resolve({ data: [], error: null }),
    );

    const insertChain = createChainMock();
    insertChain.select.mockImplementationOnce(() =>
      Promise.resolve({ data: [{ id: "l-1" }, { id: "l-2" }], error: null }),
    );

    setupChains([selectExistentesChain, insertChain]);

    const result = await importarLotesMasivo(PROYECTO_VALIDO, [
      { codigo: "L-001", sup_m2: 100, precio: 50000, moneda: "PEN" },
      { codigo: "L-002", sup_m2: 200, precio: 75000 },
    ]);

    expect(result.success).toBe(true);
    expect(result.insertados).toBe(2);
    expect(result.errores).toHaveLength(0);
    expect(insertChain.insert).toHaveBeenCalledTimes(1);
    expect(mockRevalidatePath).toHaveBeenCalled();
  });

  it("valida vendedor_asignado y rechaza vendedor inexistente", async () => {
    const selectExistentesChain = createChainMock();
    selectExistentesChain.in.mockImplementationOnce(() =>
      Promise.resolve({ data: [], error: null }),
    );
    const selectVendedoresChain = createChainMock();
    // El chain hace .select().in().eq(); el resultado se resuelve en .eq()
    selectVendedoresChain.eq.mockImplementationOnce(() =>
      Promise.resolve({ data: [{ username: "vendedor1", activo: true }], error: null }),
    );

    setupChains([selectExistentesChain, selectVendedoresChain]);

    const result = await importarLotesMasivo(
      PROYECTO_VALIDO,
      [
        { codigo: "L-001", vendedor_asignado: "vendedor1" },
        { codigo: "L-002", vendedor_asignado: "fantasma" },
      ],
      { dryRun: true },
    );

    expect(result.errores.some((e) => e.mensaje.includes("fantasma"))).toBe(true);
    expect(result.errores.some((e) => e.mensaje.includes("vendedor1"))).toBe(false);
  });

  it("rechaza valores numéricos inválidos (precio o sup_m2 negativos)", async () => {
    const selectExistentesChain = createChainMock();
    selectExistentesChain.in.mockImplementationOnce(() =>
      Promise.resolve({ data: [], error: null }),
    );
    setupChains([selectExistentesChain]);

    const result = await importarLotesMasivo(
      PROYECTO_VALIDO,
      [
        { codigo: "L-001", sup_m2: -10 },
        { codigo: "L-002", precio: -50 },
        { codigo: "L-003", sup_m2: Number.NaN },
      ],
      { dryRun: true },
    );

    expect(result.errores.length).toBeGreaterThanOrEqual(2);
    expect(result.errores.some((e) => e.mensaje.includes("Superficie"))).toBe(true);
    expect(result.errores.some((e) => e.mensaje.includes("Precio"))).toBe(true);
  });

  it("rechaza moneda y estado inválidos", async () => {
    const selectExistentesChain = createChainMock();
    selectExistentesChain.in.mockImplementationOnce(() =>
      Promise.resolve({ data: [], error: null }),
    );
    setupChains([selectExistentesChain]);

    const result = await importarLotesMasivo(
      PROYECTO_VALIDO,
      [
        { codigo: "L-001", moneda: "EUR" as any },
        { codigo: "L-002", estado: "vencido" as any },
      ],
      { dryRun: true },
    );

    expect(result.errores.some((e) => e.mensaje.includes("Moneda"))).toBe(true);
    expect(result.errores.some((e) => e.mensaje.includes("Estado"))).toBe(true);
  });

  it("hace fallback row-by-row si bulk insert falla", async () => {
    const selectExistentesChain = createChainMock();
    selectExistentesChain.in.mockImplementationOnce(() =>
      Promise.resolve({ data: [], error: null }),
    );

    // Bulk insert falla
    const bulkChain = createChainMock();
    bulkChain.select.mockImplementationOnce(() =>
      Promise.resolve({ data: null, error: { message: "constraint violation" } }),
    );

    // Row-by-row: primer lote ok, segundo falla
    const rowOk = createChainMock({ data: { id: "l-1" }, error: null });
    const rowFail = createChainMock({ data: null, error: { message: "duplicate" } });

    setupChains([selectExistentesChain, bulkChain, rowOk, rowFail]);

    const result = await importarLotesMasivo(PROYECTO_VALIDO, [
      { codigo: "L-001" },
      { codigo: "L-002" },
    ]);

    expect(result.insertados).toBe(1);
    expect(result.errores.length).toBe(1);
    expect(result.errores[0].codigo).toBe("L-002");
    expect(result.errores[0].mensaje).toContain("Error al insertar");
  });

  it("rechaza si no autenticado", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const result = await importarLotesMasivo(PROYECTO_VALIDO, [{ codigo: "L-001" }]);
    expect(result.success).toBe(false);
    expect(result.errores[0].mensaje).toContain("No autenticado");
  });

  it("rechaza array vacío", async () => {
    const result = await importarLotesMasivo(PROYECTO_VALIDO, []);
    expect(result.success).toBe(false);
    expect(result.errores[0].mensaje).toContain("No hay filas");
  });
});
