import { describe, it, expect, vi, beforeEach } from "vitest";

// ==================== HOISTED MOCKS ====================
const { mockGetUser, mockServerActionClient, createChainMock } = vi.hoisted(() => {
  function createChainMock(finalResult: any = { data: null, error: null }) {
    const chain: any = {};
    const methods = ["select", "insert", "update", "delete", "eq", "neq", "is", "or", "order", "range", "single", "in", "limit", "head", "maybeSingle"];
    for (const method of methods) {
      chain[method] = vi.fn().mockReturnValue(chain);
    }
    chain.single.mockImplementation(() => Promise.resolve(finalResult));
    chain.maybeSingle.mockImplementation(() => Promise.resolve(finalResult));
    chain.order.mockImplementation(() => Promise.resolve(finalResult));
    return chain;
  }
  const mockGetUser = vi.fn();
  const mockServerActionClient = {
    auth: { getUser: mockGetUser },
    from: vi.fn().mockReturnValue(createChainMock()),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return { mockGetUser, mockServerActionClient, createChainMock };
});

vi.mock("@/lib/supabase.server-actions", () => ({
  createServerActionClient: vi.fn().mockImplementation(() => Promise.resolve(mockServerActionClient)),
}));
vi.mock("@/lib/permissions/server", () => ({
  requierePermiso: vi.fn().mockResolvedValue(undefined),
  tienePermiso: vi.fn().mockResolvedValue(true),
  esAdmin: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/lib/permissions", () => ({
  PERMISOS: {
    CUOTAS: { GESTIONAR: "cuotas.gestionar" },
    PAGOS: { REGISTRAR: "pagos.registrar" },
    VENTAS: { VER_TODAS: "ventas.ver_todas" },
  },
}));
vi.mock("@/app/dashboard/clientes/_actions-crm-helpers", () => ({
  obtenerUsernameActual: vi.fn().mockResolvedValue({ success: true, username: "vendedor1", userId: "uid-1" }),
  revalidarCliente: vi.fn(),
  validarMonto: vi.fn().mockReturnValue({ valid: true }),
}));

import { tienePermiso } from "@/lib/permissions/server";

import {
  generarCronogramaPagos,
  obtenerCronogramaVenta,
  obtenerCuotasCliente,
  registrarPagoCuota,
} from "@/app/dashboard/clientes/_actions-cuotas";

describe("generarCronogramaPagos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } });
  });

  it("genera cronograma para una venta", async () => {
    mockServerActionClient.rpc.mockResolvedValue({
      data: [
        { numero: 1, monto: 625, fecha_vencimiento: "2026-04-01" },
        { numero: 2, monto: 625, fecha_vencimiento: "2026-05-01" },
      ],
      error: null,
    });

    const result = await generarCronogramaPagos("v-1", "c-1");
    expect(result.success).toBe(true);
  });

  it("maneja error al generar cronograma", async () => {
    mockServerActionClient.rpc.mockResolvedValue({
      data: null,
      error: { message: "Venta no encontrada" },
    });

    const result = await generarCronogramaPagos("v-inexistente", "c-1");
    expect(result.success).toBe(false);
  });
});

describe("obtenerCronogramaVenta", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("obtiene cuotas de una venta ordenadas", async () => {
    const cuotas = [
      { id: "cu-1", numero_cuota: 1, monto: 625, estado: "pagada" },
      { id: "cu-2", numero_cuota: 2, monto: 625, estado: "pendiente" },
      { id: "cu-3", numero_cuota: 3, monto: 625, estado: "pendiente" },
    ];
    const chain = createChainMock();
    chain.order.mockImplementation(() => Promise.resolve({ data: cuotas, error: null }));
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await obtenerCronogramaVenta("v-1");
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(3);
  });

  it("retorna array vacío sin cuotas", async () => {
    const chain = createChainMock();
    chain.order.mockImplementation(() => Promise.resolve({ data: null, error: null }));
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await obtenerCronogramaVenta("v-sin-cuotas");
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });
});

