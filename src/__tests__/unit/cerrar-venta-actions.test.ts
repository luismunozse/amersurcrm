import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockServerActionClient, createChainMock, mockEsAdminOCoord, mockNotificarVentaCreada } = vi.hoisted(() => {
  function createChainMock(finalResult: any = { data: null, error: null }) {
    const chain: any = {};
    const methods = [
      "select", "insert", "update", "delete", "eq", "neq", "is", "or",
      "order", "range", "single", "in", "limit", "head", "maybeSingle", "not", "gte", "lte",
    ];
    for (const method of methods) chain[method] = vi.fn().mockReturnValue(chain);
    chain.then = (resolve: any, reject: any) =>
      Promise.resolve(finalResult).then(resolve, reject);
    return chain;
  }

  const mockGetUser = vi.fn();
  const mockEsAdminOCoord = vi.fn();

  const publicChains: Record<string, any> = {};
  const schemaChains: Record<string, Record<string, any>> = {};

  const mockServerActionClient: any = {
    auth: { getUser: mockGetUser },
    from: vi.fn((table: string) => publicChains[table] ?? createChainMock()),
    schema: vi.fn((schemaName: string) => ({
      from: vi.fn((table: string) => schemaChains[schemaName]?.[table] ?? createChainMock()),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    __setPublicChain(table: string, chain: any) { publicChains[table] = chain; },
    __setSchemaChain(schemaName: string, table: string, chain: any) {
      if (!schemaChains[schemaName]) schemaChains[schemaName] = {};
      schemaChains[schemaName][table] = chain;
    },
    __reset() {
      for (const k of Object.keys(publicChains)) delete publicChains[k];
      for (const k of Object.keys(schemaChains)) delete schemaChains[k];
    },
  };

  const mockNotificarVentaCreada = vi.fn().mockResolvedValue({ enviadas: 1, errores: 0 });

  return { mockGetUser, mockServerActionClient, createChainMock, mockEsAdminOCoord, mockNotificarVentaCreada };
});

vi.mock("@/lib/supabase.server-actions", () => ({
  createServerActionClient: vi.fn().mockImplementation(() => Promise.resolve(mockServerActionClient)),
}));

vi.mock("@/lib/notifications/venta", () => ({
  notificarVentaCreada: mockNotificarVentaCreada,
}));

vi.mock("@/lib/permissions/server", () => ({
  esAdminOCoordinador: mockEsAdminOCoord,
  tienePermiso: vi.fn().mockResolvedValue(true),
  requierePermiso: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/permissions", () => ({
  PERMISOS: { VENTAS: { VER_TODAS: "ventas.ver_todas" } },
}));

vi.mock("@/app/dashboard/clientes/_actions-crm-helpers", () => ({
  obtenerUsernameActual: vi.fn().mockImplementation(async () => ({
    success: true,
    username: "vendedor1",
    userId: "uid-1",
  })),
  revalidarCliente: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  cerrarProcesoYCrearVenta,
  obtenerContextoCierreVenta,
} from "@/app/dashboard/adquisicion/_actions-proceso";

beforeEach(() => {
  vi.clearAllMocks();
  mockServerActionClient.__reset();
  mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } });
  mockEsAdminOCoord.mockResolvedValue(false);
});

// ============================================================
// cerrarProcesoYCrearVenta — validaciones
// ============================================================

describe("cerrarProcesoYCrearVenta: validaciones", () => {
  it("rechaza sin procesoId", async () => {
    const res = await cerrarProcesoYCrearVenta({
      procesoId: "",
      precioTotal: 100000,
      montoInicial: 20000,
      numeroCuotas: 60,
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/ID/);
  });

  it("rechaza precio <= 0", async () => {
    const res = await cerrarProcesoYCrearVenta({
      procesoId: "p-1",
      precioTotal: 0,
      montoInicial: 0,
      numeroCuotas: 0,
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Precio/);
  });

  it("rechaza precio NaN", async () => {
    const res = await cerrarProcesoYCrearVenta({
      procesoId: "p-1",
      precioTotal: NaN,
      montoInicial: 0,
      numeroCuotas: 0,
    });
    expect(res.success).toBe(false);
  });

  it("rechaza monto inicial negativo", async () => {
    const res = await cerrarProcesoYCrearVenta({
      procesoId: "p-1",
      precioTotal: 100000,
      montoInicial: -100,
      numeroCuotas: 60,
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/inicial/i);
  });

  it("rechaza inicial > precio", async () => {
    const res = await cerrarProcesoYCrearVenta({
      procesoId: "p-1",
      precioTotal: 100000,
      montoInicial: 200000,
      numeroCuotas: 60,
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/superar/i);
  });

  it("rechaza cuotas no entero", async () => {
    const res = await cerrarProcesoYCrearVenta({
      procesoId: "p-1",
      precioTotal: 100000,
      montoInicial: 20000,
      numeroCuotas: 60.5,
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/cuotas/i);
  });

  it("rechaza cuotas negativas", async () => {
    const res = await cerrarProcesoYCrearVenta({
      procesoId: "p-1",
      precioTotal: 100000,
      montoInicial: 20000,
      numeroCuotas: -5,
    });
    expect(res.success).toBe(false);
  });
});

// ============================================================
// cerrarProcesoYCrearVenta — autorización
// ============================================================

describe("cerrarProcesoYCrearVenta: autorización", () => {
  it("rechaza si proceso no existe", async () => {
    const procChain = createChainMock({ data: null, error: null });
    mockServerActionClient.__setPublicChain("proceso_adquisicion", procChain);

    const res = await cerrarProcesoYCrearVenta({
      procesoId: "p-x",
      precioTotal: 100000,
      montoInicial: 20000,
      numeroCuotas: 60,
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/no encontrado/i);
  });

  it("rechaza si no es vendedor asignado ni privilegiado", async () => {
    mockEsAdminOCoord.mockResolvedValue(false);
    const procChain = createChainMock({
      data: {
        id: "p-1",
        vendedor_username: "otro_vendedor",
        estado: "activo",
        etapa_actual: "desembolso",
        cliente_id: "c-1",
      },
      error: null,
    });
    mockServerActionClient.__setPublicChain("proceso_adquisicion", procChain);

    const res = await cerrarProcesoYCrearVenta({
      procesoId: "p-1",
      precioTotal: 100000,
      montoInicial: 20000,
      numeroCuotas: 60,
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/vendedor|admin/i);
  });

  it("permite a admin/coord cerrar venta de cualquier vendedor", async () => {
    mockEsAdminOCoord.mockResolvedValue(true);
    const procChain = createChainMock({
      data: {
        id: "p-1",
        vendedor_username: "otro_vendedor",
        estado: "activo",
        etapa_actual: "desembolso",
        cliente_id: "c-1",
      },
      error: null,
    });
    mockServerActionClient.__setPublicChain("proceso_adquisicion", procChain);
    mockServerActionClient.rpc.mockResolvedValue({
      data: {
        venta_id: "v-1",
        codigo_venta: "VTA-2026-0001",
        total_cuotas: 61,
        forma_pago: "credito_bancario",
        precio_total: 100000,
        saldo_pendiente: 80000,
      },
      error: null,
    });

    const res = await cerrarProcesoYCrearVenta({
      procesoId: "p-1",
      precioTotal: 100000,
      montoInicial: 20000,
      numeroCuotas: 60,
    });
    expect(res.success).toBe(true);
  });

  it("permite al vendedor asignado cerrar su propia venta", async () => {
    mockEsAdminOCoord.mockResolvedValue(false);
    const procChain = createChainMock({
      data: {
        id: "p-1",
        vendedor_username: "vendedor1",
        estado: "activo",
        etapa_actual: "desembolso",
        cliente_id: "c-1",
      },
      error: null,
    });
    mockServerActionClient.__setPublicChain("proceso_adquisicion", procChain);
    mockServerActionClient.rpc.mockResolvedValue({
      data: {
        venta_id: "v-1",
        codigo_venta: "VTA-2026-0002",
        total_cuotas: 1,
        forma_pago: "contado",
        precio_total: 50000,
        saldo_pendiente: 0,
      },
      error: null,
    });

    const res = await cerrarProcesoYCrearVenta({
      procesoId: "p-1",
      precioTotal: 50000,
      montoInicial: 50000,
      numeroCuotas: 0,
    });
    expect(res.success).toBe(true);
  });
});

// ============================================================
// cerrarProcesoYCrearVenta — flujo OK
// ============================================================

describe("cerrarProcesoYCrearVenta: flujo OK", () => {
  function setupProcesoOK() {
    const procChain = createChainMock({
      data: {
        id: "p-1",
        vendedor_username: "vendedor1",
        estado: "activo",
        etapa_actual: "desembolso",
        cliente_id: "c-1",
      },
      error: null,
    });
    mockServerActionClient.__setPublicChain("proceso_adquisicion", procChain);
  }

  it("invoca RPC cerrar_proceso_y_crear_venta con parametros correctos", async () => {
    setupProcesoOK();
    mockServerActionClient.rpc.mockResolvedValue({
      data: {
        venta_id: "v-1",
        codigo_venta: "VTA-2026-0001",
        total_cuotas: 61,
        forma_pago: "credito_bancario",
        precio_total: 150000,
        saldo_pendiente: 120000,
      },
      error: null,
    });

    await cerrarProcesoYCrearVenta({
      procesoId: "p-1",
      precioTotal: 150000,
      montoInicial: 30000,
      numeroCuotas: 60,
      fechaPrimeraCuota: "2026-06-01",
      notas: "Notarial",
    });

    expect(mockServerActionClient.rpc).toHaveBeenCalledWith(
      "cerrar_proceso_y_crear_venta",
      expect.objectContaining({
        p_proceso_id: "p-1",
        p_precio_total: 150000,
        p_monto_inicial: 30000,
        p_numero_cuotas: 60,
        p_fecha_primera_cuota: "2026-06-01",
        p_notas: "Notarial",
      }),
    );
  });

  it("devuelve los datos parseados de la respuesta del RPC", async () => {
    setupProcesoOK();
    mockServerActionClient.rpc.mockResolvedValue({
      data: {
        venta_id: "v-99",
        codigo_venta: "VTA-2026-0099",
        total_cuotas: 13,
        forma_pago: "contado",
        precio_total: 80000,
        saldo_pendiente: 0,
      },
      error: null,
    });

    const res = await cerrarProcesoYCrearVenta({
      procesoId: "p-1",
      precioTotal: 80000,
      montoInicial: 80000,
      numeroCuotas: 0,
    });

    expect(res.success).toBe(true);
    expect(res.data).toEqual({
      ventaId: "v-99",
      codigoVenta: "VTA-2026-0099",
      totalCuotas: 13,
      formaPago: "contado",
      precioTotal: 80000,
      saldoPendiente: 0,
    });
  });

  it("maneja error del RPC y retorna mensaje", async () => {
    setupProcesoOK();
    mockServerActionClient.rpc.mockResolvedValue({
      data: null,
      error: { message: "El proceso no esta en la etapa de desembolso" },
    });

    const res = await cerrarProcesoYCrearVenta({
      procesoId: "p-1",
      precioTotal: 80000,
      montoInicial: 0,
      numeroCuotas: 12,
    });

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/desembolso/);
  });

  it("rechaza respuesta inesperada del RPC", async () => {
    setupProcesoOK();
    mockServerActionClient.rpc.mockResolvedValue({ data: null, error: null });

    const res = await cerrarProcesoYCrearVenta({
      procesoId: "p-1",
      precioTotal: 80000,
      montoInicial: 0,
      numeroCuotas: 12,
    });

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/inesperada/i);
  });

  it("acepta venta al contado (cuotas=0)", async () => {
    setupProcesoOK();
    mockServerActionClient.rpc.mockResolvedValue({
      data: {
        venta_id: "v-c",
        codigo_venta: "VTA-2026-0003",
        total_cuotas: 1,
        forma_pago: "contado",
        precio_total: 50000,
        saldo_pendiente: 0,
      },
      error: null,
    });

    const res = await cerrarProcesoYCrearVenta({
      procesoId: "p-1",
      precioTotal: 50000,
      montoInicial: 50000,
      numeroCuotas: 0,
    });

    expect(res.success).toBe(true);
    // No envia fecha_primera_cuota cuando cuotas=0 (queda undefined -> null)
    expect(mockServerActionClient.rpc).toHaveBeenCalledWith(
      "cerrar_proceso_y_crear_venta",
      expect.objectContaining({ p_fecha_primera_cuota: null, p_numero_cuotas: 0 }),
    );
  });
});

// ============================================================
// cerrarProcesoYCrearVenta — notificación de venta creada
// ============================================================

describe("cerrarProcesoYCrearVenta: notificación de venta creada", () => {
  function setupProcesoConClienteYLote() {
    const procChain = createChainMock({
      data: {
        id: "p-1",
        vendedor_username: "vendedor1",
        estado: "activo",
        etapa_actual: "desembolso",
        cliente_id: "c-1",
        cliente: { nombre: "Juan Perez" },
        lote: { codigo: "A1" },
      },
      error: null,
    });
    mockServerActionClient.__setPublicChain("proceso_adquisicion", procChain);
  }

  it("notifica via notificarVentaCreada con cliente, lote, monto y actor resueltos", async () => {
    setupProcesoConClienteYLote();
    mockServerActionClient.rpc.mockResolvedValue({
      data: {
        venta_id: "v-1",
        codigo_venta: "VTA-2026-0001",
        total_cuotas: 61,
        forma_pago: "credito_bancario",
        precio_total: 150000,
        saldo_pendiente: 120000,
      },
      error: null,
    });

    await cerrarProcesoYCrearVenta({
      procesoId: "p-1",
      precioTotal: 150000,
      montoInicial: 30000,
      numeroCuotas: 60,
    });

    expect(mockNotificarVentaCreada).toHaveBeenCalledTimes(1);
    expect(mockNotificarVentaCreada).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteNombre: "Juan Perez",
        loteCodigo: "A1",
        monto: 150000,
        actorId: "uid-1",
        actorNombre: "vendedor1",
        ventaId: "v-1",
        codigoVenta: "VTA-2026-0001",
      }),
    );
  });

  it("no falla el cierre si notificarVentaCreada lanza", async () => {
    setupProcesoConClienteYLote();
    mockServerActionClient.rpc.mockResolvedValue({
      data: {
        venta_id: "v-2",
        codigo_venta: "VTA-2026-0002",
        total_cuotas: 1,
        forma_pago: "contado",
        precio_total: 50000,
        saldo_pendiente: 0,
      },
      error: null,
    });
    mockNotificarVentaCreada.mockRejectedValueOnce(new Error("push down"));

    const res = await cerrarProcesoYCrearVenta({
      procesoId: "p-1",
      precioTotal: 50000,
      montoInicial: 50000,
      numeroCuotas: 0,
    });

    expect(res.success).toBe(true);
  });
});

// ============================================================
// obtenerContextoCierreVenta
// ============================================================

describe("obtenerContextoCierreVenta", () => {
  it("rechaza sin procesoId", async () => {
    const res = await obtenerContextoCierreVenta("");
    expect(res.success).toBe(false);
  });

  it("rechaza si proceso no existe", async () => {
    const procChain = createChainMock({ data: null, error: null });
    mockServerActionClient.__setPublicChain("proceso_adquisicion", procChain);

    const res = await obtenerContextoCierreVenta("p-x");
    expect(res.success).toBe(false);
  });

  it("retorna contexto con datos del lote y reserva", async () => {
    const procChain = createChainMock({
      data: {
        codigo: "ADQ-2026-0001",
        lote: {
          id: "l-1",
          codigo: "A1",
          precio: 120000,
          moneda: "PEN",
          proyecto_id: "py-1",
          proyecto: { nombre: "Proyecto Sol" },
        },
        reserva: {
          monto_reserva: 5000,
          forma_pago: "credito_hipotecario",
          moneda: "PEN",
        },
      },
      error: null,
    });
    mockServerActionClient.__setPublicChain("proceso_adquisicion", procChain);

    const configChain = createChainMock({
      data: {
        tasa_efectiva_mensual: 0.012,
        max_cuotas_saldo: 240,
        porcentaje_cuota_inicial: 25,
      },
      error: null,
    });
    mockServerActionClient.__setSchemaChain("crm", "configuracion_proyecto_financiera", configChain);

    const res = await obtenerContextoCierreVenta("p-1");
    expect(res.success).toBe(true);
    expect(res.data).toEqual({
      procesoCodigo: "ADQ-2026-0001",
      loteCodigo: "A1",
      proyectoNombre: "Proyecto Sol",
      precioSugerido: 120000,
      moneda: "PEN",
      montoSeparacion: 5000,
      formaPagoReserva: "credito_hipotecario",
      tasaEfectivaMensual: 0.012,
      maxCuotasSaldo: 240,
      porcentajeCuotaInicial: 25,
    });
  });

  it("usa defaults si no hay configuracion del proyecto", async () => {
    const procChain = createChainMock({
      data: {
        codigo: "ADQ-2026-0002",
        lote: {
          id: "l-2",
          codigo: "B1",
          precio: 90000,
          moneda: "USD",
          proyecto_id: "py-2",
          proyecto: { nombre: "Proyecto Luna" },
        },
        reserva: null,
      },
      error: null,
    });
    mockServerActionClient.__setPublicChain("proceso_adquisicion", procChain);

    const configChain = createChainMock({ data: null, error: null });
    mockServerActionClient.__setSchemaChain("crm", "configuracion_proyecto_financiera", configChain);

    const res = await obtenerContextoCierreVenta("p-2");
    expect(res.success).toBe(true);
    expect(res.data?.tasaEfectivaMensual).toBe(0);
    expect(res.data?.maxCuotasSaldo).toBe(120);
    expect(res.data?.porcentajeCuotaInicial).toBe(20);
    expect(res.data?.formaPagoReserva).toBeNull();
    expect(res.data?.montoSeparacion).toBeNull();
  });
});
