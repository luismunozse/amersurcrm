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
  };
  return { mockGetUser, mockServerActionClient, createChainMock };
});

vi.mock("@/lib/supabase.server-actions", () => ({
  createServerActionClient: vi.fn().mockImplementation(() => Promise.resolve(mockServerActionClient)),
}));
vi.mock("@/lib/permissions/server", () => ({
  requierePermiso: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/permissions", () => ({
  PERMISOS: {
    VENTAS: { CREAR: "ventas.crear", MODIFICAR: "ventas.modificar" },
  },
}));
vi.mock("@/app/dashboard/clientes/_actions-crm-helpers", () => ({
  obtenerUsernameActual: vi.fn().mockResolvedValue({ success: true, username: "vendedor1", userId: "uid-1" }),
  revalidarCliente: vi.fn(),
}));

import {
  crearCalificacionBancaria,
  actualizarCalificacionBancaria,
  obtenerCalificacionesCliente,
  agregarDocumentoCalificacion,
  actualizarDocumentoCalificacion,
} from "@/app/dashboard/clientes/_actions-calificacion";

describe("crearCalificacionBancaria", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } });
  });

  it("crea calificación con datos mínimos", async () => {
    const chain = createChainMock({ data: { id: "cb-1", estado: "pendiente" }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await crearCalificacionBancaria({ clienteId: "c-1" });
    expect(result.success).toBe(true);
    expect(chain.insert).toHaveBeenCalled();
  });

  it("crea calificación con datos de banco", async () => {
    const chain = createChainMock({ data: { id: "cb-1" }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await crearCalificacionBancaria({
      clienteId: "c-1",
      reservaId: "r-1",
      loteId: "l-1",
      banco: "BCP",
      ejecutivoBancario: "Ana Torres",
      telefonoEjecutivo: "999111222",
      emailEjecutivo: "ana@bcp.com",
      montoSolicitado: 60000,
      moneda: "PEN",
    });
    expect(result.success).toBe(true);
    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({
      banco: "BCP",
      ejecutivo_bancario: "Ana Torres",
    }));
  });

  it("maneja error de BD", async () => {
    const chain = createChainMock();
    chain.single.mockImplementation(() => { throw { message: "Error" }; });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await crearCalificacionBancaria({ clienteId: "c-1" });
    expect(result.success).toBe(false);
  });
});

describe("actualizarCalificacionBancaria", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("actualiza estado a aprobada", async () => {
    const chain = createChainMock({ data: { id: "cb-1", estado: "aprobada" }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await actualizarCalificacionBancaria("cb-1", {
      estado: "aprobada",
      montoAprobado: 60000,
      tasaInteres: 7.5,
      plazoMeses: 240,
      clienteId: "c-1",
    });
    expect(result.success).toBe(true);
  });

  it("actualiza estado a rechazada con motivo", async () => {
    const chain = createChainMock({ data: { id: "cb-1", estado: "rechazada" }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await actualizarCalificacionBancaria("cb-1", {
      estado: "rechazada",
      motivoRechazo: "Ingresos insuficientes",
      clienteId: "c-1",
    });
    expect(result.success).toBe(true);
  });
});

describe("obtenerCalificacionesCliente", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("obtiene calificaciones de un cliente", async () => {
    const calificaciones = [
      { id: "cb-1", estado: "aprobada", banco: "BCP" },
      { id: "cb-2", estado: "pendiente", banco: "Interbank" },
    ];
    const chain = createChainMock();
    chain.order.mockImplementation(() => Promise.resolve({ data: calificaciones, error: null }));
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await obtenerCalificacionesCliente("c-1");
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
  });

  it("retorna array vacío sin calificaciones", async () => {
    const chain = createChainMock();
    chain.order.mockImplementation(() => Promise.resolve({ data: null, error: null }));
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await obtenerCalificacionesCliente("c-sin-calif");
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });
});

describe("agregarDocumentoCalificacion", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("agrega documento de calificación", async () => {
    const chain = createChainMock({ data: { id: "doc-1" }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await agregarDocumentoCalificacion({
      calificacionId: "cb-1",
      tipoDocumento: "boleta_pago",
      nombre: "Boleta marzo 2026",
      url: "https://storage.example.com/boleta.pdf",
      clienteId: "c-1",
    });
    expect(result.success).toBe(true);
  });
});

describe("actualizarDocumentoCalificacion", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("actualiza estado de documento", async () => {
    const chain = createChainMock({ data: { id: "doc-1" }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await actualizarDocumentoCalificacion("doc-1", {
      estado: "aprobado",
      notas: "Documento válido",
      clienteId: "c-1",
    });
    expect(result.success).toBe(true);
  });
});
