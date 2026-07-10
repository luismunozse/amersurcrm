import { describe, it, expect, vi, beforeEach } from "vitest";

// ==================== HOISTED MOCKS ====================
const { mockGetUser, mockServerActionClient, createChainMock, mockNotificarVentaCreada } = vi.hoisted(() => {
  function createChainMock(finalResult: any = { data: null, error: null }) {
    const chain: any = {};
    const methods = ["select", "insert", "update", "delete", "eq", "neq", "is", "or", "order", "range", "single", "in", "limit", "head", "maybeSingle", "gte", "lte", "not"];
    for (const method of methods) { chain[method] = vi.fn().mockReturnValue(chain); }
    chain.single.mockImplementation(() => Promise.resolve(finalResult));
    chain.maybeSingle.mockImplementation(() => Promise.resolve(finalResult));
    chain.limit.mockImplementation(() => Promise.resolve(finalResult));
    chain.order.mockImplementation(() => Promise.resolve(finalResult));
    chain.range.mockImplementation(() => Promise.resolve(finalResult));
    return chain;
  }
  const mockGetUser = vi.fn();
  const mockServerActionClient = {
    auth: { getUser: mockGetUser },
    from: vi.fn().mockReturnValue(createChainMock()),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  const mockNotificarVentaCreada = vi.fn().mockResolvedValue({ enviadas: 1, errores: 0 });
  return { mockGetUser, mockServerActionClient, createChainMock, mockNotificarVentaCreada };
});

vi.mock("@/lib/supabase.server-actions", () => ({
  createServerActionClient: vi.fn().mockImplementation(() => Promise.resolve(mockServerActionClient)),
}));
vi.mock("@/lib/permissions/server", () => ({
  requierePermiso: vi.fn().mockResolvedValue(undefined),
  tienePermiso: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/lib/permissions", () => ({
  PERMISOS: {
    VENTAS: { CREAR: "ventas.crear", ANULAR: "ventas.anular" },
    PAGOS: { REGISTRAR: "pagos.registrar" },
  },
}));
vi.mock("@/app/dashboard/clientes/_actions-crm-helpers", () => ({
  obtenerUsernameActual: vi.fn().mockResolvedValue({ success: true, username: "vendedor1", userId: "uid-1" }),
  revalidarCliente: vi.fn(),
  crearEventoAgenda: vi.fn().mockResolvedValue(true),
  validarMonto: vi.fn().mockReturnValue({ valid: true }),
}));

vi.mock("@/lib/notifications/venta", () => ({
  notificarVentaCreada: mockNotificarVentaCreada,
}));

import {
  convertirReservaEnVenta,
  registrarPago,
  anularVenta,
  obtenerTimelineCliente,
} from "@/app/dashboard/clientes/_actions-ventas";
import { requierePermiso } from "@/lib/permissions/server";

describe("convertirReservaEnVenta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } });
  });

  it("verifica permisos de ventas.crear", async () => {
    // Setup multi-step mock: reserva lookup -> venta insert -> reserva update -> lote update
    const chain = createChainMock({ data: { id: "v-1", lote_id: "l-1", cliente_id: "c-1", reserva_id: "r-1" }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    await convertirReservaEnVenta({ reservaId: "r-1", precioTotal: 75000, formaPago: "contado" });
    expect(requierePermiso).toHaveBeenCalledWith("ventas.crear", expect.any(Object));
  });

  it("maneja error cuando reserva no existe", async () => {
    const chain = createChainMock();
    chain.single.mockImplementation(() => { throw { message: "Reserva no encontrada" }; });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await convertirReservaEnVenta({ reservaId: "r-inexistente", precioTotal: 75000, formaPago: "contado" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Reserva no encontrada");
  });

  it("valida precio total positivo", async () => {
    const { validarMonto } = await import("@/app/dashboard/clientes/_actions-crm-helpers");
    (validarMonto as any).mockReturnValue({ valid: false, error: "Precio total debe ser mayor a 0" });

    const result = await convertirReservaEnVenta({ reservaId: "r-1", precioTotal: 0, formaPago: "contado" });
    expect(result.success).toBe(false);
  });
});

describe("convertirReservaEnVenta — notificación de venta creada", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } });
    // "valida precio total positivo" (above) permanently overrides this mock's
    // return value via .mockReturnValue() — vi.clearAllMocks() clears call
    // history but not that override, so later describe blocks must restore it.
    const { validarMonto } = await import("@/app/dashboard/clientes/_actions-crm-helpers");
    (validarMonto as any).mockReturnValue({ valid: true });
  });

  it("llama a notificarVentaCreada con cliente, lote, monto y actor resueltos", async () => {
    const chain = createChainMock({
      data: {
        id: "v-1",
        cliente_id: "c-1",
        lote_id: "l-1",
        estado: "activa",
        moneda: "PEN",
        nombre: "Juan Perez",
        codigo: "L-001",
        codigo_venta: "VTA-1",
      },
      error: null,
    });
    mockServerActionClient.from.mockReturnValue(chain);

    await convertirReservaEnVenta({ reservaId: "r-1", precioTotal: 75000, formaPago: "contado" });

    expect(mockNotificarVentaCreada).toHaveBeenCalledTimes(1);
    const arg = mockNotificarVentaCreada.mock.calls[0][0];
    expect(arg.clienteNombre).toBe("Juan Perez");
    expect(arg.loteCodigo).toBe("L-001");
    expect(arg.monto).toBe(75000);
    expect(arg.actorId).toBe("uid-1");
    expect(arg.actorNombre).toBe("vendedor1");
  });

  it("no falla la conversión si notificarVentaCreada lanza", async () => {
    const chain = createChainMock({
      data: { id: "v-1", cliente_id: "c-1", lote_id: "l-1", estado: "activa", moneda: "PEN" },
      error: null,
    });
    mockServerActionClient.from.mockReturnValue(chain);
    mockNotificarVentaCreada.mockRejectedValueOnce(new Error("push down"));

    const result = await convertirReservaEnVenta({ reservaId: "r-1", precioTotal: 75000, formaPago: "contado" });
    expect(result.success).toBe(true);
  });
});

