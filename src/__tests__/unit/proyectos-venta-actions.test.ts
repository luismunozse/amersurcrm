import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockServerActionClient, mockSchemaClient, createChainMock, mockRequierePermiso, mockObtenerPermisos, mockNotificar } = vi.hoisted(() => {
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
      "like",
    ];
    for (const method of methods) {
      chain[method] = vi.fn().mockReturnValue(chain);
    }
    chain.single.mockImplementation(() => Promise.resolve(finalResult));
    chain.maybeSingle.mockImplementation(() => Promise.resolve(finalResult));
    chain.order.mockReturnValue(chain);
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
    mockRequierePermiso: vi.fn().mockResolvedValue(undefined),
    mockObtenerPermisos: vi.fn(),
    mockNotificar: vi.fn().mockResolvedValue({ enviadas: 1, errores: 0 }),
  };
});

vi.mock("@/lib/supabase.server-actions", () => ({
  createServerActionClient: vi.fn().mockImplementation(() => Promise.resolve(mockServerActionClient)),
}));

vi.mock("@/lib/permissions/server", () => ({
  requierePermiso: mockRequierePermiso,
  esAdmin: vi.fn().mockResolvedValue(true),
  esAdminOCoordinador: vi.fn().mockResolvedValue(true),
  obtenerPermisosUsuario: mockObtenerPermisos,
  tieneRol: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/permissions", () => ({
  PERMISOS: {
    LOTES: { EDITAR: "lotes.editar", CREAR: "lotes.crear" },
    PROYECTOS: { EDITAR: "proyectos.editar" },
    VENTAS: { CREAR: "ventas.crear", MODIFICAR: "ventas.modificar" },
    RESERVAS: { CREAR: "reservas.crear" },
  },
}));

vi.mock("@/app/_actionsNotifications", () => ({
  notificarUsuariosPorRoles: mockNotificar,
  crearNotificacion: vi.fn().mockResolvedValue({ id: "n-1" }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { convertirReservaAVenta } from "@/app/dashboard/proyectos/[id]/_venta-actions";

const validLoteId = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";

describe("convertirReservaAVenta - validaciones", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } });
    mockObtenerPermisos.mockResolvedValue({
      id: "uid-1",
      email: "admin@test.com",
      nombre_completo: "Admin",
      username: "admin",
      rol: "ROL_ADMIN",
      permisos: [],
      activo: true,
    });
  });

  it("rechaza loteId inválido", async () => {
    const res = await convertirReservaAVenta({
      loteId: "no-uuid",
      formaPago: "contado",
      precioTotal: 100000,
      montoInicial: 100000,
    });
    expect(res.error).toContain("inválido");
  });

  it("rechaza forma de pago inválida", async () => {
    const res = await convertirReservaAVenta({
      loteId: validLoteId,
      formaPago: "cash" as any,
      precioTotal: 100000,
      montoInicial: 100000,
    });
    expect(res.error).toContain("Forma de pago");
  });

  it("rechaza precio <= 0", async () => {
    const res = await convertirReservaAVenta({
      loteId: validLoteId,
      formaPago: "contado",
      precioTotal: 0,
      montoInicial: 0,
    });
    expect(res.error).toContain("Precio total");
  });

  it("rechaza monto inicial mayor a precio", async () => {
    const res = await convertirReservaAVenta({
      loteId: validLoteId,
      formaPago: "financiado",
      precioTotal: 100000,
      montoInicial: 150000,
      numeroCuotas: 12,
    });
    expect(res.error).toContain("fuera de rango");
  });

  it("rechaza contado sin igualar monto inicial al precio", async () => {
    const res = await convertirReservaAVenta({
      loteId: validLoteId,
      formaPago: "contado",
      precioTotal: 100000,
      montoInicial: 50000,
    });
    expect(res.error).toContain("contado");
  });

  it("rechaza financiado sin cuotas", async () => {
    const res = await convertirReservaAVenta({
      loteId: validLoteId,
      formaPago: "financiado",
      precioTotal: 100000,
      montoInicial: 20000,
      numeroCuotas: 0,
    });
    expect(res.error).toContain("cuotas");
  });
});

