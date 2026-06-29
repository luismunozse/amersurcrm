import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockServerActionClient, createChainMock } = vi.hoisted(() => {
  function createChainMock(finalResult: any = { data: null, error: null }) {
    const chain: any = {};
    const methods = ["select", "insert", "update", "delete", "eq", "neq", "is", "or", "order", "range", "single", "in", "limit", "head", "maybeSingle"];
    for (const method of methods) { chain[method] = vi.fn().mockReturnValue(chain); }
    chain.single.mockImplementation(() => Promise.resolve(finalResult));
    chain.order.mockImplementation(() => Promise.resolve(finalResult));
    chain.range.mockImplementation(() => Promise.resolve(finalResult));
    return chain;
  }
  const mockGetUser = vi.fn();
  const mockServerActionClient = {
    auth: { getUser: mockGetUser },
    from: vi.fn().mockReturnValue(createChainMock()),
  };
  return { mockGetUser, mockServerActionClient, createChainMock };
});

vi.mock("@/lib/supabase.server-actions", () => ({
  createServerActionClient: vi.fn().mockImplementation(() => Promise.resolve(mockServerActionClient)),
}));
vi.mock("@/lib/permissions/server", () => ({
  requierePermiso: vi.fn().mockResolvedValue(undefined),
  tienePermiso: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/lib/permissions", () => ({
  PERMISOS: { VENTAS: { CREAR: "ventas.crear" } },
}));
vi.mock("@/app/dashboard/clientes/_actions-crm-helpers", () => ({
  obtenerUsernameActual: vi.fn().mockResolvedValue({ success: true, username: "vendedor1", userId: "uid-1" }),
  revalidarCliente: vi.fn(),
}));

import { tienePermiso } from "@/lib/permissions/server";

import {
  crearSolicitudPostVenta,
  actualizarSolicitudPostVenta,
  obtenerSolicitudesPostVentaCliente,
  obtenerSolicitudesPostVenta,
} from "@/app/dashboard/postventa/_actions-postventa";

describe("crearSolicitudPostVenta", () => {
  beforeEach(() => { vi.clearAllMocks(); mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } }); });

  it("crea solicitud de reclamo", async () => {
    const chain = createChainMock({ data: { id: "spv-1", tipo: "reclamo" }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await crearSolicitudPostVenta({
      ventaId: "v-1",
      clienteId: "c-1",
      tipo: "reclamo",
      asunto: "Filtración en baño",
      descripcion: "Se detectó filtración de agua",
      prioridad: "alta",
    });
    expect(result.success).toBe(true);
  });

  it("crea solicitud de mantenimiento", async () => {
    const chain = createChainMock({ data: { id: "spv-2" }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await crearSolicitudPostVenta({
      ventaId: "v-1",
      clienteId: "c-1",
      tipo: "mantenimiento",
      asunto: "Mantenimiento jardín",
    });
    expect(result.success).toBe(true);
  });

  it("maneja error al crear solicitud", async () => {
    const chain = createChainMock();
    chain.single.mockImplementation(() => { throw { message: "Error" }; });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await crearSolicitudPostVenta({
      ventaId: "v-1",
      clienteId: "c-1",
      tipo: "reclamo",
      asunto: "Test",
    });
    expect(result.success).toBe(false);
  });
});

describe("actualizarSolicitudPostVenta", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("actualiza estado a en_proceso", async () => {
    const chain = createChainMock({ data: { id: "spv-1", estado: "en_proceso" }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await actualizarSolicitudPostVenta("spv-1", {
      estado: "en_proceso",
      asignadoA: "tecnico1",
      clienteId: "c-1",
    });
    expect(result.success).toBe(true);
  });

  it("cierra solicitud con calificación", async () => {
    const chain = createChainMock({ data: { id: "spv-1" }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await actualizarSolicitudPostVenta("spv-1", {
      estado: "cerrada",
      comentarioResolucion: "Se reparó la filtración",
      calificacionCliente: 5,
      comentarioCalificacion: "Excelente servicio",
      clienteId: "c-1",
    });
    expect(result.success).toBe(true);
  });
});

describe("obtenerSolicitudesPostVentaCliente", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("obtiene solicitudes de un cliente", async () => {
    const chain = createChainMock();
    chain.order.mockImplementation(() => Promise.resolve({ data: [{ id: "spv-1" }], error: null }));
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await obtenerSolicitudesPostVentaCliente("c-1");
    expect(result.success).toBe(true);
  });
});

describe("obtenerSolicitudesPostVenta", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("llama a supabase from('solicitud_postventa') para listar", async () => {
    vi.mocked(tienePermiso).mockResolvedValueOnce(true);
    const chain = createChainMock();
    chain.range.mockImplementation(() => Promise.resolve({ data: [], error: null }));
    chain.order.mockReturnValue(chain);
    mockServerActionClient.from.mockReturnValue(chain);

    await obtenerSolicitudesPostVenta();
    expect(mockServerActionClient.from).toHaveBeenCalledWith("solicitud_postventa");
  });

  it("maneja error al listar solicitudes", async () => {
    vi.mocked(tienePermiso).mockResolvedValueOnce(true);
    const chain = createChainMock();
    chain.range.mockImplementation(() => Promise.resolve({ data: null, error: { message: "DB error" } }));
    chain.order.mockReturnValue(chain);
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await obtenerSolicitudesPostVenta();
    expect(result.success).toBe(false);
  });

  // global role must bypass client ownership check and return all post-sale requests
  it("global role — returns all without fetching vendor clients", async () => {
    vi.mocked(tienePermiso).mockResolvedValueOnce(true);
    const chain = createChainMock();
    chain.range.mockImplementation(() => Promise.resolve({ data: [{ id: "spv-1" }], error: null }));
    chain.order.mockReturnValue(chain);
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await obtenerSolicitudesPostVenta();

    expect(result.success).toBe(true);
    const fromTables = mockServerActionClient.from.mock.calls.map((c: any[]) => c[0]);
    expect(fromTables).not.toContain("cliente");
  });

  // vendor role must scope solicitudes to own clients via cliente lookup and .in(cliente_id) filter
  it("vendor role — fetches own clients and scopes query via .in(cliente_id)", async () => {
    vi.mocked(tienePermiso).mockResolvedValueOnce(false); // vendor

    const clienteChain = createChainMock();
    clienteChain.eq.mockImplementation(() =>
      Promise.resolve({ data: [{ id: "c-1" }], error: null })
    );

    const mainChain = createChainMock();
    mainChain.range.mockImplementation(() => Promise.resolve({ data: [{ id: "spv-1" }], error: null }));
    mainChain.order.mockReturnValue(mainChain);

    mockServerActionClient.from
      .mockReturnValueOnce(clienteChain) // for 'cliente' scope lookup
      .mockReturnValue(mainChain);       // for 'solicitud_postventa' main query

    const result = await obtenerSolicitudesPostVenta();

    expect(result.success).toBe(true);
    expect(mockServerActionClient.from).toHaveBeenCalledWith("cliente");
    expect(mainChain.in).toHaveBeenCalledWith("cliente_id", expect.any(Array));
  });
});