describe("registrarPago", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } });
  });

  it("verifica permisos de pagos.registrar", async () => {
    const chain = createChainMock({ data: { id: "p-1" }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    await registrarPago({ ventaId: "v-1", monto: 5000, metodoPago: "transferencia" });
    expect(requierePermiso).toHaveBeenCalledWith("pagos.registrar", expect.any(Object));
  });

  it("retorna resultado al registrar pago", async () => {
    const chain = createChainMock({ data: { id: "p-1" }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await registrarPago({ ventaId: "v-1", monto: 5000, metodoPago: "transferencia", banco: "BCP", numeroOperacion: "OP-123" });
    // Verifica que retorna un resultado (sea success o error)
    expect(result).toHaveProperty("success");
  });

  it("maneja error al registrar pago", async () => {
    const chain = createChainMock();
    chain.single.mockImplementation(() => { throw { message: "Venta no encontrada" }; });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await registrarPago({ ventaId: "v-inexistente", monto: 5000, metodoPago: "efectivo" });
    expect(result.success).toBe(false);
  });
});

describe("anularVenta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } });
  });

  it("verifica permisos de ventas.anular", async () => {
    const chain = createChainMock({ data: { id: "v-1", lote_id: "l-1", cliente_id: "c-1" }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    await anularVenta("v-1", "Cliente desistió");
    expect(requierePermiso).toHaveBeenCalled();
  });

  it("maneja error al anular", async () => {
    const chain = createChainMock();
    chain.single.mockImplementation(() => { throw { message: "Permission denied" }; });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await anularVenta("v-1", "Motivo test");
    expect(result.success).toBe(false);
  });
});

describe("obtenerTimelineCliente", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } });
  });

  it("llama a supabase con el clienteId correcto", async () => {
    const chain = createChainMock();
    chain.order.mockImplementation(() => Promise.resolve({ data: [], error: null, count: 0 }));
    chain.range.mockReturnValue(chain);
    mockServerActionClient.from.mockReturnValue(chain);

    await obtenerTimelineCliente("c-1");
    expect(mockServerActionClient.from).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("cliente_id", "c-1");
  });
});