describe("obtenerCuotasCliente", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("obtiene todas las cuotas de un cliente (global role)", async () => {
    vi.mocked(tienePermiso).mockResolvedValueOnce(true);
    const cuotas = [
      { id: "cu-1", venta_id: "v-1", numero_cuota: 1, estado: "pagada" },
    ];
    const chain = createChainMock();
    chain.order.mockImplementation(() => Promise.resolve({ data: cuotas, error: null }));
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await obtenerCuotasCliente("c-1");
    expect(result.success).toBe(true);
  });

  // global role must bypass client ownership check and return cuotas directly
  it("global role — bypasses ownership check and returns cuotas", async () => {
    vi.mocked(tienePermiso).mockResolvedValueOnce(true);
    const chain = createChainMock();
    chain.order.mockImplementation(() => Promise.resolve({ data: [{ id: "cu-1" }], error: null }));
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await obtenerCuotasCliente("c-1");

    expect(result.success).toBe(true);
    // No ownership check against 'cliente' needed for global roles
    const fromTables = mockServerActionClient.from.mock.calls.map((c: any[]) => c[0]);
    expect(fromTables).not.toContain("cliente");
  });

  // vendor without client ownership must be rejected before the cuota query runs
  it("vendor without access to client — returns authorization error", async () => {
    vi.mocked(tienePermiso).mockResolvedValueOnce(false); // vendor

    // Cliente ownership check returns null (not assigned to this vendor)
    const clienteChain = createChainMock({ data: null, error: null });
    const cuotaChain = createChainMock();
    cuotaChain.order.mockImplementation(() => Promise.resolve({ data: [], error: null }));

    mockServerActionClient.from
      .mockReturnValueOnce(clienteChain) // for 'cliente' ownership check
      .mockReturnValue(cuotaChain);       // for 'cuota' (should not be reached)

    const result = await obtenerCuotasCliente("c-other");

    expect(result.success).toBe(false);
    expect((result as any).error).toMatch(/permiso/i);
    // cuota query must NOT have been executed
    expect(mockServerActionClient.from).not.toHaveBeenCalledWith("cuota");
  });

  // vendor WITH ownership of target client — passes auth check AND cuota query runs
  // Guards FIX 5 (inner join): verifies the happy path still works after !inner change
  it("vendor with access to client — ownership check passes and cuotas are returned", async () => {
    vi.mocked(tienePermiso).mockResolvedValueOnce(false); // vendor, not global role

    // Cliente ownership check returns the client (assigned to this vendor)
    const clienteChain = createChainMock({ data: { id: "c-1" }, error: null });

    const expectedCuotas = [
      { id: "cu-1", venta_id: "v-1", numero_cuota: 1, estado: "pendiente" },
      { id: "cu-2", venta_id: "v-1", numero_cuota: 2, estado: "pendiente" },
    ];
    const cuotaChain = createChainMock();
    cuotaChain.order.mockImplementation(() =>
      Promise.resolve({ data: expectedCuotas, error: null })
    );

    mockServerActionClient.from
      .mockReturnValueOnce(clienteChain) // for 'cliente' ownership check
      .mockReturnValue(cuotaChain);      // for 'cuota' query

    const result = await obtenerCuotasCliente("c-1");

    expect(result.success).toBe(true);
    expect((result as { data: unknown[] }).data).toHaveLength(2);
    // cuota query must have been executed
    expect(mockServerActionClient.from).toHaveBeenCalledWith("cuota");
  });
});

describe("registrarPagoCuota", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } });
  });

  it("registra pago de cuota con datos completos", async () => {
    const chain = createChainMock({ data: { id: "p-1" }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await registrarPagoCuota({
      ventaId: "v-1",
      cuotaId: "cu-1",
      monto: 625,
      moneda: "PEN",
      metodoPago: "transferencia",
      numeroOperacion: "OP-54321",
      banco: "BCP",
      notas: "Pago cuota 1",
      clienteId: "c-1",
    });
    expect(result.success).toBe(true);
  });

  it("registra pago con comprobante", async () => {
    const chain = createChainMock({ data: { id: "p-1" }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await registrarPagoCuota({
      ventaId: "v-1",
      cuotaId: "cu-2",
      monto: 625,
      metodoPago: "deposito",
      comprobanteUrl: "https://storage.example.com/voucher.jpg",
      clienteId: "c-1",
    });
    expect(result.success).toBe(true);
  });

  it("maneja error al registrar pago", async () => {
    const chain = createChainMock();
    chain.single.mockImplementation(() => { throw { message: "Cuota ya pagada" }; });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await registrarPagoCuota({
      ventaId: "v-1",
      cuotaId: "cu-1",
      monto: 625,
      metodoPago: "efectivo",
      clienteId: "c-1",
    });
    expect(result.success).toBe(false);
  });
});
