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
}));
vi.mock("@/lib/permissions", () => ({
  PERMISOS: { VENTAS: { CREAR: "ventas.crear" } },
}));
vi.mock("@/app/dashboard/clientes/_actions-crm-helpers", () => ({
  obtenerUsernameActual: vi.fn().mockResolvedValue({ success: true, username: "vendedor1", userId: "uid-1" }),
  revalidarCliente: vi.fn(),
}));

import {
  crearIndependizacion,
  actualizarIndependizacion,
  obtenerIndependizacionesCliente,
  obtenerIndependizaciones,
  agregarDocumentoIndependizacion,
} from "@/app/dashboard/independizacion/_actions-independizacion";

describe("crearIndependizacion", () => {
  beforeEach(() => { vi.clearAllMocks(); mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } }); });

  it("crea proceso de independización", async () => {
    const chain = createChainMock({ data: { id: "ind-1", estado: "pendiente" }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await crearIndependizacion({
      ventaId: "v-1",
      loteId: "l-1",
      clienteId: "c-1",
      notaria: "Notaría Gómez",
      partidaRegistralMatriz: "PR-12345",
    });
    expect(result.success).toBe(true);
  });

  it("maneja error al crear", async () => {
    const chain = createChainMock();
    chain.single.mockImplementation(() => { throw { message: "Error" }; });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await crearIndependizacion({ ventaId: "v-1", loteId: "l-1", clienteId: "c-1" });
    expect(result.success).toBe(false);
  });
});

describe("actualizarIndependizacion", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("actualiza estado y datos SUNARP", async () => {
    const chain = createChainMock({ data: { id: "ind-1" }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await actualizarIndependizacion("ind-1", {
      estado: "presentada_sunarp",
      partidaRegistralIndependizada: "PR-67890",
      numeroTitulo: "2026-00456",
      zonaRegistral: "IX - Lima",
      fechaPresentacionSunarp: "2026-03-20",
      clienteId: "c-1",
    });
    expect(result.success).toBe(true);
  });

  it("registra inscripción completada", async () => {
    const chain = createChainMock({ data: { id: "ind-1" }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await actualizarIndependizacion("ind-1", {
      estado: "inscrita",
      fechaInscripcion: "2026-04-15",
      clienteId: "c-1",
    });
    expect(result.success).toBe(true);
  });
});

describe("obtenerIndependizacionesCliente", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("obtiene independizaciones de un cliente", async () => {
    const chain = createChainMock();
    chain.order.mockImplementation(() => Promise.resolve({ data: [{ id: "ind-1" }], error: null }));
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await obtenerIndependizacionesCliente("c-1");
    expect(result.success).toBe(true);
  });
});

describe("obtenerIndependizaciones", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("maneja error al listar independizaciones", async () => {
    const chain = createChainMock();
    chain.range.mockImplementation(() => Promise.resolve({ data: null, error: { message: "DB error" } }));
    chain.order.mockReturnValue(chain);
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await obtenerIndependizaciones();
    expect(result.success).toBe(false);
  });
});

describe("agregarDocumentoIndependizacion", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("agrega documento", async () => {
    const chain = createChainMock({ data: { id: "doc-1" }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await agregarDocumentoIndependizacion({
      independizacionId: "ind-1",
      tipoDocumento: "plano_independizacion",
      nombre: "Plano de independización",
      url: "https://storage.example.com/plano.pdf",
      clienteId: "c-1",
    });
    expect(result.success).toBe(true);
  });
});
