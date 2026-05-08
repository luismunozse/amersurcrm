import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockServerActionClient, createChainMock } = vi.hoisted(() => {
  function createChainMock(finalResult: any = { data: null, error: null }) {
    const chain: any = {};
    const methods = ["select", "insert", "update", "delete", "eq", "neq", "is", "or", "order", "range", "single", "in", "limit", "head", "maybeSingle"];
    for (const method of methods) { chain[method] = vi.fn().mockReturnValue(chain); }
    chain.single.mockImplementation(() => Promise.resolve(finalResult));
    chain.maybeSingle.mockImplementation(() => Promise.resolve(finalResult));
    chain.limit.mockImplementation(() => Promise.resolve(finalResult));
    chain.order.mockImplementation(() => Promise.resolve(finalResult));
    chain.insert.mockImplementation(() => Promise.resolve({ data: finalResult.data, error: finalResult.error }));
    chain.update.mockImplementation(() => Promise.resolve({ data: finalResult.data, error: finalResult.error }));
    chain.delete.mockImplementation(() => Promise.resolve({ data: finalResult.data, error: finalResult.error }));
    return chain;
  }
  const mockGetUser = vi.fn();
  const schemaChain = createChainMock();
  const mockServerActionClient = {
    auth: { getUser: mockGetUser },
    from: vi.fn().mockReturnValue(createChainMock()),
    schema: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(schemaChain) }),
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
}));
vi.mock("@/lib/permissions", () => ({
  PERMISOS: {
    RESERVAS: { CREAR: "reservas.crear", CANCELAR: "reservas.cancelar", ELIMINAR: "reservas.eliminar" },
  },
}));
vi.mock("@/app/dashboard/clientes/_actions-crm-helpers", () => ({
  obtenerUsernameActual: vi.fn().mockResolvedValue({ success: true, username: "vendedor1", userId: "uid-1" }),
  revalidarCliente: vi.fn(),
  crearEventoAgenda: vi.fn().mockResolvedValue(true),
  validarMonto: vi.fn().mockReturnValue({ valid: true }),
  validarFechaFutura: vi.fn().mockReturnValue({ valid: true }),
}));
import {
  registrarVisita,
  crearReserva,
  cancelarReserva,
} from "@/app/dashboard/clientes/_actions-reservas";
import { requierePermiso } from "@/lib/permissions/server";

describe("registrarVisita", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } });
    const chain = createChainMock();
    chain.insert.mockImplementation(() => Promise.resolve({ data: null, error: null }));
    mockServerActionClient.from.mockReturnValue(chain);
  });

  it("registra visita exitosamente", async () => {
    const result = await registrarVisita({
      clienteId: "c-1",
      loteId: "l-1",
      fechaVisita: "2026-03-20",
      feedback: "Muy interesado",
    });
    expect(result.success).toBe(true);
  });

  it("registra visita sin fecha (usa fecha actual)", async () => {
    const result = await registrarVisita({ clienteId: "c-1" });
    expect(result.success).toBe(true);
  });

  it("maneja error al registrar", async () => {
    const chain = createChainMock();
    chain.insert.mockImplementation(() => Promise.resolve({ error: { message: "Error insert" } }));
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await registrarVisita({ clienteId: "c-1" });
    expect(result.success).toBe(false);
  });
});

describe("crearReserva", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } });
  });

  it("verifica permisos de reservas.crear", async () => {
    const chain = createChainMock({ data: { id: "r-1", lote_id: "l-1" }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    await crearReserva({ clienteId: "c-1", loteId: "l-1", montoReserva: 5000, fechaVencimiento: "2026-04-20" });
    expect(requierePermiso).toHaveBeenCalled();
  });

  it("maneja error al crear reserva", async () => {
    const chain = createChainMock();
    chain.single.mockImplementation(() => { throw { message: "Lote no disponible" }; });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await crearReserva({ clienteId: "c-1", loteId: "l-99", montoReserva: 5000, fechaVencimiento: "2026-04-20" });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("cancelarReserva", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("verifica permisos de reservas.cancelar", async () => {
    const chain = createChainMock({ data: { id: "r-1", lote_id: "l-1", cliente_id: "c-1" }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    await cancelarReserva("r-1", "Desistió");
    expect(requierePermiso).toHaveBeenCalled();
  });

  it("maneja error al cancelar", async () => {
    const chain = createChainMock();
    chain.single.mockImplementation(() => { throw { message: "Not found" }; });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await cancelarReserva("r-1", "Motivo");
    expect(result.success).toBe(false);
  });
});