describe("convertirReservaAVenta - flujo exitoso", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } });
    mockObtenerPermisos.mockResolvedValue({
      id: "uid-1",
      email: "admin@test.com",
      nombre_completo: "Admin",
      username: "admin",
      rol: "ROL_ADMIN",
      permisos: [],
      activo: true,
    });
  });

  it("rechaza si lote no está reservado", async () => {
    const loteChain = createChainMock({
      data: { id: validLoteId, codigo: "L-001", estado: "disponible", proyecto_id: "p-1" },
      error: null,
    });
    mockSchemaClient.from.mockReturnValueOnce(loteChain);

    const res = await convertirReservaAVenta({
      loteId: validLoteId,
      formaPago: "contado",
      precioTotal: 100000,
      montoInicial: 100000,
    });
    expect(res.error).toContain("reservado");
  });

  it("rechaza si no hay reserva activa", async () => {
    const loteChain = createChainMock({
      data: { id: validLoteId, codigo: "L-001", estado: "reservado", proyecto_id: "p-1" },
      error: null,
    });
    const reservaChain = createChainMock({ data: null, error: null });

    mockSchemaClient.from.mockReturnValueOnce(loteChain).mockReturnValueOnce(reservaChain);

    const res = await convertirReservaAVenta({
      loteId: validLoteId,
      formaPago: "contado",
      precioTotal: 100000,
      montoInicial: 100000,
    });
    expect(res.error).toContain("reserva activa");
  });

  it("convierte reserva en venta exitosamente (contado)", async () => {
    const loteChain = createChainMock({
      data: { id: validLoteId, codigo: "L-001", estado: "reservado", proyecto_id: "p-1" },
      error: null,
    });
    const reservaChain = createChainMock({
      data: { id: "r-1", cliente_id: "c-1", vendedor_username: "vendedor1" },
      error: null,
    });
    const ultimaVentaChain = createChainMock({ data: null, error: null });
    const insertVentaChain = createChainMock({
      data: { id: "v-1", codigo_venta: "VTA-20260519-001" },
      error: null,
    });
    const updateLoteChain = createChainMock();
    updateLoteChain.eq.mockImplementationOnce(() => Promise.resolve({ data: null, error: null }));
    const updateReservaChain = createChainMock();
    updateReservaChain.eq.mockImplementationOnce(() => Promise.resolve({ data: null, error: null }));

    mockSchemaClient.from
      .mockReturnValueOnce(loteChain)
      .mockReturnValueOnce(reservaChain)
      .mockReturnValueOnce(ultimaVentaChain)
      .mockReturnValueOnce(insertVentaChain)
      .mockReturnValueOnce(updateLoteChain)
      .mockReturnValueOnce(updateReservaChain);

    const res = await convertirReservaAVenta({
      loteId: validLoteId,
      formaPago: "contado",
      precioTotal: 100000,
      montoInicial: 100000,
    });

    expect(res.error).toBeNull();
    expect(res.data?.codigo_venta).toBe("VTA-20260519-001");
  });

  it("notifica via notificarUsuariosPorRoles a ROL_ADMIN + ROL_COORDINADOR_VENTAS excluyendo al actor", async () => {
    const loteChain = createChainMock({
      data: { id: validLoteId, codigo: "L-001", estado: "reservado", proyecto_id: "p-1" },
      error: null,
    });
    const reservaChain = createChainMock({
      data: { id: "r-1", cliente_id: "c-1", vendedor_username: "vendedor1" },
      error: null,
    });
    const ultimaVentaChain = createChainMock({ data: null, error: null });
    const insertVentaChain = createChainMock({
      data: { id: "v-1", codigo_venta: "VTA-20260519-001" },
      error: null,
    });
    const updateLoteChain = createChainMock();
    updateLoteChain.eq.mockImplementationOnce(() => Promise.resolve({ data: null, error: null }));
    const updateReservaChain = createChainMock();
    updateReservaChain.eq.mockImplementationOnce(() => Promise.resolve({ data: null, error: null }));

    mockSchemaClient.from
      .mockReturnValueOnce(loteChain)
      .mockReturnValueOnce(reservaChain)
      .mockReturnValueOnce(ultimaVentaChain)
      .mockReturnValueOnce(insertVentaChain)
      .mockReturnValueOnce(updateLoteChain)
      .mockReturnValueOnce(updateReservaChain);

    await convertirReservaAVenta({
      loteId: validLoteId,
      formaPago: "contado",
      precioTotal: 100000,
      montoInicial: 100000,
    });

    expect(mockNotificar).toHaveBeenCalledWith(
      ["ROL_ADMIN", "ROL_COORDINADOR_VENTAS"],
      "venta",
      expect.stringContaining("L-001"),
      expect.any(String),
      expect.objectContaining({ ventaId: "v-1", codigoVenta: expect.stringMatching(/^VTA-/) }),
      "uid-1",
    );
  });
});
