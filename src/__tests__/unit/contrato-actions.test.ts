import { describe, it, expect, vi, beforeEach } from "vitest";

// ==================== HOISTED MOCKS ====================

const { mockGetUser, mockServerActionClient, createChainMock } = vi.hoisted(() => {
  function createChainMock(finalResult: any = { data: null, error: null }) {
    const chain: any = {};
    const methods = ["select", "insert", "update", "eq", "neq", "is", "or", "order", "range", "single", "in", "limit", "head"];
    for (const method of methods) {
      chain[method] = vi.fn().mockReturnValue(chain);
    }
    chain.single.mockImplementation(() => Promise.resolve(finalResult));
    chain.limit.mockImplementation(() => Promise.resolve(finalResult));
    // order returns a Promise-like for queries that don't end in single()
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

// Mock the helpers
vi.mock("@/app/dashboard/clientes/_actions-crm-helpers", () => ({
  obtenerUsernameActual: vi.fn().mockResolvedValue({ success: true, username: "admin1" }),
  revalidarCliente: vi.fn(),
}));

// Import after mocks
import { crearContrato, actualizarContrato, obtenerContratosCliente } from "@/app/dashboard/clientes/_actions-contrato";

describe("crearContrato", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1", email: "test@test.com" } } });
  });

  it("crea un contrato correctamente con datos mínimos", async () => {
    const contratoData = {
      id: "contrato-1",
      codigo_contrato: "CON-2026-0001",
      estado: "borrador",
      venta_id: "venta-1",
      cliente_id: "cliente-1",
    };

    const chain = createChainMock({ data: contratoData, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await crearContrato({
      ventaId: "venta-1",
      clienteId: "cliente-1",
      loteId: "lote-1",
    });

    expect(result.success).toBe(true);
    expect(mockServerActionClient.from).toHaveBeenCalledWith("contrato");
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        venta_id: "venta-1",
        cliente_id: "cliente-1",
        lote_id: "lote-1",
        estado: "borrador",
        vendedor_username: "admin1",
      })
    );
  });

  it("crea un contrato con notaría y notario", async () => {
    const chain = createChainMock({ data: { id: "contrato-2" }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await crearContrato({
      ventaId: "venta-1",
      clienteId: "cliente-1",
      notaria: "Notaría Fernández",
      notario: "Dr. Manuel Fernández",
      notas: "Contrato urgente",
    });

    expect(result.success).toBe(true);
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        notaria: "Notaría Fernández",
        notario: "Dr. Manuel Fernández",
        notas: "Contrato urgente",
      })
    );
  });

  it("maneja error de base de datos al crear", async () => {
    const chain = createChainMock({ data: null, error: { message: "FK violation" } });
    // Override single to throw
    chain.single.mockImplementation(() => {
      throw { message: "FK violation" };
    });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await crearContrato({
      ventaId: "venta-inexistente",
      clienteId: "cliente-1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("FK violation");
  });
});

describe("actualizarContrato", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("actualiza el estado de un contrato", async () => {
    const chain = createChainMock({ data: { id: "contrato-1", estado: "pendiente_firma" }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await actualizarContrato("contrato-1", {
      estado: "pendiente_firma",
      clienteId: "cliente-1",
    });

    expect(result.success).toBe(true);
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        estado: "pendiente_firma",
      })
    );
    expect(chain.eq).toHaveBeenCalledWith("id", "contrato-1");
  });

  it("actualiza datos de notaría", async () => {
    const chain = createChainMock({ data: { id: "contrato-1" }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await actualizarContrato("contrato-1", {
      notaria: "Notaría Gómez",
      notario: "Dr. Pedro Gómez",
      clienteId: "cliente-1",
    });

    expect(result.success).toBe(true);
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        notaria: "Notaría Gómez",
        notario: "Dr. Pedro Gómez",
      })
    );
  });

  it("actualiza datos de SUNARP", async () => {
    const chain = createChainMock({ data: { id: "contrato-1" }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await actualizarContrato("contrato-1", {
      partidaRegistral: "13953913",
      numeroTitulo: "2026-00123",
      zonaRegistral: "IX - Lima",
      fechaInscripcionSunarp: "2026-03-20",
      clienteId: "cliente-1",
    });

    expect(result.success).toBe(true);
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        partida_registral: "13953913",
        numero_titulo: "2026-00123",
        zona_registral: "IX - Lima",
        fecha_inscripcion_sunarp: "2026-03-20",
      })
    );
  });

  it("actualiza URLs de documentos", async () => {
    const chain = createChainMock({ data: { id: "contrato-1" }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await actualizarContrato("contrato-1", {
      contratoUrl: "https://storage.example.com/contrato.pdf",
      escrituraUrl: "https://storage.example.com/escritura.pdf",
      constanciaSunarpUrl: "https://storage.example.com/sunarp.pdf",
      clienteId: "cliente-1",
    });

    expect(result.success).toBe(true);
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        contrato_url: "https://storage.example.com/contrato.pdf",
        escritura_url: "https://storage.example.com/escritura.pdf",
        constancia_sunarp_url: "https://storage.example.com/sunarp.pdf",
      })
    );
  });

  it("maneja error de base de datos al actualizar", async () => {
    const chain = createChainMock({ data: null, error: { message: "Not found" } });
    chain.single.mockImplementation(() => {
      throw { message: "Not found" };
    });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await actualizarContrato("contrato-inexistente", {
      estado: "firmado",
      clienteId: "cliente-1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not found");
  });
});

describe("obtenerContratosCliente", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("obtiene contratos de un cliente correctamente", async () => {
    const contratos = [
      { id: "c-1", codigo_contrato: "CON-2026-0001", estado: "borrador" },
      { id: "c-2", codigo_contrato: "CON-2026-0002", estado: "firmado" },
    ];

    const chain = createChainMock();
    chain.order.mockImplementation(() => Promise.resolve({ data: contratos, error: null }));
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await obtenerContratosCliente("cliente-1");

    expect(result.success).toBe(true);
    expect(result.data).toEqual(contratos);
    expect(mockServerActionClient.from).toHaveBeenCalledWith("contrato");
    expect(chain.eq).toHaveBeenCalledWith("cliente_id", "cliente-1");
    expect(chain.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("retorna array vacío cuando no hay contratos", async () => {
    const chain = createChainMock();
    chain.order.mockImplementation(() => Promise.resolve({ data: null, error: null }));
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await obtenerContratosCliente("cliente-sin-contratos");

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it("maneja error de base de datos", async () => {
    const chain = createChainMock();
    chain.order.mockImplementation(() => {
      throw { message: "Connection error" };
    });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await obtenerContratosCliente("cliente-1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Connection error");
  });
});
